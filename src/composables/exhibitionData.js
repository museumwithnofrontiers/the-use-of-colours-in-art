import { eraLabel, roundOutward } from '@museumwnf/viewer-core'
import {
  useExhibitionData, useExhibitionCollection, useExhibitionTimeline, useExhibitionPartner, useExhibitionSheet,
  PAGE_SIZE, DATE_MODE, FACET_CATEGORIES, FACET_LABEL_KEYS, useFacetLabels,
} from '@museumwnf/viewer-core/dxa'

// The exhibition's whole data/catalogue/timeline/partner/sheet layer,
// threaded together the way the viewer-core/dxa README shows (epic #1730):
// this site no longer carries its own copy of useCollection.js,
// useTimeline.js, partnerSpecs.js, sheet.js or useExhibitionData.js — all
// five were byte-identical with water-in-islam's, and now ship from
// @museumwnf/viewer-core/dxa's exhibition shape. What was genuinely this
// exhibition's own (the source-project colour/notice maps keyed by project
// UUID, epic #1727 phase 4) already lived in dataset.config.js, not in any
// of those five files, so nothing site-specific moves here — `config` is
// unused by every export below, same as upstream.
const data = useExhibitionData()
const collection = useExhibitionCollection(data)
const timeline = useExhibitionTimeline(data, collection)
const partner = useExhibitionPartner(data)
const sheet = useExhibitionSheet(data)

export {
  eraLabel, roundOutward,
  PAGE_SIZE, DATE_MODE, FACET_CATEGORIES, FACET_LABEL_KEYS, useFacetLabels,
}

// ── The data layer (was useExhibitionData.js) ──────────────────────────────
export const {
  manifest, defaultLang,
  exhibition, relatedContent, tags, countries, languages, dynasties, glossary, timelines, timelineEvents,
  isHiddenPartner,
  items, itemById, visiblePartners, visiblePartnerById,
  tr, md, mdInline, mdStrip, labelOf, loadEnglish, availableLanguages, loadTranslations, translations,
  chromeImage,
  partnerById, countryById, tagById, dynastyById, glossaryById, languageByCode,
  countryByCode, countryLabelFromCode,
  itemRoute, isInstitution, partnerRoute, partnerObjectsRoute,
  isExploreRecord, projectName,
  exhibitionTitle, exhibitionSubtitle, exhibitionHeadline, bannerCaption,
  siblingSites, siblingUrl,
} = data

// ── The catalogue spec (was useCollection.js) ───────────────────────────────
export const { FACETS, haystack, tile, collectionResults, countryIdForCode, tagLabelForLegacy } = collection

// ── The timeline spec (was useTimeline.js) ──────────────────────────────────
// `countryIdForCode` is renamed on the way out: the catalogue spec above
// already claims that name for its own, different function, and only
// ItemSheet.vue reads the timeline's — aliased back to `countryIdForCode` on
// the way in there (its own import line only), so its script stays unchanged.
export const {
  usesLocalTimeline, hasTimeline, timelineCountries, timelineCountryName,
  countryIdForCode: timelineCountryIdForCode,
  findEvents, timelineSpec, timelineGallerySpec,
} = timeline

// ── The partner specs (was partnerSpecs.js) ─────────────────────────────────
export const { partnerListSpec, partnerSheetSpec } = partner

// ── The item-sheet spec (was sheet.js) ──────────────────────────────────────
export const { itemSheet } = sheet
