# Code Agent Guidance

This repository is intentionally a very small static website. Preserve that property.

## Architecture

- Production consists of checked-in static files served directly by GitHub Pages.
- Use semantic HTML, modern CSS, and small vanilla JavaScript ES modules.
- There is no build step and no production/runtime dependency graph.
- Prefer HTML and CSS over JavaScript whenever the platform can express the behavior cleanly.
- Do not introduce a framework, bundler, component system, CSS preprocessor, utility CSS framework, state library, or compatibility abstraction without concrete evidence that the current approach cannot satisfy a requirement.
- Keep files flat and responsibilities obvious. Create submodules only when `main.js` becomes materially harder to understand as one file.
- Target current evergreen browsers. Prefer progressive enhancement and graceful degradation to browser-specific workarounds.

## General Guidelines

- Strongly bias toward simplicity.
- Less code is better code.
- Be concrete first; refactor only when repetition or complexity is real.
- Fix root causes rather than layering exceptions.
- Use descriptive names.
- Remove dead code aggressively.
- Do not add speculative or "just in case" compatibility paths.
- Treat smooth scrolling/media behavior, responsive layout, accessibility, and reduced-motion support as product requirements rather than polish.
- Do not autoplay audible media. Audio must require an explicit user action.

## Commands

Use npm scripts rather than invoking tools directly:

```bash
npm install
npm run dev
npm run lint
npm run check
npm run fix
```

- `npm run dev`: serve the repository locally at `http://127.0.0.1:4173` using the dev-only `serve` package.
- `npm run lint`: run Biome linting.
- `npm run check`: run Biome formatter/linter checks without modifying files.
- `npm run fix`: apply safe Biome formatting/lint fixes.

Run `npm run check` before committing.

## Commits

Use scoped commits: `<scope>: <description>`.

Typical scopes: `scaffold`, `hero`, `video`, `audio`, `content`, `responsive`, `a11y`, `repo`.

Do not add AI attribution or `Co-Authored-By` trailers.
