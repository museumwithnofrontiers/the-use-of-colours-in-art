import { exhibitionConfig } from '@museumwnf/viewer-layout/dxa'

// The whole declaration of this website: a DXA exhibition, whose pages,
// shell, menu, sponsor strip and legacy redirects are the family's
// (`exhibitionConfig`, @museumwnf/viewer-layout/dxa). What is this
// exhibition's own is below.

// The source-database chip's colour, per project: one of
// @museumwnf/viewer-layout's `mwnf-chip--<name>` classes for every project id
// the package's `manifest.projects` carries.
// A record with no project at all is an Explore record, whose chip the
// family draws itself.
export const projectColors = {
  '61c122ac-ea86-5462-8bab-6b86138c49b2': 'mwnf-chip--ISLandEPM', // Discover Islamic Art
  '928f5e0d-53e3-5f53-b9c2-5af389c30dd4': 'mwnf-chip--ISLandEPM', // Explore Islamic Art Collections
  '76eaf6c2-8025-53bc-9e39-106803a3917e': 'mwnf-chip--DBA', // Discover Baroque Art
  '0f031e22-6dc6-5ce6-b94b-9bb88345140c': 'mwnf-chip--AWE', // Sharing History
  'dcf7b4d2-03c8-568a-8209-2817950fe05e': 'mwnf-chip--DCA', // Discover Carpet Art
  'ad963031-4a8c-5d06-b797-b7cfc772e3c0': 'mwnf-chip--DGA', // Discover Glass Art
  'a0817323-79ca-53fc-95ac-9f65ee2fcbac': 'mwnf-chip--Galleries', // MWNF Galleries
  '08eff25c-24af-5d7d-8635-18ea15aca879': 'mwnf-chip--EXH', // The Use Of Colours In Art (this exhibition's own project)
}

// The projects whose item sheets still carry legacy's Explore-partner notice.
export const noticeProjects = [
  '928f5e0d-53e3-5f53-b9c2-5af389c30dd4', // Explore Islamic Art Collections
]

export default exhibitionConfig({
  // The dataset package this website renders. Must match the alias in
  // vite.config.js and the dependency in package.json.
  datasetPackage: '@museumwnf/the-use-of-colours-in-art-data',

  // The name for a package that predates `manifest.site`.
  siteName: 'The Use of Colours in Art',

  // The address this build is deployed at, base path included, read by the
  // source credit: the GitHub Pages address, the same repository segment
  // vite.config.js's `base` puts in the build's base path, so the two change
  // together, and with the domain.
  origin: 'https://museumwithnofrontiers.github.io/the-use-of-colours-in-art',

  projectColors,
  noticeProjects,

  // The credits page's body.
  creditsBody: 'colours.credits.body',
})
