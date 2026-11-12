import { createStandardViewer, textsByLanguage } from '@museumwnf/viewer-core'
import { catalogues as sharedTexts } from '@museumwnf/viewer-i18n/exhibition'
import '@museumwnf/viewer-layout/style.css'
import '@museumwnf/viewer-layout/dxa/exhibition.css'
import '../theme/tokens.css'
import '../theme/overrides.css'
import config from './dataset.config.js'

// Every locales/<lang>.json holds this exhibition's own texts, and may overload
// any entry it receives. Local wins — that is the only merge rule there is.
createStandardViewer(config, {
  dictionary: sharedTexts,
  ownMessages: textsByLanguage(import.meta.glob('../locales/*.json', { eager: true })),
})
