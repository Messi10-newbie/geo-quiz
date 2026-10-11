export type Continent = 'Africa' | 'Asia' | 'Europe' | 'North America' | 'South America' | 'Oceania'

export interface Country {
  code: string // ISO 3166-1 alpha-2, e.g. "MY"
  name: string
  capital: string
  continent: Continent
  population: number
}

export const CONTINENTS: Continent[] = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
]
