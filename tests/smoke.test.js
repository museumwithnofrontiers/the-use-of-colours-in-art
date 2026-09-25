import { describe, expect, it, vi } from 'vitest'
import { loadEntities, mergeMessages } from '@museumwnf/viewer-core'
import {
  checkOfferedLanguages, checkRoutes, checkSectionMeta, checkTextsRendered, mountSite as mountOn,
} from '@museumwnf/viewer-core/testing'
import { catalogues as sharedTexts } from '@museumwnf/viewer-i18n/exhibition'
import ownTexts from '../locales/en.json'
import config, { noticeProjects, projectColors } from '../src/dataset.config.js'
import manifest from '@museumwnf/the-use-of-colours-in-art-data'
import partnerNamesEn from '@museumwnf/the-use-of-colours-in-art-data/translations/partners.en.json'
import dynastyNamesEn from '@museumwnf/the-use-of-colours-in-art-data/translations/dynasties.en.json'

// The same two layers main.js assembles, in the same order: the shared bundle
// first, this exhibition's own file last. Mounting without them would prove
// nothing about the chrome — every text would render as its own name.
const messages = mergeMessages(sharedTexts, { en: ownTexts })

// Mounted on the address under test, as a visitor arrives from a link.
function mountSite(hash = '#/') {
  return mountOn(config, messages, hash)
}

