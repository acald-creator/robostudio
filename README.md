# RoboStudio

RoboStudio is a dense, keyboard-first desktop robotics/simulation workbench built with Angular + Tauri + Three.js.

It is inspired by power-user tools like Blender, Cursor, and VS Code, with a tiling workspace, scene-based workflows, and simulation-focused panels.

## Tech Stack

- Angular 20
- Tauri 2
- Three.js (`three`) + `camera-controls`
- UnoCSS
- Vitest

## Current Capabilities

- Dense tiling multi-panel layout
- Split/close panel operations
- Draggable split resizing
- Scene-based guided creation loop
- Scene switching (blank, rover, robot arm, carbuncle-style placeholder)
- Three.js viewport with pro-style camera controls
- Viewport-first mobile shell (under 900px) with bottom tabs
- Installable web app manifest (no service worker / offline cache yet)
- Local/self-hosted fonts (no remote Google font fetch at runtime)

## Repository Structure

- `src/` Angular frontend
- `src-tauri/` Desktop shell and Rust/Tauri config
- `docs/` Project documentation and roadmap

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Rust toolchain (for Tauri desktop)
- Tauri prerequisites for your OS

### Install

```bash
npm install
```

### Run Web Dev Server

```bash
npm run start
```

### Run Desktop (Tauri)

```bash
npm run tauri dev
```

### Build Frontend

```bash
npm run build
```

The production output is a static site at `dist/robostudio/browser/` and can be hosted on GitHub Pages, Cloudflare Pages, or Vercel. Below 900px the workbench swaps the desktop tiling chrome for a viewport-first shell (View / Scene / Inspect / Log / Graph). A web app manifest is included for home-screen install; there is no service worker yet, so deploys are not cached offline.

## Testing

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

## Styling

- UnoCSS is configured in `uno.config.ts`
- Generated utilities are written to `src/uno.css`

Regenerate utilities manually:

```bash
npm run build:css
```

## Docs

- MVP remainder roadmap: [`docs/MVP_REMAINDER_ROADMAP.md`](docs/MVP_REMAINDER_ROADMAP.md)

## Notes

- Desktop keeps the dense tiling workbench; phones use a compact viewport-first shell.
- This project currently uses a strict dense UI approach and may enforce small typography and compact controls.
- Angular bundle budget warnings are currently expected while the MVP feature surface is expanding.
