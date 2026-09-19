<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { NotFoundView, useI18n, useProjects, useSiteConfig } from '@museumwnf/viewer-core'
import {
  BackLink, DynastyList, GlossaryTool, RecordLanguages, RelatedRecords, SheetSection,
} from '@museumwnf/viewer-layout/content'
import { RecordView } from '@museumwnf/viewer-layout/views'
import {
  labelOf, partnerById, partnerRoute, dynastyById, translations, defaultLang, md, itemById,
  isHiddenPartner, isExploreRecord,
} from '../composables/useExhibitionData.js'
import { findEvents, eraLabel, roundOutward, timelineCountries, countryIdForCode, hasTimeline } from '../composables/useTimeline.js'
import { itemSheet } from '../composables/sheet.js'
import { noticeProjects, projectColors } from '../dataset.config.js'

// The item sheet is the platform's composed record page, rendering the spec
// in composables/sheet.js: the record's language and loads, the glossary
// terms and the click on one, the rows, the gallery, the credits, the
// citation and the related records are the view's. What this page owns
// fills the view's slots — the blocks only an exhibition has: the source
// database name and colour, the portal links, the timeline tool behind the
// `hasTimeline` gate, the cross-references to sibling sites, and the print
// action. The glossary tool and the dynasty popouts are the layout's own
// content components (GlossaryTool, DynastyList) — this page just feeds
// them the language and, for dynasties, the raw records legacy's own rule
// (no popout for one with no history text) has already filtered.
//
// A per-language build ships every member's `languages` array but not every
// member's text in this language (`itemById`'s own rule, in
// useExhibitionData.js), and RecordView resolves its record from the whole
// package regardless of language. The gate below reproduces legacy's 404 for
// an id this build cannot render, which RecordView on its own does not.

const props = defineProps({ id: { type: String, required: true } })

const { t } = useI18n()
const { links } = useSiteConfig()
// Epic #1727 phase 4: the source project's name and its "related database" /
// Artistic Introduction links come from the data package's own
// `manifest.projects` entry (viewer-core's `useProjects()`), keyed by this
// record's `project_id` — not from a hardcoded set of legacy project keys.
const { label: sourceLabel, links: projectLinks } = useProjects()

const item = computed(() => itemById.value.get(props.id) ?? null)
const era = (year) => eraLabel(year, t)

// The Explore-partner notice has no manifest field of its own — which
// projects still get it is this exhibition's own editorial choice
// (`dataset.config.js`'s `noticeProjects`, one list shared verbatim with the
// sibling water-in-islam).
const showEiacNotice = (record) => noticeProjects.includes(record.project_id)

// This item's chip colour: `dataset.config.js`'s `projectColors`, a static
// map from project UUID to one of this site's own `mwnf-chip--<name>`
// classes (`src/styles/site.css` — not viewer-layout's shared, legacy-key-
// named family classes, which this exhibition no longer uses), or the
// `explore` class for a record with no project at all (`isExploreRecord`,
// useExhibitionData.js).
const chipFamily = (record) => projectColors[record.project_id] ?? (isExploreRecord(record) ? 'explore' : null)
// `related_items` references from the exporter carry only the legacy
// project_key, not project_id yet (TODO(#1727): platform gap, reported on
// the epic — the exporter's related_items entries need project_id too), so a
// reference outside this exhibition can resolve the `explore` case only.
const referenceFamily = (ref) => (isExploreRecord(ref) ? 'explore' : null)

// ── Related content ───────────────────────────────────────────────────────
//
// Decision Q3: none of these become a constructed URL. A related item the
// package holds opens locally (the view's rows); one it does not is shown
// as the reference it is; a sibling site is linked only where the import
// carried a host.
//
// `records`/`outside` come from the view's own `useRelatedRecords`, which
// resolves against the whole package, not this build's language subset — the
// same gap the results page closes with `scope`. A related item outside the
// subset is moved into the reference list rather than opened, and its own
// reference entry (project key, backward_compatibility) is recovered from
// the record's raw `related_items`, because the view's tile shape does not
// carry them.
const byName = (a, b) => (a.name ?? '').localeCompare(b.name ?? '')
const galleryRefs = (record) => (record.gallery_references ?? []).filter((g) => g.kind === 'gallery').sort(byName)
// Legacy suppressed every exhibition link whose host was
// exhibitions.museumwnf.org; decision Q3 says outbound links are not
// dropped, so they are shown here.
const exhibitionRefs = (record) => (record.gallery_references ?? []).filter((g) => g.kind === 'exhibition').sort(byName)