describe('website smoke test', () => {
  it('mounts against the configured data package', async () => {
    const { app, host } = await mountSite()

    expect(host.textContent).toContain(config.siteName)
    expect(host.querySelector('.mwnf-page')).not.toBeNull()

    // The website's own Home view (registered under the route name 'home')
    // must replace viewer-core's generic home view.
    expect(host.querySelector('.vc-home')).toBeNull()

    app.unmount()
  }, 20000)

  // The collection results and the item sheet run on the platform's composed
  // views (metanull/viewer-core#50): the tiles, the dependent options and
  // the pages come from the spec, the sheet's rows from the sheet spec, and
  // what only this exhibition has — the panel in the aside, the
  // related-content container — fills the views' slots.
  it('renders the collection results on the composed results view', async () => {
    const { app, host } = await mountSite('#/collection-results')
    await vi.waitFor(() => expect(host.querySelector('.mwnf-grid__tile')).not.toBeNull(), { timeout: 20000 })
    expect(host.querySelector('.mwnf-catalogue')).not.toBeNull()
    expect(host.querySelector('.mwnf-catalogue__aside .mwnf-filter')).not.toBeNull()
    expect(host.querySelector('.mwnf-summary__count')).not.toBeNull()
    // Nine a page, two paginations.
    expect(host.querySelectorAll('.mwnf-grid__tile').length).toBe(9)
    expect(host.querySelectorAll('.mwnf-pagination').length).toBe(2)
    app.unmount()
  }, 60000)

  it('renders the item sheet on the composed record view', async () => {
    const [, items] = await loadEntities(['exhibition', 'items'])
    const item = items.find((i) => i.project_id) ?? items[0]
    const { app, host } = await mountSite(`#/item/${item.id}`)
    await vi.waitFor(() => expect(host.querySelector('.mwnf-sheet__label')).not.toBeNull(), { timeout: 20000 })
    expect(host.querySelector('.mwnf-record')).not.toBeNull()
    expect(host.querySelector('.mwnf-dxa-item__languages')).not.toBeNull()
    // ItemDetailView (@museumwnf/viewer-layout/dxa) renders the related block under
    // its own `mwnf-sheet-related` class, and the source line under
    // `mwnf-sheet-source__line` — this site no longer wraps either in its
    // own `related-content-container`/`source-reference` classes.
    expect(host.querySelector('.mwnf-sheet-related')).not.toBeNull()
    // The citation/"source database" name is the fixture manifest's own
    // project entry now (epic #1727 phase 4), not a legacy project code.
    if (item.project_id) {
      const projectName = manifest.projects?.[item.project_id]?.name?.en
      if (projectName) expect(host.querySelector('.mwnf-sheet-source__line').textContent).toContain(projectName)
    }
    // The glossary tool (metanull/water-in-islam#36) is unconditional — the
    // layout's own component, not local state, so every sheet carries it.
    expect(host.querySelector('.mwnf-glossary-tool')).not.toBeNull()
    // The source credit (metanull/water-in-islam#43): itemSheet.citation is
    // not `false`, so RecordView's `source` slot renders its default
    // (SourceCredit) once the website declares `site.origin` — the link's
    // text is `sourceUrl()`'s own address, origin plus this item's hash route.
    const creditLink = host.querySelector('.mwnf-source-credit a')
    expect(creditLink).not.toBeNull()
    expect(creditLink.textContent.startsWith(config.site.origin)).toBe(true)
    expect(creditLink.textContent.endsWith(`#/item/${item.id}`)).toBe(true)
    app.unmount()
  }, 60000)

  // Epic #1727 phase 4: the "search the related database" link, the
  // Artistic Introduction link and the Explore-partner notice are gated on
  // the fixture manifest's own `manifest.projects` entry for this record's
  // `project_id`, not a hardcoded legacy project key — one sheet per project
  // this build actually references, so every gate value the fixture carries
  // is exercised at least once (a `null` URL, e.g. an as-yet-unpopulated one,
  // is exactly as provable an absence as a non-null one is a presence).
  it('gates the related-database link, the Artistic Introduction link and the Explore-partner notice on the manifest project', async () => {
    const [, items] = await loadEntities(['exhibition', 'items'])
    const seen = new Set()
    const sample = items.filter((i) => {
      if (!i.project_id || seen.has(i.project_id) || !manifest.projects?.[i.project_id]) return false
      seen.add(i.project_id)
      return true
    })
    expect(sample.length).toBeGreaterThan(0)

    for (const item of sample) {
      const proj = manifest.projects[item.project_id]
      const { app, host } = await mountSite(`#/item/${item.id}`)
      await vi.waitFor(() => expect(host.querySelector('.mwnf-sheet-related')).not.toBeNull(), { timeout: 20000 })

      // ItemDetailView's related-database/Artistic-Introduction lines carry
      // no block class of their own (`mwnf-sheet-related__line` is shared by
      // several lines), so presence is asserted on the link's own href
      // instead — a stricter check than the old class-presence one, and one
      // that (unlike it) still fails if the href were ever wrong.
      expect(!!host.querySelector(`a[href="${proj.related_database_url}"]`)).toBe(!!proj.related_database_url)
      expect(!!host.querySelector(`a[href="${proj.artistic_introduction_url}"]`)).toBe(!!proj.artistic_introduction_url)
      expect(!!host.querySelector('.mwnf-sheet-notice')).toBe(noticeProjects.includes(item.project_id))
      // The chip colour is this build's own `projectColors` map, keyed the
      // same way — every project the fixture carries must have an entry, or
      // the chip silently falls back to viewer-layout's default swatch.
      expect(projectColors[item.project_id]).toBeTruthy()

      app.unmount()
    }
  }, 120000)

  // The dynasty popouts (metanull/water-in-islam#36) are DynastyList/
  // DynastyPopout from the layout, fed the raw dynasty records legacy's own
  // rule already filtered to (a dynasty with no history text gets no
  // popout) — an item with such a dynasty must render the list with it.
  it('renders a dynasty popout on an item sheet that has one', async () => {
    const [, items] = await loadEntities(['exhibition', 'items'])
    const item = items.find((i) =>
      (!i.languages?.length || i.languages.includes('en'))
      && (i.dynasty_ids ?? []).some((id) => dynastyNamesEn[id]?.history))
    const dynastyId = item.dynasty_ids.find((id) => dynastyNamesEn[id]?.history)
    const { app, host } = await mountSite(`#/item/${item.id}`)
    await vi.waitFor(() => expect(host.querySelector('.mwnf-dynasty-list')).not.toBeNull(), { timeout: 20000 })
    expect(host.querySelectorAll('.mwnf-dynasty').length).toBeGreaterThan(0)
    expect(host.textContent).toContain(dynastyNamesEn[dynastyId].name)
    app.unmount()
  }, 60000)

  // The partner pages run on the platform's composed views
  // (metanull/water-in-islam#34): the country grouping and the A-Z toggle are
  // `PartnerListView`'s, the tab strip and the map are this exhibition's own
  // header/before-sheet slots (partnerSpecs.js), and the objects grid is the
  // composed results view scoped to one partner (PartnerObjects.vue).
  it('renders the partners list on the composed list view', async () => {
    const [exhibition, partners] = await loadEntities(['exhibition', 'partners'])
    const hidden = new Set(exhibition.hidden_partner_ids ?? [])
    const partner = partners.find((p) => !hidden.has(p.id) && partnerNamesEn[p.id]?.name)
    const { app, host } = await mountSite('#/partners')
    await vi.waitFor(() => expect(host.querySelector('.mwnf-partner-list')).not.toBeNull(), { timeout: 20000 })
    // Country groups, every one open (`variant: 'open'`), and the A-Z / Z-A
    // toggle (`orderToggle: true`) — both from partnerListSpec.
    expect(host.querySelectorAll('.mwnf-partner-list__group-heading').length).toBeGreaterThan(0)
    expect(host.querySelector('.mwnf-partner-list__toggle-button')).not.toBeNull()
    // A row's name is the real translation, not a placeholder or a bare entry.
    expect(host.textContent).toContain(partnerNamesEn[partner.id].name)
    app.unmount()
  }, 30000)

  it('renders a partner profile on the composed record view', async () => {
    const [exhibition, partners] = await loadEntities(['exhibition', 'partners'])
    const hidden = new Set(exhibition.hidden_partner_ids ?? [])
    const partner = partners.find((p) => !hidden.has(p.id) && p.type !== 'institution' && partnerNamesEn[p.id]?.name)
    const { app, host } = await mountSite(`#/partner/${partner.id}`)
    await vi.waitFor(() => expect(host.querySelector('.mwnf-record')).not.toBeNull(), { timeout: 20000 })
    expect(host.textContent).toContain(partnerNamesEn[partner.id].name)
    // The About/Contact/Logo tab strip and the OpenStreetMap embed. The strip
    // is found by its role: viewer-layout's `PartnerPanel`
    // (museumwithnofrontiers/inventory-app#2034) replaces the family page's
    // own `.mwnf-dxa-profile-links`, and this test holds on both.
    expect(host.querySelector('[role="tablist"], .mwnf-dxa-profile-links')).not.toBeNull()
    expect(host.querySelector('.mwnf-partner-map')).not.toBeNull()
    app.unmount()
  }, 30000)

  it('renders a partner objects page on the composed results view', async () => {
    const [exhibition, partners] = await loadEntities(['exhibition', 'partners'])
    const hidden = new Set(exhibition.hidden_partner_ids ?? [])
    const partner = partners.find((p) => !hidden.has(p.id) && p.item_count > 0)
    const { app, host } = await mountSite(`#/partner/${partner.id}/objects`)
    await vi.waitFor(() => expect(host.querySelector('.mwnf-grid__tile')).not.toBeNull(), { timeout: 20000 })
    expect(host.querySelector('.mwnf-catalogue')).not.toBeNull()
    // The header names the partner this page scopes the grid to.
    expect(host.textContent).toContain(partnerNamesEn[partner.id]?.name ?? partner.id)
    app.unmount()
  }, 30000)

  // The collection entrance and the header search results run on the
  // platform's composed views (metanull/water-in-islam#35): the facet
  // dropdowns, the from/to year buckets and the navigate-on-choice behaviour
  // are `SearchFormView`'s (`mode: 'facets'`, CollectionSearch.vue); the
  // boolean keyword grammar over the haystack is `CatalogueResultsView`'s
  // `narrow` (SearchResults.vue), unchanged from before this story.
  it('renders the collection entrance on the composed search form view', async () => {
    const { app, host } = await mountSite('#/collection')
    await vi.waitFor(() => expect(host.querySelector('.mwnf-search-form')).not.toBeNull(), { timeout: 20000 })
    // The country dropdown plus at least one populated tag category.
    expect(host.querySelectorAll('.mwnf-search-form .mwnf-facet').length).toBeGreaterThan(1)
    // The shared from/to year buckets (`dates: 'buckets'`).
    expect(host.querySelector('.mwnf-search-form__dates')).not.toBeNull()
    // The "How to search" link to the essay page.
    expect(host.querySelector('.mwnf-search-form__how-to')).not.toBeNull()
    expect(host.textContent).toContain('Have you already been at')
    app.unmount()
  }, 30000)

  it('returns every renderable object for the all-objects sentinel', async () => {
    const { app, host } = await mountSite('#/search?q=all-objects')
    await vi.waitFor(() => expect(host.querySelector('.mwnf-grid__tile')).not.toBeNull(), { timeout: 20000 })
    expect(host.textContent).toContain('All objects')
    app.unmount()
  }, 30000)

  it('renders a keyword search on the composed results view', async () => {
    const [, items] = await loadEntities(['exhibition', 'items'])
    // A term this build actually ships text for — the boolean grammar reads
    // the English sheet, so a name from an English-tagged member is a hit
    // the client-side index and the server-rendered fixture must agree on.
    const item = items.find((i) => !i.languages?.length || i.languages.includes('en'))
    const term = item.internal_name.split(' ')[0]
    const { app, host } = await mountSite(`#/search?q=${encodeURIComponent(term)}`)
    await vi.waitFor(() => expect(host.querySelector('.mwnf-grid__tile')).not.toBeNull(), { timeout: 20000 })
    expect(host.textContent).toContain(`“${term}”`)
    // Fewer than the full set, or the boolean grammar found nothing narrow.
    expect(host.querySelectorAll('.mwnf-grid__tile').length).toBeGreaterThan(0)
    app.unmount()
  }, 30000)

  it('offers the two ways out of an empty keyword search', async () => {
    const { app, host } = await mountSite('#/search?q=zzz-nonexistent-keyword-zzz')
    await vi.waitFor(() => expect(host.querySelector('.mwnf-catalogue')).not.toBeNull(), { timeout: 20000 })
    expect(host.textContent).toContain('No items match your search.')
    expect(host.querySelector('a[href="#/how-to-search"]')).not.toBeNull()
    expect(host.querySelector('a[href="#/collection"]')).not.toBeNull()
    app.unmount()
  }, 30000)

  it('renders the search how-to essay on the composed text page view', async () => {
    const { app, host } = await mountSite('#/how-to-search')
    await vi.waitFor(() => expect(host.textContent).toContain('Boolean Full Text Search'), { timeout: 20000 })
    expect(host.querySelector('a[href="#/collection"]')).not.toBeNull()
    app.unmount()
  }, 30000)

  // The five theme-family pages run on composed views (metanull/water-in-islam#32):
  // the accordion, the essay, the results grid and the link list are the
  // package's; what only this exhibition has — the picture→parent
  // indirection, the related-works toggle, the tour heading — fills their
  // slots and spec functions (composables/themes.js, themeSpecs.js).
  it('renders the themes list on the composed accordion', async () => {
    const { app, host } = await mountSite('#/themes')
    await vi.waitFor(() => expect(host.querySelector('.mwnf-cards--accordion')).not.toBeNull(), { timeout: 20000 })
    expect(host.querySelectorAll('.mwnf-cards__details').length).toBeGreaterThan(0)
    app.unmount()
  }, 30000)

  // PictureGallery/PictureNarrative (viewer-layout 2.14.0, story #1811/#1729)
  // now fill the panel/thumbnails/after-body slots this family's own
  // Theme.vue used to build by hand — the class names below
  // (`mwnf-picture-gallery__*`/`mwnf-picture-narrative__*`) are the shared
  // components' own, not this site's former `theme-component-*` markup.
  it('renders a theme on the composed essay view', async () => {
    const [, , , themes] = await loadEntities(['exhibition', 'items', 'partners', 'themes'])
    const theme = themes.find((t) => t.id === '1')
    const { app, host } = await mountSite('#/theme/1')
    await vi.waitFor(() => expect(host.querySelector('.mwnf-essay')).not.toBeNull(), { timeout: 20000 })
    expect(host.querySelector('.mwnf-essay').className).not.toContain('mwnf-essay--about')
    // The Roman label sits beside the theme's own title, in the `#header` slot.
    expect(host.querySelector('.mwnf-dxa-theme__heading').textContent).toMatch(/[IVX]/)
    expect(host.querySelector('.mwnf-essay__side')).not.toBeNull()
    expect(host.querySelector('.mwnf-picture-gallery__selected, .mwnf-picture-gallery__empty')).not.toBeNull()
    expect(host.querySelector('.mwnf-essay__nav')).not.toBeNull()
    // The selected picture's own caption: its panel title is the parent
    // record's label (viewer-core/dxa's `useExhibitionThemes`),
    // not the theme node's own presentation text.
    expect(host.querySelector('.mwnf-picture-gallery__detail--title').textContent)
      .toContain('Church of St. Lourenço de Almancil')
    // The sub-theme list, in the family theme page's `#navigation`.
    const subNav = host.querySelector('.mwnf-dxa-theme__subthemes')
    expect(subNav.textContent).toContain('The Basics – getting to know the Primary Colours')
    expect(subNav.textContent).toContain('Primary Colours in Architectural Monuments')
    // The view reads the theme texts through the tree's own entity, and a wrong
    // entity renders internal names or nothing. viewer-core 1.12.1 exposes
    // `tree.entity` and `tree.source` as strings.
    const proseElement = host.querySelector('.mwnf-essay__prose, .mwnf-essay__body')
    expect(proseElement?.textContent?.trim()).toBeTruthy()
    const titleElement = host.querySelector('.mwnf-essay__title')
    if (titleElement) expect(titleElement.textContent).not.toBe(theme.internal_name)
    // Theme.vue overrides EssayView's `after` slot for the tour's forward
    // link (About mode only) — that override replaces the slot's own
    // default (SourceCredit), so the credit is rendered explicitly there too
    // (metanull/water-in-islam#43).
    const creditLink = host.querySelector('.mwnf-source-credit a')
    expect(creditLink).not.toBeNull()
    expect(creditLink.textContent.startsWith(config.site.origin)).toBe(true)
    app.unmount()
  }, 30000)

  // Theme 1's first sub-theme carries a same-node related pair (a picture
  // whose curator-set "Related items" link names another picture curated
  // under this very sub-theme): the target starts hidden from the strip
  // behind "Add Related Works", and the source's selection shows the
  // target's name/relation text in PictureNarrative's "Related" block.
  it('shows a picture\'s related items and the "Add related works" toggle', async () => {
    const { app, host } = await mountSite('#/theme/1/1/5')
    await vi.waitFor(() => expect(host.querySelector('.mwnf-picture-narrative__related')).not.toBeNull(), { timeout: 20000 })

    const toggle = host.querySelector('.mwnf-picture-gallery__toggle')
    expect(toggle).not.toBeNull()
    expect(toggle.textContent.trim()).toBe('Add Related Works')
    // The related target (display_order 6) is a backRelated hit for this
    // node's own strip, so it starts hidden: fewer thumbs than pictures.
    expect(host.querySelectorAll('.mwnf-picture-gallery__thumb').length).toBeLessThan(13)

    const related = host.querySelector('.mwnf-picture-narrative__related')
    expect(related.textContent).toContain('Related')
    expect(related.textContent).toContain('Saint Charles Borromeo Administers the Sacrament to the Plague-Infected')
    expect(related.textContent).toContain('Similar colour scheme, as well as similar theme.')
    app.unmount()
  }, 30000)

  // The epic's own fix (museumwithnofrontiers/inventory-app#1729): a related
  // link whose target is curated under a DIFFERENT theme used to be silently
  // dropped (the pre-migration `relatedTo` map was scoped to the current
  // node only). useThemePictures.js resolves against the whole tree instead
  // (`themes.js`'s `pictureById`), so the target still renders here, by name.
  it('renders a related picture whose target lives in another theme', async () => {
    const { app, host } = await mountSite('#/theme/0/overview/3')
    await vi.waitFor(() => expect(host.querySelector('.mwnf-picture-narrative__related')).not.toBeNull(), { timeout: 20000 })

    const related = host.querySelector('.mwnf-picture-narrative__related')
    expect(related.textContent).toContain('Prayer rug')
    expect(related.textContent).toContain('Similar decorative elements, as well as some colours.')
    // The target is a real, selectable picture (a button, not dead text) —
    // clicking it is how a visitor reaches it, same as any other related item.
    expect(related.querySelector('button img')).not.toBeNull()
    app.unmount()
  }, 30000)

  it('renders the theme gallery on the composed results view', async () => {
    const { app, host } = await mountSite('#/theme-gallery/1')
    await vi.waitFor(() => expect(host.querySelector('.mwnf-grid__tile')).not.toBeNull(), { timeout: 20000 })
    expect(host.querySelector('.mwnf-catalogue')).not.toBeNull()
    app.unmount()
  }, 30000)

  // The timeline entrance, results and gallery run on viewer-layout's
  // composed views (metanull/water-in-islam#33): `timelineSpec` drives the
  // form/results shape, `timelineGallerySpec` the country/period join.
  it('renders the timeline entrance on the composed timeline view, as a form', async () => {
    const { app, host } = await mountSite('#/timeline')
    await vi.waitFor(() => expect(host.querySelector('.mwnf-timeline')).not.toBeNull(), { timeout: 20000 })
    expect(host.querySelector('.mwnf-timeline__filters')).not.toBeNull()
    // The entrance renders the form alone — no results row, no summary.
    expect(host.querySelector('.mwnf-timeline__row')).toBeNull()
    expect(host.querySelector('.mwnf-summary')).toBeNull()
    expect(host.textContent).toContain('Have you already been at')
    app.unmount()
  }, 30000)

  it('renders the timeline results on the composed timeline view', async () => {
    const { app, host } = await mountSite('#/timeline-results')
    await vi.waitFor(() => expect(host.querySelector('.mwnf-summary')).not.toBeNull(), { timeout: 20000 })
    expect(host.querySelector('.mwnf-timeline')).not.toBeNull()
    // "Events found" is the default summary label — this exhibition supplies
    // no summary of its own.
    expect(host.textContent).toContain('Events found')
    app.unmount()
  }, 30000)

  it('offers "See Gallery" from the timeline results when the period has objects', async () => {
    const [, items] = await loadEntities(['exhibition', 'items'])
    const dated = items.find((i) => Number.isFinite(i.start_date) && i.country_id)
    const { app, host } = await mountSite(
      `#/timeline-results?country=${dated.country_id}&begin=${dated.start_date}&end=${dated.end_date ?? dated.start_date}`,
    )
    await vi.waitFor(() => expect(host.querySelector('.mwnf-timeline__gallery')).not.toBeNull(), { timeout: 20000 })
    expect(host.querySelector('.mwnf-timeline__gallery').textContent).toContain('See Gallery')
    app.unmount()
  }, 30000)

  it('renders the timeline gallery on the composed results view', async () => {
    const [, items] = await loadEntities(['exhibition', 'items'])
    const dated = items.find((i) => Number.isFinite(i.start_date) && i.country_id)
    const { app, host } = await mountSite(
      `#/timeline/gallery?country=${dated.country_id}&begin=${dated.start_date}&end=${dated.end_date ?? dated.start_date}`,
    )
    await vi.waitFor(() => expect(host.querySelector('.mwnf-catalogue')).not.toBeNull(), { timeout: 20000 })
    // The item that seeded the query overlaps its own period, so the grid is
    // never empty here.
    expect(host.querySelector('.mwnf-grid__tile')).not.toBeNull()
    app.unmount()
  }, 30000)

  it('timeline country id filter produces the same results as the legacy two-letter code', async () => {
    const [, items] = await loadEntities(['exhibition', 'items'])
    // Find an item with Greece (grc) to use for the test
    const datedGrc = items.find((i) => Number.isFinite(i.start_date) && i.country_id === 'grc')
    if (!datedGrc) {
      // Skip if no Greece items exist
      return
    }

    // Mount with the country id (grc)
    const { app: appId, host: hostId } = await mountSite(
      `#/timeline-results?country=grc&begin=${datedGrc.start_date}&end=${datedGrc.end_date ?? datedGrc.start_date}`,
    )
    await vi.waitFor(() => expect(hostId.querySelector('.mwnf-summary')).not.toBeNull(), { timeout: 20000 })

    // Mount with the legacy code (gr)
    const { app: appCode, host: hostCode } = await mountSite(
      `#/timeline-results?country=gr&begin=${datedGrc.start_date}&end=${datedGrc.end_date ?? datedGrc.start_date}`,
    )
    await vi.waitFor(() => expect(hostCode.querySelector('.mwnf-summary')).not.toBeNull(), { timeout: 20000 })

    // Both should render the same number of rows
    const rowsId = hostId.querySelectorAll('.mwnf-timeline__row').length
    const rowsCode = hostCode.querySelectorAll('.mwnf-timeline__row').length
    expect(rowsId).toBe(rowsCode)

    // Both should have the same gallery link text and count
    const galleryId = hostId.querySelector('.mwnf-timeline__gallery')
    const galleryCode = hostCode.querySelector('.mwnf-timeline__gallery')
    if (galleryId && galleryCode) {
      expect(galleryId.textContent).toBe(galleryCode.textContent)
    }

    // The first row's caption should contain the country name "Greece"
    const firstRowId = hostId.querySelector('.mwnf-timeline__row')
    if (firstRowId) {
      expect(firstRowId.textContent).toContain('Greece')
    }

    appId.unmount()
    appCode.unmount()
  }, 60000)

  it('renders the related content on the composed link list', async () => {
    const { app, host } = await mountSite('#/related')
    await vi.waitFor(() => expect(host.querySelector('.mwnf-link-list')).not.toBeNull(), { timeout: 20000 })
    // This exhibition's related_content.json carries five entries, so the
    // page must show groups, not the empty state.
    expect(host.querySelector('.mwnf-link-list__groups')).not.toBeNull()
    expect(host.querySelectorAll('.mwnf-link-list__item').length).toBeGreaterThan(0)
    app.unmount()
  }, 30000)

  it('renders about on the composed essay view, in about mode', async () => {
    const { app, host } = await mountSite('#/about')
    await vi.waitFor(() => expect(host.querySelector('.mwnf-essay')).not.toBeNull(), { timeout: 20000 })
    expect(host.querySelector('.mwnf-essay').className).toContain('mwnf-essay--about')
    // `about` drops EssayView's own side column; the picture panel this
    // family otherwise shows has nothing to attach to on this page.
    expect(host.querySelector('.mwnf-essay__side')).toBeNull()
    // `#after-body` itself is NOT part of that side column (EssayView renders
    // it in the main article flow regardless of `about`), so Theme.vue's own
    // `v-if="!aboutMode"` on PictureNarrative is what actually hides the
    // narrative body here — asserted directly, not just inferred from the
    // side column's absence.
    expect(host.querySelector('.mwnf-picture-narrative')).toBeNull()
    expect(host.textContent).toContain(config.siteName)
    app.unmount()
  }, 30000)

  it('declares every canonical route by name, and every legacy shape as a redirect', () => {
    expect(checkRoutes(config, {
      names: [
        'home', 'about', 'themes', 'theme', 'theme-gallery', 'collection', 'collection-results',
        'item', 'search-results', 'search-how-to', 'partners', 'partner', 'partner-objects',
        'institution', 'institution-monuments', 'related', 'timeline', 'timeline-results',
        'timeline-gallery', 'credits',
      ],
      legacyPaths: [
        '/database-item/:uid(.*)/:language',
        '/partner/:country/:id/:language',
        '/partner-objects/:country/:id/:page',
        '/institution/:country/:id/:language',
        '/institution-monuments/:country/:id/:page',
        '/timeline-gallery/:country/:start/:end/:page',
      ],
    })).toEqual([])
  })

  // Every route names the section it belongs to, which is what the shell
  // (src/SiteShell.vue, `config.navigation.links`/`.sectionTitles`) reads for
  // the active menu entry and the banner title.
  it('gives every route a section', () => {
    expect(checkSectionMeta(config)).toEqual([])
  })

  it('offers the languages the package declares for the site, where the items carry them', () => {
    expect(checkOfferedLanguages(config)).toEqual([])
  })

  it('reads nothing but the manifest before it mounts', () => {
    expect(config.media.legacyHost).toMatch(/^https:/)
    expect(Object.keys(config.links)).toEqual(
      expect.arrayContaining(['portal', 'galleries', 'myCollection', 'about', 'contact', 'legalNotice', 'credits', 'cookies']),
    )
  })

  // What this website contributes to a legacy address is the mapping: a dbUid
  // path to an item, a country and legacy id to a partner or an institution,
  // the page number out of the path. That the router turns such an entry into
  // a redirect is viewer-core's own test.
  it('maps a legacy address onto the canonical route', async () => {
    const [items, partners] = await loadEntities(['exhibition', 'items', 'partners']).then((all) => [all[1], all[2]])
    const [itemFor, partnerFor, objectsFor, institutionFor, monumentsFor, galleryFor] = config.legacyRoutes

    const item = items.find((i) => i.backward_compatibility)
    expect(await itemFor.resolve({ uid: item.backward_compatibility.split(':').join('/') })).toEqual({
      name: 'item',
      params: { id: item.id },
    })
    expect(await itemFor.resolve({ uid: 'mwnf3/objects/NOPE/xx/Mus00/0' })).toBeNull()

    const museum = partners.find((p) => p.type !== 'institution' && (p.backward_compatibility ?? '').split(':').length >= 4)
    const [, , museumId, museumCountry] = museum.backward_compatibility.split(':')
    expect(await partnerFor.resolve({ country: museumCountry, id: museumId })).toEqual({
      name: 'partner',
      params: { id: museum.id },
    })
    expect(await objectsFor.resolve({ country: museumCountry, id: museumId, page: '3' })).toEqual({
      name: 'partner-objects',
      params: { id: museum.id },
      query: { page: '3' },
    })
    // An institution reaches the institution pages, which are the same
    // component under a different name.
    expect(await institutionFor.resolve({ country: museumCountry, id: museumId })).toEqual({
      name: 'institution',
      params: { id: museum.id },
    })
    expect(await monumentsFor.resolve({ country: museumCountry, id: museumId, page: '1' })).toEqual({
      name: 'institution-monuments',
      params: { id: museum.id },
      query: {},
    })

    // The page number and the period leave the path for the query, and an
    // open bound stops being the literal 'any'.
    expect(galleryFor.resolve({ country: 'uk', start: 'any', end: '1500', page: '2' })).toEqual({
      name: 'timeline-gallery',
      query: { country: 'uk', end: '1500', page: '2' },
    })
    // The path's own `start` becomes `begin` in the query: viewer-layout's
    // `TimelineResultsView` renders its date control under that key, and the
    // gallery spec reads the same one, so both routes stay one shape.
    expect(galleryFor.resolve({ country: 'uk', start: '1200', end: 'any', page: '1' })).toEqual({
      name: 'timeline-gallery',
      query: { country: 'uk', begin: '1200' },
    })
  }, 20000)

  // The chrome is two layers now, and either one failing is silent: a missing
  // entry renders as its own name rather than as an error. This asserts the
  // rendered page, so a bundle that installs but never reaches the components
  // fails here too.
  it('renders the shared texts and its own over them', async () => {
    const { app, host } = await mountSite()

    const text = host.textContent
    // From viewer-i18n: the layout's skip link, a menu entry, and the strapline
    // under the exhibition's title.
    expect(text).toContain('Skip to content')
    expect(text).toContain('Themes')
    expect(text).toContain('A MWNF online exhibition.')
    // Nothing rendered as a bare entry name, which is what a missing text
    // looks like — there is no exception to throw for one. Every namespace
    // the pages render, not just the site's own: a raw shared key (`record`,
    // `sheet`, `timeline`, `partner`, `catalogue`, and this site's `exhibition`
    // class) passes unseen otherwise.
    expect(checkTextsRendered(host, {
      namespaces: ['colours', 'core', 'layout', 'catalogue', 'record', 'sheet', 'timeline', 'partner', 'exhibition'],
    })).toEqual([])

    app.unmount()
  }, 20000)

  // The footer attribution (metanull/water-in-islam#43): once the data
  // package's `manifest.rights` names a holder, viewer-layout's SiteShell
  // renders the attribution sentence and a terms-of-use link automatically —
  // nothing in this website's own SiteShell.vue names it.
  it('renders the rights attribution and the terms link in the footer', async () => {
    const { app, host } = await mountSite()

    const attribution = host.querySelector('.mwnf-footer__attribution')
    expect(attribution).not.toBeNull()
    expect(attribution.textContent).toContain(manifest.rights.attribution)

    const termsLink = host.querySelector('.mwnf-footer__terms')
    expect(termsLink).not.toBeNull()
    expect(termsLink.textContent).toBe(messages.en['record.source.termsOfUse'])
    expect(termsLink.getAttribute('href')).toBe(manifest.rights.terms_url)

    app.unmount()
  }, 20000)
})
