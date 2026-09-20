<script setup>
import { RouterLink } from 'vue-router'
import { I18nText } from '@museumwnf/viewer-core'
import { PartnerListView } from '@museumwnf/viewer-layout/views'
import { BackLink } from '@museumwnf/viewer-layout/content'
import { partnerObjectsRoute, partnerListSpec } from '../composables/exhibitionData.js'

// The partners list, on the platform's composed list view: the country
// grouping and the A–Z / Z–A toggle are `PartnerListView`'s, driven by
// `partnerListSpec` (composables/partnerSpecs.js). What is this
// exhibition's own fills the `#row` slot — the "N object(s)" / "no objects"
// meta line and the Read More / View Objects links legacy printed under
// every name, from the MWNF-384 branch that lists a partner whether or not
// it holds anything.
</script>

<template>
  <div id="partners-container">
    <PartnerListView :spec="partnerListSpec">
      <template #before>
        <div id="partners-options-container">
          <BackLink />
        </div>
        <!-- A shared entry, not this exhibition's own: the only thing that made
             the old `txtPartners` exhibition-specific was an absolute URL to its
             own Themes page, which is `#/themes` now. -->
        <I18nText id="partners-list-description" class="mwnf-prose" dir="auto" keypath="exhibition.partners.intro" />
      </template>

      <template #row="{ partner, row }">
        <div class="partner-text-links-container">
          <div class="partner-name">
            <RouterLink :to="row.route">
              <span v-html="row.name"></span><span v-if="row.city">, {{ row.city }}</span>
            </RouterLink>
          </div>
          <div class="partner-meta" v-if="partner.item_count">
            {{ partner.item_count }} {{ $t('partner.item.objectsInSite') }}
          </div>
          <div class="partner-meta partner-meta-empty" v-else>
            {{ $t('exhibition.partner.noObjectsInExhibition') }}
          </div>
          <div class="partner-links">
            <RouterLink :to="row.route">{{ $t('exhibition.action.readMore') }}</RouterLink>
            <template v-if="partner.item_count">
              <span class="partner-link-divider">|</span>
              <RouterLink :to="partnerObjectsRoute(partner)">{{ $t('exhibition.action.viewObjects') }}</RouterLink>
            </template>
          </div>
        </div>
        <div class="partner-logo" v-if="row.logo">
          <img :src="row.logo" :alt="row.name" loading="lazy" />
        </div>
      </template>
    </PartnerListView>
  </div>
</template>

<style scoped>
#partners-container { background: #fff; width: 100%; min-height: 400px; padding-bottom: 30px; }
#partners-options-container { display: flex; align-items: center; justify-content: flex-end; padding: 0 40px; }
#partners-list-description { padding: 6px 40px 20px; max-width: 900px; line-height: 1.5; }
#partners-container :deep(.mwnf-partner-list__group) { padding: 0 40px; }
#partners-container :deep(.mwnf-partner-list__group-heading) {
  font-size: 20px;
  font-weight: 700;
  color: var(--theme-dark);
  border-bottom: 2px solid var(--theme-medium);
  margin-top: 22px;
  padding-bottom: 3px;
}
#partners-container :deep(.mwnf-partner-list__row-block) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--background-color);
}
.partner-text-links-container { flex: 1; min-width: 0; }
.partner-name a { font-weight: 700; color: var(--link-blue); text-decoration: none; }
.partner-name a:hover { text-decoration: underline; }
.partner-meta { font-size: 13px; color: #666; margin: 3px 0; }
.partner-meta-empty { font-style: italic; }
.partner-links a { color: var(--link-blue); font-size: 13px; text-decoration: none; }
.partner-links a:hover { text-decoration: underline; }
.partner-link-divider { margin: 0 6px; color: #999; }
.partner-logo img { max-width: 120px; max-height: 70px; object-fit: contain; display: block; }
</style>