function relatedRows(records) {
  return records.filter((r) => itemById.value.has(r.id))
}
function relatedOutsideRefs(records, outside, record) {
  const missing = records
    .filter((r) => !itemById.value.has(r.id))
    .map((r) => (record.related_items ?? []).find((ref) => ref.id === r.id))
    .filter(Boolean)
  return [...outside, ...missing]
}

// Popout: the timeline only — the glossary tool and the dynasty popouts
// below are the layout's own native `<details>` toggles.
const openPopup = ref(null)
function togglePopup(which) {
  openPopup.value = openPopup.value === which ? null : which
}

// DynastyList wants the raw dynasty records and a `tr` function of its own,
// not a pre-merged object — `tr` is called once per dynasty, so it closes
// over `language` rather than taking it as an argument.
function dynastyTr(dynasty, language) {
  return translations('dynasties', language)[dynasty.id] ?? translations('dynasties', defaultLang)[dynasty.id] ?? {}
}
function dynastiesWithHistory(record, language) {
  return (record.dynasty_ids ?? [])
    .map((id) => dynastyById.value.get(id))
    .filter((d) => d && dynastyTr(d, language).history)
}

const timelineCountry = ref('all')
watch(item, (it) => { timelineCountry.value = it ? (countryCodeOf(it.country_id) ?? 'all') : 'all' }, { immediate: true })
function countryCodeOf(countryId) {
  for (const [code] of timelineCountries.value) {
    if (countryIdForCode(code) === countryId) return code
  }
  return null
}
const itemRange = computed(() => roundOutward(item.value?.start_date, item.value?.end_date))
const itemEvents = computed(() => {
  const [from, to] = itemRange.value
  if (from == null) return []
  return findEvents({ countryCode: timelineCountry.value, start: from, end: to })
})

// Legacy's "As PDF (including images)" was the browser's own print dialog.
function printSheet() {
  window.print()
}
</script>

