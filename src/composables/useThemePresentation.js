import {
  itemById, labelOf, tr, defaultLang,
} from './exhibitionData.js'

// Shared between the theme page and the theme gallery — what SectionCards'
// `accordion` variant does not need `themeCover`/`pictureCaption`/`truncate`
// for any more (it renders neither an image nor an excerpt), so only the
// picture→parent indirection stays.
//
// A theme's selections point at `picture` items, which are NOT members of the
// exhibition and therefore not in items.json — only their parents are. Every
// label a theme page shows (name, holding museum, location, country) is
// therefore read off the parent record, which is also what "see the full
// record" links to. `parent_in_package` says whether that parent is resolvable
// at all — a curated picture whose parent was not exported must still render its
// own image rather than disappear.

/** The parent record of a picture selection, or null when it is not a member. */
export function pictureParent(picture) {
  if (!picture?.parent_in_package) return null
  return itemById.value.get(picture.parent_item_id) ?? null
}

/** Legacy's `itemDetailString`: museum, location, country — blanks dropped. */
export function itemDetailString(item) {
  if (!item) return ''
  const sheet = tr('items', item.id, defaultLang)
  return [
    sheet.holder || labelOf('partners', item.partner_id),
    sheet.location,
    labelOf('countries', item.country_id),
  ].filter(Boolean).join(', ')
}