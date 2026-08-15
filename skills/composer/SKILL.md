# Composer Skill

## Purpose
Turn approved Content OS output into a production-ready visual specification, generate or select the required visual assets, compose exact on-image text, run visual QA, and request export through Composer.

## Core principle
Composer does not merely place text. It composes text over imagery like a well-designed web hero: focal point first, protected areas, negative space, typographic block quality, contrast, and visual balance.

## Boundaries
- Content OS defines branding, idea, approved copy, matrix/presentation, format, product/SKU and visual intent.
- Composer may make production decisions but must not rewrite approved copy or change the approved idea unless explicitly asked.
- Social copy stays in the OS presentation; Composer handles on-image production.
- Approved imagery becomes frozen pixels before deterministic text composition.

## Workflow
1. Read the approved OS piece.
2. Normalize it into Composer Production Spec v1.
3. Resolve canonical brand assets before requesting or searching for new ones.
4. Generate or select the base image/frame(s) without inventing on-image text.
5. Freeze approved pixels.
6. Choose text zones using Hero Layout rules.
7. Send the Production Spec and assets to the Composer tool.
8. Render.
9. Run PASS / NO PASS QA.
10. If only layout fails, adjust layout parameters and render again; do not regenerate imagery.
11. Export the final PNG only after PASS.

## Hero Layout rules
### Focal point first
Protect faces, products, hands holding products, main actions and narrative details.

### Protected areas
Respect frame edges, numbering safe zones and variable protected areas around focal points.

### Negative space
Prefer visually quiet space. A position such as `top-left` is a preferred region, not a rigid coordinate.

### Typography
- Build a deliberate text block rather than a long line placed over the image.
- Prefer compact 2–3 line shapes when they improve composition.
- Avoid orphan words and visibly weak last lines.
- Maintain breathing room around numbers, faces, products and edges.
- Default font: Clash Grotesk.
- Default weight: Semibold.
- Default color: white unless contrast requires black.

### Balance
The text block must feel integrated with the image rather than pasted on top.

## PASS criteria
- Exact approved text.
- No collision with face, product, action or numbering.
- Adequate breathing room.
- Strong text-block shape and hierarchy.
- Legible contrast.
- Balanced composition.
- Correct output dimensions.

## NO PASS criteria
- Text blocks a face, product or key action.
- Text is too close to numbering or frame edges.
- One arbitrary long line when a better block is possible.
- Weak/orphaned line endings.
- Duplicate separators or accidental graphic artifacts.
- Layout feels mechanically placed rather than designed.

## Asset priority
1. Canonical asset already in `assets/<brand>/...`.
2. Asset supplied in the current production session.
3. External reference found on the web and validated before recurring use.

## Output formats
- Storyboard 16:9: 1920×1080, 3 or 4 logical frames.
- Single image 4:5: 1080×1350.

## Tool expectation
Use Composer MCP for deterministic execution. The Skill decides and validates; the MCP tool executes and exports.