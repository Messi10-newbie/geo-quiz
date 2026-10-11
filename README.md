# 🌏 GeoQuiz

A geography quiz with an AI host. Guess flags, capitals and continents — and when you're stuck,
ask **NVIDIA Nemotron** for a hint, or get a fun fact explaining the answer.

**Modes:** Guess the Flag · Capitals · Continents · Find the Flag · Mixed
**Difficulty:** Easy (73 countries with 15M+ people) or All 194 UN member states

## Features

- 10-question rounds with streak bonuses and per-mode best scores
- AI hints (cost half the points) and AI explanations after each answer
- Wrong answers come from the same continent, so it stays challenging
- Keyboard play: `1`–`4` answer · `H` hint · `E` fun fact · `Enter` next
- Responsive — works on phones

## Tech stack

| Part | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Vercel serverless function (`api/ai.ts`) |
| AI | NVIDIA Nemotron (`nemotron-3-super-120b-a12b`) via the NVIDIA API |
| CI/CD | GitHub Actions (lint + build) → Vercel auto-deploy on push to `main` |

### How the AI is kept safe

The NVIDIA key lives only on the server. The browser sends just *which* question it is on
(`mode` + country code); the function validates that against the country list and builds the
prompt itself, so the endpoint can't be used as a free general-purpose chatbot. Hints are also
post-filtered so the answer can't slip through.

## Run locally

```bash
npm install
cp .env.example .env.local   # then paste your key from https://build.nvidia.com
npm run dev
```

`npm run dev` also serves `/api/ai` locally (see `localApi()` in `vite.config.ts`).

## Deploy

1. Push to GitHub.
2. In Vercel: **Add New → Project →** import the repo (framework: Vite, auto-detected).
3. **Settings → Environment Variables:** add `NVIDIA_API_KEY`.
4. Every push to `main` now deploys automatically.

## Data & credits

- Country data: [mledoze/countries](https://github.com/mledoze/countries) (ODbL) · population: World Bank (2023)
- Flags: [flagcdn.com](https://flagcdn.com)
- Regenerate data: `node scripts/build-countries.mjs <countries.json> <population.json>`



##THE LIVE LINK

https://geo-quiz-kappa.vercel.app/
