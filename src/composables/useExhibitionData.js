import { computed } from 'vue'
import {
  byId, entityRef, mediaUrl, projectLabel, useCatalogueData, useDataPackage,
} from '@museumwnf/viewer-core'

// The exhibition's records, read the one way every website reads them:
// through viewer-core, lazily. Each entity is a shared ref that stays `null`
// until a route declaring it in `meta.entities` brings its chunk in, so
// importing this module loads nothing, and a page pays only for what it
// reads. Nothing here keeps a copy of a record or a translation.
//
// `useCatalogueData` is the wrapper half of this module: `tr`, `md`/
// `mdInline`/`mdStrip`, `loadEnglish`, `labelOf` and the two `visible` rules
// below are viewer-core's, called once here and re-exported beside what is
// genuinely this site's own — routes, legacy key mappings, chrome images,
// the exhibition's own project override. The themes tree is composables/themes.js.

// English is the base language of every catalogue in the platform: every
// list, label and fallback reads it. A record the visitor reads in another
// language is resolved on the sheet itself, by `useRecordLanguage`.
export const defaultLang = 'en'

export const exhibition = entityRef('exhibition')
export const relatedContent = entityRef('related_content')
export const tags = entityRef('tags')
export const countries = entityRef('countries')
export const languages = entityRef('languages')
export const dynasties = entityRef('dynasties')
export const glossary = entityRef('glossary')
export const timelines = entityRef('timelines')
export const timelineEvents = entityRef('timeline_events')

// E6: a hidden museum is exported but must not appear on any list or profile
// page. Its items still render — legacy hides the museum, not the object.
// Declared here as a `visible` predicate rather than coded into every page
// that lists partners; `isHiddenPartner` stays a named export because
// `ItemSheet`'s holder line is the one surface that needs the opposite of
// `visible` — the museum keeps its name and loses only the link, because it
// has no page to link to (legacy links no holder from an item sheet at all,
// hidden or not, so suppressing it is also the closer copy).
const hiddenPartnerIds = computed(() => new Set(exhibition.value?.hidden_partner_ids ?? []))
export function isHiddenPartner(partner) {
  return hiddenPartnerIds.value.has(partner?.id)
}

const catalogue = useCatalogueData({
  eager: ['items', 'partners', 'countries', 'glossary', 'dynasties', 'timeline_events', 'themes'],
  defaultLanguage: defaultLang,
  visible: {
    // An item's `languages` is what it has TRANSLATIONS in, so a non-empty
    // array without this build's language means the text exists in some
    // other language and not in this one — legacy's own instance 404s such a
    // record, and this build drops it to match.
    //
    // An EMPTY array is a different case and must not be swept in with it:
    // it means the package has no text in ANY language, which is a gap in
    // the export rather than a fact about the record, and legacy serves
    // those records regardless. They keep their legacy names through
    // `labelOf`'s `internal_name` fallback and lose only their
    // descriptions. Hence the `!i.languages?.length ||` guard, which reads
    // like a redundant null-check and is not.
    items: (i) => !i.languages?.length || i.languages.includes(defaultLang),
    partners: (p) => !hiddenPartnerIds.value.has(p.id),
  },
})

export const items = catalogue.entity('items')
export const itemById = catalogue.index('items')
export const visiblePartners = catalogue.entity('partners')
const visiblePartnerIndex = catalogue.index('partners')
export function visiblePartnerById(id) {
  return visiblePartnerIndex.value.get(id) ?? null
}

export const { tr, md, mdInline, mdStrip, labelOf, loadEnglish, availableLanguages, loadTranslations, translations } = catalogue
loadEnglish()

/**
 * Exhibition chrome images and the related-content PDFs.
 * `banner_image_path`, `homepage_image_path` and `document_path` were never
 * imported into inventory storage, so the package ships the legacy path and
 * the address is built from the host `dataset.config.js` declares under
 * `media`. `size` ∈ zoom | hi_res | lo_res | small | full.
 */
export function chromeImage(path, size = 'hi_res') {
  return mediaUrl(path, size)
}

// ── Lookup maps ────────────────────────────────────────────────────────────
//
// Unfiltered, unlike `itemById`/`visiblePartnerById`: a holder line still
// needs to resolve a hidden museum's name (`isHiddenPartner` above is what
// suppresses the link), and every other lookup here has no visibility rule
// to begin with.
export const partnerById = byId('partners')
export const countryById = byId('countries')
export const tagById = byId('tags')
export const dynastyById = byId('dynasties')
export const glossaryById = byId('glossary')
export const languageByCode = byId('languages', 'code')

