import { useCallback, useEffect, useRef, useState } from 'react'
import { askAI } from '../lib/ai'
import {
  pointsFor,
  promptFor,
  type AnswerRecord,
  type Choice,
  type Question,
} from '../lib/quiz'
import { Flag } from './Flag'

interface Props {
  questions: Question[]
  onFinish: (answers: AnswerRecord[]) => void
  onQuit: () => void
}

type AIState = { status: 'idle' } | { status: 'loading' } | { status: 'done'; text: string } | { status: 'error'; text: string }

export function Game({ questions, onFinish, onQuit }: Props) {
  const [index, setIndex] = useState(0)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [streak, setStreak] = useState(0)
  const [hint, setHint] = useState<AIState>({ status: 'idle' })
  const [explain, setExplain] = useState<AIState>({ status: 'idle' })
  // Bumped on every new question so late AI replies for an old question are ignored
  const questionToken = useRef(0)

  const q = questions[index]
  const answered = pickedId !== null
  const score = answers.reduce((sum, a) => sum + a.points, 0)
  // A hint that failed to load doesn't cost points
  const hintUsed = hint.status === 'loading' || hint.status === 'done'

  const choose = useCallback(
    (choice: Choice) => {
      if (answered) return
      const correct = choice.id === q.answerId
      const points = pointsFor(correct, streak, hintUsed)
      setPickedId(choice.id)
      setStreak(correct ? streak + 1 : 0)
      setAnswers((prev) => [...prev, { question: q, pickedId: choice.id, correct, hintUsed, points }])
    },
    [answered, q, streak, hintUsed],
  )

  const next = useCallback(() => {
    if (!answered) return
    if (index + 1 >= questions.length) {
      onFinish(answers)
      return
    }
    questionToken.current++
    setIndex(index + 1)
    setPickedId(null)
    setHint({ status: 'idle' })
    setExplain({ status: 'idle' })
  }, [answered, index, questions.length, answers, onFinish])

  const runAI = useCallback(
    async (kind: 'hint' | 'explain', set: (s: AIState) => void) => {
      const token = questionToken.current
      set({ status: 'loading' })
      try {
        const text = await askAI({
          kind,
          mode: q.mode,
          code: q.country.code,
          picked: kind === 'explain' ? (pickedId ?? undefined) : undefined,
        })
        if (token === questionToken.current) set({ status: 'done', text })
      } catch (err) {
        if (token === questionToken.current)
          set({ status: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
      }
    },
    [q, pickedId],
  )

  const askHint = useCallback(() => {
    if (!answered && !hintUsed) void runAI('hint', setHint)
  }, [answered, hintUsed, runAI])

  const askExplain = useCallback(() => {
    if (answered && (explain.status === 'idle' || explain.status === 'error')) void runAI('explain', setExplain)
  }, [answered, explain.status, runAI])

  // Keyboard: 1-4 answer, H hint, Enter / → next, E explain
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const n = Number(e.key)
      if (n >= 1 && n <= q.choices.length) choose(q.choices[n - 1])
      else if (e.key.toLowerCase() === 'h') askHint()
      else if (e.key.toLowerCase() === 'e') askExplain()
      else if (e.key === 'Enter' || e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [q, choose, askHint, askExplain, next])

  const lastCorrect = answered ? answers[answers.length - 1].correct : null
  const isFlagChoices = q.mode === 'findflag'

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-3 text-sm">
        <button
          onClick={onQuit}
          className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Quit to menu"
        >
          ✕
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400 transition-all duration-500"
            style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
        <span className="tabular-nums text-slate-400">
          {index + 1}/{questions.length}
        </span>
      </div>

      <div className="mb-5 flex items-center justify-between">
        <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-semibold tabular-nums ring-1 ring-white/10">
          ⭐ {score}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
            streak >= 2 ? 'bg-orange-500/20 text-orange-300' : 'text-slate-500'
          }`}
        >
          🔥 {streak} streak
        </span>
      </div>

      {/* Question card */}
      <div key={index} className="animate-pop-in rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-5 text-center">
          {q.mode === 'flag' && <Flag code={q.country.code} size="lg" />}
          {(q.mode === 'capital' || q.mode === 'continent') && <Flag code={q.country.code} size="md" />}
          <h2 className="text-xl font-semibold text-white sm:text-2xl">{promptFor(q)}</h2>
        </div>

        <div className={`grid gap-3 ${isFlagChoices ? 'grid-cols-2' : 'sm:grid-cols-2'}`}>
          {q.choices.map((choice, i) => {
            const isAnswer = choice.id === q.answerId
            const isPicked = choice.id === pickedId
            let state = 'bg-white/5 ring-white/10 hover:bg-white/10 hover:ring-sky-400/60'
            if (answered && isAnswer) state = 'bg-emerald-500/20 ring-emerald-400 text-emerald-100'
            else if (answered && isPicked) state = 'bg-rose-500/20 ring-rose-400 text-rose-100 animate-shake'
            else if (answered) state = 'bg-white/[0.03] ring-white/5 opacity-50'
            return (
              <button
                key={choice.id}
                onClick={() => choose(choice)}
                disabled={answered}
                className={`relative flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-left font-medium ring-1 transition focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none disabled:cursor-default ${
                  isFlagChoices ? 'flex-col justify-center py-4' : ''
                } ${state}`}
              >
                <kbd className="absolute top-2 left-2 hidden rounded bg-white/10 px-1.5 text-[10px] text-slate-400 sm:block">
                  {i + 1}
                </kbd>
                {choice.flagCode ? (
                  <>
                    <Flag code={choice.flagCode} size="md" />
                    {/* Name only revealed after answering */}
                    <span className={`text-sm ${answered ? '' : 'invisible'}`}>{choice.label}</span>
                  </>
                ) : (
                  <span className="sm:pl-5">{choice.label}</span>
                )}
                {answered && isAnswer && <span className="ml-auto">✓</span>}
                {answered && isPicked && !isAnswer && <span className="ml-auto">✗</span>}
              </button>
            )
          })}
        </div>

        {/* AI area */}
        <div className="mt-5 space-y-3">
          {!answered && (
            <button
              onClick={askHint}
              disabled={hintUsed}
              className="w-full rounded-xl bg-amber-400/10 px-4 py-2.5 text-sm font-medium text-amber-200 ring-1 ring-amber-300/30 transition hover:bg-amber-400/20 disabled:opacity-60"
            >
              {hint.status === 'loading' ? '💡 Thinking of a hint…' : '💡 AI hint (halves points)  ·  H'}
            </button>
          )}
          <AIBubble state={hint} label="Hint" tone="amber" />

          {answered && (
            <div className="animate-pop-in flex flex-col gap-3 sm:flex-row">
              <div
                className={`flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold ${
                  lastCorrect ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                }`}
              >
                {lastCorrect ? `Correct! +${answers[answers.length - 1].points}` : 'Not quite!'}
              </div>
              <button
                onClick={askExplain}
                disabled={explain.status === 'loading' || explain.status === 'done'}
                className="rounded-xl bg-violet-500/15 px-4 py-2.5 text-sm font-medium text-violet-200 ring-1 ring-violet-400/30 transition hover:bg-violet-500/25 disabled:opacity-60"
              >
                {explain.status === 'loading' ? '🤖 Thinking…' : '🤖 Fun fact · E'}
              </button>
              <button
                onClick={next}
                autoFocus
                className="rounded-xl bg-sky-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow transition hover:bg-sky-300"
              >
                {index + 1 >= questions.length ? 'See results →' : 'Next →'}
              </button>
            </div>
          )}
          <AIBubble state={explain} label="AI host" tone="violet" />
        </div>
      </div>
    </div>
  )
}

function AIBubble({ state, label, tone }: { state: AIState; label: string; tone: 'amber' | 'violet' }) {
  if (state.status !== 'done' && state.status !== 'error') return null
  const colors =
    state.status === 'error'
      ? 'bg-rose-500/10 text-rose-200 ring-rose-400/30'
      : tone === 'amber'
        ? 'bg-amber-400/10 text-amber-100 ring-amber-300/30'
        : 'bg-violet-500/10 text-violet-100 ring-violet-400/30'
  return (
    <div className={`animate-pop-in rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 ${colors}`} aria-live="polite">
      <span className="mr-1.5 font-semibold">{state.status === 'error' ? 'Oops:' : `${label}:`}</span>
      {state.text}
    </div>
  )
}
