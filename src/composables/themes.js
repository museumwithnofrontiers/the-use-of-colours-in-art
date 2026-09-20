import { computed } from 'vue'
import { entityRef, useCollectionTree } from '@museumwnf/viewer-core'
import { defaultLang, tr } from './exhibitionData.js'

// themes.json is the ordered tree: top-level themes, each with its sub-themes
// and its curated picture selections. `useCollectionTree({ source: 'themes' })`
// is the platform's own walk of that shape (metanull/viewer-core#…) — it
// replaces the hand-rolled parent/child bookkeeping this file used to carry,
// and in particular its `previous`/`next` (over `walk()`, depth-first) is
// exactly legacy's tour order: About → theme 1 overview → its sub-themes →
// theme 2 overview → …, with no per-theme sub-theme count to track by hand.
//
// `useCollectionTree`'s own return carries no `entity` field, but EssayView
// reads `spec.tree.entity` to know which package entity a node's own text
// lives on — even when `spec.tree` is already a *built* tree, not the
// `{ themes: true, entity }` shorthand that would normally supply it. Passing
// the pre-built tree without this line leaves `treeEntity` on EssayView's own
// fallback ('collections'), which is not a themes.json package's entity at
// all, and every title/quote/body lookup would 404 silently. Setting it once
// here is cheaper than asking every route to repeat the `{ themes: true }`
// shorthand, which would also build a second, redundant tree instance.
export const themeTree = useCollectionTree({ source: 'themes', entity: 'themes' })
themeTree.entity = 'themes'

// The raw top-level array (unflattened): the order the /themes page and the
// tour read the exhibition's own themes in. `collectionTreeFromThemes`
// documents `root` as always null for this shape — there is no marker record
// to key a root on — so the tree's own `children`/`walk` cannot hand back
// "every top-level theme" without the sentinel id this file has no access to;
// the raw entity already is that list, in the same order.
const rawThemes = entityRef('themes')
export const themes = computed(() => rawThemes.value ?? [])

// Two rules the data fixes rather than taste:
//
//   * Theme 0 ("About the Exhibition") is an ordinary top-level theme that the
//     legacy client renders at /about and *skips* on /themes. Its display order
//     is 1, so the themes list starts at display order 2 and numbers those
//     "Theme I" upwards — which is why `romanFor` subtracts one.
//   * The theme id in the keyspace is not the display order. The route carries
//     `display_order - 1`, exactly as legacy's `theme.display - 1` did, so a
//     legacy URL pasted after the `#` lands on the same theme.
export const aboutTheme = computed(() => themes.value.find((t) => t.display_order === 1) ?? null)

/** The themes the /themes page lists: everything after the About theme. */
export const listedThemes = computed(() => themes.value.filter((t) => t.display_order > 1))

/** Route id ⇄ theme. Legacy's `/theme/:id` carries `display_order - 1`. */
export function themeByRouteId(id) {
  const n = Number(id)
  return themes.value.find((t) => t.display_order - 1 === n) ?? null
}

export function themeRouteId(theme) {
  return (theme?.display_order ?? 1) - 1
}

/**
 * Legacy numbered its themes in Roman numerals, counting from the About
 * theme. Kept here rather than read from EssayView's `numbering: 'roman'`
 * option: that option counts a node's position among `siblings`, which it
 * derives from `tree.root` — always null for a themes.json package (see
 * above) — so every top-level theme reads as having no siblings and the
 * option would number every one of them "I". Sub-themes are unaffected (their
 * parent is a real node), but the numeral this site shows is always the
 * *owning theme's*, not the sub-theme's own position, so one function serves
 * both.
 */
export function romanFor(displayOrder) {
  const lookup = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400], ['C', 100], ['XC', 90],
    ['L', 50], ['XL', 40], ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1],
  ]
  let n = displayOrder - 1
  let out = ''
  for (const [sym, value] of lookup) {
    while (n >= value) { out += sym; n -= value }
  }
  return out
}

/** The picture selections of a theme node, ordered as the curator set them. */
export function themePictures(theme) {
  return [...(theme?.pictures ?? [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
}

/**
 * Every picture selection in the tree, by its own id — which is a different
 * id space from the catalogue's items (see `pictureParent` in
 * useThemePresentation.js). `tree.itemsUnder(id)` walks a node and its
 * descendants depth-first and returns exactly these ids; this is the lookup
 * that turns one of them back into the picture object a caller can resolve
 * to its (possibly absent) catalogue parent.
 */
export const pictureById = computed(() => {
  const map = new Map()
  for (const node of themeTree.byId.value.values()) {
    for (const picture of node.pictures ?? []) map.set(picture.picture_item_id, picture)
  }
  return map
})

// translations/themes.<lang>.json is keyed two ways: by theme id for the
// theme's own title/quote/presentation, and by `<theme id>/<picture item id>`
// for the curated text of one picture *in that theme*. The same picture in two
// themes carries two different descriptions, which is why the pivot key exists.
export function themeText(theme, lang = defaultLang) {
  return tr('themes', theme?.id, lang)
}

export function pictureText(theme, picture, lang = defaultLang) {
  if (!theme?.id || !picture?.picture_item_id) return {}
  return tr('themes', `${theme.id}/${picture.picture_item_id}`, lang)
}

/** The top-level theme that owns a node: the node itself, or its parent. */
export function owningTheme(node) {
  if (!node) return null
  const parents = themeTree.parents(node.id)
  return parents.length ? parents[0] : node
}

/** A node's 1-based position among its owning theme's sub-themes, or null for the theme itself. */
export function subIndexOf(node) {
  if (!node) return null
  const owner = owningTheme(node)
  if (!owner || owner.id === node.id) return null
  const index = themeTree.children(owner.id).findIndex((child) => child.id === node.id)
  return index === -1 ? null : index + 1
}
