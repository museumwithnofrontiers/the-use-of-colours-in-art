<script setup>
import { computed } from 'vue'
import { I18nText, useFacets } from '@museumwnf/viewer-core'
import { SearchFormView } from '@museumwnf/viewer-layout/views'
import { items, FACETS, FACET_CATEGORIES, FACET_LABEL_KEYS } from '../composables/exhibitionData.js'

// The collection entrance, on the platform's composed search form
// (`mode: 'facets'`): legacy's shape — one dropdown per facet, over the
// *whole* member universe, choosing one navigates straight to the results —
// is the view's own `immediate` behaviour for this mode, and the from/to
// year buckets are its `dates: 'buckets'`. What stays here is only what
// those two engines need fed in: the options, and which categories this
// exhibition's data actually has anything to offer for (a superset of
// legacy: `artist` has no dropdown in dxa-client, but the exporter ships the
// category, so it appears whenever it has a value — never a different
// answer, only a fuller one).
const options = useFacets(items, FACETS)
const visibleFacets = computed(() => FACET_CATEGORIES.filter((c) => (options.value[c] ?? []).length > 0))

const collectionSearchSpec = computed(() => ({
  mode: 'facets',
  target: 'collection-results',
  dates: 'buckets',
  howTo: 'search-how-to',
  facets: [
    { key: 'country', label: 'catalogue.facet.selectCountry', options: options.value.country },
    ...visibleFacets.value.map((category) => ({ key: category, label: FACET_LABEL_KEYS[category], options: options.value[category] })),
  ],
}))
</script>

<template>
  <div id="collection-search-container">
    <SearchFormView :spec="collectionSearchSpec">
      <template #intro>
        <!-- A shared entry, not this exhibition's own: the only thing that
             made the old `txtCollection` exhibition-specific was an absolute
             URL to its own Themes page, which is `#/themes` now. -->
        <I18nText id="description" class="mwnf-prose" dir="auto" keypath="exhibition.collection.intro" />
      </template>
    </SearchFormView>
  </div>
</template>

<style scoped>
#collection-search-container { display: flex; flex-wrap: wrap; background: #fff; width: 100%; }
#collection-search-container :deep(.mwnf-search-form) { display: flex; flex-direction: column; width: 40%; padding: 50px; gap: 10px; }
#collection-search-container :deep(.mwnf-search-form__panel) { max-width: 300px; }
#collection-search-container :deep(.mwnf-search-form__dates) { display: flex; gap: 10px; }
#collection-search-container :deep(.mwnf-search-form__dates) > * { flex: 1; min-width: 0; }
#collection-search-container :deep(.mwnf-search-form__how-to) { margin: 0; }
#collection-search-container :deep(.mwnf-search-form__how-to a) { color: var(--link-blue); }
#description { width: 60%; padding: 50px 75px 20px 0; margin-top: 45px; }
#description :deep(a) { color: var(--link-blue); }

@media only screen and (max-width: 849px) {
  #collection-search-container { flex-direction: column; }
  #collection-search-container :deep(.mwnf-search-form) { width: 100%; padding: 30px; }
  #description { width: 100%; padding: 30px; margin-top: 0; }
}
</style>
