import {
  languageLabels, loadEntities, mwnfLinks, offeredLanguages, sectionMeta, useDataPackage,
} from '@museumwnf/viewer-core'
import { itemFromUidPath, partnerFromKey } from '@museumwnf/viewer-core/legacy'
import { TextPageView } from '@museumwnf/viewer-layout/views'
import SiteShell from './SiteShell.vue'
import { countries, items, visiblePartners, hasTimeline } from './composables/exhibitionData.js'
import { creditsSpec } from './composables/textPageSpecs.js'

// The whole declaration of this website. Before it mounts, the website reads
// nothing from its package but the manifest: the languages it offers, their
// labels and its name come from `manifest.site`, and every record is loaded
// by the route that reads it.

const { manifest } = useDataPackage()

// ── Source-project site config (epic #1727 phase 4) ─────────────────────────
//
// Per-project-UUID editorial choices ItemSheet.vue makes about a borrowed
// item's source: which colour swatch its chip uses (one of the site's own
// `mwnf-chip--<name>` classes, `src/styles/site.css` — not viewer-layout's
// shared `mwnf-chip--<family>` vocabulary, `content.css`, which named its
// families after legacy project keys and which this exhibition no longer
// keys anything off), and which projects still get the Explore-partner
// notice legacy showed on the sheet. Both keyed by project UUID, read from
// this package's own `manifest.projects`
// (`npm pack @museumwnf/the-use-of-colours-in-art-data`) — never the legacy
// project key, which this exhibition no longer reads. Shared verbatim with
// the sibling water-in-islam; that package's own UUIDs differ, so its copy
// of these two maps is ported by hand, not copied.
export const projectColors = {
  '61c122ac-ea86-5462-8bab-6b86138c49b2': 'islamic-art', // Discover Islamic Art
  '928f5e0d-53e3-5f53-b9c2-5af389c30dd4': 'islamic-art', // Explore Islamic Art Collections
  '76eaf6c2-8025-53bc-9e39-106803a3917e': 'baroque-art', // Discover Baroque Art
  '0f031e22-6dc6-5ce6-b94b-9bb88345140c': 'sharing-history', // Sharing History
  'dcf7b4d2-03c8-568a-8209-2817950fe05e': 'carpet-art', // Discover Carpet Art
  'ad963031-4a8c-5d06-b797-b7cfc772e3c0': 'glass-art', // Discover Glass Art
  'a0817323-79ca-53fc-95ac-9f65ee2fcbac': 'galleries', // MWNF Galleries
  '08eff25c-24af-5d7d-8635-18ea15aca879': 'exhibition', // The Use Of Colours In Art (this exhibition's own native project)
}

// Legacy's Explore-partner notice, shown only on a sheet borrowed from
// Explore Islamic Art Collections.
export const noticeProjects = [
  '928f5e0d-53e3-5f53-b9c2-5af389c30dd4', // Explore Islamic Art Collections
]

// The languages this exhibition publishes (`exhibition_i18n.enabled`, declared
// by the package as `site.languages`), kept where the item translations
// actually carry them. An item sheet may offer more — whatever languages the
// record itself carries — from its own switcher, without touching the site
// language.
const languages = offeredLanguages()

// Every page renders the chrome — the header logos, the banner and its
// caption, the bottom banner and the sponsor strip — off these four; a page
// adds what it reads on top. A route also says which section it belongs
// to, and the shell reads that for the banner title and the active menu
// entry (viewer-core's `useSection`).
const CHROME = ['exhibition', 'items', 'partners', 'countries']
const meta = sectionMeta(CHROME)

