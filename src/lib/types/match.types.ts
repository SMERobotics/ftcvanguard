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

export type ScheduleStation =
    | "Red1"
    | "Red2"
    | "Red3"
    | "Blue1"
    | "Blue2"
    | "Blue3";

export interface ScheduleTeamAttributes {
    surrogate: boolean;
    noShow: boolean;
    dq: boolean;
    onField: boolean;
}

export interface ScheduleTeam {
    number: number;
    name: string;
    station: ScheduleStation;
    attributes: ScheduleTeamAttributes;
}

export interface ScheduleMatchNumber {
    id: number;
    series: number;
    match: number;
}

export interface ScheduleMatchTimes {
    scheduled: string | null;
    queuing: string | null;
    actual: string | null;
    results: string | null;
}

export interface ScheduleMatchResults {
    scoreRedFinal: number;
    scoreBlueFinal: number;
    redWins: boolean;
    blueWins: boolean;
}

export interface ScheduleMatch {
    name: string;
    type: MatchType;
    number: ScheduleMatchNumber;
    field: string;
    times: ScheduleMatchTimes;
    teams: ScheduleTeam[];
    results: ScheduleMatchResults | null;
}

export interface ScheduleResponse {
    schedule: ScheduleMatch[];
}
