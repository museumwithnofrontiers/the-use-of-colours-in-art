<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { EssayView } from '@museumwnf/viewer-layout/views'
import { PictureGallery, PictureNarrative, SourceCredit } from '@museumwnf/viewer-layout/content'
import { useI18n } from '@museumwnf/viewer-core'
import {
  aboutTheme, owningTheme, romanFor, themeByRouteId, themeText,
} from '../composables/themes.js'
import { aboutSpec, themeNodeRoute, themeSpec } from '../composables/themeSpecs.js'
import { useThemePictures } from '../composables/useThemePictures.js'
import { tr, exhibitionTitle, exhibitionSubtitle } from '../composables/exhibitionData.js'

const { t, locale } = useI18n()

// The theme page — legacy's ThemeComponent, now an EssayView spec
// (composables/themeSpecs.js) for the shell (heading, quote/body, the
// glossary popup, the tour's previous/next), with the picture panel and
// narrative body filled by viewer-layout's own PictureGallery/
// PictureNarrative (@museumwnf/viewer-layout ^2.14.0, `content`) — see
// viewer-layout's docs/theme-components.md for the decomposition rationale
// and the `pictures` shape those components expect, which
// composables/useThemePictures.js builds. Also serves /about (About.vue),
// which renders the About theme (display order 1) with the exhibition's own
// title and sub-title in place of the theme's, and no picture apparatus:
// EssayView's `about` mode drops the whole side column unconditionally, so
// the panel PictureGallery would otherwise fill has nothing to attach to
// there, and PictureNarrative is dropped explicitly below.
//
// URL shape, kept from legacy so a legacy link still resolves:
//   /theme/:id/:subtheme?/:image?
//     :id       display_order - 1
//     :subtheme the literal `overview`, or a 1-based index into sub_themes
//     :image    the selection's display_order, which the importer sets to the
//               legacy theme_item id — so `?image=5` picks the same picture it
//               picked on the live site.
const props = defineProps({
  aboutMode: { type: Boolean, default: false },
})

const route = useRoute()
const router = useRouter()

const theme = computed(() =>
  props.aboutMode ? aboutTheme.value : themeByRouteId(route.params.id)
)

const subIndex = computed(() => {
  const raw = route.params.subtheme
  if (props.aboutMode || !raw || raw === 'overview') return null
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : null
})

const subTheme = computed(() => {
  if (subIndex.value === null) return null
  return (theme.value?.sub_themes ?? [])[subIndex.value - 1] ?? null
})

/** The node whose text and pictures the page shows: a sub-theme, or the theme. */
const node = computed(() => subTheme.value ?? theme.value)

const spec = computed(() => (props.aboutMode ? aboutSpec : themeSpec))

// The node's curated selections, already resolved into PictureGallery/
// PictureNarrative's own shape (image, name, detail, fields, related,
// backRelated, …) — see useThemePictures.js, including the whole-tree
// resolution that lets a cross-theme related link still render.
const pictures = useThemePictures(node)

// ── Selection ──────────────────────────────────────────────────────────────
//
// Kept as this page's own state rather than EssayView's `items`/`selected`:
// a curated picture is a distinct id space from the catalogue's items (its
// parent, when it has one), several pictures can share one parent with
// different crops and different curated text, and a picture whose parent was
// not exported still has to render its own image. None of that is a "record
// by id" the default panel can select among.

const selectedId = ref(null)

function defaultSelection() {
  const wanted = Number(route.params.image)
  const byOrder = pictures.value.find((p) => p.displayOrder === wanted)
  return (byOrder ?? pictures.value[0])?.id ?? null
}

function reset() {
  selectedId.value = defaultSelection()
}

onMounted(reset)
watch(() => [route.params.id, route.params.subtheme, props.aboutMode], reset)

const selected = computed(
  () => pictures.value.find((p) => p.id === selectedId.value) ?? null
)

