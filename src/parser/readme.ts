export type ReadmeInfo = {
    title?: string;
    intro?: string;
    install?: string;
};

export function parseReadme(content: string): ReadmeInfo {
    const lines = content.split("\n");

    // Title: first # heading
    const titleLine = lines.find((l) => /^#\s+/.test(l));
    const title = titleLine ? titleLine.replace(/^#\s+/, "").trim() : undefined;

    // Intro: first non-empty paragraph that follows the title (before the next heading)
    let passedTitle = !titleLine;
    const introLines: string[] = [];
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
        // Strip HTML tags; leave markdown (images/links) for the renderer
        const cleaned = line.replace(/<[^>]+>/g, "").trim();
        if (cleaned) introLines.push(cleaned);
    }
    const intro = introLines.length > 0 ? introLines.join(" ") : undefined;

    // Install: content block under common install/getting-started headings.
    // Find the heading, then slice between it and the next heading to avoid
    // the multiline regex `$`-with-`m`-flag bug (which stops at end-of-line).
    const headingPattern =
        /^#{1,3}\s+(?:install(?:ation)?|getting\s+started|quick\s+start)[^\n]*/im;
    const headingMatch = content.match(headingPattern);
    let install: string | undefined;
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

    return { title, intro, install };
}
