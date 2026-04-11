/**
 * RepoLens Browser Generator
 * Ports the CLI pipeline (fetch → analyse → render) to run entirely in the browser.
 * Depends on: marked (CDN), JSZip (CDN) — both loaded before this script.
 */

// ── Parsers ──────────────────────────────────────────────────────────────────

const BADGE_DOMAINS = [
    "shields.io",
    "badgen.net",
    "codecov.io",
    "circleci.com",
    "travis-ci",
    "snyk.io",
    "sonarcloud.io",
    "coveralls.io",
    "badge.fury.io",
    "david-dm.org",
    "github.com/workflow/badge",
    "github.com/actions/workflow",
    "github.com/badges",
];

function isBadgeUrl(url) {
    return BADGE_DOMAINS.some((d) => url.includes(d));
}

function extractImageUrl(line) {
    const imgTag = /<img[^>]+src=["']([^"']+)["']/i.exec(line);
    if (imgTag?.[1] && !isBadgeUrl(imgTag[1])) return imgTag[1];
    const mdImg = /!\[[^\]]*\]\(([^)\s]+)\)/.exec(line);
    if (mdImg?.[1] && !isBadgeUrl(mdImg[1])) return mdImg[1];
    return undefined;
}

function parseReadme(content) {
    const lines = content.split("\n");

    let heroImage;
    for (const line of lines.slice(0, 30)) {
        const url = extractImageUrl(line);
        if (url) {
            heroImage = url;
            break;
        }
    }

    const titleLine = lines.find((l) => /^#\s+/.test(l));
    const title = titleLine ? titleLine.replace(/^#\s+/, "").trim() : undefined;

    let passedTitle = !titleLine;
    const introLines = [];
    for (const line of lines) {
        if (!passedTitle) {
            if (line === titleLine) passedTitle = true;
            continue;
        }
        if (/^#{1,6}\s/.test(line)) break;
        if (line.trim() === "") {
            if (introLines.length > 0) break;
            continue;
        }
        const cleaned = line.replace(/<[^>]+>/g, "").trim();
        if (cleaned) introLines.push(cleaned);
    }
    const intro = introLines.length > 0 ? introLines.join(" ") : undefined;

    const headingPattern =
        /^#{1,3}\s+(?:install(?:ation)?|getting\s+started|quick\s+start)[^\n]*/im;
    const headingMatch = content.match(headingPattern);
    let install;
    if (headingMatch?.index !== undefined) {
        const afterHeading = content.indexOf("\n", headingMatch.index);
        if (afterHeading !== -1) {
            const rest = content.slice(afterHeading + 1);
            const nextHeading = rest.search(/^#{1,3}\s/m);
            install = (
                nextHeading !== -1 ? rest.slice(0, nextHeading) : rest
            ).trim();
        }
    }

    return { title, intro, install, heroImage };
}

const UI_LIBS = [
    "react",
    "vue",
    "svelte",
    "solid-js",
    "preact",
    "@angular/core",
    "lit",
    "alpine",
];
const STATE_LIBS = [
    "redux",
    "@reduxjs/toolkit",
    "zustand",
    "mobx",
    "jotai",
    "recoil",
    "pinia",
    "vuex",
    "xstate",
    "nanostores",
];
const STYLING_LIBS = [
    "tailwindcss",
    "styled-components",
    "@emotion/react",
    "@emotion/styled",
    "sass",
    "less",
    "stitches",
    "@stitches/react",
    "unocss",
    "windicss",
];

function parsePackageJson(pkg) {
    const scripts = pkg.scripts ?? {};
    const deps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {}),
    };
    const depKeys = Object.keys(deps);
    return {
        scripts: {
            dev: scripts.dev,
            build: scripts.build,
            start: scripts.start,
        },
        dependencies: {
            ui: depKeys.filter((d) => UI_LIBS.includes(d)),
            state: depKeys.filter((d) => STATE_LIBS.includes(d)),
            styling: depKeys.filter((d) => STYLING_LIBS.includes(d)),
        },
    };
}

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

function parseFileTree(tree) {
    return tree.filter((f) => !NOISE.has(f.path.split("/")[0]));
}

// ── Heuristics ────────────────────────────────────────────────────────────────

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

function detectProjectType(pkg, filePaths) {
    if (!pkg) {
        if (filePaths.includes("Cargo.toml")) return "Rust";
        if (filePaths.includes("go.mod")) return "Go";
        if (filePaths.some((p) => p.endsWith(".py"))) return "Python";
        return "Unknown";
    }
    const deps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {}),
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

function analyzeRepo(data) {
    const readme = data.readme ? parseReadme(data.readme) : {};
    const { scripts, dependencies } = data.packageJson
        ? parsePackageJson(data.packageJson)
        : { scripts: {}, dependencies: { ui: [], state: [], styling: [] } };

    const filtered = parseFileTree(data.tree);
    const filePaths = new Set(filtered.map((f) => f.path));
    const entryPoints = ENTRY_POINT_CANDIDATES.filter((p) => filePaths.has(p));
    const projectType = detectProjectType(data.packageJson, [...filePaths]);

    let heroImage = readme.heroImage;
    if (heroImage && !heroImage.startsWith("http")) {
        const branch = data.repo.default_branch;
        const cleanPath = heroImage.replace(/^\.\//, "");
        heroImage = `https://raw.githubusercontent.com/${data.repo.full_name}/${branch}/${cleanPath}`;
    }

    return {
        repoName: data.repo.full_name,
        description: data.repo.description ?? undefined,
        avatarUrl: data.repo.owner.avatar_url,
        projectType,
        entryPoints,
        scripts,
        dependencies,
        readme: { ...readme, heroImage },
    };
}

// ── Renderer ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function renderInlineMarkdown(text) {
    const result = [];
    let lastIndex = 0;
    const pattern =
        /\[!\[([^\]]*)\]\((https?:\/\/[^)]+)\)\]\((https?:\/\/[^)]+)\)|!\[([^\]]*)\]\((https?:\/\/[^)]+)\)|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|`([^`]+)`/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        result.push(escapeHtml(text.slice(lastIndex, match.index)));
        if (match[1] !== undefined) {
            result.push(
                `<a href="${match[3]}" target="_blank" rel="noopener noreferrer"><img src="${match[2]}" alt="${escapeHtml(match[1])}" class="badge" /></a>`,
            );
        } else if (match[4] !== undefined) {
            result.push(
                `<img src="${match[5]}" alt="${escapeHtml(match[4])}" class="badge" />`,
            );
        } else if (match[6] !== undefined) {
            result.push(
                `<a href="${match[7]}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[6])}</a>`,
            );
        } else {
            result.push(`<code>${escapeHtml(match[8])}</code>`);
        }
        lastIndex = match.index + match[0].length;
    }
    result.push(escapeHtml(text.slice(lastIndex)));
    return result.join("");
}