export default {
  // The dataset package this website renders. Must match the alias in
  // vite.config.js and the dependency in package.json.
  datasetPackage: '@museumwnf/the-use-of-colours-in-art-data',

  // English is the base language of every catalogue in the platform, so the
  // name the site is known by is the English one, whatever this build enables.
  siteName: manifest.site?.names?.en ?? 'The Use of Colours in Art',

  // All pages are website-specific views (below) — no generic entity pages.
  features: {
    entities: [],
  },

  languages,

  // The absolute address this build is deployed at, base path included
  // (viewer-core's README, "the declaration outside a component" —
  // `sourceUrl()` reads it). GitHub Pages serves this repo at
  // `https://museumwithnofrontiers.github.io/<repo>`, the same `<repo>` segment
  // `vite.config.js`'s `BASE_PATH` puts in the build's own base path — so
  // this changes together with that one, and with the domain, whenever the
  // site moves off GitHub Pages.
  site: { origin: 'https://museumwithnofrontiers.github.io/the-use-of-colours-in-art' },

  shell: SiteShell,

  // What viewer-layout's `SiteShell` (src/SiteShell.vue) reads to build the
  // menu, the header/footer link lists, the search submit and the banner
  // title of every page but Home — legacy's NavigationComponent, one for one,
  // with the single rename "related content" → /related. `to`, not a bare
  // `href`, so a route rename stays one edit. TIMELINE is dropped when the
  // exhibition reports neither chronology (`hasTimeline`) — both flags gate
  // the nav entry, not the data.
  navigation: {
    languages: languageLabels(languages),
    links: [
      { section: 'about', label: 'exhibition.nav.about', to: { name: 'about' } },
      { section: 'themes', label: 'exhibition.nav.themes', to: { name: 'themes' } },
      { section: 'collection', label: 'exhibition.nav.collection', to: { name: 'collection' } },
      { section: 'partners', label: 'exhibition.nav.partners', to: { name: 'partners' } },
      { section: 'timeline', label: 'exhibition.nav.timeline', to: { name: 'timeline' }, when: () => hasTimeline.value },
      { section: 'related', label: 'exhibition.related.title', to: { name: 'related' } },
      { section: 'credits', label: 'exhibition.nav.credits', to: { name: 'credits' } },
      { label: 'exhibition.nav.myCollection', href: mwnfLinks.myCollection, external: true },
    ],
    headerLinks: [
      { label: 'core.nav.home', to: { name: 'home' } },
      { label: 'exhibition.footer.aboutMwnf', href: mwnfLinks.about, external: true },
    ],
    footerLinks: [
      { label: 'exhibition.footer.aboutMwnf', href: mwnfLinks.about, external: true },
      { label: 'exhibition.footer.contact', href: mwnfLinks.contact, external: true },
      { label: 'exhibition.footer.legalNotice', href: mwnfLinks.legalNotice, external: true },
      { label: 'exhibition.footer.credits', href: mwnfLinks.credits, external: true },
      { label: 'exhibition.footer.cookies', href: mwnfLinks.cookies, external: true },
    ],
    // The banner title over every section page but Home, which supplies its
    // own from the exhibition record (src/SiteShell.vue) — a route with none
    // of these names never renders (`checkSectionMeta` below), so there is no
    // "error" fallback to declare any more.
    sectionTitles: {
      themes: 'exhibition.section.themes',
      collection: 'exhibition.section.collection',
      database: 'exhibition.section.database',
      partners: 'exhibition.section.partners',
      related: 'exhibition.related.title',
      timeline: 'exhibition.section.timeline',
      about: 'exhibition.section.about',
      credits: 'exhibition.section.credits',
    },
    // `all-objects` is legacy's sentinel for an empty submission, and the
    // value SearchResults matches on. The two must agree: the monorepo
    // viewer sent `all-items` from here while matching `all-objects` there,
    // so an empty search reported no results out of the full count instead
    // of listing everything.
    search: {
      route: 'search-results',
      key: 'q',
      placeholder: 'exhibition.search.placeholder',
      submitLabel: 'catalogue.search.submit',
      empty: 'all-objects',
    },
  },

  // The banner variant is the one thing every page (but the sections Home
  // gates on `isHome`, src/SiteShell.vue) reads off the route alone: a split
  // banner with the exhibition's own title/subtitle/headline on Home, a
  // narrow section strip everywhere else.
  banner: {
    variant: ({ section }) => (section === 'home' ? 'split' : 'section'),
  },

  // Legacy renders category 0 — "Header" — beside the MWNF mark, under the
  // `header_logo_section_1` heading, and leaves categories 1–4 to the footer
  // strip. This exhibition has one logo and it is category 1, the UNAOC mark
  // under "Under the patronage of", so the header block stays empty here too;
  // the rule is kept because the split is the data's, not this exhibition's.
  // Each heading is written out: a name assembled from the category id would
  // resolve at run time and be invisible to the check that every entry a page
  // asks for exists. Only the two categories that carry real copy are entries
  // — legacy's slots 3 and 4 hold placeholder text ("MIDDLE RIGHT FOOTER
  // SECTION FOR LOGOS"), which is not something to ask a translator for.
  // Those fall back to the legacy category name, exactly as an unlisted
  // category always did. `logos` (below) is `src/SiteShell.vue`'s own
  // reshaping of the exhibition's raw logo records into this shape.
  logos: {
    header: (logo) => Number(logo.category_id) === 0 && logo.visible !== false,
    headerTitle: 'exhibition.sponsors.coOrganisers',
    sponsorGroups: (logos, t) => {
      const byCategory = new Map()
      for (const logo of logos) {
        if (logo.visible === false) continue
        if (Number(logo.category_id) === 0) continue
        const key = logo.category_id ?? 0
        const bucket = byCategory.get(key)
        if (bucket) bucket.push(logo)
        else byCategory.set(key, [logo])
      }
      return [...byCategory.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([categoryId, group]) => ({
          title: Number(categoryId) === 1 ? t('exhibition.sponsors.patronage')
            : Number(categoryId) === 2 ? t('exhibition.sponsors.support')
              : (group[0].category ?? ''),
          sponsors: [...group]
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
            .map((logo) => ({ name: logo.alt, href: logo.href, logo: logo.image })),
        }))
    },
  },

  // Exhibition chrome images and related-content documents live on the legacy
  // media server and were never imported; the package ships the path, this is
  // the host.
  media: {
    legacyHost: 'https://images.museumwnf.org',
  },

  // Every address this website links out to — the twelve portal addresses
  // every DXA `dataset.config.js` repeats, from viewer-core; this exhibition
  // has none of its own on top.
  links: { ...mwnfLinks },

  // The canonical routes, one view per page: a section is `/<section>`, a
  // record `/<section>/:id` with the package id, and the language, the page
  // and every filter travel in the query.
  //
  // `/theme/:id` keeps `display_order - 1`, exactly as legacy did — the About
  // theme is display order 1, so the first listed theme is `/theme/1`. It is
  // the theme's identity within this exhibition rather than a filter, and the
  // sub-theme and picture segments name which part of the theme is being
  // read, which is why they stay in the path.
  //
  // The 'home' name replaces viewer-core's generic home route.
  extraViews: [
    { path: '/', name: 'home', component: () => import('./views/Home.vue'), meta: meta('home') },
    { path: '/about', name: 'about', component: () => import('./views/About.vue'), meta: meta('about', 'themes') },
    { path: '/themes', name: 'themes', component: () => import('./views/Themes.vue'), meta: meta('themes', 'themes') },
    {
      path: '/theme/:id/:subtheme?/:image?',
      name: 'theme',
      component: () => import('./views/Theme.vue'),
      meta: meta('themes', 'themes', 'glossary', 'dynasties'),
    },
    {
      path: '/theme-gallery/:id',
      name: 'theme-gallery',
      component: () => import('./views/ThemeGallery.vue'),
      meta: meta('themes', 'themes'),
    },
    { path: '/collection', name: 'collection', component: () => import('./views/CollectionSearch.vue'), meta: meta('collection', 'tags') },
    {
      path: '/collection-results',
      name: 'collection-results',
      component: () => import('./views/CollectionResults.vue'),
      meta: meta('collection', 'tags', 'timelines'),
    },
    {
      path: '/item/:id',
      name: 'item',
      component: () => import('./views/ItemSheet.vue'),
      // The composed RecordView takes the record id as a prop, not a route read.
      props: (route) => ({ id: route.params.id }),
      meta: meta('database', 'languages', 'dynasties', 'glossary', 'timelines', 'timeline_events'),
    },
    { path: '/search', name: 'search-results', component: () => import('./views/SearchResults.vue'), meta: meta('database') },
    { path: '/how-to-search', name: 'search-how-to', component: () => import('./views/SearchHowTo.vue'), meta: meta('database') },
    { path: '/partners', name: 'partners', component: () => import('./views/Partners.vue'), meta: meta('partners') },
    { path: '/partner/:id', name: 'partner', component: () => import('./views/PartnerProfile.vue'), meta: meta('partners', 'languages') },
    {
      path: '/partner/:id/objects',
      name: 'partner-objects',
      component: () => import('./views/PartnerObjects.vue'),
      meta: meta('partners'),
    },
    {
      path: '/institution/:id',
      name: 'institution',
      component: () => import('./views/InstitutionProfile.vue'),
      meta: meta('partners', 'languages'),
    },
    {
      path: '/institution/:id/monuments',
      name: 'institution-monuments',
      component: () => import('./views/InstitutionMonuments.vue'),
      meta: meta('partners'),
    },
    { path: '/related', name: 'related', component: () => import('./views/RelatedContent.vue'), meta: meta('related', 'related_content') },
    { path: '/timeline', name: 'timeline', component: () => import('./views/Timeline.vue'), meta: meta('timeline', 'timelines', 'timeline_events') },
    {
      path: '/timeline-results',
      name: 'timeline-results',
      component: () => import('./views/TimelineResults.vue'),
      meta: meta('timeline', 'timelines', 'timeline_events'),
    },
    {
      path: '/timeline/gallery',
      name: 'timeline-gallery',
      component: () => import('./views/TimelineGallery.vue'),
      meta: meta('timeline', 'timelines', 'timeline_events'),
    },
    // No local Credits.vue: legacy's Credits page is a heading (the shell's
    // own `sectionTitles`), a body and a back link, exactly `TextPageView`'s
    // shape (`creditsSpec`, composables/textPageSpecs.js).
    { path: '/credits', name: 'credits', component: TextPageView, props: { spec: creditsSpec }, meta: meta('credits') },
  ],

  // The legacy URL shapes, redirect-only, so a legacy address pasted after
  // the `#` still lands on the right page: the item sheet's dbUid path
  // (`/database-item/mwnf3/objects/EPM/uk/Mus21/41/en`) resolves through
  // `backward_compatibility`, the partner's and the institution's country and
  // legacy id through the partner record; the language segment is dropped and
  // the page number moves to the query.
  legacyRoutes: [
    {
      path: '/database-item/:uid(.*)/:language',
      async resolve({ uid }) {
        await loadEntities(['items'])
        const item = itemFromUidPath(items.value, uid)
        return item ? { name: 'item', params: { id: item.id } } : null
      },
    },
    {
      path: '/partner/:country/:id/:language',
      async resolve({ country, id }) {
        await loadEntities(['exhibition', 'partners', 'countries'])
        const partner = partnerFromKey(visiblePartners.value, countries.value, country, id)
        return partner ? { name: 'partner', params: { id: partner.id } } : null
      },
    },
    {
      path: '/partner-objects/:country/:id/:page',
      async resolve({ country, id, page }) {
        await loadEntities(['exhibition', 'partners', 'countries'])
        const partner = partnerFromKey(visiblePartners.value, countries.value, country, id)
        if (!partner) return null
        return { name: 'partner-objects', params: { id: partner.id }, query: Number(page) > 1 ? { page } : {} }
      },
    },
    {
      path: '/institution/:country/:id/:language',
      async resolve({ country, id }) {
        await loadEntities(['exhibition', 'partners', 'countries'])
        const partner = partnerFromKey(visiblePartners.value, countries.value, country, id)
        return partner ? { name: 'institution', params: { id: partner.id } } : null
      },
    },
    {
      path: '/institution-monuments/:country/:id/:page',
      async resolve({ country, id, page }) {
        await loadEntities(['exhibition', 'partners', 'countries'])
        const partner = partnerFromKey(visiblePartners.value, countries.value, country, id)
        if (!partner) return null
        return { name: 'institution-monuments', params: { id: partner.id }, query: Number(page) > 1 ? { page } : {} }
      },
    },
    {
      // `begin`/`end`, not the path's own `start`/`end`: viewer-layout's
      // `TimelineResultsView` renders its date controls under those keys, and
      // the gallery spec reads the same ones for the query to stay one shape.
      path: '/timeline-gallery/:country/:start/:end/:page',
      resolve({ country, start, end, page }) {
        const query = { country }
        if (start !== 'any') query.begin = start
        if (end !== 'any') query.end = end
        if (Number(page) > 1) query.page = page
        return { name: 'timeline-gallery', query }
      },
    },
    { path: '/error', resolve: () => null },
  ],
}
