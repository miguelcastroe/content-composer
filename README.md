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
- On-image text: Clash Grotesk, loaded locally from `fonts/clash-grotesk/`
- Local weights: 200 ExtraLight, 300 Light, 400 Regular, 500 Medium, 600 Semibold, 700 Bold

The Composer no longer depends on the Fontshare CDN for Clash Grotesk.

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
