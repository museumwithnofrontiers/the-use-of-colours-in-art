import { useI18n } from '@museumwnf/viewer-core'
import {
  countries, countryById, itemById, tagById, tags,
  itemRoute, labelOf, tr, defaultLang, mdInline, projectName,
} from './useExhibitionData.js'

// The catalogue spec: what this exhibition's lists filter and search on. The
// engine — query state, options, dates, pages, the boolean grammar — is
// viewer-core's; what is declared here is only what is this exhibition's:
// the facets and what the URL carries for them, the date rule, the page
// size, the haystack the search bar reads, and the tile a record becomes.
//
// Legacy asked the API for everything: `/items?ic[]=…&id[]=…&na=…&nz=…` for
// the results, and `/items/countries`, `/items/tags`, `/items/years` *with
// the same filters applied* for the dropdowns — which is what made the
// facets dependent (pick a country, and the type list shrinks to the types
// still reachable). The results page hands the engine the matching subset
// for that reason; the entrance hands it everything.

/** Nine tiles a page, as legacy's grids showed. */
export const PAGE_SIZE = 9

/**
 * Decision D5: the DXA sites test containment — `na <= start_date` and
 * `nz >= coalesce(end_date, start_date)` in `Objects.blade.php` — so an
 * undated record is out the moment a bound is set.
 */
export const DATE_MODE = 'contain'

// The five THG facet categories, in the order the legacy form shows them.
// `artist` has no dropdown in dxa-client, but the category exists in the data
// and the exporter ships it, so it renders whenever it has a value — a
// superset of legacy, never a different answer.
export const FACET_CATEGORIES = ['type', 'dynasty', 'subject', 'material', 'artist']

/**
 * The heading each facet dropdown carries, as entry names. Written out once
 * here so both the entrance's `SearchFormView` spec (which translates a
 * facet's `label` itself) and the results page's own aside panel (which
 * wants the translated string) read the same five names, and so
 * `viewer-i18n-check` can see them.
 */
export const FACET_LABEL_KEYS = {
  type: 'catalogue.facet.type',
  dynasty: 'catalogue.facet.periodDynasty',
  subject: 'catalogue.facet.subject',
  material: 'catalogue.facet.material',
  artist: 'catalogue.facet.artist',
}

// Every name written out, not read off `FACET_LABEL_KEYS` through a
// variable: `viewer-i18n-check` only sees a name spelled out at the call
// site, so a loop over the map above would be invisible to it.
export function useFacetLabels() {
  const { t } = useI18n()
  return {
    type: t('catalogue.facet.type'),
    dynasty: t('catalogue.facet.periodDynasty'),
    subject: t('catalogue.facet.subject'),
    material: t('catalogue.facet.material'),
    artist: t('catalogue.facet.artist'),
  }
}

// ── What the URL carries ───────────────────────────────────────────────────
//
// The legacy 2-letter country code for `country`, the legacy tag id for a
// facet: the values legacy's URLs carried, so a link shared then still
// resolves now.

export function countryIdForCode(code) {
  return code ? (countries.value ?? []).find((c) => c.code === code)?.id ?? null : null
}

export function tagLabelForLegacy(legacyId) {
  return (tags.value ?? []).find((t) => t.legacy_tag_id === legacyId)?.label ?? legacyId
}

/**
 * The facet spec for viewer-core's `useFacets`: the country by code, each
 * tag category by legacy id, labels upper-cased on the first letter as
 * legacy printed them.
 */
export const FACETS = {
  country: {
    values: (item) => countryById.value.get(item.country_id)?.code ?? null,
    label: (code) => labelOf('countries', countryIdForCode(code)),
  },
  ...Object.fromEntries(
    FACET_CATEGORIES.map((category) => [
      category,
      {
        values: (item) =>
          (item.tag_ids ?? [])
            .map((id) => tagById.value.get(id))
            .filter((tag) => tag && tag.category === category)
            .map((tag) => tag.legacy_tag_id),
        label: tagLabelForLegacy,
        capitalize: true,
      },
    ]),
  ),
}

// ── The search bar ─────────────────────────────────────────────────────────
//
// Legacy ran MySQL boolean full-text search over the English sheet; the
// haystack is the same set of fields, and the grammar is viewer-core's.

