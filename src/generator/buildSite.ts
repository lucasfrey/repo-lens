import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RepoInsights } from "../types.js";

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

    const importantFolders = insights.importantFolders
        .map((f) =>
            li(
                `<code>${escapeHtml(f.name)}/</code><span class="score">score: ${f.score}</span>`,
            ),
        )
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
        "{{DESCRIPTION}}": renderInlineMarkdown(insights.description ?? ""),
        "{{PROJECT_TYPE}}": escapeHtml(insights.projectType),
        "{{README_TITLE}}": escapeHtml(
            insights.readme.title ?? insights.repoName,
        ),
        "{{README_INTRO}}": renderInlineMarkdown(insights.readme.intro ?? ""),
        "{{README_INSTALL}}": insights.readme.install ?? "",
        "{{SCRIPTS}}": scripts,
        "{{IMPORTANT_FOLDERS}}": importantFolders,
        "{{DEPENDENCIES}}": dependencies,
    };

    let html = templateHtml;
    for (const [slot, value] of Object.entries(slots)) {
        html = html.replaceAll(slot, value);
    }

    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "index.html");
    fs.writeFileSync(outFile, html, "utf-8");
    fs.copyFileSync(CSS_PATH, path.join(outDir, "style.css"));
    console.log(`✓ Site generated → ${outFile}`);
}