<template>
  <RecordView v-if="itemById.has(id)" :spec="itemSheet" :id="id" class="database-page">
    <!-- No title over the sheet: the name is its first row, as legacy's was. -->
    <template #header="{ languages, language, select }">
      <div class="languages">
        <RecordLanguages :languages="languages" :language="language" @select="select" />
      </div>
      <BackLink />
    </template>

    <template #before-sheet="{ record, languages }">
      <div class="links-container">
        <!-- Decision Q3: legacy's `remote-object` URL came from a
             hand-maintained table with no counterpart in the new model, so
             the source is named, not linked. The chip is a colour swatch only
             now (its own name is announced right next to it below, so a
             second copy of the same text inside it would be redundant) — the
             source line is dropped when the manifest has no project name to
             print. -->
        <p class="source-reference" v-if="chipFamily(record)">
          <span class="mwnf-chip" :class="`mwnf-chip--${chipFamily(record)}`" aria-hidden="true"></span>
          <template v-if="sourceLabel(record.project_id)">{{ t('record.sheet.sourceDatabase') }}: {{ sourceLabel(record.project_id) }}</template>
        </p>
        <p class="source-uid"><code>{{ record.backward_compatibility }}</code></p>
        <p class="add-collection-link">
          <a :href="links.myCollection" target="_blank" rel="noopener">↗ {{ t('record.action.addToCollection') }}</a>
        </p>
      </div>
      <div class="info-eiac" v-if="showEiacNotice(record)">
        {{ t('exhibition.item.explorePartnerNote') }} <strong><em>{{ languages.map((l) => l.label).join(', ') }}</em></strong>
      </div>
    </template>

    <!-- E6: a hidden museum keeps its name on the sheet and loses the link,
         because it has no page to link to. -->
    <template #museum="{ record }">
      <RouterLink v-if="!isHiddenPartner(partnerById.get(record.partner_id))" :to="partnerRoute(partnerById.get(record.partner_id))">{{ labelOf('partners', record.partner_id) }}</RouterLink>
      <span v-else>{{ labelOf('partners', record.partner_id) }}</span>
    </template>

    <template #related="{ record, language, records, outside, dir }">
      <div class="related-content-container">
        <p class="related-header related-header--caps">{{ $t('exhibition.related.title') }}</p>
        <p class="related-description">{{ t('exhibition.related.description') }}</p>

        <RelatedRecords :heading="t('exhibition.related.objects')" :records="relatedRows(records)" variant="grid" :action-label="t('exhibition.action.seeDatabaseEntry')">
          <!-- Related items this exhibition does not ship: the reference it is, awaiting a resolver. -->
          <ul v-if="relatedOutsideRefs(records, outside, record).length" class="reference-list">
            <li v-for="r in relatedOutsideRefs(records, outside, record)" :key="r.id">
              <span class="mwnf-chip" :class="referenceFamily(r) ? `mwnf-chip--${referenceFamily(r)}` : null">{{ r.project_key }}</span>
              <code>{{ r.backward_compatibility }}</code>
              <span class="unresolved-note">{{ $t('exhibition.results.notInThisExhibition') }}</span>
            </li>
          </ul>
        </RelatedRecords>

        <!-- Artistic Introduction — an Islamic Art site feature legacy linked
             from a Discover Islamic Art / Explore Islamic Art Collections
             sheet, now the manifest's own URL for this record's project,
             rendered iff it has one. -->
        <div class="artistic-introduction" v-if="projectLinks(record.project_id)?.artisticIntroductionUrl">
          <p class="related-line">
            <a :href="projectLinks(record.project_id).artisticIntroductionUrl" target="_blank" rel="noopener">↗ {{ t('exhibition.nav.artisticIntroduction') }}</a>
          </p>
        </div>

        <!-- Timeline for this item. Withheld entirely when the exhibition
             reports no chronology: legacy prints no "timeline" anywhere on
             the sheet in that case, not merely a nav entry short. -->
        <div v-if="hasTimeline && (itemEvents.length || itemRange[0] != null)">
          <p class="related-line clickable" @click="togglePopup('timeline')">➤ {{ t('record.related.timelineForItem') }}</p>
          <div class="popout" v-if="openPopup === 'timeline'" dir="ltr">
            <div class="popout-close" @click="openPopup = null">✕</div>
            <div class="popout-title">{{ $t('exhibition.section.timeline') }}</div>
            <div class="popout-option">
              <label>{{ $t('timeline.form.searchIntro') }}</label>
              <select v-model="timelineCountry">
                <option v-for="c in timelineCountries" :key="c[0]" :value="c[0]">{{ c[1] }}</option>
              </select>
              <RouterLink
                class="popout-full-link"
                :to="{ name: 'timeline-results', query: { c: timelineCountry, start: itemRange[0], end: itemRange[1] } }"
              >➤ {{ $t('timeline.action.beginFullSearch') }}</RouterLink>
            </div>
            <div class="popout-scroll">
              <div class="popout-subheader">
                {{ timelineCountries.find(c => c[0] === timelineCountry)?.[1] }},
                {{ era(itemRange[0]) }} – {{ era(itemRange[1]) }}
              </div>
              <div v-if="!itemEvents.length" class="popout-empty">{{ $t('timeline.results.noEvents') }}</div>
              <div class="timeline-event" v-for="event in itemEvents" :key="event.id">
                <div class="timeline-date">{{ era(event.year_from) }}</div>
                <div v-html="md(event.text.description)"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Glossary tool -->
        <GlossaryTool :language="language" :dir="dir" />

        <!-- Dynasties -->
        <DynastyList
          :heading="t('record.dynasty.list')"
          :dynasties="dynastiesWithHistory(record, language)"
          :tr="(d) => dynastyTr(d, language)"
          :dir="dir"
        />

        <!-- Audio / video -->
        <SheetSection v-if="record.media?.length" :heading="t('record.related.audioVideo')">
          <p class="related-line" v-for="file in record.media" :key="file.url">
            <a :href="file.url" target="_blank" rel="noopener">↗ {{ file.title ?? file.url }}</a>
          </p>
        </SheetSection>

        <!-- On display in -->
        <div v-if="galleryRefs(record).length || exhibitionRefs(record).length">
          <p class="related-header">{{ t('record.related.onDisplayIn') }}</p>
          <div v-if="exhibitionRefs(record).length">
            <p class="related-sub">{{ t('record.related.exhibitions') }}</p>
            <p class="related-line" v-for="ref in exhibitionRefs(record)" :key="ref.id">
              <a v-if="ref.legacy_host" :href="ref.legacy_host" target="_blank" rel="noopener">↗ {{ ref.name }}</a>
              <span v-else>{{ ref.name }} <span class="unresolved-note">{{ $t('exhibition.item.linkPending') }}</span></span>
            </p>
          </div>
          <div v-if="galleryRefs(record).length">
            <p class="related-sub">{{ t('record.related.galleries') }}</p>
            <p class="related-line" v-for="ref in galleryRefs(record)" :key="ref.id">
              <a v-if="ref.legacy_host" :href="ref.legacy_host" target="_blank" rel="noopener">↗ {{ ref.name }}</a>
              <span v-else>{{ ref.name }} <span class="unresolved-note">{{ $t('exhibition.item.linkPending') }}</span></span>
            </p>
          </div>
        </div>

        <!-- Search related database: the gate is on the block, as legacy's
             was — now the manifest's own related-database URL for this
             record's project (a null URL, e.g. DCA's, means no link, exactly
             as an absent legacy key used to), and the link's label is the
             same project name the citation above prints. -->
        <div class="related-database" v-if="projectLinks(record.project_id)?.relatedDatabaseUrl">
          <p class="related-header">{{ t('exhibition.search.relatedDatabase') }}</p>
          <p class="related-line">
            <a :href="projectLinks(record.project_id).relatedDatabaseUrl" target="_blank" rel="noopener">↗ {{ sourceLabel(record.project_id) }}</a>
          </p>
        </div>

        <!-- The portal search sits outside that gate in legacy too. -->
        <div>
          <p class="related-header">{{ t('exhibition.search.overallDatabase') }}</p>
          <p class="related-line">
            <a :href="links.overallDatabase" target="_blank" rel="noopener">↗ {{ t('exhibition.nav.overallDatabase') }}</a>
          </p>
        </div>

        <div>
          <p class="related-header">{{ t('record.action.download') }}</p>
          <p class="related-line clickable" @click="printSheet()">➤ {{ t('record.action.downloadPdf') }}</p>
        </div>
      </div>
    </template>
  </RecordView>
  <NotFoundView v-else />