const CALLOUT_META = {
    NOTE: { label: "Note", icon: "ℹ️" },
    TIP: { label: "Tip", icon: "💡" },
    IMPORTANT: { label: "Important", icon: "❗" },
    WARNING: { label: "Warning", icon: "⚠️" },
    CAUTION: { label: "Caution", icon: "🔥" },
};

function transformCallouts(html) {
    return html.replace(
        /<blockquote>\n<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n([\s\S]*?)<\/blockquote>/gi,
        (_match, type, inner) => {
            const meta = CALLOUT_META[type.toUpperCase()];
            const body = inner.replace(/<\/p>\s*$/, "").trim();
            return `<div class="callout callout-${type.toLowerCase()}"><p class="callout-label">${meta.icon} ${meta.label}</p><p>${body}</p></div>`;
        },
    );
}

function renderMarkdown(content) {
    return transformCallouts(marked.parse(content));
}

function li(content) {
    return `<li>${content}</li>`;
}

function buildHtml(insights) {
    const scripts = [
        insights.scripts?.dev
            ? li(
                  `<code>dev</code>: <code>${escapeHtml(insights.scripts.dev)}</code>`,
              )
            : "",
        insights.scripts?.build
            ? li(
                  `<code>build</code>: <code>${escapeHtml(insights.scripts.build)}</code>`,
              )
            : "",
        insights.scripts?.start
            ? li(
                  `<code>start</code>: <code>${escapeHtml(insights.scripts.start)}</code>`,
              )
            : "",
    ]
        .filter(Boolean)
        .join("\n");

    const dependencies = [
        insights.dependencies?.ui?.length
            ? li(
                  `<strong>UI:</strong> ${insights.dependencies.ui.map(escapeHtml).join(", ")}`,
              )
            : "",
        insights.dependencies?.state?.length
            ? li(
                  `<strong>State:</strong> ${insights.dependencies.state.map(escapeHtml).join(", ")}`,
              )
            : "",
        insights.dependencies?.styling?.length
            ? li(
                  `<strong>Styling:</strong> ${insights.dependencies.styling.map(escapeHtml).join(", ")}`,
              )
            : "",
    ]
        .filter(Boolean)
        .join("\n");

    const slots = {
        "{{REPO_NAME}}": escapeHtml(insights.repoName),
        "{{REPO_OWNER}}": escapeHtml(insights.repoName.split("/")[0]),
        "{{REPO_OWNER_URL}}": `https://github.com/${insights.repoName.split("/")[0]}`,
        "{{REPO_SHORT_NAME}}": escapeHtml(
            insights.repoName.split("/")[1] ?? insights.repoName,
        ),
        "{{REPO_URL}}": `https://github.com/${insights.repoName}`,
        "{{AVATAR_IMG}}": insights.avatarUrl
            ? `<img class="repo-avatar" src="${insights.avatarUrl}" alt="${escapeHtml(insights.repoName)} avatar" />`
            : "",
        "{{HERO_IMAGE}}": insights.readme?.heroImage
            ? `<img class="hero-img" src="${insights.readme.heroImage}" alt="${escapeHtml(insights.readme.title ?? insights.repoName)} logo" />`
            : "",
        "{{DESCRIPTION}}": renderInlineMarkdown(insights.description ?? ""),
        "{{PROJECT_TYPE}}": escapeHtml(insights.projectType),
        "{{README_TITLE}}": escapeHtml(
            insights.readme?.title ?? insights.repoName,
        ),
        "{{README_INTRO}}": renderInlineMarkdown(insights.readme?.intro ?? ""),
        "{{README_INSTALL}}": insights.readme?.install
            ? renderMarkdown(insights.readme.install)
            : "",
        "{{SCRIPTS}}": scripts,
        "{{DEPENDENCIES}}": dependencies,
    };

    let html = TEMPLATE_HTML;
    for (const [slot, value] of Object.entries(slots)) {
        html = html.replaceAll(slot, value);
    }
    return html;
}

