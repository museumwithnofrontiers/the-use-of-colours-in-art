import { eraLabel, roundOutward } from '@museumwnf/viewer-core'
import {
  useExhibitionData, useExhibitionCollection, useExhibitionTimeline, useExhibitionSheet,
} from '@museumwnf/viewer-core/dxa'

// The exhibition's data/catalogue/timeline/sheet layer, threaded together
// the way the viewer-core/dxa README shows (epic #1730): this site no
// longer carries its own copy of useCollection.js, useTimeline.js,
// sheet.js or useExhibitionData.js — all four were byte-identical with
// water-in-islam's, and now ship from @museumwnf/viewer-core/dxa's
// exhibition shape. What was genuinely this exhibition's own (the
// source-project colour/notice maps keyed by project UUID, epic #1727
// phase 4) already lived in dataset.config.js, not in any of those files.
//
// The partner layer (partnerListSpec/partnerSheetSpec, was partnerSpecs.js)
// dropped out entirely here: its only readers were this site's own
// Partners.vue/PartnerProfile.vue/InstitutionProfile.vue, and those are now
// @museumwnf/viewer-layout/dxa's `ExhibitionPartners`/`ExhibitionPartner
// Profile`, which read the partner layer from their own internal data
// module instead (epic #1731). Every export below is re-checked against
// what Home/ItemSheet/RelatedContent/Theme/ThemeGallery/Themes/Timeline —
// the views this site still owns — and composables/sheet.js/themes.js/
// useThemePictures.js/useThemePresentation.js actually read
// (`git grep` each export); an export only the deleted views imported is
// not re-exported any more.
const data = useExhibitionData()
const collection = useExhibitionCollection(data)
const timeline = useExhibitionTimeline(data, collection)
const sheet = useExhibitionSheet(data)

export { eraLabel, roundOutward }

// ── The data layer (was useExhibitionData.js) ──────────────────────────────
export const {
  defaultLang,
  exhibition, relatedContent, countries,
  isHiddenPartner,
  items, itemById, visiblePartners,
  tr, md, mdInline, mdStrip, labelOf, translations,
  chromeImage,
  partnerById, dynastyById,
  countryLabelFromCode,
  itemRoute, partnerRoute,
  isExploreRecord,
  exhibitionTitle, exhibitionSubtitle, exhibitionHeadline, bannerCaption,
} = data

// ── The catalogue spec (was useCollection.js) ───────────────────────────────
export const { tile } = collection

// ── The timeline spec (was useTimeline.js) ──────────────────────────────────
// `countryIdForCode` is renamed on the way out: composables/sheet.js is its
// only remaining reader, under this name.
export const {
  hasTimeline, timelineCountries,
  countryIdForCode: timelineCountryIdForCode,
  findEvents, timelineSpec,
} = timeline

// ── The item-sheet spec (was sheet.js) ──────────────────────────────────────
export const { itemSheet } = sheet
