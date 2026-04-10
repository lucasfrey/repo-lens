export type RepoInsights = {
    repoName: string;
    description?: string;
    avatarUrl?: string;
    projectType: string;
    entryPoints: string[];
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
        heroImage?: string;
    };
};
