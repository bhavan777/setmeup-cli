# Setmeup CLI

A CLI tool to scaffold React + Vite projects with presets or a custom stack. Choose a built-in preset, or use **Build Your Own Stack (BYOS)** to pick language, styling, and features—then get a project with the right dependencies and file structure.

## Features

- **Preset-based setup** — Start from predefined stacks (basic, minimal, professional, UI-focused).
- **Build Your Own Stack (BYOS)** — Pick TypeScript/JavaScript, Tailwind/CSS Modules/none, and optional features (ESLint, Prettier, Framer Motion, Lucide Icons, Radix UI). Save your combo as a custom preset.
- **File structure options** — Standard, feature-based, atomic design, or flat layout.
- **Custom presets** — Stored in `~/.setmeup/custom-presets.json`; list, reset, or delete them via CLI.

## Installation

**Global (recommended):**

```bash
npm install -g setmeup
```

**Run without installing (npx):**

```bash
npx setmeup init
```

## Usage

### Initialize a new project

```bash
setmeup init
```

You’ll be prompted to:

1. Choose a preset (built-in or **Build your own stack**).
2. Enter a project name.
3. Choose a file structure (standard, feature-based, atomic, flat).

The project is created in the current directory. Then:

```bash
cd <project-name>
npm install
npm run dev
```

### Other commands

| Command | Description |
|--------|-------------|
| `setmeup init` | Start interactive setup (preset + project name + structure). |
| `setmeup presets` | List all custom presets saved in `~/.setmeup`. |
| `setmeup clear-presets` | Delete all custom presets. |
| `setmeup clear --preset=<id>` | Delete one custom preset by ID. |
| `setmeup reset --preset=<id>` | Re-run BYOS for that preset (update and save again). |

## Built-in presets

| Preset | Description |
|--------|-------------|
| **basic** | React + Vite + TypeScript + Tailwind CSS. |
| **minimal** | React + Vite + JavaScript + CSS Modules. |
| **professional** | React + Vite + TypeScript + Tailwind + ESLint + Prettier. |
| **ui-focused** | React + Vite + TypeScript + Tailwind + Framer Motion + Lucide Icons + Radix UI (and class-variance-authority). |

## Build Your Own Stack (BYOS)

When you choose **Build your own stack** in `setmeup init`, you configure:

- **Language:** TypeScript or JavaScript.
- **Styling:** Tailwind CSS, CSS Modules, or None.
- **Features (optional):** ESLint, Prettier, Framer Motion, Lucide Icons, Radix UI.

You then name the preset (saved for future use) and choose the project file structure.

## File structure options

- **Standard** — `src/components/`, `src/pages/`, `App.tsx` (or `.jsx`).
- **Feature-based** — `src/features/ui/` (e.g. App moved under features).
- **Atomic Design** — `src/components/atoms/`, `src/components/molecules/`, App in `components`.
- **Flat** — All source files in `src/` (no component subfolders).

## Custom presets

- **Storage:** `~/.setmeup/custom-presets.json`.
- **List:** `setmeup presets`.
- **Delete one:** `setmeup clear --preset=<preset-id>`.
- **Delete all:** `setmeup clear-presets`.
- **Update a preset:** `setmeup reset --preset=<preset-id>` (runs BYOS again and overwrites that preset).

## Development

**Prerequisites:** Node.js, npm.

```bash
git clone <repo-url>
cd setmeup-cli
npm install
```

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm run dev` | Run CLI with `ts-node` (e.g. `npm run dev -- init`). |

The CLI entry point is `src/cli.ts`; built output is `dist/cli.js` (used by the `setmeup` bin).

## Project structure

```
setmeup-cli/
├── src/
│   ├── cli.ts              # CLI entry (Commander + Inquirer)
│   ├── lib/
│   │   ├── presets.ts      # Load/save/clear custom presets
│   │   └── setup.ts        # Copy template, customize, restructure
│   ├── presets/
│   │   ├── index.ts        # Preset collection
│   │   ├── basic/
│   │   ├── minimal/
│   │   ├── professional/
│   │   └── ui-focused/
│   └── types/
│       └── preset.ts       # Preset type definitions
├── templates/
│   └── react-vite/         # Base React + Vite template
├── package.json
├── tsconfig.json
└── README.md
```

## Tech stack (CLI)

- **commander** — CLI framework.
- **inquirer** — Interactive prompts.
- **chalk** — Terminal colors.
- **TypeScript** — Implementation and types.

## License

ISC
