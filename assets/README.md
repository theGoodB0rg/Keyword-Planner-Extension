# Assets guide

This repo uses vector sources in `assets/src/` to generate all raster images for the extension, store listings, and social cards.

Sources:
- `assets/src/logo.svg` (standard, with drop shadow): used for 128px+, store, and social.
- `assets/src/logo-small.svg` (thicker glyph, no shadow): used for 16/32/48px icons and toolbar icons to keep them crisp.

## Generate locally
```bash
npm i
npm run assets
```

Outputs go to `assets/dist/**`.

## What gets exported

- Extension icons (PNG):
  - assets/dist/icons/icon-16.png (small source)
  - assets/dist/icons/icon-32.png (small source)
  - assets/dist/icons/icon-48.png (small source)
  - assets/dist/icons/icon-128.png (standard source)
  - assets/dist/icons/icon-256.png (standard source)
- Toolbar/action icons:
  - assets/dist/icons/toolbar-16.png (small source)
  - assets/dist/icons/toolbar-32.png (small source)
- Social:
  - assets/dist/social/og-1200x630.png
  - assets/dist/social/square-1080.png
- Chrome Web Store promo tiles (optional):
  - assets/dist/store/cws-promo-small-440x280.png
  - assets/dist/store/cws-promo-large-920x680.png
- Favicons (for docs/site):
  - assets/dist/favicon/favicon-16.png
  - assets/dist/favicon/favicon-32.png
  - assets/dist/favicon/favicon-180.png (Apple touch)
  - assets/dist/favicon/favicon-192.png
  - assets/dist/favicon/favicon-512.png

## Manifest snippet

Update your `manifest.json` if present:

```json
{
  "icons": {
    "16": "assets/dist/icons/icon-16.png",
    "32": "assets/dist/icons/icon-32.png",
    "48": "assets/dist/icons/icon-48.png",
    "128": "assets/dist/icons/icon-128.png"
  },
  "action": {
    "default_icon": {
      "16": "assets/dist/icons/toolbar-16.png",
      "32": "assets/dist/icons/toolbar-32.png"
    }
  }
}
```

## Tips for a polished look

- Keep a single brand color pair and consistent rounded-corner radius.
- Screenshots for the store: 1280×800 PNGs with brief annotations and consistent browser frame.
- Prefer SVG for source art; generate PNG/WebP only for targets that require it.
- If you change `assets/src/logo.svg`, the GitHub Action rebuilds and commits `assets/dist/**` automatically.