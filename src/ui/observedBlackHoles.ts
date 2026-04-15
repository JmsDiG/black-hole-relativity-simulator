export interface ObservedBlackHoleModel {
  id: string
  name: string
  category: string
  massSolar: number
  summary: string
  citation: string
  sourceUrl: string
}

export const OBSERVED_BLACK_HOLES: ObservedBlackHoleModel[] = [
  {
    id: 'sgr-a-star',
    name: 'Sagittarius A*',
    category: 'Supermassive black hole',
    massSolar: 4.154e6,
    summary:
      'The compact object at the center of the Milky Way. A useful reference for comparing stellar-orbit constraints with horizon-scale imaging.',
    citation:
      'GRAVITY Collaboration (2022): geometric and orbital constraints give a mass of about 4.154 million solar masses.',
    sourceUrl: 'https://arxiv.org/abs/2112.07478',
  },
  {
    id: 'm87-star',
    name: 'M87*',
    category: 'Supermassive black hole',
    massSolar: 6.5e9,
    summary:
      'The first black hole imaged by the Event Horizon Telescope. Its huge mass makes the Schwarzschild scale and light-crossing time enormous.',
    citation:
      'Event Horizon Telescope Collaboration (2019), “First M87 Event Horizon Telescope Results. VI. The Shadow and Mass of the Central Black Hole”.',
    sourceUrl: 'https://arxiv.org/abs/1906.11243',
  },
  {
    id: 'cygnus-x1',
    name: 'Cygnus X-1',
    category: 'Stellar-mass black hole',
    massSolar: 21.2,
    summary:
      'A landmark X-ray binary and one of the most famous stellar-mass black holes. Good for contrasting compact scales against supermassive cases.',
    citation:
      'Miller-Jones et al. (2021), Science: revised dynamical mass near 21.2 solar masses.',
    sourceUrl: 'https://www.science.org/doi/10.1126/science.abb3363',
  },
  {
    id: 'gw150914-remnant',
    name: 'GW150914 remnant',
    category: 'Merger remnant black hole',
    massSolar: 62,
    summary:
      'The remnant black hole from the first directly detected binary black-hole merger in gravitational waves.',
    citation:
      'Abbott et al. (2016), “Properties of the Binary Black Hole Merger GW150914”: remnant mass about 62 solar masses.',
    sourceUrl: 'https://authors.library.caltech.edu/records/mt5ym-r8015',
  },
]
