import { describe, expect, it, vi } from 'vitest'
import { mergeMessages } from '@museumwnf/viewer-core'
import { mountSite as mountOn } from '@museumwnf/viewer-core/testing'
import { describeExhibitionSmoke } from '@museumwnf/viewer-layout/dxa/testing'
import { catalogues as sharedTexts } from '@museumwnf/viewer-i18n/exhibition'
import manifest from '@museumwnf/the-use-of-colours-in-art-data'
import partnerNames from '@museumwnf/the-use-of-colours-in-art-data/translations/partners.en.json'
import dynastyNames from '@museumwnf/the-use-of-colours-in-art-data/translations/dynasties.en.json'
import ownTexts from '../locales/en.json'
import config, { noticeProjects } from '../src/dataset.config.js'

// The exhibition family's smoke test, run against this exhibition's own
// package (@museumwnf/viewer-layout/dxa/testing).
describeExhibitionSmoke({
  config,
  noticeProjects,
  sharedTexts,
  ownTexts,
  manifest,
  partnerNames,
  dynastyNames,
  namespace: 'colours',
  collection: { tiles: 9, paginations: 2 },
  theme: {
    id: '1',
    pictureTitle: "Church of St. Lourenço de Almancil",
    subthemes: [
      "The Basics – getting to know the Primary Colours",
      "Primary Colours in Architectural Monuments",
    ],
  },
  relatedContent: true,
})

const messages = mergeMessages(sharedTexts, { en: ownTexts })
const mountSite = (hash = '#/') => mountOn(config, messages, hash)

// This exhibition's own: related pictures its curators paired, across themes.
describe('the-use-of-colours-in-art smoke test', () => {
  // Theme 1's first sub-theme carries a same-node related pair (a picture
  // whose curator-set "Related items" link names another picture curated
  // under this very sub-theme): the target starts hidden from the strip
  // behind "Add Related Works", and the source's "Related" block shows the
  // target's picture; choosing it shows the relation text, as legacy's
  // ThemeComponent did (inventory-app#2379).
  //
  // Until the site runs @museumwnf/viewer-layout 3.63.0 it still draws the
  // composed theme page, so each test checks the page it finds: legacy's
  // (`.mwnf-dxa-theme-page__content`) or the composed one (`.mwnf-essay`).
  // The composed branch goes once the site has taken 3.63.0.
  const legacyPage = async (host) => {
    await vi.waitFor(() => expect(host.querySelector('.mwnf-dxa-theme-page__content, .mwnf-essay')).not.toBeNull(), { timeout: 20000 })
    return Boolean(host.querySelector('.mwnf-dxa-theme-page__content'))
  }

  it('shows a picture\'s related items and the "Add Related Works" switch', async () => {
    const { app, host } = await mountSite('#/theme/1/1/5')
    if (!(await legacyPage(host))) {
      await vi.waitFor(() => expect(host.querySelector('.mwnf-picture-narrative__related')).not.toBeNull(), { timeout: 20000 })
      expect(host.querySelector('.mwnf-picture-gallery__toggle').textContent.trim()).toBe('Add Related Works')
      expect(host.querySelector('.mwnf-picture-narrative__related').textContent).toContain('Similar colour scheme, as well as similar theme.')
      app.unmount()
      return
    }
    await vi.waitFor(() => expect(host.querySelector('.mwnf-dxa-theme-page__related')).not.toBeNull(), { timeout: 20000 })

    expect(host.querySelector('.mwnf-dxa-theme-page__control').textContent).toContain('Add Related Works')
    // The related target (display_order 6) is a backRelated hit for this
    // node's own strip, so it starts hidden: fewer thumbs than pictures.
    expect(host.querySelectorAll('.mwnf-dxa-theme-page__thumb').length).toBeLessThan(13)

    const related = host.querySelector('.mwnf-dxa-theme-page__related')
    expect(related.textContent).toContain('Related')
    const target = [...related.querySelectorAll('.mwnf-dxa-theme-page__related-image img')]
      .find((img) => img.alt.includes('Saint Charles Borromeo Administers the Sacrament to the Plague-Infected'))
    expect(target).toBeTruthy()
    target.click()
    await vi.waitFor(() => expect(host.querySelector('.mwnf-dxa-theme-page__related').textContent).toContain('Similar colour scheme, as well as similar theme.'), { timeout: 20000 })
    app.unmount()
  }, 30000)

  // Legacy's ThemeComponent showed a picture's related works on a sub-theme
  // only: an overview (here the About theme's) shows its picture with no
  // "Related" block, whatever links the picture carries (inventory-app#2379).
  it('shows no related works on an overview, as legacy', async () => {
    const { app, host } = await mountSite('#/theme/0/overview/3')
    if (!(await legacyPage(host))) {
      app.unmount()
      return
    }
    await vi.waitFor(() => expect(host.textContent).toContain('Prayer rug'), { timeout: 20000 })
    expect(host.querySelector('.mwnf-dxa-theme-page__related')).toBeNull()
    app.unmount()
  }, 30000)
})
