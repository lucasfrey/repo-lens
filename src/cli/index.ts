import minimist from "minimist";
import { fetchRepo } from "../github/client.js";
import { analyzeRepo } from "../heuristics/analyzeRepo.js";
import { buildSite } from "../generator/buildSite.js";

const argv = minimist(process.argv.slice(2), {
    string: ["out", "token", "template"],
    alias: { o: "out", t: "token", T: "template" },
    default: { out: "./dist", template: "default" },
});

const [command, ownerRepo] = argv._ as [string?, string?];

if (command !== "generate" || !ownerRepo) {
    console.error(
        "Usage: repo-lens generate <owner/repo> [--out ./dist] [--token <PAT>] [--template <name|path>]\n" +
            "Example: repo-lens generate vercel/next.js\n" +
            "         repo-lens generate vercel/next.js --template minimal\n" +
            "         repo-lens generate vercel/next.js --template ./my-custom-template",
    );
    process.exit(1);
}

// ownerRepo is guaranteed non-undefined after the guard above
const repo = ownerRepo as string;
console.log(`Fetching ${repo}...`);

try {
    const token = (argv["token"] as string | undefined) ?? process.env["GITHUB_TOKEN"];
    const data = await fetchRepo(repo, token);
    console.log(`Analyzing ${data.repo.full_name}...`);
    const insights = analyzeRepo(data);
    console.log(`  Project type : ${insights.projectType}`);
    console.log(
        `  Entry points : ${insights.entryPoints.join(", ") || "none detected"}`,
    );
    buildSite(insights, argv["out"] as string, argv["template"] as string);
} catch (err) {
    console.error("Error:", (err as Error).message);
    process.exit(1);
}
