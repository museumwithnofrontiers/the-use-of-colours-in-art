import { computed } from 'vue'
import { useI18n } from '@museumwnf/viewer-core'
import { pictureById, themePictures } from './themes.js'
import { pictureParent, itemDetailString } from './useThemePresentation.js'
import {
  itemRoute, labelOf, tr, defaultLang, mdInline,
} from './exhibitionData.js'

// Builds the `pictures` array PictureGallery/PictureNarrative expect
// (@museumwnf/viewer-layout ^2.14.0, docs/theme-components.md) for one theme
// or sub-theme node.
//
// The graph-resolution rules (`buildThemePictures`) are kept as a pure
// function, independent of Vue reactivity and the exhibition data layer, so
// they can be unit-tested against a small fixture
// (useThemePictures.test.js) without mounting translations/i18n. The
// `useThemePictures` composable below is a thin wrapper that supplies live
// data.
//
// A curated picture's `related`/`backRelated` targets are resolved against
// `pictureById` — the WHOLE theme tree's picture index (themes.js), not just
// this node's own `pictures[]` — because `theme_item_related` rows can name
// a picture curated under a *different* theme entirely
// (`related[].theme_backward_compatibility`). Scoping the resolution to the
// current node, as the pre-migration Theme.vue's own `relatedTo` map did, is
// exactly what silently dropped a cross-theme link; see viewer-layout's
// docs/theme-components.md, "Why cross-theme related links are the
// website's job, not the component's".

/**
 * @param nodePictures - the node's own curated selections, in curator order
 *   (themes.js's `themePictures(node)`)
 * @param deps.pictureById - Map<pictureId, rawPicture> for EVERY picture in
 *   the whole tree
 * @param deps.resolvePicture - (rawPicture) => the base
 *   `{ id, image, imageAlt, name, detail, to }` shape — node-independent,
 *   reused for `nodePictures` themselves and for any related/backRelated
 *   target, wherever in the tree it is curated
 * @param deps.imageCaptionFor - (rawPicture) => THIS node's own curated
 *   `image_caption` for that picture (the same picture curated under a
 *   different node can carry a different caption)
 * @param deps.fieldsFor - (rawPicture) => THIS node's own panel-only
 *   `fields` array (alsoKnownAs / artist names / dates) for the picture
 * @param deps.relationText - (link) => the forward relation's text
 * @param deps.reciprocalText - (link) => the backward relation's text
 */
export function buildThemePictures(nodePictures, deps) {
  const {
    pictureById: byId, resolvePicture, imageCaptionFor, fieldsFor, relationText, reciprocalText,
  } = deps

  return (nodePictures ?? []).map((raw) => {
    const related = (raw.related ?? [])
      .map((link) => {
        const target = byId.get(link.picture_item_id)
        return target ? { picture: resolvePicture(target), text: relationText(link) } : null
      })
      .filter(Boolean)

    // Every OTHER picture anywhere in the tree whose own `related` names
    // this one — scanning the whole-tree map, not just this node's
    // siblings, is what lets a target on another theme's page still show
    // "related to" back at its source.
    const backRelated = []
    for (const other of byId.values()) {
      for (const link of other.related ?? []) {
        if (link.picture_item_id === raw.picture_item_id) {
          backRelated.push({ picture: resolvePicture(other), reciprocalText: reciprocalText(link) })
        }
      }
    }

    return {
      ...resolvePicture(raw),
      imageCaption: imageCaptionFor(raw),
      fields: fieldsFor(raw),
      // Not part of PictureGallery/PictureNarrative's own contract — kept so
      // Theme.vue can still turn a selection back into the legacy-compatible
      // `?image=<display_order>` route param without a second, parallel
      // lookup of the raw pictures.
      displayOrder: raw.display_order,
      related,
      backRelated,
    }
  })
}

/** The live composable: resolves `node`'s pictures against the exhibition's
 * parent records, translations and the current locale — see
 * `buildThemePictures` for the graph-resolution rules this wraps. */
export function useThemePictures(node) {
  const { t, locale } = useI18n()

  function resolvePicture(raw) {
    const parent = pictureParent(raw)
    const name = parent ? labelOf('items', parent.id) : ''
    return {
      id: raw.picture_item_id,
      image: raw.image_url,
      imageAlt: name,
      name: mdInline(name),
      detail: itemDetailString(parent),
      to: parent ? itemRoute(parent) : null,
    }
  }

  function imageCaptionFor(raw) {
    if (!node.value?.id) return ''
    return tr('themes', `${node.value.id}/${raw.picture_item_id}`, locale.value).image_caption ?? ''
  }

  // Legacy showed no label at all for artist names/dates, only for "also
  // known as" — kept exactly, now as a `fields` row with an empty label
  // rather than a bare template line.
  function fieldsFor(raw) {
    const parent = pictureParent(raw)
    if (!parent) return []
    const sheet = tr('items', parent.id, defaultLang)
    const fields = []
    if (sheet.alternate_name) {
      fields.push({ label: `${t('sheet.field.alsoKnownAs')}:`, value: mdInline(sheet.alternate_name) })
    }
    if (parent.artist_names?.length) fields.push({ label: '', value: parent.artist_names.join(', ') })
    if (sheet.dates) fields.push({ label: '', value: sheet.dates })
    return fields
  }

  function relationText(link) {
    return link?.descriptions?.[locale.value] ?? link?.descriptions?.en ?? ''
  }

  function reciprocalText(link) {
    return link?.reciprocal_descriptions?.[locale.value] ?? link?.reciprocal_descriptions?.en ?? ''
  }

  return computed(() => buildThemePictures(themePictures(node.value), {
    pictureById: pictureById.value,
    resolvePicture,
    imageCaptionFor,
    fieldsFor,
    relationText,
    reciprocalText,
  }))
}
