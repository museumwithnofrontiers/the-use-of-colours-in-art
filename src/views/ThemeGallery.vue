<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '@museumwnf/viewer-core'
import { CatalogueResultsView } from '@museumwnf/viewer-layout/views'
import { BackLink } from '@museumwnf/viewer-layout/content'
import {
  pictureById, romanFor, themeByRouteId, themeText, themeTree,
} from '../composables/themes.js'
import { pictureParent } from '../composables/useThemePresentation.js'
import { tile } from '../composables/exhibitionData.js'

const route = useRoute()
const { t, locale } = useI18n()

// Legacy's ThemeGallery: every record a theme touches, as one grid — now a
// CatalogueResultsView spec. `tree.itemsUnder` walks the theme and every
// sub-theme's picture selections depth-first (the union legacy's own dropdown
// had no option for either way, since its query only ever looped the
// sub-themes); a picture's own id is not a catalogue id, so each is resolved
// through its (possibly absent) parent — see `pictureParent` — and only the
// resolvable ones become the scope. The per-sub-theme narrowing legacy's
// dropdown offered on this page is not reproduced: composables/themeSpecs.js
// carries the reasons the picture→parent indirection stays this family's own
// rather than the view's, and a second, redundant filter surface over the
// same data was not worth adding back on top of it.
const theme = computed(() => themeByRouteId(route.params.id))

const itemIds = computed(() => {
  const ids = new Set()
  if (!theme.value) return ids
  for (const pictureId of themeTree.itemsUnder(theme.value.id)) {
    const parent = pictureParent(pictureById.value.get(pictureId))
    if (parent) ids.add(parent.id)
  }
  return ids
})

const title = computed(() => themeText(theme.value, locale.value).title ?? theme.value?.internal_name ?? '')

const spec = computed(() => ({
  entity: 'items',
  scope: (record) => itemIds.value.has(record.id),
  // Undated first, as legacy's own `sortChronological(out, { undated: 'first' })` did.
  sort: { undated: 'first' },
  variant: 'grid',
  recordRoute: 'item',
  record: (item, helpers) => tile(item, helpers.t),
  actionLabel: 'exhibition.action.seeDatabaseEntry',
  empty: 'exhibition.theme.noRecords',
  summary: () => [{
    label: t('exhibition.theme.galleryLabel'),
    value: `${t('exhibition.theme.romanLabel')} ${romanFor(theme.value?.display_order ?? 1)} | ${title.value}`,
  }],
}))
</script>

<template>
  <CatalogueResultsView v-if="theme" :spec="spec" class="theme-gallery">
    <template #before>
      <BackLink />
    </template>
    <template #empty>
      <p class="no-results">{{ t('exhibition.theme.noRecords') }}</p>
    </template>
  </CatalogueResultsView>

  <div class="mwnf-loader" v-else>{{ t('exhibition.theme.notInExhibition') }}</div>
</template>

<style scoped>
.theme-gallery { background: var(--secondary-color); width: 100%; min-height: 400px; padding-bottom: 30px; }
.theme-gallery :deep(.mwnf-catalogue__body) { padding: 0 20px; }
.no-results { padding: 30px 10px; font-style: italic; }
</style>
