import { describe, expect, it } from 'vitest'
import { buildThemePictures } from '../src/composables/useThemePictures.js'

// A small fixture standing in for themes.js's `pictureById`: two themes,
// each with one curated picture, and a related link from theme A's picture
// to theme B's — the shape a cross-theme `theme_item_related` row produces.
// Neither theme's own `pictures[]` is what resolves the link; only the
// whole-tree map does (see useThemePictures.js's own comment on why this is
// what fixes the pre-migration `relatedTo`'s node-scoped drop).
const picA1 = {
  picture_item_id: 'pic-a1',
  display_order: 1,
  related: [
    { picture_item_id: 'pic-b1', descriptions: { en: 'Similar colours' }, reciprocal_descriptions: {} },
  ],
}
const picB1 = { picture_item_id: 'pic-b1', display_order: 1, related: [] }

const pictureById = new Map([
  ['pic-a1', picA1],
  ['pic-b1', picB1],
])

function resolvePicture(raw) {
  return { id: raw.picture_item_id, image: `img-${raw.picture_item_id}`, name: `name-${raw.picture_item_id}` }
}

const deps = {
  pictureById,
  resolvePicture,
  imageCaptionFor: (raw) => `caption-${raw.picture_item_id}`,
  fieldsFor: () => [],
  relationText: (link) => link.descriptions?.en ?? '',
  reciprocalText: (link) => link.reciprocal_descriptions?.en ?? link.descriptions?.en ?? '',
}

describe('buildThemePictures', () => {
  it('resolves a related link whose target is curated under a different theme', () => {
    const [picture] = buildThemePictures([picA1], deps)
    expect(picture.related).toHaveLength(1)
    expect(picture.related[0].picture).toEqual({ id: 'pic-b1', image: 'img-pic-b1', name: 'name-pic-b1' })
    expect(picture.related[0].text).toBe('Similar colours')
  })

  it('finds the reciprocal back-link by scanning the whole tree, not just the node\'s own siblings', () => {
    // theme B's own `pictures[]` carries no `related` of its own — the only
    // reason pic-b1 knows pic-a1 points at it is the whole-tree scan.
    const [picture] = buildThemePictures([picB1], deps)
    expect(picture.backRelated).toHaveLength(1)
    expect(picture.backRelated[0].picture).toEqual({ id: 'pic-a1', image: 'img-pic-a1', name: 'name-pic-a1' })
    expect(picture.backRelated[0].reciprocalText).toBe('Similar colours')
  })

  it('carries the node-specific caption/fields/displayOrder alongside the resolved base shape', () => {
    const [picture] = buildThemePictures([picA1], deps)
    expect(picture.imageCaption).toBe('caption-pic-a1')
    expect(picture.fields).toEqual([])
    expect(picture.displayOrder).toBe(1)
  })

  it('drops a related link whose target is not in the tree at all', () => {
    const orphan = { picture_item_id: 'pic-a2', display_order: 2, related: [{ picture_item_id: 'does-not-exist' }] }
    const [picture] = buildThemePictures([orphan], deps)
    expect(picture.related).toEqual([])
  })

  it('returns no related/backRelated for a picture with none', () => {
    const lonely = { picture_item_id: 'pic-c1', display_order: 1, related: [] }
    const byId = new Map([['pic-c1', lonely]])
    const [picture] = buildThemePictures([lonely], { ...deps, pictureById: byId })
    expect(picture.related).toEqual([])
    expect(picture.backRelated).toEqual([])
  })
})
