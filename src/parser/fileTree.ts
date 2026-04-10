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

export function parseFileTree(tree: GitHubFile[]): { filtered: GitHubFile[] } {
    const filtered = tree.filter((file) => {
        const topLevel = file.path.split("/")[0];
        return !NOISE.has(topLevel);
    });

    return { filtered };
}
