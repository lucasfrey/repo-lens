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

export type ScriptsInfo = {
    dev?: string;
    build?: string;
    start?: string;
};

export type DependenciesInfo = {
    ui: string[];
    state: string[];
    styling: string[];
};

export function parsePackageJson(pkg: Record<string, unknown>): {
    scripts: ScriptsInfo;
    dependencies: DependenciesInfo;
} {
    const scripts = (pkg["scripts"] ?? {}) as Record<string, string>;
    const deps = {
        ...((pkg["dependencies"] ?? {}) as Record<string, string>),
        ...((pkg["devDependencies"] ?? {}) as Record<string, string>),
    };
    const depKeys = Object.keys(deps);

    return {
        scripts: {
            dev: scripts["dev"],
            build: scripts["build"],
            start: scripts["start"],
        },
        dependencies: {
            ui: depKeys.filter((d) => UI_LIBS.includes(d)),
            state: depKeys.filter((d) => STATE_LIBS.includes(d)),
            styling: depKeys.filter((d) => STYLING_LIBS.includes(d)),
        },
    };
}