export function haystack(item, text) {
  return [
    text.name, text.description, text.short_description, text.type, text.holder, text.dates,
    text.location, text.provenance, text.alternate_name, text.place_of_production,
    ...(text.keywords ?? []), ...(text.materials ?? []),
    item.internal_name, item.owner_reference, item.mwnf_reference,
    labelOf('partners', item.partner_id), labelOf('countries', item.country_id),
  ]
}

// ── The tile ───────────────────────────────────────────────────────────────

/**
 * A record as viewer-layout's grid contract: the thumbnail, the name, the
 * lines legacy's hover card carried (date, holder, place, source project).
 * The project name is the manifest's own (epic #1727 phase 4), read in the
 * same `defaultLang` every other line of this tile is — nothing for a record
 * legacy left nameless (the Explore case), so the line is dropped, not
 * printed with a hole in it.
 */
export function tile(item, t) {
  const text = tr('items', item.id, defaultLang)
  const project = projectName(item, defaultLang)
  return {
    id: item.id,
    image: item.images?.[0]?.url ?? '',
    imageAlt: labelOf('items', item.id),
    name: mdInline(text.name ?? item.internal_name ?? ''),
    meta: [
      text.dates ?? '',
      labelOf('partners', item.partner_id),
      [text.location, labelOf('countries', item.country_id)].filter(Boolean).join(', '),
      project ? `${t('catalogue.results.forProject')} ${project}` : '',
    ].filter(Boolean),
    to: itemRoute(item),
  }
}

// ── The results page, as a spec ────────────────────────────────────────────
//
// What viewer-layout's `CatalogueResultsView` renders on
// `/collection-results`: the facets over the *matching* records (the
// dependent dropdowns above), the containment date rule, undated first, nine
// tiles a page, legacy's "Collection | <selections>" summary line. The panel
// itself is composed by the view's wrapper, in the aside where legacy put it,
// so no controls are declared here. Every text is an entry name.

// `from`/`to`, not `start`/`end`: the entrance's `SearchFormView` spec
// (`mode: 'facets'`, `dates: 'buckets'`) writes the date bounds under those
// two fixed keys — the view's own, not something a spec can rename — so the
// results side has to read the same ones to stay linked to it.
const KEYS = ['country', ...FACET_CATEGORIES, 'from', 'to']

/** The filter summary line legacy printed as "Collection | <selections>". */
function filterSummary(filters, t) {
  const parts = []
  if (filters.country) parts.push(labelOf('countries', countryIdForCode(filters.country)))
  for (const key of FACET_CATEGORIES) if (filters[key]) parts.push(tagLabelForLegacy(filters[key]))
  if (filters.from) parts.push(`${t('catalogue.filter.from')} ${filters.from}`)
  if (filters.to) parts.push(`${t('catalogue.filter.to')} ${filters.to}`)
  return parts.filter(Boolean).join(' | ')
}

export const collectionResults = {
  entity: 'items',
  keys: KEYS,
  facets: FACETS,
  facetScope: 'matching',
  filterMode: 'immediate',
  // The engine reads the raw `items` entity; a per-language build ships every
  // member's `languages` array but not every member's text in this language,
  // and legacy 404s such a record (`itemById`'s own rule, in
  // useExhibitionData.js). The results page must not offer what the sheet
  // would refuse to open, so it is filtered to the same renderable subset.
  scope: (item) => itemById.value.has(item.id),
  dates: { mode: DATE_MODE, begin: 'from', end: 'to' },
  sort: { undated: 'first' },
  pageSize: PAGE_SIZE,
  variant: 'grid',
  recordRoute: 'item',
  actionLabel: 'exhibition.action.seeDatabaseEntry',
  empty: 'catalogue.results.noResults',
  pagination: { jump: true },

  record: (item, { t }) => tile(item, t),

  summary: ({ filters, pageInfo, t }) => [
    { label: t('exhibition.section.collection'), value: filterSummary(filters, t) },
    { count: pageInfo.total, value: `${t('catalogue.results.outOf')} ${itemById.value.size} ${t('catalogue.results.objects')}` },
  ],
}
