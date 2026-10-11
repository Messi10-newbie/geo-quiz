// Vercel serverless function: POST /api/ai
//
// The browser never sees the NVIDIA key. It only sends WHICH question it is on
// (mode + country code); this function builds the prompt itself, so nobody can
// use the endpoint as a free general-purpose chatbot on our key.
import { COUNTRIES } from '../src/data/countries.js'
import { CONTINENTS, type Continent, type Country } from '../src/data/types.js'

const BASE_URL = 'https://integrate.api.nvidia.com/v1'
const DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b'
const MODES = ['flag', 'capital', 'continent', 'findflag'] as const
type Mode = (typeof MODES)[number]

interface AIRequest {
  kind: 'hint' | 'explain'
  mode: Mode
  code: string // country the question is about
  picked?: string // explain only: what the player chose (country code or continent)
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}

// Validate everything coming from the browser — never trust the client.
function parse(body: unknown): AIRequest | null {
  if (typeof body !== 'object' || body === null) return null
  const { kind, mode, code, picked } = body as Record<string, unknown>
  if (kind !== 'hint' && kind !== 'explain') return null
  if (!MODES.includes(mode as Mode)) return null
  if (typeof code !== 'string' || !COUNTRIES.some((c) => c.code === code)) return null
  if (picked !== undefined) {
    const valid =
      typeof picked === 'string' &&
      (COUNTRIES.some((c) => c.code === picked) || CONTINENTS.includes(picked as Continent))
    if (!valid) return null
  }
  return { kind, mode: mode as Mode, code, picked: picked as string | undefined }
}

function answerText(mode: Mode, c: Country): string {
  if (mode === 'capital') return c.capital
  if (mode === 'continent') return c.continent
  return c.name
}

function questionText(mode: Mode, c: Country): string {
  switch (mode) {
    case 'flag':
      return 'Which country does this flag belong to? (the player can see the flag)'
    case 'capital':
      return `What is the capital of ${c.name}?`
    case 'continent':
      return `Which continent is ${c.name} in?`
    case 'findflag':
      return `Which of four flags belongs to ${c.name}?`
  }
}

function pickedText(mode: Mode, picked: string): string {
  const c = COUNTRIES.find((x) => x.code === picked)
  if (!c) return picked // a continent
  return mode === 'capital' ? `${c.capital} (capital of ${c.name})` : c.name
}

function buildMessages(req: AIRequest, c: Country) {
  const answer = answerText(req.mode, c)
  const question = questionText(req.mode, c)

  if (req.kind === 'hint') {
    const forbidden = [...new Set([c.name, c.capital, answer])].join(', ')
    const extra =
      req.mode === 'flag'
        ? ' The player can already see the flag, so do NOT describe the flag.'
        : req.mode === 'findflag'
          ? ' Describe one feature of the correct flag (a colour, symbol or layout) without naming any country.'
          : ''
    return [
      {
        role: 'system',
        content:
          'You are a friendly geography quiz host. Give ONE short hint, max 20 words, that helps ' +
          `but does not give the answer away. Never write any of these words: ${forbidden}.${extra} ` +
          'Reply with the hint only.',
      },
      { role: 'user', content: `Question: ${question}\nCorrect answer: ${answer}` },
    ]
  }

  const result =
    req.picked && req.picked !== (req.mode === 'continent' ? c.continent : c.code)
      ? `The player answered "${pickedText(req.mode, req.picked)}", which is wrong.`
      : 'The player answered correctly.'
  return [
    {
      role: 'system',
      content:
        'You are a friendly geography quiz host. Reply in max 40 words total: state the correct answer, ' +
        'and if the player was wrong give a memorable way to tell them apart; then add one true, ' +
        'surprising fun fact you are sure about. Plain text only, no markdown, no sign-off.',
    },
    { role: 'user', content: `Question: ${question}\nCorrect answer: ${answer}\n${result}` },
  ]
}

// Safety net: if the model slips and writes the answer in a hint, blank it out.
function maskAnswer(text: string, c: Country): string {
  let out = text
  for (const word of [c.name, c.capital]) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(escaped, 'gi'), '▢▢▢')
  }
  return out
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) return json({ error: 'AI is not configured on the server.' }, 500)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON.' }, 400)
  }
  const req = parse(body)
  if (!req) return json({ error: 'Invalid request.' }, 400)
  const country = COUNTRIES.find((c) => c.code === req.code)!

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.NVIDIA_MODEL ?? DEFAULT_MODEL,
        messages: buildMessages(req, country),
        temperature: 0.7,
        max_tokens: 160,
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) {
      console.error('NVIDIA error', response.status, await response.text())
      return json({ error: 'The AI is busy right now — try again in a moment.' }, 502)
    }
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] }
    let text = data.choices?.[0]?.message?.content?.trim() ?? ''
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    if (!text) return json({ error: 'The AI gave an empty answer — try again.' }, 502)
    if (req.kind === 'hint') text = maskAnswer(text, country)
    return json({ text })
  } catch (err) {
    console.error('AI request failed', err)
    return json({ error: 'Could not reach the AI — try again.' }, 502)
  }
}
