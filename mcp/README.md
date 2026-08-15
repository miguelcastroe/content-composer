# Content Composer MCP

Remote MCP layer for Content Composer.

## Responsibilities

The MCP executes deterministic Composer operations. The Composer Skill carries the editorial/production criteria.

Current tools:

- `composer_status`
- `validate_production_spec`
- `qa_production_spec`
- `build_composer_url`

`build_composer_url` returns the online Composer URL with a base64url-encoded Production Spec in the URL hash. The online UI reads that spec through `js/spec-loader.js` and preloads format, frame structure, text, layout and remote imagery.

## Run locally

```bash
cd mcp
npm install
npm start
```

Default endpoint:

```text
http://localhost:3000/mcp
```

Environment variables:

- `PORT` — HTTP port.
- `COMPOSER_URL` — online Composer URL. Defaults to `https://miguelcastroe.github.io/content-composer/`.

## Remote deployment

Deploy `mcp/` as a Node 20+ web service. The public MCP endpoint must be HTTPS and end at `/mcp`.

## Current limitation

Production Spec v1 accepts remote image URLs. Image upload/storage is the next MCP capability. Until that is implemented, a generated image needs a stable remotely accessible URL before the MCP can preload it automatically into the online Composer.