// PictureGallery's v-model:selected-id and PictureNarrative's @select both
// hand back a bare id (never the whole picture object — a related/
// backRelated target may not even be one of this node's own selections). A
// pick that resolves within this node's own `pictures` updates the route the
// same way legacy's `?image=` did; a cross-theme related pick has no
// `display_order` in this node's own url shape to rewrite it to, so the
// route is left alone.
function onSelect(id) {
  selectedId.value = id
  if (props.aboutMode) return
  const picture = pictures.value.find((p) => p.id === id)
  if (!picture) return
  router.replace({
    name: 'theme',
    params: {
      id: route.params.id,
      subtheme: route.params.subtheme ?? 'overview',
      image: String(picture.displayOrder),
    },
  })
}

// ── Text ───────────────────────────────────────────────────────────────────
//
// The quote and the body (legacy's "presentation") are the spec's own —
// `themeSpec`/`aboutSpec` name the fields and EssayView renders them, glossary
// terms marked in place. The two-tier heading (the owning theme's title, then
// the sub-theme's or "Overview") is this page's own, in the `#header` slot.

const themeTitle = computed(
  () => themeText(theme.value, locale.value).title ?? theme.value?.internal_name ?? ''
)

const heading = computed(() =>
  props.aboutMode ? exhibitionTitle(locale.value) : themeTitle.value
)

const subHeading = computed(() => {
  if (props.aboutMode) return exhibitionSubtitle(locale.value)
  if (subTheme.value) return themeText(subTheme.value, locale.value).title ?? subTheme.value.internal_name ?? ''
  return t('exhibition.theme.overview')
})

// The numeral is always the *owning theme's* — legacy never numbered a
// sub-theme on its own page, only the theme it belongs to — and empty for the
// About theme (`romanFor(1)` is ''), so no separate about-mode branch is needed.
const roman = computed(() => romanFor(owningTheme(theme.value)?.display_order ?? 1))

// ── The narrative body ──────────────────────────────────────────────────────
//
// The selected picture's own curated text — distinct from the node's own
// "presentation" that EssayView's body already renders, and keyed the same
// way as its `imageCaption` (useThemePictures.js): `<node id>/<picture item
// id>`. PictureNarrative renders this itself (viewer-core's `renderBlock`),
// so this stays the raw Markdown string, not pre-rendered HTML.
const contextualDescription = computed(() => {
  if (!node.value?.id || !selected.value?.id) return ''
  return tr('themes', `${node.value.id}/${selected.value.id}`, locale.value).contextual_description ?? ''
})

// ── Sub-theme strip ─────────────────────────────────────────────────────────

const subThemeNav = computed(() =>
  (theme.value?.sub_themes ?? []).map((sub, index) => ({
    index: index + 1,
    title: themeText(sub, locale.value).title ?? sub.internal_name ?? '',
    to: themeNodeRoute(sub),
  }))
)

const overviewTo = computed(() => (theme.value ? themeNodeRoute(theme.value) : null))

// The forward arrow is decoration, not a translatable text — it needs saying
// only once, and this page writes it twice: the tour's own `#navigation`
// slot, and the About page's one-way link into the tour where EssayView's
// `about` mode drops that slot outright (`#after`, below).
const nextArrow = '→'
</script>

