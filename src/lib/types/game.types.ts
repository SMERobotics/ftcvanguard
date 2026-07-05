const MatchResult = {
    WIN: "win",
    LOSS: "loss",
    TIE: "tie",
} as const;

export type MatchResult = (typeof MatchResult)[keyof typeof MatchResult];

export const Alliance = {
    RED: "red",
    BLUE: "blue",
} as const;

export type Alliance = (typeof Alliance)[keyof typeof Alliance];

export const Artifact = {
    PURPLE: "purple",
    GREEN: "green",
    NONE: "none",
} as const;

export type Artifact = (typeof Artifact)[keyof typeof Artifact];