// countries.json is keyed by the inventory id (ISO 3166-1 alpha-3), but the
// legacy two-letter code is what related_content and the timeline keyspaces
// carry. `code` is the country's own backward_compatibility, so this is the
// bridge between the two — and the reason it is a lookup rather than a parse
// is that several legacy codes are not ISO (`uk`, `pa`, `qt`, `ua`, `sb`).
export const countryByCode = computed(
  () => new Map((countries.value ?? []).filter(c => c.code).map(c => [c.code, c]))
)

/** The same label from a legacy two-letter code (`uk` → United Kingdom). */
export function countryLabelFromCode(code) {
  if (!code) return ''
  const country = countryByCode.value.get(code)
  return country ? labelOf('countries', country.id) : code
}

/** The canonical item route: the package id, and no language in the path. */
export function itemRoute(item) {
  return { name: 'item', params: { id: item.id } }
}

// Institutions (monument owners) and museums both live in partners.json — the
// package ships the union of legacy's /partners and /institutions because a
// static package has no endpoints to split them across. The viewer routes by
// `type`, which is what legacy's two page templates keyed off.
export function isInstitution(partner) {
  return partner?.type === 'institution'
}

export function partnerRoute(partner) {
  return {
    name: isInstitution(partner) ? 'institution' : 'partner',
    params: { id: partner.id },
  }
}

export function partnerObjectsRoute(partner, page = 1) {
  return {
    name: isInstitution(partner) ? 'institution-monuments' : 'partner-objects',
    params: { id: partner.id },
    query: page > 1 ? { page } : {},
  }
}

// Themes moved to composables/themes.js, on top of viewer-core's
// `useCollectionTree` — see that file for the tree, the route-id convention
// and `romanFor`, both kept in the site rather than the shared package.

// ── Source projects ────────────────────────────────────────────────────────
//
// A member is borrowed from the MWNF project that originally published it.
// Epic #1727 phase 4: the name is now the data package's own
// `manifest.projects` entry (populated by the importer/exporter, phases 1-2),
// keyed by this record's `project_id` (a UUID) — not viewer-core's deprecated,
// legacy-key-keyed `projectName()`/`projectFamily()`, and not this exhibition's
// own project-key comparisons either. The manifest already names the
// exhibition's own native project under its own uuid (the sibling `Collection`
// the importer creates alongside every `Project` carries the same title), so
// there is no special case here for a native member any more; the colour
// swatch moved out entirely, to `dataset.config.js`'s `projectColors` map
// (ItemSheet.vue), which is this exhibition's own editorial choice, same as
// legacy's family classes were.
const { manifest } = useDataPackage()

// Some members have no `project_id` at all: they come from the Explore
// monuments database rather than from a project, which is why provenance has
// to be read from the keyspace here instead of from a field. Legacy still
// coloured them — `#info-citation-link` carried an `Explore` class — and still
// printed an empty project name, so its citation read `"…" in , Museum With No
// Frontiers, …` with a hole in it. The colour is reproduced (ItemSheet.vue's
// own `.mwnf-chip--Explore` rule, `src/styles/site.css`); the empty name is
// not, because a label reading "for" with nothing after it is a rendering
// fault rather than a faithful copy. The line is dropped instead.
export function isExploreRecord(item) {
  return (item?.backward_compatibility ?? '').startsWith('mwnf3_explore:')
}

/** Legacy's `#info-project-name`. `null` for a record with no project (the
 * Explore case) or whose project the manifest does not name in `lang`. */
export function projectName(item, lang = defaultLang) {
  return projectLabel(manifest, item?.project_id, lang)
}

/** The exhibition's own per-language chrome text. */
export function exhibitionTitle(lang = defaultLang) {
  return exhibition.value?.titles?.[lang] ?? exhibition.value?.titles?.en ?? ''
}

export function exhibitionSubtitle(lang = defaultLang) {
  return exhibition.value?.subtitles?.[lang] ?? exhibition.value?.subtitles?.en ?? ''
}

export function exhibitionHeadline(lang = defaultLang) {
  return exhibition.value?.headlines?.[lang] ?? exhibition.value?.headlines?.en ?? ''
}

export function bannerCaption(lang = defaultLang) {
  return exhibition.value?.banner_captions?.[lang] ?? exhibition.value?.banner_captions?.en ?? ''
}

// ── Sibling sites ──────────────────────────────────────────────────────────
//
// Decision Q3: these are reference objects, not resolved links. The exporter
// records identity plus whatever the import carried; where a `legacy_host` came
// across we can link to it, and where it did not the entry still renders — it
// just does not become an anchor.

export const siblingSites = computed(() =>
  (exhibition.value?.sibling_sites ?? []).filter(s => !s.hidden)
)

export function siblingUrl(sibling) {
  return sibling?.legacy_host || null
}
