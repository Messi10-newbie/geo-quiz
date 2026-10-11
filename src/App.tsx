import { useState } from 'react'
import { Game } from './components/Game'
import { Home } from './components/Home'
import { Results } from './components/Results'
import {
  loadBest,
  makeRound,
  saveBest,
  type AnswerRecord,
  type Difficulty,
  type GameMode,
  type Question,
} from './lib/quiz'

type Screen =
  | { name: 'home' }
  | { name: 'game'; questions: Question[] }
  | { name: 'results'; answers: AnswerRecord[]; best: number; isNewBest: boolean }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [mode, setMode] = useState<GameMode>('flag')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  // Changing this remounts <Game>, which resets all of its state for a fresh round
  const [round, setRound] = useState(0)

  function start(m: GameMode, d: Difficulty) {
    setMode(m)
    setDifficulty(d)
    setRound((r) => r + 1)
    setScreen({ name: 'game', questions: makeRound(m, d) })
  }

  function finish(answers: AnswerRecord[]) {
    const score = answers.reduce((s, a) => s + a.points, 0)
    const previousBest = loadBest(mode, difficulty)
    saveBest(mode, difficulty, score)
    setScreen({
      name: 'results',
      answers,
      best: Math.max(previousBest, score),
      isNewBest: score > previousBest && score > 0,
    })
  }

  return (
    <div className="flex min-h-dvh flex-col px-4 py-8 sm:py-12">
      <main className="flex flex-1 items-start justify-center">
        {screen.name === 'home' && <Home initialDifficulty={difficulty} onStart={start} />}
        {screen.name === 'game' && (
          <Game
            key={round}
            questions={screen.questions}
            onFinish={finish}
            onQuit={() => setScreen({ name: 'home' })}
          />
        )}
        {screen.name === 'results' && (
          <Results
            mode={mode}
            answers={screen.answers}
            best={screen.best}
            isNewBest={screen.isNewBest}
            onPlayAgain={() => start(mode, difficulty)}
            onHome={() => setScreen({ name: 'home' })}
          />
        )}
      </main>
      <footer className="mt-10 text-center text-xs text-slate-600">
        Flags by flagcdn.com · Country data: mledoze/countries (ODbL) & World Bank · AI by NVIDIA Nemotron
      </footer>
    </div>
  )
}
