export type GitHubFile = {
    path: string;
    type: "blob" | "tree";
    size?: number;
};

export type GitHubRepo = {
    name: string;
    full_name: string;
    description: string | null;
    default_branch: string;
    owner: {
        login: string;
        avatar_url: string;
    };
};

export type RepoData = {
    repo: GitHubRepo;
    tree: GitHubFile[];
    readme: string | null;
    packageJson: Record<string, unknown> | null;
};

export async function fetchRepo(
    ownerRepo: string,
    token?: string,
): Promise<RepoData> {
    const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const [owner, repo] = ownerRepo.split("/");
    if (!owner || !repo)
        throw new Error(
            `Invalid repo format. Expected "owner/repo", got "${ownerRepo}"`,
        );

    const base = "https://api.github.com";

    const repoRes = await fetch(`${base}/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok)
        throw new Error(
            `Failed to fetch repo: ${repoRes.status} ${repoRes.statusText}`,
        );
    const repoData = (await repoRes.json()) as GitHubRepo;

    const treeRes = await fetch(
        `${base}/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`,
        { headers },
    );
    if (!treeRes.ok)
        throw new Error(`Failed to fetch file tree: ${treeRes.status}`);
    const treeData = (await treeRes.json()) as { tree: GitHubFile[] };

    let readme: string | null = null;
    const readmeRes = await fetch(`${base}/repos/${owner}/${repo}/readme`, {
        headers,
    });
    if (readmeRes.ok) {
        const readmeData = (await readmeRes.json()) as {
            content: string;
            encoding: string;
        };
        if (readmeData.encoding === "base64") {
            readme = Buffer.from(
                readmeData.content.replace(/\n/g, ""),
                "base64",
            ).toString("utf-8");
        }
    }

    let packageJson: Record<string, unknown> | null = null;
    const pkgRes = await fetch(
        `${base}/repos/${owner}/${repo}/contents/package.json`,
        { headers },
    );
    if (pkgRes.ok) {
        const pkgData = (await pkgRes.json()) as {
            content: string;
            encoding: string;
        };
        if (pkgData.encoding === "base64") {
            try {
                packageJson = JSON.parse(
                    Buffer.from(
                        pkgData.content.replace(/\n/g, ""),
                        "base64",
                    ).toString("utf-8"),
                ) as Record<string, unknown>;
            } catch {
                // not a valid JSON package.json — skip
            }
        }
    }

    return { repo: repoData, tree: treeData.tree, readme, packageJson };
}
