import { exhibitionConfig } from '@museumwnf/viewer-layout/dxa'
import sponsorLogos from './sponsor-logos.json'

// The whole declaration of this website: a DXA exhibition, whose pages,
// shell, menu, sponsor strip and legacy redirects are the family's
// (`exhibitionConfig`, @museumwnf/viewer-layout/dxa). What is this
// exhibition's own is below.


// The projects whose item sheets still carry legacy's Explore-partner notice.
export const noticeProjects = [
  '928f5e0d-53e3-5f53-b9c2-5af389c30dd4', // Explore Islamic Art Collections
]

// This website's own chrome files (inventory-app#2233, D7): the logo, the
// banners, the sibling-gallery tiles and the backgrounds, imported from the
// legacy site into theme/assets/. A picture the package names by its legacy
// path is the file at theme/assets/chrome/<that path>; the layout resolves
// each through this map (@museumwnf/viewer-layout, "Site chrome").
const chrome = import.meta.glob('../theme/assets/**/*.{jpg,jpeg,png,gif,svg}', {
  eager: true, query: '?url', import: 'default',
})

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

  noticeProjects,

  // The credits page's body.
  creditsBody: 'colours.credits.body',

  // This website's own chrome files, above.
  chrome,

  // The sponsors' logos, this website's own (inventory-app#2463): each file
  // under theme/assets/chrome/, its caption in locales/, its link, banner
  // slot (category 0 is the header) and order, as legacy's exhibition_logo
  // rows set them (src/sponsor-logos.json).
  sponsorLogos,
})
