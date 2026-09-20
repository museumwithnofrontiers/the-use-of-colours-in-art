<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { BackLink, Pagination } from '@museumwnf/viewer-layout/content'
import { CatalogueResultsView } from '@museumwnf/viewer-layout/views'
import {
  visiblePartnerById, partnerRoute, labelOf, tr, defaultLang, PAGE_SIZE, tile,
} from '../composables/exhibitionData.js'

// The member items one partner holds, on the platform's composed results
// view. Legacy split this into PartnerObjects and InstitutionMonuments, one
// per endpoint; here it is one component and `variant` supplies the count
// line's wording. The partner is a route param, not a filter the URL
// carries, so the spec is built per-route rather than kept as a static
// export like `collectionResults`.
const props = defineProps({
  variant: { type: String, default: 'partner' },
})

const isInstitutionView = computed(() => props.variant === 'institution')

const route = useRoute()
const partner = computed(() => visiblePartnerById(route.params.id))

const city = computed(() => (partner.value ? tr('partners', partner.value.id, defaultLang).city ?? '' : ''))

const objectsSpec = computed(() => ({
  entity: 'items',
  scope: (item) => item.partner_id === partner.value?.id,
  sort: { undated: 'first' },
  pageSize: PAGE_SIZE,
  variant: 'grid',
  recordRoute: 'item',
  actionLabel: 'exhibition.action.seeDatabaseEntry',
  empty: isInstitutionView.value
    ? 'colours.partnerObjects.emptyInstitution'
    : 'colours.partnerObjects.emptyPartner',
  record: (item, { t }) => tile(item, t),
  summary: ({ pageInfo, t }) => [
    { count: pageInfo.total, value: t(isInstitutionView.value ? 'colours.partner.monumentsInExhibition' : 'partner.item.objectsInSite') },
  ],
}))
</script>

<template>
  <CatalogueResultsView v-if="partner" :spec="objectsSpec" class="partner-objects-page">
    <template #before>
      <BackLink />
      <div id="partner-objects-header">
        <p id="partner-name">{{ labelOf('partners', partner.id) }}</p>
        <p id="partner-location">{{ [city, labelOf('countries', partner.country_id)].filter(Boolean).join(', ') }}</p>
      </div>
    </template>

    <template #actions="{ pageInfo, goToPage }">
      <Pagination class="pages" :page-info="pageInfo" jump @navigate="goToPage" />
    </template>

    <template #after>
      <div id="profile-link-container">
        <RouterLink id="profile-link" :to="partnerRoute(partner)">
          ➤ {{ isInstitutionView ? $t('colours.partnerObjects.institutionProfile') : $t('colours.partnerObjects.partnerProfile') }}
        </RouterLink>
      </div>
    </template>
  </CatalogueResultsView>
</template>

<style scoped>
.partner-objects-page { background: #fff; width: 100%; min-height: 400px; padding-bottom: 30px; }
#partner-objects-header { padding: 8px 0 4px; }
#partner-name { font-size: 22px; font-weight: 700; color: var(--theme-dark); }
#partner-location { color: #555; }
.partner-objects-page :deep(.mwnf-catalogue__body) { padding: 0 20px 20px; }
.pages { padding-inline: 20px; }
#profile-link-container { padding: 0 20px 16px; }
#profile-link { color: var(--link-blue); }
</style>
