# NovaFinder

An open-source alternative file manager for macOS, built because Finder leaves a lot on the table.

> **Status:** Beta. NovaFinder is a *companion* to Finder, not a replacement — macOS doesn't actually allow replacing Finder, and you shouldn't trust any single file manager (including this one) with your only copy of anything. Back up your data.

## Why this exists

Finder is fine for the 80% case and frustrating for the rest. NovaFinder focuses on the parts Finder is weakest at:

- **Saved searches that actually stick around** — Smart Folders for kind / size / name / content, surfaced in the sidebar.
- **Two panes, one window** — the single biggest productivity gap vs. Finder for anyone who moves files around for a living.
- **A Quick Look that understands code** — syntax-highlighted previews via Shiki, plus images, video, PDF, HTML, and text.
- **Git-aware browsing** — modified / staged / untracked badges right in the file list.

If none of those sound like a problem you have, Finder is probably already good enough. If two or more do, give NovaFinder a try.

## See it in action

> The GIFs below live in [docs/gifs/](docs/gifs/). If you're viewing this on GitHub and they're missing, the project hasn't shipped its first release yet.

### Smart Folders — saved searches in the sidebar
![Smart Folders demo](docs/gifs/smart-folders.gif)

### Dual-pane file moves
![Dual-pane demo](docs/gifs/dual-pane.gif)

### Quick Look with syntax-highlighted source
![Quick Look code preview](docs/gifs/quicklook-code.gif)

### Git status badges in the file list
![Git status badges](docs/gifs/git-badges.gif)

## Install

Pre-built, notarized `.dmg` releases are on the [Releases page](../../releases). Or build from source — see below.

## Features

### Navigation & Views
- **Dual-pane navigation** — browse and manage files side by side, with optional sync
- **Four view modes** — List, Column, Gallery, and Icon/Grid
- **Editable breadcrumb path bar** — click to type a path or jump up the hierarchy
- **Back / forward / up** with full history per pane
- **Pinned favorites & recent folders**
- **Smart Folders** — saved searches for kind, size, name, and content
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

## Building from source

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

## Contributing

Issues and PRs welcome. This is a side project — response times vary. Bug reports for data-loss scenarios get priority over feature requests.

## License

MIT — see [LICENSE](LICENSE) for details.
