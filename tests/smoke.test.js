import { describe, expect, it, vi } from 'vitest'
import { mergeMessages } from '@museumwnf/viewer-core'
import { mountSite as mountOn } from '@museumwnf/viewer-core/testing'
import { describeExhibitionSmoke } from '@museumwnf/viewer-layout/dxa/testing'
import { catalogues as sharedTexts } from '@museumwnf/viewer-i18n/exhibition'
import manifest from '@museumwnf/the-use-of-colours-in-art-data'
import partnerNames from '@museumwnf/the-use-of-colours-in-art-data/translations/partners.en.json'
import dynastyNames from '@museumwnf/the-use-of-colours-in-art-data/translations/dynasties.en.json'
import ownTexts from '../locales/en.json'
import config, { noticeProjects, projectColors } from '../src/dataset.config.js'

// The exhibition family's smoke test, run against this exhibition's own
// package (@museumwnf/viewer-layout/dxa/testing).
describeExhibitionSmoke({
  config,
  noticeProjects,
  projectColors,
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
})
