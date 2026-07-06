const MatchType = {
    PRACTICE: "practice",
    QUAL: "qual",
    PLAYOFF: "playoff",
} as const;

export type MatchType = (typeof MatchType)[keyof typeof MatchType];

const MatchResult = {
    WIN: "win",
    LOSS: "loss",
    TIE: "tie",
} as const;

export type MatchResult = (typeof MatchResult)[keyof typeof MatchResult] | null;

const Alliance = {
    RED: "red",
    BLUE: "blue",
} as const;

export type Alliance = (typeof Alliance)[keyof typeof Alliance] | null;