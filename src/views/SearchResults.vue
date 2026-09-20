<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useKeywordIndex } from '@museumwnf/viewer-core'
import { BackLink } from '@museumwnf/viewer-layout/content'
import { CatalogueResultsView } from '@museumwnf/viewer-layout/views'
import { itemById, loadEnglish, PAGE_SIZE, haystack, tile } from '../composables/exhibitionData.js'

// The header search bar's results, on the platform's composed results view.
// Legacy ran MySQL boolean full-text search server-side; viewer-core runs
// the same operator grammar over a client-side index of this exhibition's
// haystack — the DXA grammar itself is untouched, no ranking beyond what the
// boolean grammar already does and no expansion. `all-objects` is legacy's
// sentinel for an empty submission, matched by `narrow` below rather than by
// the index (a bare `search('all-objects')` would find nothing).
//
// The index reads every record of the entity; `scope` keeps the same
// renderable-subset rule the collection results page uses (`itemById`'s own
// rule, in useExhibitionData.js), and `narrow` runs the keyword search over
// what `scope` already narrowed to — the "members intersection" legacy's own
// `ids.has()` check kept.
const index = useKeywordIndex('items', { grammar: 'boolean', haystack })
const ready = ref(false)
loadEnglish().then(() => { ready.value = true })

function isAllObjects(term) {
  return !term || term === 'all-objects'
}

const refineTerm = ref('')

const searchResultsSpec = computed(() => ({
  entity: 'items',
  keys: ['q'],
  scope: (item) => itemById.value.has(item.id),
  // The boolean grammar's own hit order (relevance, for a query with
  // operators) is the result; re-sorting chronologically would undo it.
  sort: false,
  narrow: (list, filters) => {
    if (!ready.value) return []
    if (isAllObjects(filters.q)) return list
    const ids = new Set(list.map((i) => i.id))
    return index.search(filters.q).filter((i) => ids.has(i.id))
  },
  pageSize: PAGE_SIZE,
  variant: 'grid',
  recordRoute: 'item',
  actionLabel: 'exhibition.action.seeDatabaseEntry',
  record: (item, { t }) => tile(item, t),
  pagination: { jump: true },

  summary: ({ filters, pageInfo, t }) => [
    { label: t('exhibition.section.database'), value: isAllObjects(filters.q) ? t('catalogue.results.allObjects') : `“${filters.q}”` },
    { count: pageInfo.total, value: `${t('catalogue.results.outOf')} ${itemById.value.size} ${t('catalogue.results.objects')}` },
  ],
}))
</script>

<template>
  <CatalogueResultsView :spec="searchResultsSpec" class="search-results-page">
    <template #before>
      <BackLink />
    </template>

    <!-- No auto-rendered `controls`: legacy's box is one field with a button
         beside it, not the generic labelled row the platform's own control
         types build, so it is composed here instead. Submitting re-runs the
         search on THIS page rather than returning to the header's box. -->
    <template #filters="{ apply }">
      <form class="refine-search" @submit.prevent="apply({ q: refineTerm || 'all-objects' })">
        <input v-model="refineTerm" type="text" class="refine-search-input" :placeholder="$t('catalogue.search.keywordPlaceholder')" />
        <button type="submit" class="refine-search-submit">{{ $t('catalogue.search.submit') }}</button>
      </form>
      <p class="how-to"><RouterLink :to="{ name: 'search-how-to' }">{{ $t('catalogue.search.howTo') }} ›</RouterLink></p>
    </template>

    <!-- Was one sentence with two links threaded through it. The message
         stands on its own and the two ways out are links beside it. -->
    <template #empty>
      <p class="no-results">
        {{ $t('catalogue.results.noResultsSearch') }}
        <RouterLink :to="{ name: 'search-how-to' }">{{ $t('catalogue.search.howTo') }}</RouterLink>
        <span class="no-results-divider">|</span>
        <RouterLink :to="{ name: 'collection' }">{{ $t('exhibition.section.collection') }}</RouterLink>
      </p>
    </template>
  </CatalogueResultsView>
</template>

<style scoped>
.search-results-page { background: #fff; width: 100%; min-height: 400px; }
.search-results-page :deep(.mwnf-catalogue__body) { padding: 0 20px 20px; }
.search-results-page :deep(.mwnf-catalogue__filters) { padding: 0 20px 12px; }
.refine-search { display: flex; gap: 8px; max-width: 360px; }
.refine-search-input { flex: 1; min-width: 0; padding: 5px 8px; font-family: inherit; border: 1px solid var(--rule-grey); }
.refine-search-submit { padding: 5px 14px; font-family: inherit; cursor: pointer; }
.how-to { margin-top: 8px; }
.how-to a { color: var(--link-blue); font-size: 13px; }
.no-results { padding: 40px 0; }
.no-results a { color: var(--link-blue); }
.no-results-divider { margin: 0 6px; color: #999; }
</style>
