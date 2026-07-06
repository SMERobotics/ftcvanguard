export const Artifact = {
    PURPLE: "purple",
    GREEN: "green",
    NONE: "none",
} as const;

export type Artifact = (typeof Artifact)[keyof typeof Artifact];