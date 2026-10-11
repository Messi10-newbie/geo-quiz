import type { Mode } from './quiz'

export interface AIRequest {
  kind: 'hint' | 'explain'
  mode: Mode
  code: string
  picked?: string
}

/** Ask our own /api/ai function (which holds the NVIDIA key) for a hint or explanation. */
export async function askAI(req: AIRequest): Promise<string> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  const data = (await response.json().catch(() => ({}))) as { text?: string; error?: string }
  if (!response.ok || !data.text) throw new Error(data.error ?? 'The AI is unavailable right now.')
  return data.text
}
