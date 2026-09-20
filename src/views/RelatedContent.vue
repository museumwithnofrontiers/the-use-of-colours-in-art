<script setup>
import { LinkListView } from '@museumwnf/viewer-layout/views'
import { useI18n } from '@museumwnf/viewer-core'
import {
  relatedContent, chromeImage, countryLabelFromCode, mdStrip,
} from '../composables/exhibitionData.js'

const { t, locale } = useI18n()

// Legacy's RelatedContent: the exhibition's reading list, grouped by category
// and ordered inside each group — now a LinkListView spec. That view has no
// slots and renders `label`/`note` as plain interpolated text rather than
// through the Markdown pipeline (`{{ link.label }}`, not `v-html`), which this
// exhibition's own related_content.json makes a real loss rather than a
// theoretical one: every one of its five entries is `kind: "text"` — a
// bibliography with no title and no link, written in Markdown for its book
// titles' italics and its paragraph breaks — so what reaches the page is that
// text with the emphasis stripped and every line run together, since a plain
// text node collapses the whitespace `mdStrip` leaves behind exactly as an
// HTML paragraph always does. There is no view-level hook this spec can use
// to keep the formatting; recorded here rather than approximated with markup
// the view will not render.
//
// The four category NAMES are the one thing the package cannot supply. Legacy
// reads them from `mwnf3_thematic_gallery.related_content_category`, which the
// importer does not carry, so `related_content.json` ships `category_id` alone.
// The names below are that table's English rows, verbatim from the live API
// (`exhibitionRelatedContents[*].categoryName`) — the same class of ported
// legacy constant as the timeline's year-bucket algorithm, and recorded as a
// package gap in README.md rather than pretended away. Every exhibition site
// carries the same four categories, so the names read from the shared
// `exhibition.relatedCategory.*` dictionary rather than a copy of this site's
// own.
const CATEGORY_NAMES = {
  1: 'exhibition.relatedCategory.furtherReading',
  2: 'exhibition.relatedCategory.mwnfContent',
  3: 'exhibition.relatedCategory.partnerContent',
  4: 'exhibition.relatedCategory.otherContent',
}

// Legacy's own display order for the four groups, which is the order its API
// happened to answer in — not ascending id.
const CATEGORY_ORDER = [1, 2, 3, 4]

function text(map) {
  return map?.[locale.value] ?? map?.en ?? ''
}

function href(entry) {
  if (entry.document_path) return chromeImage(entry.document_path, 'hi_res')
  return entry.url ?? null
}

// A text entry (no title) reads as its own bibliography; anything else names
// itself, falling back to its link when even that is missing.
function labelFor(entry) {
  if (text(entry.titles)) return mdStrip(text(entry.titles))
  if (text(entry.texts)) return mdStrip(text(entry.texts))
  const link = href(entry)
  return link || t('exhibition.relatedCategory.unknown')
}

// Everything a title entry carries beyond its own label — location, authors,
// a short description — collapsed to one line under it; a plain text entry
// has already said everything it has in `labelFor`, so it carries none.
function noteFor(entry) {
  if (!text(entry.titles)) return ''
  const parts = []
  if (entry.entity_location || entry.entity_country) {
    parts.push([entry.entity_location, entry.entity_country ? countryLabelFromCode(entry.entity_country) : '']
      .filter(Boolean).join(', '))
  }
  if (entry.authors || entry.type_resource) parts.push([entry.authors, entry.type_resource].filter(Boolean).join(', '))
  if (text(entry.descriptions)) parts.push(mdStrip(text(entry.descriptions)))
  if (entry.further_reading) parts.push(mdStrip(entry.further_reading))
  return parts.join(' — ')
}

function groups() {
  const byCategory = new Map()
  for (const entry of relatedContent.value) {
    const bucket = byCategory.get(entry.category_id)
    if (bucket) bucket.push(entry)
    else byCategory.set(entry.category_id, [entry])
  }
  const ids = [
    ...CATEGORY_ORDER.filter((id) => byCategory.has(id)),
    ...[...byCategory.keys()].filter((id) => !CATEGORY_ORDER.includes(id)).sort(),
  ]
  return ids.map((id) => ({
    heading: CATEGORY_NAMES[id] ?? 'exhibition.relatedCategory.unknown',
    links: [...byCategory.get(id)]
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((entry) => ({ label: labelFor(entry), href: href(entry) ?? undefined, note: noteFor(entry) || undefined })),
  }))
}

const spec = {
  groups,
  empty: 'exhibition.related.notAvailable',
  // LinkListView takes a fixed destination, not "the page before this one" —
  // Home is the one address every visitor can always reach back to.
  back: { label: 'core.action.back', to: { name: 'home' } },
}
</script>

<template>
  <LinkListView :spec="spec" class="related-content" />
</template>

<style scoped>
.related-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: 400px;
  color: var(--secondary-text-color);
  background: var(--secondary-color);
}
.related-content :deep(.mwnf-link-list__groups) { width: 70%; padding: 20px 50px 50px; }

@media only screen and (max-width: 974px) {
  .related-content :deep(.mwnf-link-list__groups) { width: 100%; padding: 20px 30px 50px; }
}
</style>
