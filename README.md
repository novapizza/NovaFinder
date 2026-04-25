# NovaFinder

A powerful, modern file manager for macOS built with Electron, React, and TypeScript.

## Features

- **Dual-pane navigation** — Browse and manage files side by side
- **Quick Look** — Preview files instantly without opening them
- **Pinned folders** — Keep your most-used directories one click away
- **Recent folders** — Quickly jump back to recently visited locations
- **Integrated terminal** — Run shell commands without leaving the app
- **Zip / Unzip** — Compress and extract archives natively
- **Git status badges** — See modified, staged, and untracked files at a glance
- **Syntax highlighting** — View source files with full language support via Shiki
- **PDF & Markdown preview** — Read documents inline
- **Wide path bar** — Always know where you are in the filesystem

## Tech Stack

| Layer | Technology |
|-------|------------|
| Shell | Electron 41 |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript 5 |
| Bundler | electron-vite / Vite 6 |
| State | Zustand |

## Getting Started

### Prerequisites

- Node.js 18+
- macOS (the app targets macOS; other platforms are untested)

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Package as a distributable `.dmg`

```bash
npm run dist
```

The output will be placed in the `out/` directory.

## Project Structure

```
NovaFinder/
├── src/
│   ├── main/        # Electron main process
│   ├── preload/     # Preload scripts (context bridge)
│   └── renderer/    # React frontend
├── electron.vite.config.ts
├── tsconfig.json
└── package.json
```

## License

MIT — see [LICENSE](LICENSE) for details.