// ── GitHub fetcher ─────────────────────────────────────────────────────────────

async function fetchRepo(ownerRepo, token) {
    const headers = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const base = "https://api.github.com";

    const repoRes = await fetch(`${base}/repos/${ownerRepo}`, { headers });
    if (!repoRes.ok)
        throw new Error(
            `Repo not found: ${repoRes.status} ${repoRes.statusText}`,
        );
    const repo = await repoRes.json();

    const treeRes = await fetch(
        `${base}/repos/${ownerRepo}/git/trees/${repo.default_branch}?recursive=1`,
        { headers },
    );
    if (!treeRes.ok)
        throw new Error(`Failed to fetch file tree: ${treeRes.status}`);
    const { tree } = await treeRes.json();

    let readme = null;
    const readmeRes = await fetch(`${base}/repos/${ownerRepo}/readme`, {
        headers,
    });
    if (readmeRes.ok) {
        const { content, encoding } = await readmeRes.json();
        if (encoding === "base64") readme = atob(content.replace(/\n/g, ""));
    }

    let packageJson = null;
    const pkgRes = await fetch(
        `${base}/repos/${ownerRepo}/contents/package.json`,
        { headers },
    );
    if (pkgRes.ok) {
        const { content, encoding } = await pkgRes.json();
        if (encoding === "base64") {
            try {
                packageJson = JSON.parse(atob(content.replace(/\n/g, "")));
            } catch {}
        }
    }

    return { repo, tree, readme, packageJson };
}

// ── Entry point ───────────────────────────────────────────────────────────────

function parseRepoInput(input) {
    const trimmed = input.trim();
    // Full GitHub URL
    const urlMatch = trimmed.match(/github\.com\/([^/?#\s]+\/[^/?#\s]+)/);
    if (urlMatch) return urlMatch[1].replace(/\.git$/, "");
    // owner/repo directly
    if (/^[^/\s]+\/[^/\s]+$/.test(trimmed)) return trimmed;
    return null;
}

async function generate(inputValue, token, onStatus) {
    const ownerRepo = parseRepoInput(inputValue);
    if (!ownerRepo)
        throw new Error("Invalid repo. Use owner/repo or a GitHub URL.");

    onStatus(`Fetching ${ownerRepo}…`);
    const data = await fetchRepo(ownerRepo, token);

    onStatus("Analysing…");
    const insights = analyzeRepo(data);

    onStatus("Building site…");
    const html = buildHtml(insights);

    onStatus("Packaging…");
    const zip = new JSZip();
    zip.file("index.html", html);
    zip.file("style.css", TEMPLATE_CSS);

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ownerRepo.replace("/", "-")}-repolens.zip`;
    a.click();
    URL.revokeObjectURL(url);

    return insights.repoName;
}

// ── Embedded templates ────────────────────────────────────────────────────────
// These are injected at build time by buildSite.ts so browser generator
// always stays in sync with the actual templates on disk.

const TEMPLATE_HTML = `__TEMPLATE_HTML__`;
const TEMPLATE_CSS = `__TEMPLATE_CSS__`;
