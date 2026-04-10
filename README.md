# RepoLens

> Turn any GitHub repo into a clean, readable docs site in seconds.

RepoLens fetches a GitHub repository, analyzes its structure using heuristics, and generates a static HTML documentation site — no AI, no frameworks, no fuss.

---

## Requirements

- Node.js 18+
- pnpm

---

## Installation

### Use globally (after build)

```sh
pnpm build
npm link   # or: pnpm link --global
```

Then run from anywhere:

```sh
repo-lens generate <owner/repo>
```

### Run without installing

```sh
pnpm dev -- generate <owner/repo>
```

---

## Usage

```sh
repo-lens generate <owner/repo> [options]
```

### Arguments

| Argument     | Description                                             |
| ------------ | ------------------------------------------------------- |
| `owner/repo` | The GitHub repository to analyze, e.g. `storybookjs/storybook` |

### Options

| Flag              | Alias | Default   | Description                                                     |
| ----------------- | ----- | --------- | --------------------------------------------------------------- |
| `--out <path>`    | `-o`  | `./dist`  | Output directory for the generated site                         |
| `--token <PAT>`   | `-t`  | —         | GitHub Personal Access Token (avoids rate limits)               |
| `--template <id>` | `-T`  | `default` | Template name (built-in) or path to a custom template directory |

---

## Examples

```sh
# Basic usage — output goes to ./dist
repo-lens generate storybookjs/storybook

# Custom output directory
repo-lens generate facebook/react --out ./my-docs

# With a GitHub token (recommended for frequent use)
repo-lens generate torvalds/linux --token ghp_yourtoken

# Using a different built-in template
repo-lens generate storybookjs/storybook --template minimal

# Using a custom/purchased template from a local path
repo-lens generate storybookjs/storybook --template ./my-premium-template
```

Open `dist/index.html` in a browser to view the generated site.

---

## Development

```sh
# Install dependencies
pnpm install

# Run in dev mode (no build step)
pnpm dev -- generate storybookjs/storybook

# Type-check
pnpm exec tsc --noEmit

# Build
pnpm build
```

---

## Output

The generated `dist/index.html` includes:

- **Project type** — detected from dependencies and config files (React, Next.js, Express, etc.)
- **Getting started** — install instructions extracted from the README
- **Scripts** — `dev`, `build`, and `start` commands from `package.json`
- **Entry points** — detected source entry files (e.g. `src/index.tsx`)
- **Key folders** — ranked by importance (e.g. `src`, `components`, `api`)
- **Dependencies** — categorized into UI, state, and styling libraries

The site supports **dark mode** automatically via CSS `prefers-color-scheme`.

---

## GitHub Token

Without a token, the GitHub API allows ~60 requests/hour per IP. Provide a [Personal Access Token](https://github.com/settings/tokens) (no scopes needed for public repos) to raise this to 5,000/hour:

```sh
repo-lens generate owner/repo --token ghp_yourtoken
```

---

## License

MIT
