<script setup>
import { computed } from 'vue'
import { I18nText } from '@museumwnf/viewer-core'
import { TimelineResultsView } from '@museumwnf/viewer-layout/views'
import { timelineSpec } from '../composables/exhibitionData.js'

// Timeline entry form, on the platform's composed timeline view: what is
// this exhibition's own — the local/country scope, the suppressed country
// control, the legacy country-code table — is `timelineSpec`, in
// composables/useTimeline.js; `entrance: true` is this page's own instance
// of that spec, so the view renders the form alone and validates before
// navigating to the results.
//
// Both chronology flags being false also means the nav offers no Timeline and
// nothing on the site links here (see `hasTimeline`), yet the page stays
// reachable by URL because legacy keeps it reachable — typing /timeline on the
// live instance still renders this form and its introduction. So this page
// must render sensibly for a visitor who arrives with no link.
//
// The introduction is a shared entry: the only thing that made the old
// `txtTimeline` this exhibition's own was an absolute URL to its Themes page —
// and that URL pointed at a staging host. It is `#/themes` now.
const spec = computed(() => ({ ...timelineSpec.value, entrance: true }))
</script>

<template>
  <TimelineResultsView :spec="spec">
    <template #after>
      <I18nText id="timeline-description" class="mwnf-prose" dir="auto" keypath="exhibition.timeline.intro" />
    </template>
  </TimelineResultsView>
</template>

<style scoped>
#timeline-description { padding: 20px 30px 40px; line-height: 1.55; }
#timeline-description :deep(a) { color: var(--link-blue); }
</style>
