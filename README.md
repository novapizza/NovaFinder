# NovaFinder

A powerful, modern file manager for macOS built with Electron, React, and TypeScript.

## Features

### Navigation & Views
- **Dual-pane navigation** — Browse and manage files side by side, with optional sync
- **Four view modes** — List, Column, Gallery, and Icon/Grid
- **Editable breadcrumb path bar** — Click to type a path or jump up the hierarchy
- **Back / forward / up** with full history per pane
- **Pinned favorites & recent folders** — One-click access to where you work
- **Smart Folders** — Saved searches for kind, size, name, and content
- **Arrow-key navigation** through file lists

### File Operations
- Copy, cut, paste, duplicate, single-file rename
- Move to Trash, Empty Trash, cross-volume move
- Zip / Unzip
- New folder / new file
- Drag-and-drop move (basic)

### Search & Metadata
- Filename and in-folder content search
- Filters by kind and size
- **Color tags** (7 colors) and a Get Info modal
- Hidden files toggle (⇧⌘.)

### Preview
- **Quick Look** (Space) — image, video, PDF, text, HTML, and syntax-highlighted source via Shiki
- Toggleable preview panel (⌘⇧P)

### Sidebar
- Favorites, Smart Folders, Volumes, Tags, Trash, and live disk usage

### System Integration
- Open with default app, Reveal in Finder, Open in Terminal
- Copy path / copy name from context menu
- **Git status badges** — modified, staged, and untracked at a glance
- File watching with auto-refresh on external changes

### Appearance
- **Light / Dark / System** theme — follows macOS appearance live by default

> See [features.html](features.html) for the full feature inventory and parity gaps vs macOS Finder.

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
│   ├── main/        # Electron main process (IPC, fs, tags, watcher)
│   ├── preload/     # Preload scripts (context bridge)
│   └── renderer/    # React frontend
│       ├── components/  # Toolbar, Sidebar, FileList, PreviewPanel, …
│       ├── hooks/       # useTheme, useKeyboard, useFileOps, …
│       └── store/       # Zustand stores (panes, tags, search, …)
├── features.html        # Feature inventory & Finder parity gaps
├── electron.vite.config.ts
├── tsconfig.json
└── package.json
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘← / ⌘→ | Back / Forward |
| ⌘↑ | Up one folder |
| Space | Quick Look |
| ⌘⇧P | Toggle preview panel |
| ⇧⌘. | Toggle hidden files |
| ⌘A | Select all |
| ⌘C / ⌘X / ⌘V | Copy / Cut / Paste |
| ⌘D | Duplicate |
| ⌘⌫ | Move to Trash |
| ⌘I | Get Info |

## License

MIT — see [LICENSE](LICENSE) for details.
