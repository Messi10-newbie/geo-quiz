import { useState } from 'react'
import {
  EASY_MIN_POPULATION,
  MODE_INFO,
  ROUND_LENGTH,
  countryPool,
  loadBest,
  type Difficulty,
  type GameMode,
} from '../lib/quiz'

interface Props {
  initialDifficulty: Difficulty
  onStart: (mode: GameMode, difficulty: Difficulty) => void
}

const GAME_MODES: GameMode[] = ['flag', 'capital', 'continent', 'findflag', 'mixed']

export function Home({ initialDifficulty, onStart }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty)

  return (
    <div className="animate-pop-in mx-auto w-full max-w-3xl">
      <header className="mb-8 text-center sm:mb-10">
        <div className="mb-3 text-5xl sm:text-6xl" aria-hidden>
          🌏
        </div>
        <h1 className="bg-gradient-to-r from-sky-300 via-cyan-200 to-violet-300 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
          GeoQuiz
        </h1>
        <p className="mt-3 text-slate-400">
          Flags, capitals and continents — with an AI host to help when you're stuck.
        </p>
      </header>

      <div className="mb-6 flex justify-center">
        <div
          role="radiogroup"
          aria-label="Difficulty"
          className="inline-flex rounded-full bg-white/5 p-1 ring-1 ring-white/10"
        >
          {(['easy', 'all'] as const).map((d) => (
            <button
              key={d}
              role="radio"
              aria-checked={difficulty === d}
              onClick={() => setDifficulty(d)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition sm:px-5 ${
                difficulty === d
                  ? 'bg-sky-400 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {d === 'easy'
                ? `Easy · ${countryPool('easy').length} big countries`
                : `All · ${countryPool('all').length} countries`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {GAME_MODES.map((mode) => {
          const info = MODE_INFO[mode]
          const best = loadBest(mode, difficulty)
          return (
            <button
              key={mode}
              onClick={() => onStart(mode, difficulty)}
              className={`group flex items-center gap-4 rounded-2xl bg-white/5 p-5 text-left ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/10 hover:ring-sky-400/50 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
                mode === 'mixed' ? 'sm:col-span-2' : ''
              }`}
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/10 text-2xl transition group-hover:scale-110">
                {info.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-white">{info.title}</span>
                <span className="block text-sm text-slate-400">{info.blurb}</span>
              </span>
              {best > 0 && (
                <span className="shrink-0 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-300">
                  Best {best}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        {ROUND_LENGTH} questions per round · streaks give bonus points · AI hints halve the points
        {difficulty === 'easy' && ` · Easy = countries over ${EASY_MIN_POPULATION / 1_000_000}M people`}
      </p>
    </div>
  )
}
