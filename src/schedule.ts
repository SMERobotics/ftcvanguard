export const EVENT = 'USMOKSKCWLT1';
export const TEAM = 26855;
export const TIME_ZONE = 'America/Chicago';
export const SCHEDULE_URL = `http://100.64.135.121:8000/api/v2/schedule?event=${EVENT}`;

export type Alliance = 'red' | 'blue';
export type Level = 'PRACTICE' | 'QUALIFICATION' | 'PLAYOFF';
export type Team = {
  number: number;
  name: string;
  attributes: {
    surrogate: boolean;
    absent: boolean;
    disqualified: boolean | null;
    participating: boolean | null;
  };
};
export type Match = {
  name: string;
  field: string;
  tournament: { level: Level; series: number; match: number };
  timestamps: {
    scheduled: number;
    estimated: number | null;
    actual: number | null;
    reportedAt: number | null;
    updatedAt: number | null;
  };
  teams: Record<Alliance, Team[]>;
  results: Record<Alliance, { score: number | null; win: boolean | null }>;
};
export type MatchSection = { key: string; date: string; title: string; data: Match[] };

const levels: Level[] = ['PRACTICE', 'QUALIFICATION', 'PLAYOFF'];
const titles: Record<Level, string> = { PRACTICE: 'Practice', QUALIFICATION: 'Qualifications', PLAYOFF: 'Playoffs' };
const clock = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit' });
const calendar = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZoneName: 'short',
});
const flags = [
  { key: 'surrogate', label: 'Surrogate', short: 'S' },
  { key: 'absent', label: 'Absent', short: 'A' },
  { key: 'disqualified', label: 'Disqualified', short: 'DQ' },
] as const;

export async function fetchSchedule(signal: AbortSignal): Promise<Match[]> {
  const response = await fetch(SCHEDULE_URL, { signal });
  if (!response.ok) throw new Error(`Schedule request failed (${response.status})`);
  const body = await response.json();
  if (!Array.isArray(body?.schedule)) throw new Error('Invalid schedule response');
  return body.schedule;
}

export function teamAlliance(match: Match): Alliance | undefined {
  return (['red', 'blue'] as const).find(color => match.teams[color].some(team => team.number === TEAM));
}

export function matchKey(match: Match): string {
  const { level, series, match: number } = match.tournament;
  return `${level}-${series}-${number}`;
}

export function scheduleSections(matches: Match[], competing: boolean): MatchSection[] {
  const sorted = matches.filter(match => !competing || teamAlliance(match)).sort((a, b) =>
    a.timestamps.scheduled - b.timestamps.scheduled ||
    levels.indexOf(a.tournament.level) - levels.indexOf(b.tournament.level) ||
    a.tournament.series - b.tournament.series || a.tournament.match - b.tournament.match);
  const sections = new Map<string, MatchSection>();
  for (const match of sorted) {
    const date = calendar.format(match.timestamps.scheduled);
    const key = `${date}-${match.tournament.level}`;
    if (!sections.has(key)) sections.set(key, { key, date, title: titles[match.tournament.level], data: [] });
    sections.get(key)!.data.push(match);
  }
  return [...sections.values()];
}

export function matchTime(match: Match): string {
  const { actual, estimated, scheduled } = match.timestamps;
  const label = actual !== null ? 'Started' : estimated !== null ? 'Estimated' : 'Scheduled';
  return `${label} ${formatTime(actual ?? estimated ?? scheduled)}`;
}

export function formatTime(timestamp: number): string {
  return clock.format(timestamp);
}

export function matchStatus(match: Match, color?: Alliance, now = Date.now()): string {
  const { red, blue } = match.results;
  if (red.score === null || blue.score === null) return match.timestamps.scheduled > now ? 'Scheduled' : 'No result';
  if (!color) return 'Final';
  if (match.results[color].win === true) return 'Win';
  if (match.results[color === 'red' ? 'blue' : 'red'].win === true) return 'Loss';
  return red.score === blue.score ? 'Tie' : 'Result';
}

export function teamFlags(team: Team) {
  return flags.filter(flag => team.attributes[flag.key] === true);
}
