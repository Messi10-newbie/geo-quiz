import { MODE_INFO, promptFor, type AnswerRecord, type GameMode, type Question } from '../lib/quiz'
import { Flag } from './Flag'

interface Props {
  mode: GameMode
  answers: AnswerRecord[]
  best: number
  isNewBest: boolean
  onPlayAgain: () => void
  onHome: () => void
}

function labelFor(q: Question, id: string): string {
  return q.choices.find((c) => c.id === id)?.label ?? id
}

function verdict(ratio: number): string {
  if (ratio === 1) return 'Perfect round! 🏆'
  if (ratio >= 0.8) return 'World traveller! ✈️'
  if (ratio >= 0.5) return 'Nice exploring! 🧭'
  return 'Keep exploring! 🗺️'
}

export function Results({ mode, answers, best, isNewBest, onPlayAgain, onHome }: Props) {
  const score = answers.reduce((s, a) => s + a.points, 0)
  const correct = answers.filter((a) => a.correct).length

  return (
    <div className="animate-pop-in mx-auto w-full max-w-2xl">
      <div className="mb-6 rounded-3xl bg-white/5 p-6 text-center ring-1 ring-white/10 sm:p-8">
        <p className="text-sm text-slate-400">
          {MODE_INFO[mode].icon} {MODE_INFO[mode].title}
        </p>
        <h2 className="mt-2 text-3xl font-bold text-white">{verdict(correct / answers.length)}</h2>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Score" value={score} highlight />
          <Stat label="Correct" value={`${correct}/${answers.length}`} />
          <Stat label="Best" value={best} />
        </div>
        {isNewBest && (
          <p className="mt-4 inline-block rounded-full bg-amber-400/15 px-4 py-1 text-sm font-semibold text-amber-300">
            ✨ New best score!
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={onPlayAgain}
            autoFocus
            className="rounded-xl bg-sky-400 px-6 py-3 font-semibold text-slate-950 shadow transition hover:bg-sky-300"
          >
            Play again
          </button>
          <button
            onClick={onHome}
            className="rounded-xl bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/15"
          >
            Change mode
          </button>
        </div>
      </div>

      <h3 className="mb-3 px-1 text-sm font-semibold tracking-wide text-slate-400 uppercase">Review</h3>
      <ul className="space-y-2">
        {answers.map((a, i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <Flag code={a.question.country.code} size="sm" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-300">
                {a.question.mode === 'flag' ? `Flag of ${a.question.country.name}` : promptFor(a.question)}
              </p>
              <p className="text-sm">
                {a.correct ? (
                  <span className="text-emerald-300">✓ {labelFor(a.question, a.pickedId)}</span>
                ) : (
                  <>
                    <span className="text-rose-300 line-through">{labelFor(a.question, a.pickedId)}</span>
                    <span className="ml-2 text-emerald-300">→ {labelFor(a.question, a.question.answerId)}</span>
                  </>
                )}
                {a.hintUsed && <span className="ml-2 text-xs text-amber-300/80">💡 hint</span>}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-400">+{a.points}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/5 px-2 py-3 ring-1 ring-white/10">
      <div className={`text-2xl font-bold tabular-nums ${highlight ? 'text-sky-300' : 'text-white'}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}
