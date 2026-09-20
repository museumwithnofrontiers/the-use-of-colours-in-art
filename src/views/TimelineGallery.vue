<script setup>
import { CatalogueResultsView } from '@museumwnf/viewer-layout/views'
import { BackLink } from '@museumwnf/viewer-layout/content'
import { timelineGallerySpec } from '../composables/exhibitionData.js'

// The member items whose dates overlap the timeline search's country and
// period, on the platform's composed results page. Legacy asked `/items` for
// this; `timelineGallerySpec` (composables/useTimeline.js) does the same
// join client-side. Overlap, not containment: a period is a window on the
// chronology, and an object made across its edge belongs in it.
</script>

<template>
  <CatalogueResultsView :spec="timelineGallerySpec">
    <template #before>
      <BackLink />
    </template>
  </CatalogueResultsView>
</template>
