import type { ScheduleMatch } from "../types/match.types";

function getScheduleMatchKey(match: ScheduleMatch) {
    return `${match.type}-${match.number.series}-${match.number.match}`;
}

class CurrentMatch {
    details = $state<ScheduleMatch | null>(null);

    get state() {
        return this.details?.name ?? "";
    }

    get field() {
        return this.details?.field ?? "";
    }

    is(match: ScheduleMatch) {
        return (
            this.details !== null &&
            getScheduleMatchKey(this.details) === getScheduleMatchKey(match)
        );
    }

    select(match: ScheduleMatch) {
        this.details = match;
    }

    clear() {
        this.details = null;
    }

    toggle(match: ScheduleMatch) {
        if (this.is(match)) {
            this.clear();
            return;
        }

        this.select(match);
    }

    sync(matches: ScheduleMatch[]) {
        if (!this.details) return;

        const selectedKey = getScheduleMatchKey(this.details);
        this.details =
            matches.find((match) => getScheduleMatchKey(match) === selectedKey) ??
            null;
    }
}

export const currentMatch = new CurrentMatch();
