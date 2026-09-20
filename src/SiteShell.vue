<script setup>
// The site's page chrome: viewer-layout's own `SiteShell`, mounted
// from `dataset.config.js`'s `navigation`, `logos` and `banner` declarations
// (its README, "Site shell") instead of a shell that builds the menu, the
// link lists, the search submit and the logo buckets by hand.
//
// What stays here is what only a loaded record — not the route or the
// config — can answer: the banner's image and caption (an exhibition-specific
// `banner-image`/`banner-caption`, the shell README's own example of what a
// config leaves to the caller), the home page's title/subtitle/headline/enter/
// strapline (the same reason, `isHome`-gated), the exhibition's logo list
// reshaped into the `{ image, alt, href, category_id, visible, display_order }`
// shape `config.logos.header`/`.sponsorGroups` bucket by, the MWNF mark
// (`#brand`), and the dismissible popup notice, which is this exhibition's own.
import { computed } from 'vue'
import { useI18n, useSection, useSiteConfig } from '@museumwnf/viewer-core'
import { SiteShell } from '@museumwnf/viewer-layout/components'
import { PopupLogo } from '@museumwnf/viewer-layout/content'
import {
  exhibition, chromeImage, itemById, labelOf, md, tr, defaultLang,
  exhibitionTitle, exhibitionSubtitle, exhibitionHeadline, bannerCaption,
} from './composables/exhibitionData.js'

// `language`, `languages` and `update:language` are the shell contract of
// viewer-core: the language the application is in, the languages it offers
// (labelled, from dataset.config.js) and the event that sets it.
const props = defineProps({
  language: { type: String, default: 'en' },
  languages: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:language'])

const { t, locale } = useI18n()
const { links } = useSiteConfig()

// The section a route declares (`meta.section` in dataset.config.js): the
// banner title (over `config.navigation.sectionTitles`, on every page but
// this one) and the active menu entry (`config.navigation.links`) both read
// it, inside the layout's own `SiteShell` now.
const section = useSection()
const isHome = computed(() => section.value === 'home')
const currentYear = new Date().getFullYear()

// The banner: the exhibition's own image, captioned with the curator's own
// line where there is one and with the banner item's sheet where there is not.
const bannerImage = computed(() => chromeImage(exhibition.value?.banner_image_path, 'hi_res'))
const banner = computed(() => {
  const curated = bannerCaption(locale.value)
  if (curated) return curated
  const item = itemById.value.get(exhibition.value?.banner_item_id)
  if (!item) return ''
  const sheet = tr('items', item.id, defaultLang)
  return {
    name: labelOf('items', item.id),
    partner: labelOf('partners', item.partner_id),
    location: sheet.location ?? '',
    country: labelOf('countries', item.country_id),
  }
})

// Legacy's BottomBanner: the exhibition's identity on the left, and the two
// ways into it on the right. It sits under every page, including Home. Not a
// `config.navigation` link list — it is `AppHyperlinks`' own prop, passed
// straight through the layout's `SiteShell` like `hyperlinks-variant` below.
const bottomLinks = computed(() => [
  { label: t('exhibition.nav.about'), description: t('exhibition.nav.introduction'), href: '#/about' },
  { label: t('exhibition.nav.themes'), description: t('exhibition.nav.contentAtAGlance'), href: '#/themes' },
])

// The exhibition's raw logo records, reshaped into the `logos` prop's own
// contract (the shell README's "Site shell" table): `PageShell`'s header-logo
// shape (`image`/`alt`/`href`) plus the legacy fields `config.logos.header`
// and `.sponsorGroups` (dataset.config.js) bucket by — `category_id`,
// `visible`, `display_order`, and a category's own name for the one heading
// that is not a header logo or a shared entry (categories 3/4 hold legacy's
// own placeholder text, never a translator's).
function logoCaption(logo) {
  return logo.labels?.[locale.value] ?? logo.labels?.en ?? logo.alt_text ?? ''
}
const exhibitionLogos = computed(() =>
  (exhibition.value?.logos ?? []).map((logo) => ({
    image: logo.image_url,
    alt: logoCaption(logo),
    href: logo.url || undefined,
    category_id: logo.category_id,
    category: logo.category,
    visible: logo.visible,
    display_order: logo.display_order,
  })),
)

// Legacy showed `exhibitionPopupLogo` once per page load when
// `exhibitionShowPopupLogo` was set, as a dismissible overlay. Both are
// per-language in the package (`popup_logos` / `popup_logo_show`), because the
// German instance suppresses the notice the English one shows. `raw-html` on
// the layout's `PopupLogo` below: the body is Markdown like every other
// field (the importer converts the legacy HTML on the way in), rendered here
// through the site's own pipeline rather than the component's inline one,
// which drops block elements a multi-paragraph notice needs.
const popupContent = computed(() =>
  md(exhibition.value?.popup_logos?.[locale.value] ?? exhibition.value?.popup_logos?.en ?? '')
)
const popupEnabled = computed(() => {
  const show = exhibition.value?.popup_logo_show
  if (show === null || show === undefined) return false
  if (typeof show === 'boolean') return show
  return show[locale.value] ?? show.en ?? false
})
</script>

<template>
  <SiteShell
    :languages="props.languages"
    :language="props.language"
    language-placement="header"
    language-style="buttons"
    :header-home="links.portal"
    :header-title="t('exhibition.identity.tagline')"
    header-title-href="#/about"
    :banner-image="bannerImage"
    :banner-caption="banner"
    :banner-caption-label="t('exhibition.media.detailFrom')"
    :banner-title="isHome ? exhibitionTitle(locale) : ''"
    :banner-subtitle="isHome ? exhibitionSubtitle(locale) : ''"
    :banner-headline="isHome ? exhibitionHeadline(locale) : ''"
    :banner-enter="isHome ? { label: t('exhibition.action.enter'), href: '#/about' } : null"
    :banner-strapline="isHome ? t('exhibition.identity.strapline') : ''"
    hyperlinks-variant="tiles"
    :hyperlinks-title="exhibitionTitle(locale)"
    hyperlinks-title-href="#/"
    :hyperlinks-subtitle="exhibitionSubtitle(locale)"
    :hyperlinks="bottomLinks"
    :footer-text="`${t('exhibition.footer.copyright')} 2004–${currentYear}`"
    :logos="exhibitionLogos"
    @update:language="emit('update:language', $event)"
  >
    <template #brand><span class="logo-mark">MWNF</span></template>
    <template #notice><PopupLogo :content="popupContent" :enabled="popupEnabled" raw-html /></template>
    <slot />
  </SiteShell>
</template>

<style scoped>
.logo-mark {
  display: inline-block;
  border: 2px solid currentColor;
  padding: 4px 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  font-size: 18px;
}
</style>
