import type { GitHubFile } from "../github/client.js";

const NOISE = new Set([
    "node_modules",
    "dist",
    "build",
    ".git",
    ".next",
    "coverage",
    ".turbo",
    ".cache",
    "out",
    ".vercel",
    ".nuxt",
    "__pycache__",
    ".pytest_cache",
]);

const FOLDER_SCORES = new Map<string, number>([
    ["src", 10],
    ["app", 9],
    ["pages", 8],
    ["components", 8],
    ["api", 7],
    ["server", 7],
    ["routes", 6],
    ["hooks", 6],
    ["store", 5],
    ["lib", 5],
    ["utils", 4],
    ["styles", 4],
    ["config", 3],
    ["public", 3],
    ["assets", 2],
    ["tests", 3],
    ["__tests__", 3],
]);

export type FolderScore = { name: string; score: number };

export function parseFileTree(tree: GitHubFile[]): {
    filtered: GitHubFile[];
    importantFolders: FolderScore[];
} {
    const filtered = tree.filter((file) => {
        const topLevel = file.path.split("/")[0];
        return !NOISE.has(topLevel);
    });

    const topLevelFolders = new Set<string>();
    for (const file of filtered) {
        const parts = file.path.split("/");
        if (parts.length > 1 || file.type === "tree") {
            topLevelFolders.add(parts[0]);
        }
    }

    const importantFolders: FolderScore[] = [];
    for (const folder of topLevelFolders) {
        const score = FOLDER_SCORES.get(folder);
        if (score !== undefined) importantFolders.push({ name: folder, score });
    }

    return {
        filtered,
        importantFolders: importantFolders.sort((a, b) => b.score - a.score),
    };
}
