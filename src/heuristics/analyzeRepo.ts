import type { RepoData } from "../github/client.js";
import type { RepoInsights } from "../types.js";
import { parseReadme } from "../parser/readme.js";
import { parsePackageJson } from "../parser/packageJson.js";
import { parseFileTree } from "../parser/fileTree.js";

const ENTRY_POINT_CANDIDATES = [
    "src/index.tsx",
    "src/index.ts",
    "src/index.js",
    "src/main.tsx",
    "src/main.ts",
    "src/main.js",
    "app/page.tsx",
    "app/page.ts",
    "app/layout.tsx",
    "pages/index.tsx",
    "pages/index.ts",
    "pages/index.js",
    "index.ts",
    "index.js",
    "server.ts",
    "server.js",
    "main.py",
    "app.py",
    "main.go",
];

function detectProjectType(
    pkg: Record<string, unknown> | null,
    filePaths: string[],
): string {
    if (!pkg) {
        if (filePaths.includes("Cargo.toml")) return "Rust";
        if (filePaths.includes("go.mod")) return "Go";
        if (filePaths.some((p) => p.endsWith(".py"))) return "Python";
        return "Unknown";
    }

    const deps = {
        ...((pkg["dependencies"] ?? {}) as Record<string, string>),
        ...((pkg["devDependencies"] ?? {}) as Record<string, string>),
    };

    if (deps["next"]) return "Next.js";
    if (deps["nuxt"] || deps["nuxt3"] || deps["@nuxt/kit"]) return "Nuxt";
    if (deps["@sveltejs/kit"]) return "SvelteKit";
    if (deps["@remix-run/node"] || deps["@remix-run/react"]) return "Remix";
    if (deps["gatsby"]) return "Gatsby";
    if (deps["astro"]) return "Astro";
    if (deps["react"]) return "React";
    if (deps["vue"]) return "Vue";
    if (deps["svelte"]) return "Svelte";
    if (deps["express"]) return "Express (Node API)";
    if (deps["fastify"]) return "Fastify (Node API)";
    if (deps["koa"]) return "Koa (Node API)";

    return "Node.js";
}

export function analyzeRepo(data: RepoData): RepoInsights {
    const readme = data.readme ? parseReadme(data.readme) : {};

    const { scripts, dependencies } = data.packageJson
        ? parsePackageJson(data.packageJson)
        : { scripts: {}, dependencies: { ui: [], state: [], styling: [] } };

    const { filtered, importantFolders } = parseFileTree(data.tree);
    const filePaths = new Set(filtered.map((f) => f.path));

    const entryPoints = ENTRY_POINT_CANDIDATES.filter((p) => filePaths.has(p));
    const projectType = detectProjectType(data.packageJson, [...filePaths]);

    return {
        repoName: data.repo.full_name,
        description: data.repo.description ?? undefined,
        projectType,
        entryPoints,
        importantFolders,
        scripts,
        dependencies,
        readme,
    };
}
