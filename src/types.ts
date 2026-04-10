export type RepoInsights = {
    repoName: string;
    description?: string;
    projectType: string;
    entryPoints: string[];
    importantFolders: { name: string; score: number }[];
    scripts: {
        dev?: string;
        build?: string;
        start?: string;
    };
    dependencies: {
        ui: string[];
        state: string[];
        styling: string[];
    };
    readme: {
        title?: string;
        intro?: string;
        install?: string;
    };
};