<template>
  <EssayView v-if="node" :spec="spec" :id="node.id" class="theme-page" :class="{ 'about-mode': aboutMode }">
    <template #header>
      <div class="theme-component-theme-title">
        <span v-if="roman" class="roman-label">{{ t('exhibition.theme.romanLabel') }} {{ roman }} ▪ </span>{{ heading }}
      </div>
      <div class="theme-component-title">{{ subHeading }}</div>
    </template>

    <template #panel>
      <PictureGallery :pictures="pictures" :selected-id="selectedId" @update:selected-id="onSelect" />
    </template>

    <template #after-body>
      <PictureNarrative
        v-if="!aboutMode"
        :picture="selected"
        :contextual-description="contextualDescription"
        @select="onSelect"
      />
    </template>

    <!-- Tour navigation, then the sub-theme list — legacy's order. About mode
         has neither: EssayView's `about` drops this whole block, and its
         one-way "Next: Theme I" link lives in the `after` slot below. -->
    <template #navigation="{ previous, next }">
      <div class="theme-component-navigation-next-previous-wrapper">
        <RouterLink v-if="previous" :to="themeNodeRoute(previous)" class="theme-nav previous">← {{ t('exhibition.theme.previous') }}</RouterLink>
        <span v-else></span>
        <RouterLink v-if="next" :to="themeNodeRoute(next)" class="theme-nav next">{{ t('exhibition.theme.next') }} {{ nextArrow }}</RouterLink>
      </div>

      <div class="theme-component-link-navigation-container" v-if="subThemeNav.length">
        <div class="theme-component-link-navigation-section-label">{{ t('exhibition.theme.inThisTheme') }}</div>
        <div class="theme-component-link-navigation-overview">
          <RouterLink :to="overviewTo" :class="{ bold: subIndex === null }">{{ t('exhibition.theme.overview') }}</RouterLink>
        </div>
        <div class="theme-component-link-navigation" v-for="entry in subThemeNav" :key="entry.index">
          <RouterLink :to="entry.to" :class="{ bold: subIndex === entry.index }">{{ entry.index }}. {{ entry.title }}</RouterLink>
        </div>
      </div>
    </template>

    <!-- About mode only: EssayView drops the tour nav for `about` nodes, and
         legacy's About page still points forward into the tour. Overriding
         `#after` replaces its default (`SourceCredit`), so it is rendered
         explicitly here too — every essay page carries the credit, not only
         the ones with nothing else in this slot. -->
    <template #after="{ next }">
      <div class="theme-component-navigation-next-previous-wrapper" v-if="aboutMode && next">
        <span></span>
        <RouterLink :to="themeNodeRoute(next)" class="theme-nav next">{{ t('exhibition.theme.next') }} {{ nextArrow }}</RouterLink>
      </div>
      <SourceCredit />
    </template>
  </EssayView>

  <div class="mwnf-loader" v-else>{{ t('exhibition.theme.notInExhibition') }}</div>
</template>

<style scoped>
/* `class="theme-page"` lands on EssayView's own root element (Vue passes a
   parent's class through to a child's root), which is why this rule needs no
   `:deep()` — everything after it styles our own slot content, which keeps
   this file's scope wherever EssayView renders it, through `:deep()` only
   because it sits below that root rather than being it. */
.theme-page { background: var(--secondary-color); }

/* ── Heading ──────────────────────────────────────────────────────────────── */
.theme-page :deep(.theme-component-theme-title) {
  background: var(--contrast-color);
  color: var(--contrast-text-color);
  font-size: 22px;
  font-weight: 700;
  padding: 8px 12px;
}
.theme-page :deep(.theme-component-title) { font-size: 18px; font-weight: 700; padding: 12px 0 4px; }

/* ── Tour + sub-theme navigation ─────────────────────────────────────────── */
.theme-page :deep(.theme-component-navigation-next-previous-wrapper) {
  display: flex;
  justify-content: space-between;
  padding: 25px 0 10px;
  font-weight: 700;
}
.theme-page :deep(.theme-nav) { color: var(--secondary-text-color); text-decoration: none; }
.theme-page :deep(.theme-nav:hover) { background: var(--contrast-color); }

.theme-page :deep(.theme-component-link-navigation-container) { padding-top: 15px; }
.theme-page :deep(.theme-component-link-navigation-section-label) { font-weight: 700; }
.theme-page :deep(.theme-component-link-navigation-overview a),
.theme-page :deep(.theme-component-link-navigation a) { color: var(--secondary-text-color); text-decoration: none; }
.theme-page :deep(.theme-component-link-navigation-overview a:hover),
.theme-page :deep(.theme-component-link-navigation a:hover) { background: var(--contrast-color); }
.theme-page :deep(.bold) { font-weight: 700; }
</style>
