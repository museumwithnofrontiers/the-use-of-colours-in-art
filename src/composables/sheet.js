import {
  itemSheet as platformSheet,
  eraLabel, roundOutward,
  partnerById, isHiddenPartner, partnerRoute, labelOf,
  isExploreRecord, dynastyById, translations, defaultLang,
  hasTimeline, timelineCountries, timelineCountryIdForCode,
  findEvents,
} from './exhibitionData.js'
import { projectColors, noticeProjects } from '../dataset.config.js'

// This exhibition's own layer over the platform's item-sheet spec
// (exhibitionData.js's `itemSheet`, `useExhibitionSheet` from
// @museumwnf/viewer-core/dxa): the blocks RecordSheetView (viewer-layout
// 2.14.0) reads through `spec.sourceDatabase`/`spec.notice`/`spec.museum`/
// `spec.related.*` and that no platform view can own, because each reads
// either a project UUID this exhibition alone maps to a colour
// (dataset.config.js's `projectColors`), an editorial choice of which
// projects still show the Explore-partner notice (`noticeProjects`), or
// this exhibition's own timeline data (exhibitionData.js's
// `useExhibitionTimeline`). Epic #1728; shared verbatim with the sibling
// water-in-islam, whose own `projectColors`/`noticeProjects` differ.

// This item/reference's chip colour: `dataset.config.js`'s `projectColors`,
// keyed by project UUID, or the `explore` class for a record with no
// project at all (`isExploreRecord`). Since the exporter fix
// inventory-app#1807, an outside `related_items` reference carries its own
// `project_id` too (verified on the installed
// @museumwnf/the-use-of-colours-in-art-data package), so the same function
// now resolves both the sheet's own source chip and an outside reference's
// chip — closing this exhibition's copy of the TODO(#1727) gap that used to
// leave a reference's chip Explore-only.
function chipFamily(record) {
  return projectColors[record.project_id] ?? (isExploreRecord(record) ? 'explore' : null)
}
function chipClass(record) {
  const family = chipFamily(record)
  return family ? `mwnf-chip--${family}` : null
}

function dynastyTr(dynasty, language) {
  return translations('dynasties', language)[dynasty.id] ?? translations('dynasties', defaultLang)[dynasty.id] ?? {}
}
function dynastiesWithHistory(record, language) {
  return (record.dynasty_ids ?? [])
    .map((id) => dynastyById.value.get(id))
    .filter((d) => d && dynastyTr(d, language).history)
}

// The default country the "Timeline for this item" popout opens on: the
// legacy two-letter code whose id matches this record's own country.
function countryCodeOf(countryId) {
  for (const [code] of timelineCountries.value) {
    if (timelineCountryIdForCode(code) === countryId) return code
  }
  return null
}

export const itemSheet = {
  ...platformSheet,

  sourceDatabase: {
    chipClass: (record) => chipClass(record),
  },

  notice: {
    show: (record) => noticeProjects.includes(record.project_id),
    label: 'exhibition.item.explorePartnerNote',
  },

  // E6: a hidden museum keeps its name on the sheet and loses the link,
  // because it has no page to link to.
  museum: {
    route: (partnerId) => {
      const partner = partnerById.value.get(partnerId)
      if (!partner || isHiddenPartner(partner)) return null
      return partnerRoute(partner)
    },
    label: (partnerId) => labelOf('partners', partnerId),
  },

  related: {
    ...platformSheet.related,
    title: 'exhibition.related.title',
    description: 'exhibition.related.description',
    outsideChip: (ref) => chipClass(ref),
    notInPackageLabel: 'exhibition.results.notInThisExhibition',
    artisticIntroductionLabel: 'exhibition.nav.artisticIntroduction',
    databaseLabel: 'exhibition.search.relatedDatabase',
    overallDatabase: { label: 'exhibition.search.overallDatabase', linkLabel: 'exhibition.nav.overallDatabase' },
    onDisplayIn: { linkPendingLabel: 'exhibition.item.linkPending' },
    dynasties: (record, language) => ({
      records: dynastiesWithHistory(record, language),
      tr: (d) => dynastyTr(d, language),
    }),
    // Withheld entirely when the exhibition reports no chronology, or this
    // item has no date to anchor a range on: legacy prints no "timeline"
    // anywhere on the sheet in that case, not merely a nav entry short.
    timeline: (record, ctx) => {
      if (!hasTimeline.value) return null
      const range = roundOutward(record.start_date, record.end_date)
      if (range[0] == null) return null
      return {
        heading: 'exhibition.section.timeline',
        countries: timelineCountries.value.map(([value, label]) => ({ value, label })),
        defaultCountry: () => countryCodeOf(record.country_id) ?? 'all',
        events: (countryCode) => findEvents({ countryCode, start: range[0], end: range[1] }),
        range,
        era: (year) => eraLabel(year, ctx.t),
        searchTo: (countryCode, r) => ({ name: 'timeline-results', query: { country: countryCode, begin: r[0], end: r[1] } }),
      }
    },
  },
}
