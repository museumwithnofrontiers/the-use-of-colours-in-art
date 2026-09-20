<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { EssayView } from '@museumwnf/viewer-layout/views'
import { SourceCredit } from '@museumwnf/viewer-layout/content'
import { useI18n } from '@museumwnf/viewer-core'
import {
  aboutTheme, owningTheme, romanFor, themeByRouteId, themePictures, themeText,
} from '../composables/themes.js'
import { aboutSpec, themeNodeRoute, themeSpec } from '../composables/themeSpecs.js'
import { pictureParent, itemDetailString } from '../composables/useThemePresentation.js'
import {
  itemRoute, labelOf, tr, defaultLang, md, mdInline, exhibitionTitle, exhibitionSubtitle,
} from '../composables/exhibitionData.js'

const { t, locale } = useI18n()

// The theme page — legacy's ThemeComponent, now an EssayView spec
// (composables/themeSpecs.js) for the shell (heading, quote/body, the
// glossary popup, the tour's previous/next), with this family's own
// picture→parent indirection and its related-works toggle built directly in
// the `panel`/`thumbnails`/`after-body` slots — see themeSpecs.js for why
// they cannot be the default `items` machinery. Also serves /about (About.vue),
// which renders the About theme (display order 1) with the exhibition's own
// title and sub-title in place of the theme's, and no picture apparatus:
// EssayView's `about` mode drops the whole side column unconditionally, so
// the selection strip and panel this file otherwise renders have nothing to
// attach to there.
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

const pictures = computed(() => themePictures(node.value))

// ── Related works ──────────────────────────────────────────────────────────
//
// `related` hangs off the source picture and names its target. Legacy derived
// two directions from the same table: a source shows its targets under "Related
// items", and a target shows the source it belongs to with the reciprocal text.
// A target is hidden from the thumbnail strip until "Add Related Works" is on,
// which is what keeps the strip to the curator's primary selection.
const relatedTo = computed(() => {
  const map = new Map()
  const inNode = new Set(pictures.value.map(p => p.picture_item_id))
  for (const source of pictures.value) {
    for (const link of source.related ?? []) {
      if (!inNode.has(link.picture_item_id)) continue
      map.set(link.picture_item_id, { source, link })
    }
  }
  return map
})

const hasRelated = computed(() => relatedTo.value.size > 0)

const showAll = ref(false)

const strip = computed(() =>
  showAll.value
    ? pictures.value
    : pictures.value.filter(p => !relatedTo.value.has(p.picture_item_id))
)

// ── Selection ──────────────────────────────────────────────────────────────
//
// Kept as this page's own state rather than EssayView's `items`/`selected`:
// a curated picture is a distinct id space from the catalogue's items (its
// parent, when it has one — see `pictureParent`), several pictures can share
// one parent with different crops and different curated text, and a picture
// whose parent was not exported still has to render its own image. None of
// that is a "record by id" the default panel can select among.

const selectedId = ref(null)

function defaultSelection() {
  const wanted = Number(route.params.image)
  const byOrder = pictures.value.find(p => p.display_order === wanted)
  return (byOrder ?? pictures.value[0])?.picture_item_id ?? null
}

function reset() {
  showAll.value = false
  selectedId.value = defaultSelection()
}

onMounted(reset)
watch(() => [route.params.id, route.params.subtheme, props.aboutMode], reset)

const selected = computed(
  () => pictures.value.find(p => p.picture_item_id === selectedId.value) ?? null
)

