import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import type { RepoInsights } from "../types.js";

const CALLOUT_META: Record<string, { label: string; icon: string }> = {
    NOTE: { label: "Note", icon: "ℹ️" },
    TIP: { label: "Tip", icon: "💡" },
    IMPORTANT: { label: "Important", icon: "❗" },
    WARNING: { label: "Warning", icon: "⚠️" },
    CAUTION: { label: "Caution", icon: "🔥" },
};

function transformCallouts(html: string): string {
    return html.replace(
        /<blockquote>\n<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n([\s\S]*?)<\/blockquote>/gi,
        (_match, type: string, inner: string) => {
            const meta = CALLOUT_META[type.toUpperCase()];
            const body = inner.replace(/<\/p>\s*$/, "").trim();
            return `<div class="callout callout-${type.toLowerCase()}"><p class="callout-label">${meta.icon} ${meta.label}</p><p>${body}</p></div>`;
        },
    );
}

function renderMarkdown(content: string): string {
    return transformCallouts(marked(content) as string);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// In dev (tsx): __dirname is src/generator. In build: build/generator.
// Templates live at src/templates/<name>/ — resolve relative to project root.
const BUILTIN_TEMPLATES_DIR = path.resolve(__dirname, "../../src/templates");

function resolveTemplateDir(template: string): string {
    // Treat values starting with . / \ as filesystem paths (relative to cwd)
    if (template.startsWith(".") || path.isAbsolute(template)) {
        return path.resolve(process.cwd(), template);
    }
    return path.join(BUILTIN_TEMPLATES_DIR, template);
}

function li(content: string): string {
    return `<li>${content}</li>`;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Converts inline markdown to HTML. Handles (in priority order):
 *   [![alt](imgUrl)](linkUrl)  → linked badge <img> inside <a>
 *   ![alt](imgUrl)             → bare <img>
 *   [text](url)                → <a> link
 *   `code`                      → <code>
 * Plain text segments are HTML-escaped. Only https?:// URLs are accepted.
 */
function renderInlineMarkdown(text: string): string {
    const result: string[] = [];
    let lastIndex = 0;
    // Group indices:
    // 1,2,3 → linked badge: alt, imgUrl, linkUrl
    // 4,5   → bare image: alt, imgUrl
    // 6,7   → regular link: text, url
    // 8     → code span
    const pattern =
        /\[!\[([^\]]*)\]\((https?:\/\/[^)]+)\)\]\((https?:\/\/[^)]+)\)|!\[([^\]]*)\]\((https?:\/\/[^)]+)\)|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|`([^`]+)`/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        result.push(escapeHtml(text.slice(lastIndex, match.index)));

        if (match[1] !== undefined) {
            // [![alt](imgUrl)](linkUrl) — linked badge
            result.push(
                `<a href="${match[3]}" target="_blank" rel="noopener noreferrer">` +
                    `<img src="${match[2]}" alt="${escapeHtml(match[1])}" class="badge" /></a>`,
            );
        } else if (match[4] !== undefined) {
            // ![alt](imgUrl) — bare image
            result.push(
                `<img src="${match[5]}" alt="${escapeHtml(match[4])}" class="badge" />`,
            );
        } else if (match[6] !== undefined) {
            // [text](url) — regular link
            result.push(
                `<a href="${match[7]}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[6])}</a>`,
            );
        } else {
            // `inline code`
            result.push(`<code>${escapeHtml(match[8]!)}</code>`);
        }

        lastIndex = match.index + match[0].length;
    }

    result.push(escapeHtml(text.slice(lastIndex)));
    return result.join("");
}

