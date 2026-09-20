import { createStandardViewer } from '@museumwnf/viewer-core'
import { catalogues as sharedTexts } from '@museumwnf/viewer-i18n/exhibition'
import '@museumwnf/viewer-layout/style.css'
import '../theme/tokens.css'
import '../theme/overrides.css'
import './styles/site.css'
import config from './dataset.config.js'

// Every locales/<lang>.json holds this exhibition's own texts, and may overload
// any entry it receives. Local wins — that is the only merge rule there is.
const localeFiles = import.meta.glob('../locales/*.json', { eager: true })
const ownTexts = {}
for (const [path, module] of Object.entries(localeFiles)) {
  const lang = path.split('/').pop().replace(/\.json$/, '')
  ownTexts[lang] = module.default
}

createStandardViewer(config, undefined, { dictionary: sharedTexts, ownMessages: ownTexts })
