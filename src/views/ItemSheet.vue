<script setup>
import { BackLink, RecordLanguages } from '@museumwnf/viewer-layout/content'
import { RecordSheetView } from '@museumwnf/viewer-layout/views'
import { itemById } from '../composables/exhibitionData.js'
import { itemSheet } from '../composables/sheet.js'

defineProps({ id: { type: String, required: true } })
</script>

<template>
  <RecordSheetView :spec="itemSheet" :id="id" :data-getter="(itemId) => itemById.get(itemId)" class="database-page">
    <template #header="{ languages, language, select }">
      <div class="languages">
        <RecordLanguages :languages="languages" :language="language" @select="select" />
      </div>
      <BackLink />
    </template>
  </RecordSheetView>
</template>
