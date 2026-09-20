<script setup>
import { computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useI18n, yearBuckets } from '@museumwnf/viewer-core'
import { BackLink, FacetSelect, FilterPanel, Pagination } from '@museumwnf/viewer-layout/content'
import { CatalogueResultsView } from '@museumwnf/viewer-layout/views'
import {
  labelOf, timelines, FACET_CATEGORIES, collectionResults, countryIdForCode, useFacetLabels, hasTimeline,
} from '../composables/exhibitionData.js'

// Results plus "filter further by", on the platform's composed results page:
// the filters in the URL, the dependent options, the date rule, the tiles and
// the pages are the view's, from the spec in composables/useCollection.js.
// What is this exhibition's fills the view's slots: the panel composed in
// the aside where legacy put it — every dropdown rebuilt from the items that
// survive the current filter set, so picking a country shrinks the type
// list, exactly as legacy's re-queries did — with the timeline link under
// it, a reset that is the entrance again, and a second pagination above the
// tiles.
const router = useRouter()
const { t } = useI18n()
const labels = useFacetLabels()

const KEYS = collectionResults.keys
const isFirstSearch = (filters) => KEYS.filter((k) => filters[k]).length <= 1

// Choosing navigates, and a reset is the entrance again.
function resetFilters() {
  router.push({ name: 'collection' })
}

// "Timeline for this Search" — legacy offered it whenever the chosen country
// actually has a chronology. The global timeline ships in every package
// whatever its flags say, so the check is a lookup rather than a request —
// a Set of `country_id`, so the countries served by both chronologies count
// once. `hasTimeline` comes first, and it is not redundant with that lookup:
// the worldwide chronology ships here too, so every country it covers would
// otherwise offer the link on a site whose Timeline section legacy withholds.
const timelineCountryIds = computed(() => new Set((timelines.value ?? []).map((tl) => tl.country_id)))
function showTimelineLink(filters) {
  if (!hasTimeline.value) return false
  const id = countryIdForCode(filters.country)
  return Boolean(id && timelineCountryIds.value.has(id))
}
</script>

<template>
  <CatalogueResultsView :spec="collectionResults" class="collection-results">
    <template #before>
      <BackLink />
    </template>

    <template #actions="{ pageInfo, goToPage }">
      <Pagination class="pages" :page-info="pageInfo" jump @navigate="goToPage" />
    </template>

    <!-- Was "No results. Click here to reset all filters.", with the link
         inside the sentence. The message stands on its own and the action is
         the button beside it, because a text is not something to thread a
         control through. -->
    <template #empty>
      {{ $t('catalogue.results.noResults') }}
      <button class="linkish" @click="resetFilters()">{{ $t('catalogue.results.resetFilters') }}</button>
    </template>

    <template #aside="{ filters, apply, matching, options }">
      <FilterPanel
        mode="immediate"
        :title="isFirstSearch(filters) ? $t('catalogue.facet.filterBy') : $t('catalogue.facet.filterFurtherBy')"
        :reset-label="$t('catalogue.results.resetFilters')"
        :disabled="matching.length === 0"
        @reset="resetFilters()"
      >
        <FacetSelect
          :model-value="filters.country"
          :options="options.country"
          :placeholder="$t('catalogue.facet.selectCountry')"
          @update:model-value="apply({ country: $event })"
        />
        <FacetSelect
          v-for="category in FACET_CATEGORIES"
          :key="category"
          :model-value="filters[category]"
          :options="options[category]"
          :placeholder="labels[category]"
          hide-empty
          @update:model-value="apply({ [category]: $event })"
        />
        <div class="date-wrapper">
          <FacetSelect :model-value="filters.from" :options="yearBuckets(matching, t)" :placeholder="$t('catalogue.facet.startDate')" @update:model-value="apply({ from: $event })" />
          <FacetSelect :model-value="filters.to" :options="yearBuckets(matching, t)" :placeholder="$t('catalogue.facet.endDate')" @update:model-value="apply({ to: $event })" />
        </div>
      </FilterPanel>

      <div class="timeline-link-box" v-if="showTimelineLink(filters)">
        <div class="options-label">{{ $t('catalogue.results.timelineForSearch') }}</div>
        <p>
          ➤
          <RouterLink :to="{ name: 'timeline-results', query: { country: countryIdForCode(filters.country), begin: filters.from, end: filters.to } }">
            {{ $t('exhibition.section.timeline') }} | {{ labelOf('countries', countryIdForCode(filters.country)) }}
          </RouterLink>
        </p>
      </div>
    </template>
  </CatalogueResultsView>
</template>

<style scoped>
.collection-results { background: #fff; width: 100%; min-height: 400px; }
.collection-results :deep(.mwnf-summary) { padding: 0 20px 12px; font-size: 15px; }
.collection-results :deep(.mwnf-catalogue__body) { padding: 0 20px 20px; }
.collection-results :deep(.mwnf-catalogue__aside) { flex: 0 0 260px; }
.linkish { background: none; border: none; color: var(--link-blue); text-decoration: underline; cursor: pointer; font: inherit; }
.date-wrapper { display: flex; gap: 8px; }
.date-wrapper > * { flex: 1; min-width: 0; }
.options-label { font-weight: 700; margin-bottom: 4px; }
.timeline-link-box { margin-top: 16px; background: var(--rule-grey); padding: 14px; }
.timeline-link-box a { color: var(--link-blue); }
</style>
