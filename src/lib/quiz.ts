import { COUNTRIES } from '../data/countries'
import { CONTINENTS, type Country } from '../data/types'

export type Mode = 'flag' | 'capital' | 'continent' | 'findflag'
export type GameMode = Mode | 'mixed'
export type Difficulty = 'easy' | 'all'

export interface Choice {
  id: string // country code, or continent name in continent mode
  label: string
  flagCode?: string // set when the choice is shown as a flag
}

export interface Question {
  mode: Mode
  country: Country
  choices: Choice[]
  answerId: string
}

export interface AnswerRecord {
  question: Question
  pickedId: string
  correct: boolean
  hintUsed: boolean
  points: number
}

export const ROUND_LENGTH = 10
export const EASY_MIN_POPULATION = 15_000_000

export const MODE_INFO: Record<GameMode, { title: string; blurb: string; icon: string }> = {
  flag: { title: 'Guess the Flag', blurb: 'See a flag, name the country', icon: '🚩' },
  capital: { title: 'Capitals', blurb: 'Name the capital city', icon: '🏛️' },
  continent: { title: 'Continents', blurb: 'Place the country on the map', icon: '🌍' },
  findflag: { title: 'Find the Flag', blurb: 'Pick the right flag of four', icon: '🔍' },
  mixed: { title: 'Mixed', blurb: 'A bit of everything', icon: '🎲' },
}

const MODES: Mode[] = ['flag', 'capital', 'continent', 'findflag']

export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function countryPool(difficulty: Difficulty): Country[] {
  return difficulty === 'easy'
    ? COUNTRIES.filter((c) => c.population >= EASY_MIN_POPULATION)
    : COUNTRIES
}

// Wrong answers from the same continent first — "Peru or Chile?" is harder than "Peru or Japan?"
function distractors(country: Country, pool: Country[], n: number): Country[] {
  const others = pool.filter((c) => c.code !== country.code && c.capital !== country.capital)
  const same = shuffle(others.filter((c) => c.continent === country.continent))
  const rest = shuffle(others.filter((c) => c.continent !== country.continent))
  return [...same, ...rest].slice(0, n)
}

function makeQuestion(mode: Mode, country: Country, pool: Country[]): Question {
  if (mode === 'continent') {
    const wrong = shuffle(CONTINENTS.filter((c) => c !== country.continent)).slice(0, 3)
    return {
      mode,
      country,
      answerId: country.continent,
      choices: shuffle([country.continent, ...wrong]).map((c) => ({ id: c, label: c })),
    }
  }
  const options = shuffle([country, ...distractors(country, pool, 3)])
  return {
    mode,
    country,
    answerId: country.code,
    choices: options.map((c) => ({
      id: c.code,
      label: mode === 'capital' ? c.capital : c.name,
      flagCode: mode === 'findflag' ? c.code : undefined,
    })),
  }
}

export function makeRound(gameMode: GameMode, difficulty: Difficulty): Question[] {
  const pool = countryPool(difficulty)
  return shuffle(pool)
    .slice(0, ROUND_LENGTH)
    .map((country) => {
      const mode = gameMode === 'mixed' ? MODES[Math.floor(Math.random() * MODES.length)] : gameMode
      return makeQuestion(mode, country, pool)
    })
}

export function promptFor(q: Question): string {
  switch (q.mode) {
    case 'flag':
      return 'Which country does this flag belong to?'
    case 'capital':
      return `What is the capital of ${q.country.name}?`
    case 'continent':
      return `Which continent is ${q.country.name} in?`
    case 'findflag':
      return `Which flag belongs to ${q.country.name}?`
  }
}

/** Points for one answer: 100, plus up to +100 for a streak, halved if a hint was used. */
export function pointsFor(correct: boolean, streakBefore: number, hintUsed: boolean): number {
  if (!correct) return 0
  const base = 100 + Math.min(streakBefore, 5) * 20
  return hintUsed ? Math.round(base / 2) : base
}

export function flagUrl(code: string, width: 160 | 320 | 640 | 1280 = 320): string {
  return `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`
}

// ---- Best scores (per mode + difficulty), kept only in this browser ----
const bestKey = (m: GameMode, d: Difficulty) => `geoquiz.best.${m}.${d}`

export function loadBest(m: GameMode, d: Difficulty): number {
  try {
    return Number(localStorage.getItem(bestKey(m, d))) || 0
  } catch {
    return 0
  }
}

export function saveBest(m: GameMode, d: Difficulty, score: number): void {
  try {
    if (score > loadBest(m, d)) localStorage.setItem(bestKey(m, d), String(score))
  } catch {
    // storage blocked (private mode) — best score just isn't remembered
  }
}
