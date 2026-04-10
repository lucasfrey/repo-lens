# RepoLens — Copilot Workspace Instructions

## What is RepoLens?

RepoLens is a lightweight tool that turns any GitHub repository into a clean, readable, static documentation site. The core goal is helping developers **understand a codebase quickly** — not generating generic docs.

> "Turn any GitHub repo into a clean, professional, easy-to-understand docs site in seconds."

---

## Target Users

- Indie developers
- Job seekers (portfolio from GitHub)
- Open source maintainers

---

## Tech Stack & Constraints

- **Templates**: Vanilla HTML
- **Styles**: Modern CSS (variables, grid, dark mode)
- **Logic**: Native JavaScript (fetch API, minimal interactivity)
- **CLI**: Node.js + TypeScript
- **No frameworks** — no React, Next.js, Vue, etc.

---

## Architecture

```
GitHub API → Parse (README, file tree, package.json) → Heuristics Engine → Static HTML → /dist
```

Optional: deploy output to GitHub Pages.

---

## Core Data Model

```ts
type RepoInsights = {
  projectType: string;
  entryPoints: string[];
  importantFolders: { name: string; score: number }[];
  scripts: {
    dev?: string;
    build?: string;
    start?: string;
  };
  dependencies: {
    ui: string[];
    state: string[];
    styling: string[];
  };
  readme: {
    title?: string;
    intro?: string;
    install?: string;
  };
};
```

---

## Heuristics Engine

The function `analyzeRepo(repo) → RepoInsights` applies these heuristics:

1. **Project type detection** — based on dependencies + config files (React, Vue, Next.js, Node API, etc.)
2. **Entry point detection** — `src/index.tsx`, `main.tsx`, `app/page.tsx`, etc.
3. **Important folder scoring** — rank `src`, `components`, `pages`, `api`, `hooks`, etc.
4. **Noise filtering** — ignore `node_modules`, `dist`, `build`, `.git`, `.next`, `coverage`
5. **Scripts extraction** — `dev`, `build`, `start`, `test` from `package.json`
6. **Dependency categorization** — UI, state, styling, data
7. **README parsing** — extract title, intro, install section, usage section
8. **File tree simplification** — remove noise, mark important nodes
9. **Clarity score** (optional) — based on README presence, scripts, structure

---

## MVP Output Sections

1. **Homepage** — repo name, description, README intro, "Start here"
2. **Structure** — simplified folder tree, highlighted important folders
3. **Key files** — rendered README, package.json insights
4. **Getting started** — extracted install/dev commands

---

## UX Principles

- Clean, modern UI
- Instant readability
- Opinionated structure (not a raw data dump)
- Collapsible sections
- Dark mode support
- Goal: "Understand this repo in 2 minutes"

---

## Philosophy

- Prefer **heuristics over AI**
- Solve **80% of common repos well**
- Keep scope **tight**
- **Ship fast**, make it useful immediately
- This is NOT a docs generator — it's a codebase comprehension tool

---

## Monetization (initial)

- Free CLI
- Paid premium templates/themes (Gumroad / Lemon Squeezy)

---

## Out of Scope (not MVP)

- AI summaries
- Onboarding guides
- Repo comparison
- Team-focused insights
- GitHub integration (auto deploy)
- Private repo support
