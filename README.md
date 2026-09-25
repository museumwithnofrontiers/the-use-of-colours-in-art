# The Use of Colours in Art

The **Museum With No Frontiers — The Use of Colours in Art** exhibition, built from the published
dataset `@museumwnf/the-use-of-colours-in-art-data`.

A DXA exhibition is the exhibition family's website with this exhibition's data. Its
pages, page shell, menu and legacy redirects are the family's, in
`@museumwnf/viewer-layout/dxa` (`exhibitionConfig`), over the family's data layer
in `@museumwnf/viewer-core/dxa`. What is this exhibition's own lives here: its
values, its palette, its texts and its tests. The platform's architecture is
described in
[inventory-app#1510](https://github.com/museumwithnofrontiers/inventory-app/issues/1510).

| Package | Role |
| --- | --- |
| `@museumwnf/the-use-of-colours-in-art-data` | the dataset (JSON + `manifest.json`) |
| `@museumwnf/viewer-core` | the engine (routing, data access, texts, languages) and the family's data layer (`/dxa`) |
| `@museumwnf/viewer-layout` | the page structure and the family's pages (`/dxa`), themed through `theme/tokens.css` |
| `@museumwnf/viewer-i18n` | the texts shared with the other MWNF websites (this one receives the `exhibition` bundle) |

All four publish publicly to npmjs, so `npm install` needs no authentication.
Nothing in this repository holds a token.

## What is where

| Path | Contents |
| --- | --- |
| `src/dataset.config.js` | this exhibition's own values: its package, name and address, the colour of each source project's chip, the projects whose sheets carry the Explore-partner notice, its credits text |
| `src/main.js` | the entry point: the engine, the shared and own texts, the stylesheets |
| `src/styles/site.css` | the palette the theme reads |
| `theme/` | the visual identity: `tokens.css` (the normal surface), `overrides.css` (the escape hatch), `assets/` |
| `locales/` | this exhibition's own texts |
| `tests/` | the smoke test, which mounts the whole website against its dataset |

A page that has to differ from the family's is this exhibition's own component,
registered on the same route name as an override of what `exhibitionConfig`
returns; a page every exhibition needs changed is a change to
`@museumwnf/viewer-layout/dxa`.

## Texts

The texts every MWNF exhibition shares — the menu, the item-sheet labels, the
editorial pages — come from
[`viewer-i18n`](https://github.com/museumwithnofrontiers/viewer-i18n) as the
`exhibition` bundle. `locales/` holds only what belongs to this exhibition, and may
overload any shared entry by spelling out the same name. The local file is
applied last: **local wins**, the only merge rule there is.

## Development

The preview runs in Docker; nothing needs to be installed on the host.

```bash
docker compose up
```

Then open <http://localhost:5173>. `npm run build` and `npm run test` are the
checks CI runs.

## Translator — editing the website's texts

You need a GitHub account and a browser. The files under `locales/` hold this
exhibition's own texts, one file per language (`en.json` is English). Texts
shared with the other websites are edited in
[`viewer-i18n`](https://github.com/museumwithnofrontiers/viewer-i18n) the same
way; the museum content arrives translated in the dataset.

1. Open `locales/` on this repository's GitHub page and click the language file.
2. Click the pencil (✏️). Change only the text after the colon; the entry's
   name before it stays as it is.
3. Click "Commit changes…", then "Propose changes".
4. A green tick on the automatic check means the change goes live by itself
   a few minutes later; otherwise a comment says what to fix.

A text is just text, with Markdown if you want (`**bold**`, `*italic*`,
`[a link](https://example.org)`). It may not contain HTML, or `{` and `}`.

## Webdesigner — theming the website

The visual identity lives in `theme/`: `tokens.css` (colours, fonts, spacing),
`overrides.css` (escape hatch) and `assets/`. A change to a page or a
component itself is a request for `@museumwnf/viewer-layout`: open an issue
there.

## Deployment

Every push to `main` builds and publishes the website to
<https://museumwithnofrontiers.github.io/the-use-of-colours-in-art/> through the reusable workflows in
[`museumwithnofrontiers/viewer-workflows`](https://github.com/museumwithnofrontiers/viewer-workflows).