function select(picture) {
  selectedId.value = picture.picture_item_id
  if (!props.aboutMode) {
    router.replace({
      name: 'theme',
      params: {
        id: route.params.id,
        subtheme: route.params.subtheme ?? 'overview',
        image: String(picture.display_order),
      },
    })
  }
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

// ── The picture being shown ────────────────────────────────────────────────

function captionFor(picture) {
  const parent = pictureParent(picture)
  const text = pictureTextFor(picture)
  return {
    imageCaption: text.image_caption ?? '',
    name: parent ? labelOf('items', parent.id) : '',
    detail: itemDetailString(parent),
    parent,
  }
}

// Picture-specific curated text is keyed `<node id>/<picture item id>` — see
// composables/themes.js. Read directly here (rather than through the spec)
// because it varies with which picture is selected, not with the node.
function pictureTextFor(picture) {
  if (!node.value?.id || !picture?.picture_item_id) return {}
  return tr('themes', `${node.value.id}/${picture.picture_item_id}`, locale.value)
}

const selectedCaption = computed(() => (selected.value ? captionFor(selected.value) : null))

const selectedSheet = computed(() => {
  const parent = selectedCaption.value?.parent
  return parent ? tr('items', parent.id, defaultLang) : {}
})

const contextualHtml = computed(() => {
  const value = selected.value ? pictureTextFor(selected.value).contextual_description : ''
  return value ? md(value) : ''
})

/** The related targets of the selected picture, if it is a source. */
const selectedTargets = computed(() => {
  const own = selected.value?.related ?? []
  const byId = new Map(pictures.value.map(p => [p.picture_item_id, p]))
  return own
    .map(link => ({ link, picture: byId.get(link.picture_item_id) }))
    .filter(entry => entry.picture)
})

/** The source of the selected picture, if it is itself a related target. */
const selectedSource = computed(() => relatedTo.value.get(selectedId.value) ?? null)

function relationText(link) {
  return link?.descriptions?.[locale.value] ?? link?.descriptions?.en ?? ''
}

function reciprocalText(link) {
  return link?.reciprocal_descriptions?.[locale.value] ?? link?.reciprocal_descriptions?.en ?? ''
}

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

    <template #after-body>
      <template v-if="!aboutMode">
        <div class="theme-component-selected-justification mwnf-prose" v-if="contextualHtml" v-html="contextualHtml"></div>

        <!-- Related items: the selected picture as a source -->
        <div class="related-items-container" v-if="selectedTargets.length">
          <div class="related-items-header">{{ t('exhibition.related.items') }}</div>
          <div class="related-items-images-container">
            <div class="related-items-image main-image">
              <img :src="selected.image_url" :alt="selectedCaption.name" />
              <div class="thumbnail-text">
                <span class="italic" v-html="mdInline(selectedCaption.name)"></span>
                <span v-if="selectedCaption.detail">, {{ selectedCaption.detail }}</span>
              </div>
            </div>
            <div
              v-for="entry in selectedTargets"
              :key="entry.picture.picture_item_id"
              class="related-items-image"
            >
              <img
                :src="entry.picture.image_url"
                :alt="captionFor(entry.picture).name"
                @click="select(entry.picture)"
              />
              <div class="thumbnail-text">
                <span class="italic" v-html="mdInline(captionFor(entry.picture).name)"></span>
                <span v-if="captionFor(entry.picture).detail">, {{ captionFor(entry.picture).detail }}</span>
              </div>
              <div class="related-relation" v-if="relationText(entry.link)">{{ relationText(entry.link) }}</div>
            </div>
          </div>
        </div>

        <!-- Related to: the selected picture as a target -->
        <div class="related-to-container" v-if="selectedSource">
          <div class="related-to-header">{{ t('exhibition.related.items') }}</div>
          <div class="theme-component-selected-justification reciprocal-description">
            {{ reciprocalText(selectedSource.link) || t('exhibition.related.reciprocal') }}
          </div>
          <div class="related-to-image">
            <img
              :src="selectedSource.source.image_url"
              :alt="captionFor(selectedSource.source).name"
              @click="select(selectedSource.source)"
            />
            <div class="thumbnail-text">
              <span class="italic" v-html="mdInline(captionFor(selectedSource.source).name)"></span>
              <span v-if="captionFor(selectedSource.source).detail">, {{ captionFor(selectedSource.source).detail }}</span>
            </div>
          </div>
        </div>
      </template>
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

    <template #panel v-if="!aboutMode">
      <!-- Selected picture -->
      <div class="theme-component-selected-container" v-if="selected">
        <div class="theme-component-selected-image">
          <img :src="selected.image_url" :alt="selectedCaption.name" />
        </div>
        <div class="theme-component-selected-details-wrapper">
          <div class="theme-component-selected-detail title">
            <span v-if="selectedCaption.imageCaption">{{ selectedCaption.imageCaption }}, </span>
            <span v-html="mdInline(selectedCaption.name)"></span>
          </div>
          <div class="theme-component-selected-detail" v-if="selectedSheet.alternate_name">
            {{ t('sheet.field.alsoKnownAs') }}: <span v-html="mdInline(selectedSheet.alternate_name)"></span>
          </div>
          <div class="theme-component-selected-detail" v-if="selectedCaption.parent?.artist_names?.length">
            {{ selectedCaption.parent.artist_names.join(', ') }}
          </div>
          <div class="theme-component-selected-detail" v-if="selectedSheet.dates">{{ selectedSheet.dates }}</div>
          <div class="theme-component-selected-detail" v-if="selectedCaption.detail">{{ selectedCaption.detail }}</div>
          <RouterLink
            v-if="selectedCaption.parent"
            class="theme-component-selected-detail database-entry-link"
            :to="itemRoute(selectedCaption.parent)"
          >{{ t('exhibition.theme.seeItemEntry') }}</RouterLink>
          <!-- A picture whose parent is not a member of this exhibition says
               so rather than linking nowhere. -->
          <div class="theme-component-selected-detail unresolved" v-else>
            {{ t('exhibition.theme.recordNotInSite') }}
          </div>
        </div>
      </div>
      <div v-else class="theme-component-no-images">{{ t('exhibition.theme.additionalContent') }}</div>
    </template>

    <template #thumbnails v-if="!aboutMode">
      <div class="theme-component-images-wrapper">
        <div class="theme-component-images" v-if="strip.length">
          <div
            v-for="picture in strip"
            :key="picture.picture_item_id"
            class="theme-component-image"
            :class="{
              border: picture.picture_item_id === selectedId,
              'related-overlay': relatedTo.has(picture.picture_item_id),
            }"
          >
            <img
              :src="picture.image_url"
              :alt="captionFor(picture).name"
              loading="lazy"
              @click="select(picture)"
            />
            <div class="thumbnail-text">
              <span v-if="captionFor(picture).imageCaption">{{ captionFor(picture).imageCaption }}, </span>
              <span class="italic" v-html="mdInline(captionFor(picture).name)"></span>
              <span v-if="captionFor(picture).detail">, {{ captionFor(picture).detail }}</span>
            </div>
          </div>
        </div>

        <div class="thumbnails-section-controls" v-if="hasRelated">
          <label class="toggle">
            <input type="checkbox" v-model="showAll" />
            <!-- Two whole sentences rather than a word swapped inside one: a
                 translator has to be able to move every part of a text. -->
            <span>{{ showAll ? t('exhibition.theme.hideRelatedWorks') : t('exhibition.theme.addRelatedWorks') }}</span>
          </label>
        </div>
      </div>
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

