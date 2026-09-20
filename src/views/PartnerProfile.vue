<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { NotFoundView, useI18n } from '@museumwnf/viewer-core'
import { BackLink, PartnerMap, RecordLanguages } from '@museumwnf/viewer-layout/content'
import { RecordView } from '@museumwnf/viewer-layout/views'
import { labelOf, md, partnerObjectsRoute, visiblePartnerById, partnerSheetSpec } from '../composables/exhibitionData.js'

// Legacy has two page templates for the same record — PartnerProfile for a
// museum, InstitutionProfile for a monument's owning institution — because it
// has one endpoint each. A data package has neither, so this is one component
// and `variant` supplies the two entries that actually differ.
//
// The record's language, its load, the media gallery and its lightbox are
// the composed `RecordView`'s (`partnerSheetSpec`, composables/partnerSpecs.js)
// — this page no longer tracks any of that itself. What it owns is the
// Description/Contact/Logo tab strip, which is three different shapes
// (Markdown, an address block, a bare image) and so is built over `text`/
// `record` directly rather than forced through the sheet's rows.
const props = defineProps({
  variant: { type: String, default: 'partner' },
})

const { t } = useI18n()
const isInstitutionView = computed(() => props.variant === 'institution')
const homepageLabel = computed(() =>
  isInstitutionView.value ? t('exhibition.action.institutionHomepage') : t('partner.nav.homepage'),
)
const itemsLabel = computed(() =>
  isInstitutionView.value ? t('exhibition.action.viewItems') : t('exhibition.action.viewObjects'),
)

const route = useRoute()
const id = computed(() => String(route.params.id))

const tab = ref('description')

function hasContact(text, record) {
  return Boolean(
    text.address || text.phone || text.email || text.website
      || record.contact_person_1 || record.contact_person_2,
  )
}

function website(text) {
  const url = text.website
  if (!url) return null
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function contacts(record) {
  return [record.contact_person_1, record.contact_person_2].filter(Boolean)
}
</script>

<template>
  <RecordView v-if="visiblePartnerById(id)" :spec="partnerSheetSpec" :id="id" class="partner-profile-page">
    <template #header="{ record, text, languages, language, select }">
      <div class="languages">
        <RecordLanguages :languages="languages" :language="language" @select="select" />
      </div>
      <BackLink />

      <div id="partner-links-container">
        <div id="partner-links">
          <button :class="{ active: tab === 'description' }" @click="tab = 'description'">{{ $t('partner.info.about') }}</button>
          <template v-if="hasContact(text, record)">
            <span class="divider">|</span>
            <button :class="{ active: tab === 'contact' }" @click="tab = 'contact'">{{ $t('partner.info.contact') }}</button>
          </template>
          <template v-if="record.logos?.length">
            <span class="divider">|</span>
            <button :class="{ active: tab === 'logo' }" @click="tab = 'logo'">{{ $t('partner.info.logo') }}</button>
          </template>
          <template v-if="website(text)">
            <span class="divider">|</span>
            <a :href="website(text)" target="_blank" rel="noopener">{{ homepageLabel }}</a>
          </template>
        </div>
        <div id="partner-objects-link" v-if="record.item_count">
          <RouterLink class="mwnf-button" :to="partnerObjectsRoute(record)">{{ itemsLabel }}</RouterLink>
        </div>
      </div>
    </template>

    <template #before-sheet="{ record, text }">
      <div class="mwnf-prose" v-if="tab === 'description'" v-html="md(text.description)"></div>

      <div v-else-if="tab === 'contact'">
        <p class="contact-header">{{ $t('partner.info.addresses') }}</p>
        <div class="mwnf-prose" v-html="md(text.address)"></div>
        <p v-if="text.phone">{{ $t('partner.info.phone') }} {{ text.phone }}</p>
        <p v-if="text.email"><a :href="`mailto:${text.email}`">{{ text.email }}</a></p>
        <p v-if="website(text)"><a :href="website(text)" target="_blank" rel="noopener">{{ text.website }}</a></p>
        <div class="contact-person" v-for="person in contacts(record)" :key="person.name ?? person.email">
          <p class="contact-title" v-if="person.title">{{ person.title }}</p>
          <p v-if="person.name">{{ person.name }}</p>
          <p v-if="person.phone">{{ $t('partner.info.phone') }} {{ person.phone }}</p>
          <p v-if="person.fax">{{ $t('partner.info.fax') }} {{ person.fax }}</p>
          <p v-if="person.email"><a :href="`mailto:${person.email}`">{{ person.email }}</a></p>
        </div>
        <div class="additional-urls" v-if="record.additional_urls?.length">
          <p v-for="entry in record.additional_urls" :key="entry.url">
            <a :href="entry.url" target="_blank" rel="noopener">{{ entry.url }}</a>
          </p>
        </div>
      </div>

      <div id="partner-logo-container" v-else-if="tab === 'logo'">
        <img v-for="logo in record.logos" :key="logo.url" :src="logo.url" :alt="labelOf('partners', record.id)" />
      </div>

      <!-- No entry props passed: PartnerMap's label for the OpenStreetMap link
           defaults to partner.map.openInOpenStreetMap since viewer-layout 2.10.0. -->
      <PartnerMap
        :latitude="record.latitude"
        :longitude="record.longitude"
        :zoom="record.map_zoom"
        :label="labelOf('partners', record.id)"
      />
    </template>
  </RecordView>
  <NotFoundView v-else />
</template>

<style scoped>
.partner-profile-page { background: #fff; width: 100%; min-height: 400px; padding-bottom: 40px; }

.languages { background: var(--rule-grey); padding: 6px 20px; }

#partner-links-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--background-color);
  padding: 8px 12px;
  margin: 10px 0;
}
#partner-links { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
#partner-links button {
  background: none;
  border: none;
  font-family: inherit;
  font-size: 15px;
  color: var(--theme-dark);
  cursor: pointer;
}
#partner-links button.active { font-weight: 700; text-decoration: underline; }
#partner-links a { color: var(--link-blue); font-size: 14px; }
.divider { color: #b08; opacity: 0.4; }
#partner-objects-link a { text-decoration: none; }

.partner-profile-page :deep(.mwnf-record__body) { padding: 0 20px 30px; }

.contact-header { font-weight: 700; color: var(--theme-dark); margin-bottom: 4px; }
.contact-person { margin-top: 12px; }
.contact-title { font-style: italic; }
.partner-profile-page :deep(.mwnf-prose) a { color: var(--link-blue); }
#partner-logo-container img { max-width: 200px; display: block; margin-bottom: 12px; }
.additional-urls { margin-top: 12px; word-break: break-all; }
</style>
