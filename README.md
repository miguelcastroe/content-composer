# Content Composer

Minimal browser-based compositor for social content production.

## Output formats

- Storyboard 16:9 — 1920×1080
- Single image 4:5 — 1080×1350

## Storyboard modes

- Separate frames
- Full storyboard image
- 3 or 4 logical frames
- Frame numbering with reserved safe zones

## Typography

- UI: Inter
- On-image text: Clash Grotesk

The `fonts/clash-grotesk/` folder is reserved for the local Clash Grotesk font files so the production build can stop depending on the Fontshare CDN.

## Structure

```text
content-composer/
├── index.html
├── css/
│   └── app.css
├── js/
│   └── app.js
├── assets/
│   ├── logos/
│   └── packshots/
├── fonts/
│   └── clash-grotesk/
└── README.md
```