</template>

<style scoped>
.database-page { background: #fff; width: 100%; min-height: 400px; }

.languages { background: var(--rule-grey); padding: 6px 20px; }

/* Legacy's two columns — the photos on the left, the sheet on the right, the
   related content under both — over the view's single main column: the
   gallery takes the first column, everything else the second, and the
   related block spans the two. */
.database-page :deep(.mwnf-record__body) { padding: 0 20px 30px; }
.database-page :deep(.mwnf-record__main) {
  display: grid;
  grid-template-columns: 42% minmax(0, 1fr);
  column-gap: 26px;
  align-items: start;
}
.database-page :deep(.mwnf-record__main > *) { grid-column: 2; }
.database-page :deep(.mwnf-record__main > .mwnf-media) { grid-column: 1; grid-row: 1 / span 12; }
.database-page :deep(.mwnf-record__main > .related-content-container) { grid-column: 1 / -1; }

.links-container { padding-top: 14px; font-size: 14px; }
.links-container p { margin-bottom: 6px; }
.source-uid code { font-size: 12px; color: #666; word-break: break-all; }
.add-collection-link a { color: var(--link-blue); }

.info-eiac {
  background: var(--rule-grey);
  padding: 10px 12px;
  margin-bottom: 14px;
  font-size: 13px;
}
.database-page :deep(.mwnf-sheet__value a) { color: var(--link-blue); }

.related-content-container { margin-top: 30px; border-top: 3px solid var(--contrast-color); padding-top: 16px; }
.related-header {
  font-weight: 700;
  color: var(--main-color);
  font-size: 16px;
  margin-top: 18px;
  border-bottom: 1px solid var(--rule-grey);
}
.related-header--caps { text-transform: uppercase; }
.related-sub { font-weight: 700; margin-top: 12px; }
.related-description { font-size: 13px; color: #555; margin-top: 6px; }
.related-line { margin-top: 6px; }
.related-line a { color: var(--link-blue); }
.related-line.clickable { color: var(--main-color); cursor: pointer; }
.related-line.clickable:hover { text-decoration: underline; }

.reference-list { list-style: none; margin-top: 6px; }
.reference-list li { padding: 3px 0; font-size: 13px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.reference-list code { color: #555; }
.unresolved-note { color: #8a8a8a; font-style: italic; font-size: 12px; }

.popout {
  position: relative;
  background: #fff;
  border: 2px solid var(--contrast-color);
  margin: 8px 0 14px;
  max-width: 640px;
}
.popout-close {
  position: absolute;
  top: 4px;
  inset-inline-end: 8px;
  cursor: pointer;
  color: #fff;
  font-size: 16px;
  z-index: 2;
}
.popout-title { background: var(--main-color); color: var(--main-text-color); padding: 6px 12px; font-weight: 700; }
.popout-option { padding: 8px 12px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 13px; }
.popout-option select { font-family: inherit; padding: 3px; }
.popout-full-link { color: var(--link-blue); }
.popout-scroll { max-height: 320px; overflow: auto; padding: 10px 12px; font-size: 14px; }
.popout-subheader { font-weight: 700; margin-bottom: 8px; }
.popout-empty { color: #777; font-style: italic; }
.timeline-event { display: flex; gap: 10px; padding: 5px 0; border-bottom: 1px solid #eee; }
.timeline-date { flex: 0 0 90px; font-weight: 700; }

@media only screen and (max-width: 849px) {
  .database-page :deep(.mwnf-record__main) { display: block; }
}
</style>