/* ── Thumbnail strip ─────────────────────────────────────────────────────── */
.theme-page :deep(.theme-component-images-wrapper) { width: 100%; padding: 0 0 12px; }
.theme-page :deep(.theme-component-images) {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 8px;
}
.theme-page :deep(.theme-component-image) { position: relative; flex: 0 0 auto; width: 130px; }
.theme-page :deep(.theme-component-image img) {
  width: 130px;
  height: 130px;
  object-fit: cover;
  cursor: pointer;
  display: block;
}
.theme-page :deep(.theme-component-image.border img) { outline: 4px solid var(--contrast-color); outline-offset: -4px; }
.theme-page :deep(.theme-component-image.related-overlay img) { opacity: 0.75; }
.theme-page :deep(.thumbnail-text) {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 5;
  width: 260px;
  padding: 8px;
  font-size: 13px;
  background: var(--main-color);
  color: var(--main-text-color);
}
.theme-page :deep(.theme-component-image:hover .thumbnail-text),
.theme-page :deep(.related-items-image:hover .thumbnail-text),
.theme-page :deep(.related-to-image:hover .thumbnail-text) { display: block; }
.theme-page :deep(.italic) { font-style: italic; }

.theme-page :deep(.thumbnails-section-controls) { padding: 8px 0 0; }
.theme-page :deep(.toggle) { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }

/* ── Selected picture panel ──────────────────────────────────────────────── */
.theme-page :deep(.theme-component-selected-image img) { width: 100%; object-fit: contain; max-height: 420px; }
.theme-page :deep(.theme-component-selected-details-wrapper) { padding-top: 12px; font-size: 15px; line-height: 1.45; }
.theme-page :deep(.theme-component-selected-detail.title) { font-weight: 700; }
.theme-page :deep(.database-entry-link) { display: inline-block; margin-top: 10px; color: var(--link-blue); }
.theme-page :deep(.unresolved) { margin-top: 10px; font-style: italic; color: var(--shadow-grey); }
.theme-page :deep(.theme-component-no-images) { padding: 40px 0; font-style: italic; }

/* ── Body extras ──────────────────────────────────────────────────────────── */
.theme-page :deep(.theme-component-selected-justification) { padding: 8px 0; line-height: 1.6; }
.theme-page :deep(.related-items-container),
.theme-page :deep(.related-to-container) { padding-top: 20px; }
.theme-page :deep(.related-items-header),
.theme-page :deep(.related-to-header) { font-weight: 700; margin-bottom: 8px; }
.theme-page :deep(.related-items-images-container) { display: flex; flex-wrap: wrap; gap: 14px; }
.theme-page :deep(.related-items-image),
.theme-page :deep(.related-to-image) { position: relative; width: 130px; }
.theme-page :deep(.related-items-image img),
.theme-page :deep(.related-to-image img) {
  width: 130px; height: 130px; object-fit: cover; cursor: pointer; display: block;
}
.theme-page :deep(.related-items-image.main-image img) { outline: 4px solid var(--main-color); outline-offset: -4px; cursor: default; }
.theme-page :deep(.related-relation) { font-size: 12px; padding-top: 4px; }
.theme-page :deep(.reciprocal-description) { font-style: italic; }

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

@media only screen and (max-width: 974px) {
  .theme-page :deep(.thumbnail-text) { display: none !important; }
}
</style>