export function buildSite(
    insights: RepoInsights,
    outDir: string,
    template = "default",
): void {
    const templateDir = resolveTemplateDir(template);
    const TEMPLATE_PATH = path.join(templateDir, "index.html");
    const CSS_PATH = path.join(templateDir, "style.css");

    if (!fs.existsSync(TEMPLATE_PATH)) {
        throw new Error(`Template not found: ${templateDir}`);
    }

    const templateHtml = fs.readFileSync(TEMPLATE_PATH, "utf-8");

    const scripts = [
        insights.scripts.dev
            ? li(
                  `<code>dev</code>: <code>${escapeHtml(insights.scripts.dev)}</code>`,
              )
            : "",
        insights.scripts.build
            ? li(
                  `<code>build</code>: <code>${escapeHtml(insights.scripts.build)}</code>`,
              )
            : "",
        insights.scripts.start
            ? li(
                  `<code>start</code>: <code>${escapeHtml(insights.scripts.start)}</code>`,
              )
            : "",
    ]
        .filter(Boolean)
        .join("\n              ");

    const dependencies = [
        insights.dependencies.ui.length
            ? li(
                  `<strong>UI:</strong> ${insights.dependencies.ui.map(escapeHtml).join(", ")}`,
              )
            : "",
        insights.dependencies.state.length
            ? li(
                  `<strong>State:</strong> ${insights.dependencies.state.map(escapeHtml).join(", ")}`,
              )
            : "",
        insights.dependencies.styling.length
            ? li(
                  `<strong>Styling:</strong> ${insights.dependencies.styling.map(escapeHtml).join(", ")}`,
              )
            : "",
    ]
        .filter(Boolean)
        .join("\n              ");

    const slots: Record<string, string> = {
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
        "{{HERO_IMAGE}}": insights.readme.heroImage
            ? `<img class="hero-img" src="${insights.readme.heroImage}" alt="${escapeHtml(insights.readme.title ?? insights.repoName)} logo" />`
            : "",
        "{{DESCRIPTION}}": renderInlineMarkdown(insights.description ?? ""),
        "{{PROJECT_TYPE}}": escapeHtml(insights.projectType),
        "{{README_TITLE}}": escapeHtml(
            insights.readme.title ?? insights.repoName,
        ),
        "{{README_INTRO}}": renderInlineMarkdown(insights.readme.intro ?? ""),
        "{{README_INSTALL}}": insights.readme.install
            ? renderMarkdown(insights.readme.install)
            : "",
        "{{SCRIPTS}}": scripts,
        "{{DEPENDENCIES}}": dependencies,
    };

    let html = templateHtml;
    for (const [slot, value] of Object.entries(slots)) {
        html = html.replaceAll(slot, value);
    }

    // Generated repo output goes in dist/preview/
    const previewDir = path.join(outDir, "preview");
    fs.mkdirSync(previewDir, { recursive: true });
    const outFile = path.join(previewDir, "index.html");
    fs.writeFileSync(outFile, html, "utf-8");
    fs.copyFileSync(CSS_PATH, path.join(previewDir, "style.css"));

    // Landing page becomes dist/index.html
    const LANDING_DIR = path.resolve(__dirname, "../../src/landing");
    const landingHtml = path.join(LANDING_DIR, "index.html");
    const landingCss = path.join(LANDING_DIR, "style.css");
    const landingJs = path.join(LANDING_DIR, "generator.js");
    fs.mkdirSync(outDir, { recursive: true });
    if (fs.existsSync(landingHtml)) {
        fs.copyFileSync(landingHtml, path.join(outDir, "index.html"));
    }
    if (fs.existsSync(landingCss)) {
        fs.copyFileSync(landingCss, path.join(outDir, "landing.css"));
    }
    if (fs.existsSync(landingJs)) {
        // Embed template files into generator.js so it works standalone in the browser
        const templateHtmlEscaped = templateHtml
            .replace(/\\/g, "\\\\")
            .replace(/`/g, "\\`")
            .replace(/\$\{/g, "\\${");
        const templateCss = fs.readFileSync(CSS_PATH, "utf-8");
        const templateCssEscaped = templateCss
            .replace(/\\/g, "\\\\")
            .replace(/`/g, "\\`")
            .replace(/\$\{/g, "\\${");
        let generatorJs = fs.readFileSync(landingJs, "utf-8");
        generatorJs = generatorJs
            .replace("__TEMPLATE_HTML__", templateHtmlEscaped)
            .replace("__TEMPLATE_CSS__", templateCssEscaped);
        fs.writeFileSync(
            path.join(outDir, "generator.js"),
            generatorJs,
            "utf-8",
        );
    }

    console.log(`✓ Site generated → ${outFile}`);
}
