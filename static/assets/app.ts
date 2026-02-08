/*
not functional but nice things to do:
- [ ] integrate bearer auth directly into authFetch()
*/

interface Tab {
    buttonId: string;
    viewId: string;
}

interface Event {
    code: string;
    name: string;
    dateStart: string;
    dateEnd: string;
    regionCode?: string;
    leagueCode?: string;
}

interface Match {
    description: string;
    matchNumber: number;
    series: number;
    tournamentLevel: string;
    teams: Team[];
    scoreRedFinal?: number;
    scoreBlueFinal?: number;
    scoreRedAuto?: number;
    scoreBlueAuto?: number;
    scoreRedFoul?: number;
    scoreBlueFoul?: number;
    actualStartTime?: string;
    startTime: string;
    field?: string;
}

interface Team {
    teamNumber: number;
    station: string;
    surrogate: boolean;
}

interface TeamInfo {
    teamNumber: number;
    nameShort: string;
    nameFull: string;
    rookieYear?: number;
    organizationType?: string;
    schoolName?: string;
    city?: string;
    stateProv?: string;
    country?: string;
}

interface TeamOPR {
    teamNumber: number;
    opr: number | null;
}

interface Ranking {
    rank: number;
    teamNumber: number;
    displayTeamNumber: string;
    teamName: string;
    wins: number;
    losses: number;
    ties: number;
    matchesPlayed: number;
    matchesCounted: number;
    sortOrder1: number;
    sortOrder2: number;
    sortOrder3: number;
    sortOrder4: number;
    sortOrder5: number;
    sortOrder6: number;
}

interface Note {
    autoPerformance: string;
    teleopPerformance: string;
    generalNotes: string;
    updatedAt: number | null;
}

interface ScoreAlliance {
    alliance: string;
    team: number;
    autoClassifiedArtifacts: number;
    autoOverflowArtifacts: number;
    autoClassifierState: string[];
    robot1Auto: boolean;
    robot2Auto: boolean;
    autoLeavePoints: number;
    autoArtifactPoints: number;
    autoPatternPoints: number;
    teleopClassifiedArtifacts: number;
    teleopOverflowArtifacts: number;
    teleopDepotArtifacts: number;
    teleopClassifierState: string[];
    robot1Teleop: string;
    robot2Teleop: string;
    teleopArtifactPoints: number;
    teleopDepotPoints: number;
    teleopPatternPoints: number;
    teleopBasePoints: number;
    autoPoints: number;
    teleopPoints: number;
    foulPointsCommitted: number;
    preFoulTotal: number;
    movementRP: boolean;
    goalRP: boolean;
    patternRP: boolean;
    totalPoints: number;
    majorFouls: number;
    minorFouls: number;
}

interface ScoreMatch {
    matchLevel: string;
    matchSeries: number;
    matchNumber: number;
    randomization: number;
    alliances: ScoreAlliance[];
}

type MatchResult = "win" | "loss" | "tie";

interface MatchResultIndicator {
    label: string;
    variant: MatchResult;
    tooltip: string;
}

// URL State Management
interface AppState {
    view?: string;
    event?: string;
    match?: number;
    team?: number;
    insights?: number;
    showAll?: boolean;
}

declare const Chart: any;

const tabs: Tab[] = [
    { buttonId: "button-schedule", viewId: "view-schedule" },
    { buttonId: "button-rankings", viewId: "view-rankings" },
    { buttonId: "button-notes", viewId: "view-notes" },
    { buttonId: "button-insights", viewId: "view-insights" },
    { buttonId: "button-strategy", viewId: "view-strategy" },
    { buttonId: "button-compare", viewId: "view-compare" },
    { buttonId: "button-settings", viewId: "view-settings" },
    { buttonId: "button-about", viewId: "view-about" },
    { buttonId: "button-admin", viewId: "view-admin" },
];

let currentMatches: Match[] = [];
let currentRankings: Ranking[] = [];
let currentTeams: TeamInfo[] = [];
let currentEventCode: string = "";
let currentNotesStatus: { [teamId: number]: number | undefined } = {};
let loggedInTeamId: number | null = null;
let notesAutoSaveTimeout: number | null = null;
let activeViewId: string = tabs[0]?.viewId || "view-schedule";
let currentEventStartTimestamp: number | null = null;
let isMobileMenuOpen: boolean = false;
let currentSelectedMatch: number | null = null;
let currentSelectedNotesTeam: number | null = null;
let currentInsightsTeam: number | null = null;
let currentScoreMatches: ScoreMatch[] = [];
let showAllMatches: boolean = false;
let queueInterval: number;
const activeCharts: Record<string, any> = {};
let currentOPRData: Map<number, number | null> = new Map();
let isAdminAuthenticated: boolean = false;
let currentUserScopes: string[] = [];

type RankingSortColumn = "rankingScore" | "opr" | "matchPoints" | "basePoints" | "autoPoints" | "highScore" | "wlt" | "played" | null;
type SortDirection = "asc" | "desc";
let currentRankingSortColumn: RankingSortColumn = "rankingScore";
let currentRankingSortDirection: SortDirection = "desc";

function getViewNameFromId(viewId: string): string {
    return viewId.replace("view-", "");
}

function getViewIdFromName(viewName: string): string {
    return `view-${viewName}`;
}

function buildUrlFromState(state: AppState): string {
    const params = new URLSearchParams();
    if (state.view) params.set("view", state.view);
    if (state.event) params.set("event", state.event);
    if (state.match !== undefined && state.match !== null) params.set("match", state.match.toString());
    if (state.team !== undefined && state.team !== null) params.set("team", state.team.toString());
    if (state.insights !== undefined && state.insights !== null) params.set("insights", state.insights.toString());
    if (state.showAll) params.set("showAll", "1");
    const queryString = params.toString();
    return queryString ? `?${queryString}` : window.location.pathname;
}

function getCurrentState(): AppState {
    return {
        view: getViewNameFromId(activeViewId),
        event: currentEventCode || undefined,
        match: currentSelectedMatch ?? undefined,
        team: currentSelectedNotesTeam ?? undefined,
        insights: currentInsightsTeam ?? undefined,
        showAll: showAllMatches || undefined
    };
}

function updateUrl(replace: boolean = false) {
    const state = getCurrentState();
    const url = buildUrlFromState(state);
    if (replace) {
        history.replaceState(state, "", url);
    } else {
        history.pushState(state, "", url);
    }
}

function parseUrlState(): AppState {
    const params = new URLSearchParams(window.location.search);
    return {
        view: params.get("view") || undefined,
        event: params.get("event") || undefined,
        match: params.has("match") ? parseInt(params.get("match")!, 10) : undefined,
        team: params.has("team") ? parseInt(params.get("team")!, 10) : undefined,
        insights: params.has("insights") ? parseInt(params.get("insights")!, 10) : undefined,
        showAll: params.get("showAll") === "1" || undefined
    };
}

async function assertAuthorized(response: Response): Promise<Response> {
    if (response.status === 401) {
        try {
            const payload = await response.clone().json().catch(() => null);
            if (payload && (payload as any).status === "fuck") {
                handleLogout();
            }
        } catch {
            // ignore JSON parsing errors here
        }
    }
    return response;
}

async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const res = await fetch(input, init);
    return assertAuthorized(res);
}

function toggleMobileMenu(open?: boolean) {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    
    isMobileMenuOpen = open !== undefined ? open : !isMobileMenuOpen;
    
    if (isMobileMenuOpen) {
        sidebar.classList.add("open");
        document.body.style.overflow = "hidden";
    } else {
        sidebar.classList.remove("open");
        document.body.style.overflow = "";
    }
}

function closeMobileMenu() {
    toggleMobileMenu(false);
}

function switchTab(activeTab: Tab, updateHistory: boolean = true) {
    const currentView = document.getElementById(activeViewId);
    
    closeMobileMenu();
    
    if (currentView && activeViewId !== activeTab.viewId) {
        currentView.classList.add("fade-out");
        
        setTimeout(() => {
            tabs.forEach(tab => {
                const button = document.getElementById(tab.buttonId);
                const view = document.getElementById(tab.viewId);

                if (button && view) {
                    if (tab === activeTab) {
                        button.classList.add("sidebar-active");
                        view.style.display = "block";
                        view.classList.remove("fade-out");
                        activeViewId = activeTab.viewId;
                    } else {
                        button.classList.remove("sidebar-active");
                        view.style.display = "none";
                        view.classList.remove("fade-out");
                    }
                }
            });
            if (updateHistory) {
                updateUrl();
            }
        }, 200);
    } else {
        tabs.forEach(tab => {
            const button = document.getElementById(tab.buttonId);
            const view = document.getElementById(tab.viewId);

            if (button && view) {
                if (tab === activeTab) {
                    button.classList.add("sidebar-active");
                    view.style.display = "block";
                    activeViewId = activeTab.viewId;
                } else {
                    button.classList.remove("sidebar-active");
                    view.style.display = "none";
                }
            }
        });
        if (updateHistory && currentView && activeViewId === activeTab.viewId) {
            // Only update URL if we're not switching tabs (staying on same tab)
        } else if (updateHistory) {
            updateUrl();
        }
    }
}

function showLoading() {
    const container = document.getElementById("loading-bar-container");
    const bar = document.getElementById("loading-bar");
    const status = document.getElementById("status-text");
    
    if (container) {
        container.classList.remove("hide");
        container.style.display = "block";
    }
    if (status) status.textContent = "Loading...";
    
    if (bar) {
        bar.style.width = "0%";
        bar.style.transition = "width 5s cubic-bezier(0.2, 0.8, 0.2, 1)";
        // Force reflow
        bar.offsetHeight; 
        bar.style.width = "90%";
    }
}

function hideLoading() {
    const container = document.getElementById("loading-bar-container");
    const bar = document.getElementById("loading-bar");
    const status = document.getElementById("status-text");
    
    if (bar) {
        bar.style.transition = "width 0.3s ease-out";
        bar.style.width = "100%";
        
        setTimeout(() => {
            if (container) {
                container.classList.add("hide");
                setTimeout(() => {
                    container.style.display = "none";
                    container.classList.remove("hide");
                    bar.style.width = "0%";
                }, 150);
            }
            if (status) status.textContent = "Ready";
        }, 300);
    } else {
        if (container) {
            container.classList.add("hide");
            setTimeout(() => {
                container.style.display = "none";
                container.classList.remove("hide");
            }, 150);
        }
        if (status) status.textContent = "Ready";
    }
}

async function loadEvents() {
    const token = localStorage.getItem("token");
    if (!token) return;

    showLoading();
    try {
        const response = await authFetch("/api/v1/events", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!response.ok) return;

        const data = await response.json();
        const events: Event[] = data.events || [];
        populateMeetSelector(events);

    } catch (error) {
        console.error("Failed to load events:", error);
    } finally {
        hideLoading();
    }
}

async function loadEventsWithStateRestore() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const urlState = parseUrlState();

    showLoading();
    try {
        const response = await authFetch("/api/v1/events", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!response.ok) return;

        const data = await response.json();
        const events: Event[] = data.events || [];
        await populateMeetSelectorWithStateRestore(events, urlState);

    } catch (error) {
        console.error("Failed to load events:", error);
    } finally {
        hideLoading();
    }
}

async function populateMeetSelectorWithStateRestore(events: Event[], urlState: AppState) {
    const selector = document.getElementById("meet-selector") as HTMLSelectElement;
    if (!selector) return;

    selector.innerHTML = "";
    
    events.sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime());

    const now = new Date();

    events.forEach(event => {
        const option = document.createElement("option");
        option.value = event.code;
        option.textContent = `${event.name} (${event.code})`;
        selector.appendChild(option);
    });

    let defaultEvent: Event | undefined;

    // Check if URL has an event specified
    if (urlState.event) {
        defaultEvent = events.find(e => e.code === urlState.event);
    }

    // Fall back to most recent event that has begun
    if (!defaultEvent) {
        for (let i = events.length - 1; i >= 0; i--) {
            const start = new Date(events[i].dateStart);
            if (start <= now) {
                defaultEvent = events[i];
                break;
            }
        }
    }

    // Fall back to first upcoming event
    if (!defaultEvent && events.length > 0) {
        defaultEvent = events[0];
    }

    if (defaultEvent) {
        selector.value = defaultEvent.code;
        currentEventCode = defaultEvent.code;
        await loadScheduleWithStateRestore(defaultEvent.code, urlState);
    }
    
    selector.addEventListener("change", () => {
        console.log("Selected meet:", selector.value);
        currentEventCode = selector.value;
        currentSelectedMatch = null;
        currentSelectedNotesTeam = null;
        loadSchedule(selector.value);
        updateUrl();
    });

    // Switch to the correct tab from URL state
    if (urlState.view) {
        const viewId = getViewIdFromName(urlState.view);
        const tab = tabs.find(t => t.viewId === viewId);
        if (tab) {
            switchTab(tab, false);
            
            // Initialize notes view if that's the active tab
            if (viewId === "view-notes" && currentEventCode && currentTeams.length > 0) {
                await initializeNotesView(currentEventCode);
                restoreNotesTeamSelection();
            }
            
            // Trigger insights analysis if that's the active tab
            if (viewId === "view-insights" && urlState.insights) {
                analyzeTeam(urlState.insights, false);
            }
        }
    } else if (tabs.length > 0) {
        switchTab(tabs[0], false);
    }
    
    // Set initial URL state
    updateUrl(true);
}

async function loadScheduleWithStateRestore(eventCode: string, urlState: AppState) {
    const token = localStorage.getItem("token");
    if (!token) return;

    const detailsContainer = document.getElementById("schedule-details");
    if (detailsContainer) {
        detailsContainer.innerHTML = '<div class="empty-state">Select a match to view details</div>';
    }

    showLoading();
    try {
        const eventRes = await authFetch(`/api/v1/event?event=${eventCode}`, { headers: { "Authorization": `Bearer ${token}` } });
        
        if (!eventRes.ok) {
            console.error("Failed to load event details");
            return;
        }

        const eventData = await eventRes.json();
        const event = eventData.events && eventData.events.length > 0 ? eventData.events[0] : null;
        
        if (!event) {
            console.error("Event not found");
            return;
        }

        currentEventStartTimestamp = event.dateStart ? new Date(event.dateStart).getTime() : null;

        const [scheduleRes, rankingsRes, teamsRes, qualScoresRes, playoffScoresRes] = await Promise.all([
            authFetch(`/api/v1/schedule?event=${eventCode}`, { headers: { "Authorization": `Bearer ${token}` } }),
            authFetch(`/api/v1/rankings?event=${eventCode}`, { headers: { "Authorization": `Bearer ${token}` } }),
            authFetch(`/api/v1/teams?event=${eventCode}`, { headers: { "Authorization": `Bearer ${token}` } }),
            authFetch(`/api/v1/scores/${eventCode}/qual`, { headers: { "Authorization": `Bearer ${token}` } }),
            authFetch(`/api/v1/scores/${eventCode}/playoff`, { headers: { "Authorization": `Bearer ${token}` } })
        ]);

        if (scheduleRes.ok && teamsRes.ok) {
            const scheduleData = await scheduleRes.json();
            const rankingsData = rankingsRes.ok ? await rankingsRes.json() : { rankings: [] };
            const teamsData = await teamsRes.json();
            const qualScoresData = qualScoresRes.ok ? await qualScoresRes.json() : { matchScores: [] };
            const playoffScoresData = playoffScoresRes.ok ? await playoffScoresRes.json() : { matchScores: [] };
            
            currentMatches = scheduleData.schedule || [];
            currentMatches.sort((a, b) => getMatchStartTimestamp(a) - getMatchStartTimestamp(b));
            currentRankings = rankingsData.rankings || [];
            currentTeams = teamsData.teams || [];
            currentScoreMatches = [...(qualScoresData.matchScores || []), ...(playoffScoresData.matchScores || [])];
            mergeScoresIntoScheduleMatches(currentMatches, currentScoreMatches);
            
            // Restore or infer showAll state
            if (urlState.showAll !== undefined) {
                showAllMatches = urlState.showAll;
            } else if (urlState.match !== undefined) {
                // Infer showAll if linked match doesn't include the team
                const linkedMatch = currentMatches.find(m => m.matchNumber === urlState.match);
                if (linkedMatch && !linkedMatch.teams.some(t => t.teamNumber === loggedInTeamId)) {
                    showAllMatches = true;
                }
            }

            const showAllCheckbox = document.getElementById("show-all-matches") as HTMLInputElement;
            if (showAllCheckbox) {
                showAllCheckbox.checked = showAllMatches;
            }

            renderSchedule(currentMatches, currentRankings, currentTeams);
            renderRankings(currentRankings);

            // Render strategy match list if on strategy tab
            const currentView = document.querySelector('.view:not([style*="display: none"])');
            if (currentView?.id === "view-strategy") {
                renderStrategyMatchList();
            }

            // Fetch OPR data for all ranked teams
            const rankedTeamNumbers = currentRankings.map(r => r.teamNumber);
            if (rankedTeamNumbers.length > 0) {
                fetchOPRData(rankedTeamNumbers).then(oprResults => {
                    currentOPRData = new Map(oprResults.map(r => [r.teamNumber, r.opr]));
                    renderRankings(currentRankings);
                });
            }

            // Restore match selection from URL
            if (urlState.match !== undefined) {
                currentSelectedMatch = urlState.match;
                restoreMatchSelection();
            }
        }
    } catch (error) {
        console.error("Failed to load schedule/rankings/teams:", error);
    } finally {
        hideLoading();
    }
}

function populateMeetSelector(events: Event[]) {
    const selector = document.getElementById("meet-selector") as HTMLSelectElement;
    if (!selector) return;

    selector.innerHTML = "";
    
    // Sort events by date
    events.sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime());

    const now = new Date();

    events.forEach(event => {
        const option = document.createElement("option");
        option.value = event.code;
        option.textContent = `${event.name} (${event.code})`;
        selector.appendChild(option);
    });

    let defaultEvent: Event | undefined;

    // Default to the most recent meet that has already begun
    // Iterate backwards to find the latest event with start date <= now
    for (let i = events.length - 1; i >= 0; i--) {
        const start = new Date(events[i].dateStart);
        if (start <= now) {
            defaultEvent = events[i];
            break;
        }
    }

    // If no event has begun, default to the first upcoming one
    if (!defaultEvent && events.length > 0) {
        defaultEvent = events[0];
    }

    if (defaultEvent) {
        selector.value = defaultEvent.code;
        currentEventCode = defaultEvent.code;
        loadSchedule(defaultEvent.code);
    }
    
    selector.addEventListener("change", () => {
        console.log("Selected meet:", selector.value);
        currentEventCode = selector.value;
        currentSelectedMatch = null;
        currentSelectedNotesTeam = null;
        loadSchedule(selector.value);
        updateUrl();
    });
}

async function fetchOPRData(teamNumbers: number[]): Promise<TeamOPR[]> {
    const now = new Date();
    const seasonDate = new Date(now.getTime() - 34 * 7 * 24 * 60 * 60 * 1000); // 34 weeks ago b/c season starts ~beginning of September
    const season = seasonDate.getFullYear();
    const seasonStatsName = `TeamEventStats${season}`;

    const promises = teamNumbers.map(async (teamNumber) => {
        try {
            const response = await fetch("https://api.ftcscout.org/graphql", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    query: `
                        query OPR_totalPointsNp($season: Int!, $number: Int!) {
                            teamByNumber(number: $number) {
                                events(season: $season) {
                                    stats {
                                        ... on ${seasonStatsName} {
                                            opr {
                                                totalPointsNp
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    `,
                    variables: {
                        season: season,
                        number: teamNumber
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                const events = data?.data?.teamByNumber?.events || [];

                let highestOPR: number | null = null;
                for (const event of events) {
                    const opr = event?.stats?.opr?.totalPointsNp;
                    if (opr !== undefined && opr !== null) {
                        if (highestOPR === null || opr > highestOPR) {
                            highestOPR = opr;
                        }
                    }
                }

                return { teamNumber, opr: highestOPR };
            }
        } catch (error) {
            console.error(`Failed to fetch OPR for team ${teamNumber}:`, error);
        }
        return { teamNumber, opr: null };
    });

    const results = await Promise.all(promises);
    return results;
}

async function loadSchedule(eventCode: string) {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Reset details view
    const detailsContainer = document.getElementById("schedule-details");
    if (detailsContainer) {
        detailsContainer.innerHTML = '<div class="empty-state">Select a match to view details</div>';
    }

    showLoading();
    try {
        // First, fetch event details
        const eventRes = await authFetch(`/api/v1/event?event=${eventCode}`, { headers: { "Authorization": `Bearer ${token}` } });
        
        if (!eventRes.ok) {
            console.error("Failed to load event details");
            return;
        }

        const eventData = await eventRes.json();
        const event = eventData.events && eventData.events.length > 0 ? eventData.events[0] : null;
        
        if (!event) {
            console.error("Event not found");
            return;
        }

        currentEventStartTimestamp = event.dateStart ? new Date(event.dateStart).getTime() : null;

        const [scheduleRes, rankingsRes, teamsRes, qualScoresRes, playoffScoresRes] = await Promise.all([
            authFetch(`/api/v1/schedule?event=${eventCode}`, { headers: { "Authorization": `Bearer ${token}` } }),
            authFetch(`/api/v1/rankings?event=${eventCode}`, { headers: { "Authorization": `Bearer ${token}` } }),
            authFetch(`/api/v1/teams?event=${eventCode}`, { headers: { "Authorization": `Bearer ${token}` } }),
            authFetch(`/api/v1/scores/${eventCode}/qual`, { headers: { "Authorization": `Bearer ${token}` } }),
            authFetch(`/api/v1/scores/${eventCode}/playoff`, { headers: { "Authorization": `Bearer ${token}` } })
        ]);

        if (scheduleRes.ok && teamsRes.ok) {
            const scheduleData = await scheduleRes.json();
            const rankingsData = rankingsRes.ok ? await rankingsRes.json() : { rankings: [] };
            const teamsData = await teamsRes.json();
            const qualScoresData = qualScoresRes.ok ? await qualScoresRes.json() : { matchScores: [] };
            const playoffScoresData = playoffScoresRes.ok ? await playoffScoresRes.json() : { matchScores: [] };
            
            currentMatches = scheduleData.schedule || [];
            currentMatches.sort((a, b) => getMatchStartTimestamp(a) - getMatchStartTimestamp(b));
            currentRankings = rankingsData.rankings || [];
            currentTeams = teamsData.teams || [];
            currentScoreMatches = [...(qualScoresData.matchScores || []), ...(playoffScoresData.matchScores || [])];
            mergeScoresIntoScheduleMatches(currentMatches, currentScoreMatches);
            
            const showAllCheckbox = document.getElementById("show-all-matches") as HTMLInputElement;
            if (showAllCheckbox) {
                showAllCheckbox.checked = showAllMatches;
            }

            renderSchedule(currentMatches, currentRankings, currentTeams);
            renderRankings(currentRankings);

            // Fetch OPR data for all ranked teams
            const rankedTeamNumbers = currentRankings.map(r => r.teamNumber);
            if (rankedTeamNumbers.length > 0) {
                fetchOPRData(rankedTeamNumbers).then(oprResults => {
                    currentOPRData = new Map(oprResults.map(r => [r.teamNumber, r.opr]));
                    renderRankings(currentRankings);
                });
            }

            if (activeViewId === "view-notes" && currentTeams.length > 0) {
                await initializeNotesView(eventCode);
            }
        }
    } catch (error) {
        console.error("Failed to load schedule/rankings/teams:", error);
    } finally {
        hideLoading();
    }
}

function parseScore(value: unknown): number | null {
    if (typeof value === "number") {
        return value;
    }

    if (typeof value === "string") {
        const parsed = parseInt(value, 10);
        return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
}

function getMatchStartTimestamp(match: Match): number {
    const time = match.actualStartTime || match.startTime;
    const timestamp = time ? new Date(time).getTime() : 0;
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function buildMatchKey(match: Pick<Match, "matchNumber" | "series" | "tournamentLevel">): string {
    const level = match.tournamentLevel || "";
    const seriesValue = typeof match.series === "number" ? match.series : 0;
    return `${level}-${seriesValue}-${match.matchNumber}`;
}

function normalizeLevel(level: string | undefined | null): string {
    return (level || "").toUpperCase();
}

function buildScoreKeyFromSchedule(match: Pick<Match, "matchNumber" | "series" | "tournamentLevel">): string {
    const seriesValue = typeof match.series === "number" ? match.series : 0;
    return `${normalizeLevel(match.tournamentLevel)}-${seriesValue}-${match.matchNumber}`;
}

function buildScoreKeyFromScore(match: Pick<ScoreMatch, "matchLevel" | "matchSeries" | "matchNumber">): string {
    const seriesValue = typeof match.matchSeries === "number" ? match.matchSeries : 0;
    return `${normalizeLevel(match.matchLevel)}-${seriesValue}-${match.matchNumber}`;
}

function mergeMatchResults(scheduleMatches: Match[], resultMatches: Match[]): void {
    const resultMap = new Map<string, Match>();
    resultMatches.forEach(result => {
        resultMap.set(buildMatchKey(result), result);
    });

    scheduleMatches.forEach(match => {
        const result = resultMap.get(buildMatchKey(match));
        if (!result) return;

        const redScore = parseScore(result.scoreRedFinal);
        const blueScore = parseScore(result.scoreBlueFinal);

        if (redScore !== null) {
            match.scoreRedFinal = redScore;
        }
        if (blueScore !== null) {
            match.scoreBlueFinal = blueScore;
        }
    });
}

function mergeScoresIntoScheduleMatches(scheduleMatches: Match[], scoreMatches: ScoreMatch[]): void {
    const scoreMap = new Map<string, ScoreMatch>();
    scoreMatches.forEach(score => scoreMap.set(buildScoreKeyFromScore(score), score));

    scheduleMatches.forEach(match => {
        const score = scoreMap.get(buildScoreKeyFromSchedule(match));
        if (!score) return;

        const red = score.alliances.find(a => a.alliance.toLowerCase() === "red");
        const blue = score.alliances.find(a => a.alliance.toLowerCase() === "blue");

        if (red && typeof red.totalPoints === "number") {
            match.scoreRedFinal = red.totalPoints;
        }
        if (blue && typeof blue.totalPoints === "number") {
            match.scoreBlueFinal = blue.totalPoints;
        }
    });
}

function findScoreMatchForScheduleMatch(match: Match): ScoreMatch | undefined {
    return currentScoreMatches.find(score => buildScoreKeyFromScore(score) === buildScoreKeyFromSchedule(match));
}

async function enrichMatchesWithResults(eventCode: string, matches: Match[], token: string): Promise<void> {
    if (!matches.length) return;

    const uniqueLevels = Array.from(new Set(matches
        .map(match => match.tournamentLevel)
        .filter((level): level is string => typeof level === "string" && level.length > 0)));

    if (!uniqueLevels.length) return;

    const headers = { "Authorization": `Bearer ${token}` };

    try {
        const responses = await Promise.all(uniqueLevels.map(level => {
            const params = new URLSearchParams({ event: eventCode, level });
            return authFetch(`/api/v1/matches?${params.toString()}`, { headers })
                .then(res => res.ok ? res.json() : null)
                .catch(() => null);
        }));

        const resultMatches = responses.flatMap(response => response?.matches ?? []);
        if (resultMatches.length > 0) {
            mergeMatchResults(matches, resultMatches);
        }
    } catch (error) {
        console.warn("Failed to enrich match results", error);
    }
}

function getMatchResultIndicator(match: Match): MatchResultIndicator | null {
    if (loggedInTeamId === null) {
        return null;
    }

    const teamEntry = match.teams.find(team => team.teamNumber === loggedInTeamId);
    if (!teamEntry) {
        return null;
    }

    const redScore = parseScore(match.scoreRedFinal);
    const blueScore = parseScore(match.scoreBlueFinal);

    if (redScore === null || blueScore === null) {
        return null;
    }

    if (redScore === blueScore) {
        return { label: "T", variant: "tie", tooltip: "Tie" };
    }

    const isRedAlliance = teamEntry.station.startsWith("Red");
    const didWin = isRedAlliance ? redScore > blueScore : blueScore > redScore;

    if (didWin) {
        return { label: "W", variant: "win", tooltip: "Win" };
    }

    return { label: "L", variant: "loss", tooltip: "Loss" };
}

function renderRankings(rankings: Ranking[]) {
    const tbody = document.querySelector("#rankings-table tbody") as HTMLElement;
    if (!tbody) return;

    tbody.style.opacity = "0";
    
    setTimeout(() => {
        tbody.innerHTML = "";

        rankings.forEach((rank, index) => {
            const tr = document.createElement("tr");
            tr.style.animationDelay = `${index * 0.02}s`;
            if (loggedInTeamId && rank.teamNumber === loggedInTeamId) {
                tr.classList.add("current-team-rank");
            }
            const oprValue = currentOPRData.get(rank.teamNumber);
            const oprDisplay = oprValue !== null && oprValue !== undefined ? oprValue.toFixed(1) : "–";
            tr.innerHTML = `
                <td>${rank.rank}</td>
                <td><span class="team-number-link" data-team="${rank.teamNumber}">${rank.teamNumber}</span></td>
                <td>${rank.teamName}</td>
                <td>${rank.sortOrder1}</td>
                <td>${oprDisplay}</td>
                <td>${rank.sortOrder2}</td>
                <td>${rank.sortOrder3}</td>
                <td>${rank.sortOrder4}</td>
                <td>${Math.floor(rank.sortOrder6)}</td>
                <td>${rank.wins}-${rank.losses}-${rank.ties}</td>
                <td>${rank.matchesPlayed}</td>
            `;
            tbody.appendChild(tr);
        });

        tbody.style.opacity = "1";
    }, 100);
}

function getRankingValue(rank: Ranking, column: RankingSortColumn): number {
    switch (column) {
        case "rankingScore": return rank.sortOrder1;
        case "opr": return currentOPRData.get(rank.teamNumber) ?? -Infinity;
        case "matchPoints": return rank.sortOrder2;
        case "basePoints": return rank.sortOrder3;
        case "autoPoints": return rank.sortOrder4;
        case "highScore": return Math.floor(rank.sortOrder6);
        case "wlt": return rank.wins * 10000 + rank.ties * 100 - rank.losses;
        case "played": return rank.matchesPlayed;
        default: return 0;
    }
}

function getTiebreakerValue(rank: Ranking, column: RankingSortColumn): number[] {
    const order: RankingSortColumn[] = ["rankingScore", "matchPoints", "basePoints", "autoPoints", "highScore", "opr"];
    const filtered = order.filter(c => c !== column);
    return filtered.map(c => getRankingValue(rank, c));
}

function compareRankings(a: Ranking, b: Ranking, column: RankingSortColumn, direction: SortDirection): number {
    const multiplier = direction === "desc" ? -1 : 1;
    const aVal = getRankingValue(a, column);
    const bVal = getRankingValue(b, column);
    
    if (aVal !== bVal) return (aVal - bVal) * multiplier;
    
    const aTiebreakers = getTiebreakerValue(a, column);
    const bTiebreakers = getTiebreakerValue(b, column);
    
    for (let i = 0; i < aTiebreakers.length; i++) {
        if (aTiebreakers[i] !== bTiebreakers[i]) {
            return (bTiebreakers[i] - aTiebreakers[i]);
        }
    }
    return 0;
}

function sortRankings(rankings: Ranking[], column: RankingSortColumn, direction: SortDirection): Ranking[] {
    if (!column) return rankings;
    return [...rankings].sort((a, b) => compareRankings(a, b, column, direction));
}

function updateSortIndicators(activeColumn: RankingSortColumn, direction: SortDirection) {
    const headers = document.querySelectorAll("#rankings-table thead th.sortable");
    headers.forEach(th => {
        th.classList.remove("sort-asc", "sort-desc");
        const sortKey = (th as HTMLElement).dataset.sort;
        if (sortKey === activeColumn) {
            th.classList.add(direction === "asc" ? "sort-asc" : "sort-desc");
        }
    });
}

function handleRankingHeaderClick(column: RankingSortColumn) {
    if (currentRankingSortColumn === column) {
        currentRankingSortDirection = currentRankingSortDirection === "desc" ? "asc" : "desc";
    } else {
        currentRankingSortColumn = column;
        currentRankingSortDirection = "desc";
    }
    
    updateSortIndicators(currentRankingSortColumn, currentRankingSortDirection);
    const sorted = sortRankings(currentRankings, currentRankingSortColumn, currentRankingSortDirection);
    renderRankings(sorted);
}

function initRankingSortHandlers() {
    const headers = document.querySelectorAll("#rankings-table thead th.sortable");
    headers.forEach(th => {
        th.addEventListener("click", () => {
            const sortKey = (th as HTMLElement).dataset.sort as RankingSortColumn;
            handleRankingHeaderClick(sortKey);
        });
    });
    updateSortIndicators(currentRankingSortColumn, currentRankingSortDirection);
}

function renderSchedule(matches: Match[], rankings: Ranking[], teams: TeamInfo[]) {
    const listContainer = document.getElementById("schedule-list");
    if (!listContainer) return;

    if (queueInterval) clearInterval(queueInterval);

    listContainer.innerHTML = "";

    const filteredMatches = showAllMatches ? matches : matches.filter(match => 
        match.teams.some(team => team.teamNumber === loggedInTeamId)
    );

    filteredMatches.forEach((match, index) => {
        const item = document.createElement("div");
        item.className = "match-item";
        item.dataset.matchNumber = match.matchNumber.toString();
        item.dataset.tournamentLevel = match.tournamentLevel || "";
        item.style.animationDelay = `${index * 0.03}s`;
        item.onclick = () => {
            document.querySelectorAll(".match-item").forEach(el => el.classList.remove("active"));
            item.classList.add("active");
            currentSelectedMatch = match.matchNumber;
            renderMatchDetails(match, rankings, teams);
            updateUrl();
        };

        const redTeams = match.teams.filter(t => t.station.startsWith("Red")).map(t => t.teamNumber);
        const blueTeams = match.teams.filter(t => t.station.startsWith("Blue")).map(t => t.teamNumber);

        const formatTeamNumbers = (teamNums: number[], colorClass: string) => {
            const validTeams = teamNums.filter(t => t && t > 0);
            if (validTeams.length === 0) return "TBD";
            return validTeams.join(", ");
        };

        // Queue logic
        let queueText = "";
        let queueClass = "";
        let queueTimeAttr = "";
        
        const now = new Date();
        const matchStart = new Date(match.actualStartTime || match.startTime);
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const hasScores = match.scoreRedFinal !== undefined || match.scoreBlueFinal !== undefined;
        const isOld = matchStart < oneHourAgo;
        
        if (!hasScores && !isOld) {
            const matchIndexInFull = currentMatches.indexOf(match);
            const prevMatch = matchIndexInFull > 0 ? currentMatches[matchIndexInFull - 1] : null;
            
            let queueTime: Date;
            if (prevMatch) {
                queueTime = new Date(prevMatch.actualStartTime || prevMatch.startTime);
            } else {
                queueTime = new Date(match.startTime);
                queueTime.setMinutes(queueTime.getMinutes() - 10);
            }

            queueTimeAttr = `data-queue-time="${queueTime.getTime()}"`;

            const diffMs = queueTime.getTime() - now.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffSecs = Math.ceil((diffMs % (1000 * 60)) / 1000);

            if (diffMs <= 0) {
                queueText = "Queueing Now";
                queueClass = "queueing";
            } else {
                queueText = `Queueing in ${diffMins}m ${diffSecs}s`;
            }
        } else {
            queueText = "Concluded";
        }

        const fieldInfo = match.field ? ` • Field ${match.field}` : '';
        const fieldInfoAttr = fieldInfo ? `data-field-info="${fieldInfo}"` : '';

        const resultIndicator = getMatchResultIndicator(match);
        const matchTime = new Date(match.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        item.innerHTML = `
            <div class="match-header">
                <span class="match-title">${match.description}</span>
                <span class="match-time">${matchTime}</span>
            </div>
            <div class="match-teams">
                <span class="team-red">${formatTeamNumbers(redTeams, "team-red")}</span>
                <span class="team-vs">vs</span>
                <span class="team-blue">${formatTeamNumbers(blueTeams, "team-blue")}</span>
            </div>
            <div class="match-meta">
                <span class="queue-status ${queueClass}" ${queueTimeAttr} ${fieldInfoAttr}>${queueText}${fieldInfo}</span>
                ${resultIndicator ? `<span class="match-result match-${resultIndicator.variant}" title="${resultIndicator.tooltip}">${resultIndicator.label}</span>` : ""}
            </div>
        `;
        listContainer.appendChild(item);
    });

    queueInterval = window.setInterval(updateQueueTimers, 1000);
}

// Handle team number clicks for instant insights
document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("team-number-link")) {
        e.preventDefault();
        e.stopPropagation();
        
        const teamNumber = parseInt(target.getAttribute("data-team") || "0");
        if (teamNumber) {
            const insightsTab = tabs.find(t => t.viewId === "view-insights");
            const teamInput = document.getElementById("insights-team-input") as HTMLInputElement;
            
            if (insightsTab && teamInput) {
                switchTab(insightsTab, false);
                teamInput.value = teamNumber.toString();
                currentInsightsTeam = teamNumber;
                analyzeTeam(teamNumber);
                updateUrl();
            }
        }
    }
});

function updateQueueTimers() {
    const now = new Date();
    document.querySelectorAll(".queue-status[data-queue-time]").forEach(el => {
        const time = parseInt(el.getAttribute("data-queue-time") || "0");
        const fieldInfo = el.getAttribute("data-field-info") || "";
        
        if (!time) return;
        
        const diffMs = time - now.getTime();
        let text = "";
        
        if (diffMs <= 0) {
            text = "Queueing Now";
            el.classList.add("queueing");
        } else {
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffSecs = Math.ceil((diffMs % (1000 * 60)) / 1000);
            text = `Queueing in ${diffMins}m ${diffSecs}s`;
            el.classList.remove("queueing");
        }
        
        el.textContent = text + fieldInfo;
    });
}

function getAllianceFromScore(scoreMatch: ScoreMatch | undefined, alliance: "red" | "blue"): ScoreAlliance | undefined {
    return scoreMatch?.alliances.find(a => a.alliance.toLowerCase() === alliance);
}

function getMatchRankingPoints(alliance: ScoreAlliance, opponent?: ScoreAlliance): number {
    if (!opponent) return 0;
    if (alliance.totalPoints > opponent.totalPoints) return 3;
    if (alliance.totalPoints === opponent.totalPoints) return 1;
    return 0;
}

function renderMatchRPChips(count: number, allianceColor: "red" | "blue"): string {
    return Array.from({ length: 3 }).map((_, index) => {
        const filled = index < count;
        return `<span class="rp-chip match ${allianceColor} ${filled ? "filled" : ""}" title="Match RP">Match</span>`;
    }).join("");
}

function renderRPLine(alliance: ScoreAlliance, opponent: ScoreAlliance | undefined, allianceColor: "red" | "blue"): string {
    const matchRP = getMatchRankingPoints(alliance, opponent);
    const movement = `<span class="rp-chip ${allianceColor} ${alliance.movementRP ? "filled" : ""}" title="Movement RP">Movement</span>`;
    const goal = `<span class="rp-chip ${allianceColor} ${alliance.goalRP ? "filled" : ""}" title="Goal RP">Goal</span>`;
    const pattern = `<span class="rp-chip ${allianceColor} ${alliance.patternRP ? "filled" : ""}" title="Pattern RP">Pattern</span>`;
    return `<div class="rp-line">${renderMatchRPChips(matchRP, allianceColor)}${movement}${goal}${pattern}</div>`;
}

function renderDonutChart(canvasId: string, values: number[], labels: string[], colors: string[]) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas || typeof Chart === "undefined") return;

    if (activeCharts[canvasId]) {
        activeCharts[canvasId].destroy();
    }

    activeCharts[canvasId] = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }]
        },
        options: {
            cutout: "58%",
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    titleFont: { family: "JetBrains Mono", size: 12 },
                    bodyFont: { family: "JetBrains Mono", size: 12 }
                }
            },
            animation: { duration: 350 }
        }
    });
}

function renderMetricRow(label: string, value: number | string): string {
    return `<div class="metric-row"><span>${label}</span><span class="metric-value">${value}</span></div>`;
}

function renderRobotPill(label: string, value: string | boolean, allianceColor: "red" | "blue"): string {
    const text = typeof value === "boolean" ? (value ? "Left" : "Stayed") : value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    const normalized = text || "–";
    const stateClass = typeof value === "boolean" ? (value ? "pill-on" : "pill-off") : normalized.toLowerCase();
    return `<span class="robot-pill ${allianceColor} ${stateClass}">${label} ${normalized}</span>`;
}

function renderAllianceBreakdown(scoreMatch: ScoreMatch, allianceColor: "red" | "blue", chartJobs: Array<() => void>): string {
    const alliance = getAllianceFromScore(scoreMatch, allianceColor);
    const opponent = getAllianceFromScore(scoreMatch, allianceColor === "red" ? "blue" : "red");

    if (!alliance) {
        return `<div class="score-card ${allianceColor}"><div class="score-card-empty">Scores unavailable</div></div>`;
    }

    const penaltyPointsEarned = opponent ? Math.max(opponent.foulPointsCommitted || 0, 0) : 0;
    const donutId = `score-donut-${allianceColor}-${scoreMatch.matchNumber}-${Date.now()}`;
    const segmentLabels = [
        "Auto Leave",
        "Auto Artifact",
        "Auto Pattern",
        "Teleop Artifact",
        "Teleop Depot",
        "Teleop Pattern",
        "Teleop Base",
        "Penalties Awarded"
    ];

    const segmentValues = [
        alliance.autoLeavePoints || 0,
        alliance.autoArtifactPoints || 0,
        alliance.autoPatternPoints || 0,
        alliance.teleopArtifactPoints || 0,
        alliance.teleopDepotPoints || 0,
        alliance.teleopPatternPoints || 0,
        alliance.teleopBasePoints || 0,
        penaltyPointsEarned
    ];

    const palette = allianceColor === "red"
        ? ["#ffd6d6", "#ff9f9f", "#ff6b6b", "#ff4444", "#e52b2b", "#c81c1c", "#a30d0d", "#707070"]
        : ["#d6e9ff", "#a9d0ff", "#7fb6ff", "#559cff", "#2f86ff", "#1f73e8", "#155bc1", "#707070"];

    chartJobs.push(() => renderDonutChart(donutId, segmentValues, segmentLabels, palette));

    const autoSection = `
        <div class="score-section">
            <div class="section-title">Autonomous</div>
            ${renderMetricRow("Auto Classified Artifacts", alliance.autoClassifiedArtifacts ?? 0)}
            ${renderMetricRow("Auto Overflow Artifacts", alliance.autoOverflowArtifacts ?? 0)}
            ${renderMetricRow("Auto Leave Points", alliance.autoLeavePoints ?? 0)}
            ${renderMetricRow("Auto Pattern Points", alliance.autoPatternPoints ?? 0)}
            ${renderMetricRow("Auto Artifact Points", alliance.autoArtifactPoints ?? 0)}
        </div>
    `;

    const teleopSection = `
        <div class="score-section">
            <div class="section-title">Teleop</div>
            ${renderMetricRow("Teleop Classified Artifacts", alliance.teleopClassifiedArtifacts ?? 0)}
            ${renderMetricRow("Teleop Overflow Artifacts", alliance.teleopOverflowArtifacts ?? 0)}
            ${renderMetricRow("Teleop Depot Artifacts", alliance.teleopDepotArtifacts ?? 0)}
            ${renderMetricRow("Teleop Pattern Points", alliance.teleopPatternPoints ?? 0)}
            ${renderMetricRow("Teleop Artifact Points", alliance.teleopArtifactPoints ?? 0)}
            ${renderMetricRow("Teleop Base Points", alliance.teleopBasePoints ?? 0)}
        </div>
    `;

    const robotsSection = `
        <div class="score-section">
            <div class="section-title">Robots</div>
            <div class="metric-row">Auto Leave
                <span class="metric-value robot-badges">${renderRobotPill("R1", alliance.robot1Auto, allianceColor)}${renderRobotPill("R2", alliance.robot2Auto, allianceColor)}</span>
            </div>
            <div class="metric-row">Teleop Park
                <span class="metric-value robot-badges">${renderRobotPill("R1", alliance.robot1Teleop || "NONE", allianceColor)}${renderRobotPill("R2", alliance.robot2Teleop || "NONE", allianceColor)}</span>
            </div>
        </div>
    `;

    const penaltySection = `
        <div class="score-section penalty-section">
            ${renderMetricRow("Penalties Awarded", penaltyPointsEarned)}
        </div>
    `;

    return `
        <div class="score-card ${allianceColor}">
            <div class="score-card-header">
                <div>
                    <div class="score-card-label">${allianceColor === "red" ? "Red" : "Blue"} Alliance</div>
                    <div class="score-card-total">${alliance.totalPoints ?? 0}</div>
                </div>
                ${renderRPLine(alliance, opponent, allianceColor)}
            </div>
            <div class="score-card-body">
                <div class="score-donut-block">
                    <canvas id="${donutId}" width="180" height="180"></canvas>
                    <div class="donut-legend">
                        ${segmentLabels.map((label, idx) => `<span><span class="legend-dot" style="background:${palette[idx]}"></span>${label}</span>`).join("")}
                    </div>
                </div>
                <div class="score-details-grid">
                    ${autoSection}
                    ${teleopSection}
                    ${robotsSection}
                    ${penaltySection}
                </div>
            </div>
        </div>
    `;
}

function getRandomizationTarget(randomization: number): ("P" | "G" | "-")[] {
    switch (randomization) {
        case 1: return ["G", "P", "P", "G", "P", "P", "G", "P", "P"];
        case 2: return ["P", "G", "P", "P", "G", "P", "P", "G", "P"];
        case 3: return ["P", "P", "G", "P", "P", "G", "P", "P", "G"];
        default: return ["-", "-", "-", "-", "-", "-", "-", "-", "-"];
    }
}

function abbreviateState(state: string | undefined): "P" | "G" | "-" {
    if (!state) return "-";
    if (state.toUpperCase() === "PURPLE") return "P";
    if (state.toUpperCase() === "GREEN") return "G";
    return "-";
}

function renderClassifierRow(label: string, values: string[], target: ("P" | "G" | "-")[], accentClass: string): string {
    const cells = values.map((val, idx) => {
        const letter = abbreviateState(val);
        const matches = letter !== "-" && letter === target[idx];
        const letterClass = letter === "P" ? "classifier-purple" : letter === "G" ? "classifier-green" : "classifier-empty";
        const content = matches ? `<strong>${letter}</strong>` : letter;
        return `<span class="classifier-cell ${letterClass}">${content}</span>`;
    }).join("");
    return `
        <div class="classifier-row">
            <span class="classifier-label ${accentClass}">${label}</span>
            <div class="classifier-cells">${cells}</div>
        </div>
    `;
}

function renderClassifierSection(scoreMatch?: ScoreMatch): string {
    if (!scoreMatch) {
        return `<div class="classifier-section"><div class="classifier-row"><span class="classifier-label">Classifier</span><div class="classifier-cells">Pending scores</div></div></div>`;
    }

    const target = getRandomizationTarget(scoreMatch.randomization);
    const targetCells = target.map(letter => {
        const cls = letter === "P" ? "classifier-purple" : letter === "G" ? "classifier-green" : "classifier-empty";
        return `<span class="classifier-cell ${cls}">${letter}</span>`;
    }).join("");

    const red = getAllianceFromScore(scoreMatch, "red");
    const blue = getAllianceFromScore(scoreMatch, "blue");

    return `
        <div class="classifier-section">
            <div class="classifier-row">
                <span class="classifier-label">Target</span>
                <div class="classifier-cells">${targetCells}</div>
            </div>
            <div class="classifier-separator"></div>
            ${red ? renderClassifierRow("Red Auto", red.autoClassifierState || [], target, "red") : ""}
            ${blue ? renderClassifierRow("Blue Auto", blue.autoClassifierState || [], target, "blue") : ""}
            ${red ? renderClassifierRow("Red Teleop", red.teleopClassifierState || [], target, "red") : ""}
            ${blue ? renderClassifierRow("Blue Teleop", blue.teleopClassifierState || [], target, "blue") : ""}
        </div>
    `;
}

function renderScoreBreakdown(scoreMatch: ScoreMatch | undefined, chartJobs: Array<() => void>): string {
    if (!scoreMatch) {
        return `<div class="score-breakdown-empty">Match scores are not available yet.</div>`;
    }

    const cards = `
        <div class="score-breakdown-grid">
            ${renderAllianceBreakdown(scoreMatch, "red", chartJobs)}
            ${renderAllianceBreakdown(scoreMatch, "blue", chartJobs)}
        </div>
    `;

    const classifier = renderClassifierSection(scoreMatch);

    return `<div class="score-breakdown"><div class="score-breakdown-title">Score Breakdown</div>${cards}${classifier}</div>`;
}

async function renderMatchDetails(match: Match, rankings: Ranking[], teams: TeamInfo[]) {
    const detailsContainer = document.getElementById("schedule-details");
    if (!detailsContainer) return;

    showLoading();

    const redTeams = match.teams.filter(t => t.station.startsWith("Red"));
    const blueTeams = match.teams.filter(t => t.station.startsWith("Blue"));
    const allTeams = [...redTeams, ...blueTeams];
    const validTeams = allTeams.filter(t => t.teamNumber && t.teamNumber > 0);
    const scoreMatch = findScoreMatchForScheduleMatch(match);
    const chartJobs: Array<() => void> = [];
    const scoreBreakdownHtml = renderScoreBreakdown(scoreMatch, chartJobs);

    const getTeamRow = (team: Team, colorClass: string) => {
        // Handle missing/invalid team data (common in incomplete playoff matches)
        if (!team.teamNumber || team.teamNumber <= 0) {
            return `
                <div class="team-row">
                    <span class="${colorClass}">TBD</span>
                    <span class="team-rank">-</span>
                </div>
            `;
        }

        const rank = rankings.find(r => r.teamNumber === team.teamNumber);
        const teamInfo = teams.find(t => t.teamNumber === team.teamNumber);
        
        const rankText = rank ? `#${rank.rank}` : "-";
        let name = `Team ${team.teamNumber}`;
        
        if (rank && rank.teamName) {
            name = rank.teamName;
        } else if (teamInfo) {
            name = teamInfo.nameShort || teamInfo.nameFull;
        }

        return `
            <div class="team-row">
                <span class="${colorClass} team-number-link" data-team="${team.teamNumber}">${team.teamNumber} ${name}</span>
                <span class="team-rank">${rankText}</span>
            </div>
        `;
    };

    const statsTableRows = validTeams.map(team => {
        const rank = rankings.find(r => r.teamNumber === team.teamNumber);
        
        const rankText = rank ? `#${rank.rank}` : "-";
        const rp = rank ? rank.sortOrder1 : "-";
        const mp = rank ? rank.sortOrder2 : "-";
        const bp = rank ? rank.sortOrder3 : "-";
        const ap = rank ? rank.sortOrder4 : "-";
        const record = rank ? `${rank.wins}-${rank.losses}-${rank.ties}` : "-";
        const played = rank ? rank.matchesPlayed : "-";
        
        const isRed = team.station.startsWith("Red");
        const allianceClass = isRed ? "team-red" : "team-blue";
        const rowClass = isRed ? "stats-row-red" : "stats-row-blue";

        return `
            <tr class="${rowClass}">
                <td class="${allianceClass}"><span class="team-number-link" data-team="${team.teamNumber}">${team.teamNumber}</span></td>
                <td>${rankText}</td>
                <td>${rp}</td>
                <td>${mp}</td>
                <td>${bp}</td>
                <td>${ap}</td>
                <td>${record}</td>
                <td>${played}</td>
            </tr>
        `;
    }).join("");

    const statsTable = `
        <div class="stats-container">
            <div class="stats-title">Team Statistics</div>
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Team</th>
                        <th>Rank</th>
                        <th>Ranking Score</th>
                        <th>Match Points</th>
                        <th>Base Points</th>
                        <th>Auto Points</th>
                        <th>W-L-T</th>
                        <th>Plays</th>
                    </tr>
                </thead>
                <tbody>
                    ${statsTableRows}
                </tbody>
            </table>
        </div>
    `;

    const redScore = parseScore(match.scoreRedFinal);
    const blueScore = parseScore(match.scoreBlueFinal);
    const redWon = redScore !== null && blueScore !== null && redScore > blueScore;
    const blueWon = redScore !== null && blueScore !== null && blueScore > redScore;
    const redScoreText = redScore !== null ? ` - ${redScore}${redWon ? " 👑" : ""}` : "";
    const blueScoreText = blueScore !== null ? ` - ${blueScore}${blueWon ? " 👑" : ""}` : "";
    const redAllianceTitle = `Red Alliance${redScoreText}`;
    const blueAllianceTitle = `Blue Alliance${blueScoreText}`;
    
    const notesLoadingSection = validTeams.length > 0 ? `
        <div class="notes-display-container" id="notes-section">
            <div class="notes-display-title">Scouting Notes</div>
            <div class="notes-loading">Loading notes...</div>
        </div>
    ` : "";

    detailsContainer.innerHTML = `
        <div class="details-animate">
            <div class="details-header">
                <div class="details-title">${match.description}</div>
                <div class="details-time">Scheduled: ${new Date(match.startTime).toLocaleString()}</div>
                ${match.actualStartTime ? `<div class="details-time">Actual: ${new Date(match.actualStartTime).toLocaleString()}</div>` : ''}
                ${match.field ? `<div class="details-time">Field: ${match.field}</div>` : ''}
            </div>
            
            <div class="alliance-container">
                <div class="alliance-card red">
                    <div class="alliance-title">${redAllianceTitle}</div>
                    ${redTeams.map(t => getTeamRow(t, 'team-red')).join("")}
                </div>
                <div class="alliance-card blue">
                    <div class="alliance-title">${blueAllianceTitle}</div>
                    ${blueTeams.map(t => getTeamRow(t, 'team-blue')).join("")}
                </div>
            </div>

            ${scoreBreakdownHtml}
            ${statsTable}
            ${notesLoadingSection}
        </div>
    `;

    chartJobs.forEach(job => job());

    if (validTeams.length > 0) {
        const teamNumbers = validTeams.map(t => t.teamNumber);
        const notesMap = await loadNotesForTeams(teamNumbers);
        
        const notesSection = document.getElementById("notes-section");
        if (notesSection) {
            const escapeHtml = (text: string) => {
                const div = document.createElement("div");
                div.textContent = text;
                return div.innerHTML;
            };
            
            const formatMultiline = (text: string) => {
                return escapeHtml(text).replace(/\n/g, "<br>");
            };

            notesSection.innerHTML = `
                <div class="notes-display-title">Scouting Notes</div>
                ${validTeams.map(team => {
                    const notes = notesMap.get(team.teamNumber);
                    const teamInfo = teams.find(t => t.teamNumber === team.teamNumber);
                    const teamName = teamInfo ? (teamInfo.nameShort || teamInfo.nameFull) : `Team ${team.teamNumber}`;
                    const isRed = team.station.startsWith("Red");
                    const allianceClass = isRed ? "team-red" : "team-blue";
                    
                    if (!notes || (!notes.autoPerformance && !notes.teleopPerformance && !notes.generalNotes)) {
                        return `
                            <div class="notes-display-card no-notes">
                                <div class="notes-display-header">
                                    <span class="${allianceClass}">${team.teamNumber} - ${teamName}</span>
                                    <span class="notes-status-pending">No notes</span>
                                </div>
                            </div>
                        `;
                    }
                    
                    return `
                        <div class="notes-display-card">
                            <div class="notes-display-header">
                                <span class="${allianceClass}">${team.teamNumber} - ${teamName}</span>
                                <span class="notes-status-complete">✓</span>
                            </div>
                            ${notes.autoPerformance ? `<div class="notes-display-field"><strong>Auto:</strong><br>${formatMultiline(notes.autoPerformance)}</div>` : ""}
                            ${notes.teleopPerformance ? `<div class="notes-display-field"><strong>TeleOp:</strong><br>${formatMultiline(notes.teleopPerformance)}</div>` : ""}
                            ${notes.generalNotes ? `<div class="notes-display-field"><strong>Notes:</strong><br>${formatMultiline(notes.generalNotes)}</div>` : ""}
                        </div>
                    `;
                }).join("")}
            `;
        }
    }

    hideLoading();
}

async function verifyToken(token: string): Promise<boolean> {
    try {
        const response = await authFetch("/api/v1/verify", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            loggedInTeamId = data.id;
            currentUserScopes = Array.isArray(data.scope) ? data.scope : [];
            isAdminAuthenticated = currentUserScopes.includes("admin");
            return true;
        }
        return false;
    } catch (error) {
        console.error("Token verification failed:", error);
        return false;
    }
}

async function checkAdminStatus(): Promise<void> {
    const adminButton = document.getElementById("button-admin");
    if (!adminButton) return;

    if (currentUserScopes.includes("admin")) {
        adminButton.style.display = "";
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await authFetch("/api/v1/admin/self", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (response.status === 200) {
            adminButton.style.display = "";
        }
    } catch (error) {
        console.log("Admin check failed:", error);
    }
}

function updateAdminViewState(): void {
    const adminLogin = document.getElementById("admin-login");
    const adminContainer = document.getElementById("admin-container");
    
    if (isAdminAuthenticated) {
        if (adminLogin) adminLogin.style.display = "none";
        if (adminContainer) adminContainer.style.display = "";
    } else {
        if (adminLogin) adminLogin.style.display = "";
        if (adminContainer) adminContainer.style.display = "none";
    }
}

async function handleAdminLogin(event: Event): Promise<void> {
    event.preventDefault();
    
    const otpInput = document.getElementById("admin-otp") as HTMLInputElement;
    const errorElement = document.getElementById("admin-login-error");
    const submitButton = document.getElementById("admin-login-button");
    
    if (!otpInput || !errorElement || !submitButton) return;
    
    const otp = otpInput.value.trim();
    
    if (!/^\d{6}$/.test(otp)) {
        errorElement.textContent = "Please enter a valid 6-digit code";
        errorElement.style.display = "block";
        return;
    }
    
    submitButton.textContent = "Authenticating...";
    (submitButton as HTMLButtonElement).disabled = true;
    errorElement.style.display = "none";
    
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("No token found");
        }
        
        const response = await authFetch(`/api/v1/admin/login?otp=${otp}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (response.status === 200) {
            const data = await response.json();
            localStorage.setItem("token", data.token);
            localStorage.setItem("adminToken", data.token);
            currentUserScopes = ["user", "admin"];
            isAdminAuthenticated = true;
            updateAdminViewState();
            otpInput.value = "";
            
            if (typeof (window as any).switchAdminSection === "function") {
                (window as any).switchAdminSection("overview");
            }
        } else if (response.status === 403) {
            errorElement.textContent = "Invalid or expired code";
            errorElement.style.display = "block";
        } else {
            errorElement.textContent = "Authentication failed";
            errorElement.style.display = "block";
        }
    } catch (error) {
        console.error("Admin login error:", error);
        errorElement.textContent = "Authentication failed";
        errorElement.style.display = "block";
    } finally {
        submitButton.textContent = "Authenticate";
        (submitButton as HTMLButtonElement).disabled = false;
    }
}

function showLogin() {
    const loginView = document.getElementById("login");
    if (loginView) {
        loginView.style.display = "flex";
    }
}

function hideLogin() {
    const loginView = document.getElementById("login");
    if (loginView) {
        loginView.style.display = "none";
    }
}

async function handleLogin(event: Event) {
    event.preventDefault();
    const idInput = document.getElementById("login-id") as HTMLInputElement;
    const passwordInput = document.getElementById("login-password") as HTMLInputElement;
    const errorElement = document.getElementById("login-error");

    if (!idInput || !passwordInput || !errorElement) return;

    const id = parseInt(idInput.value);
    const password = passwordInput.value;

    errorElement.style.display = "none";
    errorElement.textContent = "";

    try {
        const response = await fetch("/api/v1/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("token", data.token);
            loggedInTeamId = id;
            currentUserScopes = ["user"];
            isAdminAuthenticated = false;
            hideLogin();
            await checkAdminStatus();
            updateAdminViewState();
            loadEvents();
            if (tabs.length > 0) {
                switchTab(tabs[0]);
            }
        } else {
            errorElement.textContent = data.error || "Login failed";
            errorElement.style.display = "block";
        }
    } catch (error) {
        console.error("Login error:", error);
        errorElement.textContent = "An error occurred. Please try again.";
        errorElement.style.display = "block";
    }
}

function getRelativeTime(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) !== 1 ? "s" : ""} ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? "s" : ""} ago`;
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? "s" : ""} ago`;
}

async function loadNotesStatus() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await authFetch(`/api/v1/notes/list`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const rawStatus = data.notesStatus || {};
            currentNotesStatus = {};
            Object.keys(rawStatus).forEach(key => {
                const numericKey = parseInt(key, 10);
                const value = rawStatus[key];
                if (!Number.isNaN(numericKey)) {
                    currentNotesStatus[numericKey] = typeof value === "number" ? value : undefined;
                }
            });
        }
    } catch (error) {
        console.error("Failed to load notes status:", error);
    }
}

async function loadNotesForTeams(teamIds: number[]): Promise<Map<number, Note>> {
    const token = localStorage.getItem("token");
    const notesMap = new Map<number, Note>();
    
    if (!token) return notesMap;

    try {
        const promises = teamIds.map(teamId => 
            authFetch(`/api/v1/notes?team=${teamId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            }).then(res => res.ok ? res.json() : null)
        );
        
        const results = await Promise.all(promises);
        teamIds.forEach((teamId, index) => {
            if (results[index]) {
                notesMap.set(teamId, results[index].notes);
            }
        });
    } catch (error) {
        console.error("Failed to load notes for teams:", error);
    }
    
    return notesMap;
}

async function loadNotes(teamId: number): Promise<Note> {
    const token = localStorage.getItem("token");
    if (!token) return { autoPerformance: "", teleopPerformance: "", generalNotes: "", updatedAt: null };

    try {
        const response = await authFetch(`/api/v1/notes?team=${teamId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.notes;
        }
    } catch (error) {
        console.error("Failed to load notes:", error);
    }
    
    return { autoPerformance: "", teleopPerformance: "", generalNotes: "", updatedAt: null };
}

function isNoteStale(updatedAt?: number): boolean {
    if (!updatedAt || currentEventStartTimestamp === null) return false;
    const noteTimeMs = updatedAt * 1000;
    const oneDayMs = 24 * 60 * 60 * 1000;
    return noteTimeMs < currentEventStartTimestamp - oneDayMs;
}

function updateTeamNoteStatus(teamId: number) {
    const item = document.querySelector(`.notes-team-item[data-team-id="${teamId}"]`);
    if (!item) return;

    const updatedAt = currentNotesStatus[teamId];
    const hasNotes = updatedAt !== undefined;
    const stale = hasNotes && isNoteStale(updatedAt);

    item.classList.toggle("needs-notes", !hasNotes);
    item.classList.toggle("stale-notes", !!hasNotes && stale);

    const statusIndicator = item.querySelector(".notes-status-complete, .notes-status-pending, .notes-status-warning");
    if (statusIndicator) {
        if (!hasNotes) {
            statusIndicator.className = "notes-status-pending";
            statusIndicator.textContent = "!";
        } else if (stale) {
            statusIndicator.className = "notes-status-warning";
            statusIndicator.textContent = "!";
        } else {
            statusIndicator.className = "notes-status-complete";
            statusIndicator.textContent = "✓";
        }
    }
}

async function saveNotes(teamId: number, notes: Note) {
    const token = localStorage.getItem("token");
    if (!token) return;

    const isComplete = notes.autoPerformance.trim() !== "" && 
                     notes.teleopPerformance.trim() !== "" && 
                     notes.generalNotes.trim() !== "";
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Optimistically update UI immediately
    currentNotesStatus[teamId] = isComplete ? timestamp : undefined;
    updateTeamNoteStatus(teamId);

    // Then save to backend
    try {
        authFetch("/api/v1/notes", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                subjectTeamId: teamId,
                autoPerformance: notes.autoPerformance,
                teleopPerformance: notes.teleopPerformance,
                generalNotes: notes.generalNotes
            })
        }).then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error("Save failed");
        }).then(data => {
            currentNotesStatus[teamId] = isComplete ? data.updatedAt : undefined;
            updateTeamNoteStatus(teamId);
        }).catch(error => {
            console.error("Failed to save notes:", error);
            // Revert optimistic update on failure
            delete currentNotesStatus[teamId];
            updateTeamNoteStatus(teamId);
        });
    } catch (error) {
        console.error("Failed to save notes:", error);
    }
}

function renderNotesTeamList(teams: TeamInfo[], eventCode: string) {
    const listContainer = document.getElementById("notes-list");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    teams.forEach((team, index) => {
        const item = document.createElement("div");
        item.className = "notes-team-item";
        item.dataset.teamId = team.teamNumber.toString();
        item.style.animationDelay = `${index * 0.03}s`;
        
        const updatedAt = currentNotesStatus[team.teamNumber];
        const hasNotes = updatedAt !== undefined;
        const stale = hasNotes && isNoteStale(updatedAt);

        if (!hasNotes) {
            item.classList.add("needs-notes");
        } else if (stale) {
            item.classList.add("stale-notes");
        }

        item.onclick = () => {
            document.querySelectorAll(".notes-team-item").forEach(el => el.classList.remove("active"));
            item.classList.add("active");
            currentSelectedNotesTeam = team.teamNumber;
            renderNotesEditor(team, eventCode);
            updateUrl();
        };

        const teamName = team.nameShort || team.nameFull || `Team ${team.teamNumber}`;
        let statusIndicator = '<span class="notes-status-pending">!</span>';
        if (hasNotes) {
            statusIndicator = stale ? '<span class="notes-status-warning">!</span>' : '<span class="notes-status-complete">✓</span>';
        }

        item.innerHTML = `
            <div class="notes-team-header">
                <span class="notes-team-number">${team.teamNumber}</span>
                ${statusIndicator}
            </div>
            <div class="notes-team-name">${teamName}</div>
        `;
        listContainer.appendChild(item);
    });
}

async function renderNotesEditor(team: TeamInfo, eventCode: string) {
    const detailsContainer = document.getElementById("notes-details");
    if (!detailsContainer) return;

    const notes = await loadNotes(team.teamNumber);
    const teamName = team.nameShort || team.nameFull || `Team ${team.teamNumber}`;

    detailsContainer.innerHTML = `
        <div class="notes-editor-container details-animate">
            <div class="notes-editor-header">
                <div class="notes-editor-title">Team ${team.teamNumber} - ${teamName}</div>
                <div class="notes-editor-subtitle">Event: ${eventCode}</div>
            </div>
            
            <div class="notes-section">
                <label class="notes-label" for="notes-auto">Autonomous Performance</label>
                <textarea class="notes-textarea" id="notes-auto" placeholder="Describe autonomous performance: Start location, ball count, reliability...">${notes.autoPerformance}</textarea>
            </div>
            
            <div class="notes-section">
                <label class="notes-label" for="notes-teleop">Teleoperated Performance</label>
                <textarea class="notes-textarea" id="notes-teleop" placeholder="Describe teleoperated performance: Shooting location, throughput, accuracy, strategy...">${notes.teleopPerformance}</textarea>
            </div>
            
            <div class="notes-section">
                <label class="notes-label" for="notes-general">General Notes</label>
                <textarea class="notes-textarea" id="notes-general" placeholder="Overall vibe check/misc yap...">${notes.generalNotes}</textarea>
            </div>
            
            <div class="notes-footer">
                ${notes.updatedAt ? `<span class="notes-last-saved">Last saved: ${new Date(notes.updatedAt * 1000).toLocaleString()} (${getRelativeTime(notes.updatedAt)})</span>` : '<span class="notes-last-saved">Not yet saved</span>'}
            </div>
        </div>
    `;

    const autoTextarea = document.getElementById("notes-auto") as HTMLTextAreaElement;
    const teleopTextarea = document.getElementById("notes-teleop") as HTMLTextAreaElement;
    const generalTextarea = document.getElementById("notes-general") as HTMLTextAreaElement;

    const handleInput = () => {
        if (notesAutoSaveTimeout) {
            clearTimeout(notesAutoSaveTimeout);
        }
        
        notesAutoSaveTimeout = window.setTimeout(() => {
            const updatedNotes: Note = {
                autoPerformance: autoTextarea.value,
                teleopPerformance: teleopTextarea.value,
                generalNotes: generalTextarea.value,
                updatedAt: Math.floor(Date.now() / 1000)
            };
            saveNotes(team.teamNumber, updatedNotes);
        }, 500);
    };

    autoTextarea.addEventListener("input", handleInput);
    teleopTextarea.addEventListener("input", handleInput);
    generalTextarea.addEventListener("input", handleInput);
}

async function initializeNotesView(eventCode: string) {
    if (!currentTeams.length) return;
    
    await loadNotesStatus();
    renderNotesTeamList(currentTeams, eventCode);
}

function findTeamMatches(teamNumber: number, schedule: Match[], matchScores: any[]): any[] {
    // Use composite key of level + series + matchNumber to handle both qual and playoff matches
    const teamMatchKeys = new Set<string>();
    const teamAlliances = new Map<string, string>();

    for (const match of schedule) {
        // Skip matches with incomplete team data
        if (!match.teams.every(t => t.teamNumber && t.teamNumber > 0)) continue;
        
        for (const team of match.teams) {
            if (team.teamNumber === teamNumber) {
                const level = normalizeLevel(match.tournamentLevel);
                const series = typeof match.series === "number" ? match.series : 0;
                const key = `${level}-${series}-${match.matchNumber}`;
                teamMatchKeys.add(key);
                const alliance = team.station.startsWith("Red") ? "Red" : "Blue";
                teamAlliances.set(key, alliance);
                break;
            }
        }
    }

    const filteredScores: any[] = [];
    for (const matchScore of matchScores) {
        const level = normalizeLevel(matchScore.matchLevel);
        const series = typeof matchScore.matchSeries === "number" ? matchScore.matchSeries : 0;
        const key = `${level}-${series}-${matchScore.matchNumber}`;
        if (teamMatchKeys.has(key)) {
            const teamAllianceName = teamAlliances.get(key);
            
            filteredScores.push({
                ...matchScore,
                teamAlliance: teamAllianceName
            });
        }
    }

    // Sort by level (qual first, then playoff) then by match number
    return filteredScores.sort((a, b) => {
        const aLevel = normalizeLevel(a.matchLevel);
        const bLevel = normalizeLevel(b.matchLevel);
        if (aLevel !== bLevel) {
            return aLevel.includes("qual") ? -1 : 1;
        }
        return a.matchNumber - b.matchNumber;
    });
}

function roundTo2(val: number | null | undefined): number | null {
    if (val === null || val === undefined) return null;
    return Math.round(val * 100) / 100;
}

function normalizeTournamentLevel(level?: string): string {
    return (level || "").toLowerCase();
}

function isQualMatch(match: Match | ScoreMatch): boolean {
    const level = normalizeTournamentLevel((match as Match).tournamentLevel || (match as ScoreMatch).matchLevel);
    return level.includes("qual");
}

function isScoreComplete(matchScore: ScoreMatch): boolean {
    if (!matchScore || !matchScore.alliances || matchScore.alliances.length === 0) return false;
    return matchScore.alliances.every(alliance => alliance.totalPoints !== undefined && alliance.totalPoints !== null);
}

function getAllianceTeams(scheduleMatch: Match, allianceName: string): number[] {
    return scheduleMatch.teams
        .filter(team => team.station.toLowerCase().startsWith(allianceName.toLowerCase()))
        .map(team => team.teamNumber);
}

function buildTeamList(schedule: Match[]): number[] {
    const teams = new Set<number>();
    for (const match of schedule) {
        for (const team of match.teams) {
            if (team.teamNumber && team.teamNumber > 0) {
                teams.add(team.teamNumber);
            }
        }
    }
    return Array.from(teams).sort((a, b) => a - b);
}

function eventHasAllScores(schedule: Match[], matchScores: ScoreMatch[]): boolean {
    const scheduleMap = new Map<number, Match>();
    schedule.forEach(match => scheduleMap.set(match.matchNumber, match));

    for (const match of schedule) {
        const score = matchScores.find(ms => ms.matchNumber === match.matchNumber);
        if (!score || !isScoreComplete(score)) {
            return false;
        }
    }
    return true;
}

function eventHasAllScoresForMatches(schedule: Match[], matchScores: ScoreMatch[]): boolean {
    for (const match of schedule) {
        const level = normalizeLevel(match.tournamentLevel);
        const series = typeof match.series === "number" ? match.series : 0;
        const score = matchScores.find(ms => {
            const scoreLevel = normalizeLevel(ms.matchLevel);
            const scoreSeries = typeof ms.matchSeries === "number" ? ms.matchSeries : 0;
            return ms.matchNumber === match.matchNumber && 
                   scoreLevel === level &&
                   scoreSeries === series;
        });
        if (!score || !isScoreComplete(score)) {
            return false;
        }
    }
    return true;
}

function buildLeastSquaresSolution(teamIds: number[], equations: { teams: number[]; value: number; }[]): Map<number, number> {
    const teamIndex = new Map<number, number>();
    teamIds.forEach((id, idx) => teamIndex.set(id, idx));

    const rows = equations.length;
    const cols = teamIds.length;

    if (rows === 0 || cols === 0) {
        return new Map<number, number>();
    }

    const ata: number[][] = Array.from({ length: cols }, () => Array(cols).fill(0));
    const atb: number[] = Array(cols).fill(0);

    for (const eq of equations) {
        const bVal = eq.value;
        const indices = eq.teams.map(id => teamIndex.get(id)!).filter(idx => idx !== undefined);
        for (const i of indices) {
            atb[i] += bVal;
            for (const j of indices) {
                ata[i][j] += 1;
            }
        }
    }

    // Augmented matrix for Gaussian elimination: ata | atb
    const augmented: number[][] = ata.map((row, i) => [...row, atb[i]]);
    const n = cols;

    for (let i = 0; i < n; i++) {
        // Pivot selection
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                maxRow = k;
            }
        }

        const pivot = augmented[maxRow][i];
        if (Math.abs(pivot) < 1e-9) {
            continue;
        }

        // Swap rows
        [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

        // Normalize pivot row
        for (let j = i; j <= n; j++) {
            augmented[i][j] /= pivot;
        }

        // Eliminate column
        for (let k = 0; k < n; k++) {
            if (k === i) continue;
            const factor = augmented[k][i];
            if (Math.abs(factor) < 1e-12) continue;
            for (let j = i; j <= n; j++) {
                augmented[k][j] -= factor * augmented[i][j];
            }
        }
    }

    const solution = new Map<number, number>();
    for (let i = 0; i < n; i++) {
        const value = Number.isFinite(augmented[i][n]) ? augmented[i][n] : 0;
        solution.set(teamIds[i], value);
    }
    return solution;
}

function computeOprForEvent(teamNumber: number, schedule: Match[], matchScores: ScoreMatch[]) {
    // Filter schedule to only include matches with valid team data
    const validSchedule = schedule.filter(match => 
        match.teams.every(t => t.teamNumber && t.teamNumber > 0)
    ).sort((a, b) => {
        const aLevel = normalizeLevel(a.tournamentLevel);
        const bLevel = normalizeLevel(b.tournamentLevel);
        if (aLevel !== bLevel) return aLevel.includes("QUAL") ? -1 : 1;
        return a.matchNumber - b.matchNumber;
    });
    
    const validScores = matchScores.filter(isScoreComplete).sort((a, b) => {
        const aLevel = normalizeLevel(a.matchLevel);
        const bLevel = normalizeLevel(b.matchLevel);
        if (aLevel !== bLevel) return aLevel.includes("QUAL") ? -1 : 1;
        return a.matchNumber - b.matchNumber;
    });

    // OPR is calculated ONLY from qualification matches
    const qualSchedule = validSchedule.filter(isQualMatch);
    const qualScores = validScores.filter(isQualMatch);

    const eventComplete = eventHasAllScoresForMatches(qualSchedule, qualScores);
    // Get all team matches (qual + playoff) for display
    const teamMatches = findTeamMatches(teamNumber, validSchedule, validScores);
    // Build team list only from qual matches for OPR calculation
    const teamList = buildTeamList(qualSchedule);

    // Generate labels based on match level
    const matchLabels = teamMatches.map(match => {
        const level = normalizeLevel(match.matchLevel);
        const prefix = level.includes("QUAL") ? "Q" : "P";
        return `${prefix}${match.matchNumber}`;
    });

    if (!eventComplete || teamList.length === 0 || teamMatches.length === 0) {
        return {
            eventComplete,
            teamMatches,
            matchLabels,
            perMatchOpr: {
                overall: teamMatches.map(() => null),
                auto: teamMatches.map(() => null),
                teleop: teamMatches.map(() => null),
                autoArtifacts: teamMatches.map(() => null),
                teleopArtifacts: teamMatches.map(() => null)
            },
            teamOpr: null
        };
    }

    // Build schedule map ONLY from qual matches for OPR
    const qualScheduleMap = new Map<string, Match>();
    qualSchedule.forEach(match => {
        const level = normalizeLevel(match.tournamentLevel);
        const series = typeof match.series === "number" ? match.series : 0;
        const key = `${level}-${series}-${match.matchNumber}`;
        qualScheduleMap.set(key, match);
    });

    // Build equations ONLY from qual scores
    const buildEquations = (metric: (alliance: ScoreAlliance) => number) => {
        const equations: { teams: number[]; value: number; }[] = [];
        for (const score of qualScores) {
            if (!isScoreComplete(score)) continue;
            const level = normalizeLevel(score.matchLevel);
            const series = typeof score.matchSeries === "number" ? score.matchSeries : 0;
            const key = `${level}-${series}-${score.matchNumber}`;
            const scheduleMatch = qualScheduleMap.get(key);
            if (!scheduleMatch) continue;
            for (const alliance of score.alliances) {
                const allianceTeams = getAllianceTeams(scheduleMatch, alliance.alliance);
                if (!allianceTeams.length) continue;
                equations.push({ teams: allianceTeams, value: metric(alliance) });
            }
        }
        return equations;
    };

    const metricSelectors = {
        overall: (alliance: ScoreAlliance) => (alliance.autoPoints || 0) + (alliance.teleopPoints || 0),
        auto: (alliance: ScoreAlliance) => alliance.autoPoints || 0,
        teleop: (alliance: ScoreAlliance) => alliance.teleopPoints || 0,
        autoArtifacts: (alliance: ScoreAlliance) => (alliance.autoClassifiedArtifacts || 0) + (alliance.autoOverflowArtifacts || 0),
        teleopArtifacts: (alliance: ScoreAlliance) => (alliance.teleopClassifiedArtifacts || 0) + (alliance.teleopOverflowArtifacts || 0)
    };

    const solutions = {
        overall: buildLeastSquaresSolution(teamList, buildEquations(metricSelectors.overall)),
        auto: buildLeastSquaresSolution(teamList, buildEquations(metricSelectors.auto)),
        teleop: buildLeastSquaresSolution(teamList, buildEquations(metricSelectors.teleop)),
        autoArtifacts: buildLeastSquaresSolution(teamList, buildEquations(metricSelectors.autoArtifacts)),
        teleopArtifacts: buildLeastSquaresSolution(teamList, buildEquations(metricSelectors.teleopArtifacts))
    };

    const teamOpr = {
        overall: solutions.overall.get(teamNumber) || 0,
        auto: solutions.auto.get(teamNumber) || 0,
        teleop: solutions.teleop.get(teamNumber) || 0,
        autoArtifacts: solutions.autoArtifacts.get(teamNumber) || 0,
        teleopArtifacts: solutions.teleopArtifacts.get(teamNumber) || 0
    };

    // OPR is only shown for qual matches, null for playoff matches
    const perMatchOpr = {
        overall: teamMatches.map(match => isQualMatch(match) ? teamOpr.overall : null),
        auto: teamMatches.map(match => isQualMatch(match) ? teamOpr.auto : null),
        teleop: teamMatches.map(match => isQualMatch(match) ? teamOpr.teleop : null),
        autoArtifacts: teamMatches.map(match => isQualMatch(match) ? teamOpr.autoArtifacts : null),
        teleopArtifacts: teamMatches.map(match => isQualMatch(match) ? teamOpr.teleopArtifacts : null)
    };

    return {
        eventComplete,
        teamMatches,
        matchLabels,
        perMatchOpr,
        teamOpr
    };
}

async function analyzeTeam(teamNumber: number, updateHistory: boolean = true) {
    const token = localStorage.getItem("token");
    if (!token) return;

    const content = document.getElementById("insights-content");
    if (!content) return;

    currentInsightsTeam = teamNumber;
    if (updateHistory) {
        updateUrl();
    }

    content.innerHTML = '<div class="insights-loading">Loading team data...</div>';
    showLoading();

    try {
        const [eventsRes, teamInfoRes] = await Promise.all([
            authFetch(`/api/v1/team/${teamNumber}/events`, {
                headers: { "Authorization": `Bearer ${token}` }
            }),
            authFetch(`/api/v1/team/${teamNumber}`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
        ]);

        if (!eventsRes.ok) {
            content.innerHTML = '<div class="insights-error">Failed to load team events. Please check the team number.</div>';
            hideLoading();
            return;
        }

        const eventsData = await eventsRes.json();
        const events = eventsData.events || [];

        let teamInfo: TeamInfo | null = null;
        if (teamInfoRes.ok) {
            const teamInfoData = await teamInfoRes.json();
            const teams = teamInfoData.teams || [];
            if (teams.length > 0) {
                teamInfo = teams[0];
            }
        }

        if (events.length === 0) {
            content.innerHTML = '<div class="insights-error">No events found for this team.</div>';
            hideLoading();
            return;
        }

        const sortedEvents = [...events].sort((a, b) => {
            const aTime = a.dateStart ? new Date(a.dateStart).getTime() : 0;
            const bTime = b.dateStart ? new Date(b.dateStart).getTime() : 0;
            return aTime - bTime;
        });

        const allScoreData: any[] = [];
        for (const event of sortedEvents) {
            try {
                const [qualScoresRes, playoffScoresRes, scheduleRes] = await Promise.all([
                    authFetch(`/api/v1/scores/${event.code}/qual`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    }),
                    authFetch(`/api/v1/scores/${event.code}/playoff`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    }),
                    authFetch(`/api/v1/schedule?event=${event.code}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    })
                ]);

                if (scheduleRes.ok) {
                    const qualScoresData = qualScoresRes.ok ? await qualScoresRes.json() : { matchScores: [] };
                    const playoffScoresData = playoffScoresRes.ok ? await playoffScoresRes.json() : { matchScores: [] };
                    const scheduleData = await scheduleRes.json();
                    
                    const qualScores = qualScoresData.matchScores || [];
                    const playoffScores = playoffScoresData.matchScores || [];
                    
                    // Filter playoff scores to only include complete matches with valid team data
                    const validPlayoffScores = playoffScores.filter((score: ScoreMatch) => {
                        if (!isScoreComplete(score)) return false;
                        // Check if the corresponding schedule match has valid teams (matching level, series, and matchNumber)
                        const scoreSeries = typeof score.matchSeries === "number" ? score.matchSeries : 0;
                        const scheduleMatch = (scheduleData.schedule || []).find((m: Match) => {
                            const matchSeries = typeof m.series === "number" ? m.series : 0;
                            return m.matchNumber === score.matchNumber && 
                                   normalizeLevel(m.tournamentLevel) === normalizeLevel(score.matchLevel) &&
                                   matchSeries === scoreSeries;
                        });
                        if (!scheduleMatch) return false;
                        // Ensure all teams have valid team numbers
                        return scheduleMatch.teams.every((t: Team) => t.teamNumber && t.teamNumber > 0);
                    });
                    
                    const allScores = [...qualScores, ...validPlayoffScores];
                    
                    if (allScores.length > 0 && scheduleData.schedule) {
                        const { eventComplete, teamMatches, matchLabels, perMatchOpr, teamOpr } = computeOprForEvent(
                            teamNumber,
                            scheduleData.schedule,
                            allScores
                        );

                        if (teamMatches.length > 0) {
                            allScoreData.push({
                                event: event.name,
                                eventCode: event.code,
                                scores: teamMatches,
                                matchLabels,
                                perMatchOpr,
                                teamOpr,
                                eventComplete
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn(`Failed to fetch scores for ${event.code}`, e);
            }
        }

        renderInsights(teamNumber, sortedEvents, allScoreData, teamInfo);
    } catch (error) {
        console.error("Failed to analyze team:", error);
        content.innerHTML = '<div class="insights-error">An error occurred while analyzing the team.</div>';
    } finally {
        hideLoading();
    }
}

function generateStatsHTML(stats: any) {
    return `
        <div class="insight-card">
            <h3>Overall Statistics</h3>
            <div class="stat-row"><span>Total Matches:</span><strong>${stats.totalMatches}</strong></div>
            <div class="stat-row"><span>Win Rate:</span><strong>${stats.winRate.toFixed(1)}% (${stats.wins})</strong></div>
            <div class="stat-row"><span>Avg Score:</span><strong>${stats.avgScore.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Median Score:</span><strong>${stats.medianScore.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Standard Deviation:</span><strong>${stats.scoreStdDev.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Max Score:</span><strong>${stats.maxScore}</strong></div>
            <div class="stat-row"><span>Min Score:</span><strong>${stats.minScore}</strong></div>
        </div>

        <div class="insight-card">
            <h3>Autonomous Performance</h3>
            <div class="stat-row"><span>Avg Auto Points:</span><strong>${stats.avgAutoPoints.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Avg Artifact Points:</span><strong>${stats.avgAutoArtifactPoints.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Avg Pattern Points:</span><strong>${stats.avgAutoPatternPoints.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Avg Leave Points:</span><strong>${stats.avgAutoLeave.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Avg Artifacts Scored:</span><strong>${stats.avgAutoArtifacts.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Median Artifacts Scored:</span><strong>${stats.medianAutoArtifacts.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Mode Artifacts Scored:</span><strong>${stats.modeAutoArtifacts !== null && stats.modeAutoArtifacts !== undefined ? stats.modeAutoArtifacts : 'n/a'}</strong></div>
            <div class="stat-row"><span>Std Dev Artifacts:</span><strong>${stats.stdDevAutoArtifacts.toFixed(1)}</strong></div>
        </div>

        <div class="insight-card">
            <h3>Teleop Performance</h3>
            <div class="stat-row"><span>Avg Teleop Points:</span><strong>${stats.avgTeleopPoints.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Avg Artifact Points:</span><strong>${stats.avgTeleopArtifactPoints.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Avg Pattern Points:</span><strong>${stats.avgTeleopPatternPoints.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Avg Base Points:</span><strong>${stats.avgTeleopBasePoints.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Avg Artifacts Scored:</span><strong>${stats.avgTeleopArtifacts.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Median Artifacts Scored:</span><strong>${stats.medianTeleopArtifacts.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Mode Artifacts Scored:</span><strong>${stats.modeTeleopArtifacts !== null && stats.modeTeleopArtifacts !== undefined ? stats.modeTeleopArtifacts : 'n/a'}</strong></div>
            <div class="stat-row"><span>Std Dev Artifacts:</span><strong>${stats.stdDevTeleopArtifacts.toFixed(1)}</strong></div>
        </div>

        <div class="insight-card">
            <h3>Ranking Points</h3>
            <div class="stat-row"><span>Movement RP:</span><strong>${stats.movementRPRate.toFixed(1)}% (${(stats.movementRPRate * stats.totalMatches / 100).toFixed(0)})</strong></div>
            <div class="stat-row"><span>Goal RP:</span><strong>${stats.goalRPRate.toFixed(1)}% (${(stats.goalRPRate * stats.totalMatches / 100).toFixed(0)})</strong></div>
            <div class="stat-row"><span>Pattern RP:</span><strong>${stats.patternRPRate.toFixed(1)}% (${(stats.patternRPRate * stats.totalMatches / 100).toFixed(0)})</strong></div>
        </div>

        <div class="insight-card">
            <h3>Penalties</h3>
            <div class="stat-row"><span>Avg Points Committed:</span><strong>${stats.avgPenaltyPoints.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Major Fouls:</span><strong>${stats.totalMajorFouls}</strong></div>
            <div class="stat-row"><span>Minor Fouls:</span><strong>${stats.totalMinorFouls}</strong></div>
            <div class="stat-row"><span>Clean Matches:</span><strong>${(stats.cleanMatches / stats.totalMatches * 100).toFixed(1)}% (${stats.cleanMatches})</strong></div>
        </div>
    `;
}

function renderInsights(teamNumber: number, events: any[], scoreData: any[], teamInfo: TeamInfo | null) {
    const content = document.getElementById("insights-content");
    if (!content) return;

    const eventCodes = new Set(scoreData.map(s => s.eventCode));
    const playedEvents = events.filter(e => eventCodes.has(e.code));

    const stats = calculateTeamStatistics(teamNumber, scoreData);
    const charts = generateChartsHTML(stats);

    const teamNickname = teamInfo ? (teamInfo.nameShort || teamInfo.nameFull || "") : "";
    const teamTitle = teamNickname ? `Team ${teamNumber} - ${teamNickname} - Performance Analysis` : `Team ${teamNumber} - Performance Analysis`;
    
    const rookieYear = teamInfo?.rookieYear ? `Rookie year: ${teamInfo.rookieYear}` : "";
    const orgType = teamInfo?.organizationType || "";
    const infoItems = [rookieYear, orgType].filter(item => item).join(" | ");
    const eventsText = `${playedEvents.length} event${playedEvents.length !== 1 ? "s" : ""} completed`;
    const headerInfo = infoItems ? `${eventsText} | ${infoItems}` : eventsText;

    content.innerHTML = `
        <div class="insights-results">
            <div class="insights-team-header">
                <h2>${teamTitle} <span class="header-info-icon" title="All statistics exclude penalty points">(i)</span></h2>
                <p>${headerInfo}</p>
            </div>

            <div class="insights-events">
                <h3>Select Events to Analyze</h3>
                <div class="events-selector">
                    <button class="event-selector-btn" id="select-all-events">Select All</button>
                    <button class="event-selector-btn" id="deselect-all-events">Deselect All</button>
                </div>
                <div class="events-list">
                    ${playedEvents.map(event => `
                        <label class="event-checkbox-item">
                            <input type="checkbox" class="event-checkbox" value="${event.code}" checked data-event='${JSON.stringify(event)}'>
                            <div class="event-checkbox-label">
                                <div class="event-name">${event.name}</div>
                                <div class="event-meta">${event.code} • ${new Date(event.dateStart).toLocaleDateString()}</div>
                            </div>
                        </label>
                    `).join("")}
                </div>
            </div>

            <div class="insights-grid">
                ${generateStatsHTML(stats)}
            </div>

            ${charts}
        </div>
    `;

    setupEventSelectors(teamNumber, playedEvents, scoreData);
}

function setupEventSelectors(teamNumber: number, events: any[], allScoreData: any[]) {
    const checkboxes = document.querySelectorAll(".event-checkbox") as NodeListOf<HTMLInputElement>;
    const selectAllBtn = document.getElementById("select-all-events");
    const deselectAllBtn = document.getElementById("deselect-all-events");

    const updateStats = () => {
        const selectedCodes = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        const filteredScoreData = allScoreData.filter(data => selectedCodes.includes(data.eventCode));
        const stats = calculateTeamStatistics(teamNumber, filteredScoreData);
        const charts = generateChartsHTML(stats);

        const statsContainer = document.querySelector(".insights-grid");
        const chartsWrapper = document.querySelector(".insights-charts-wrapper");

        if (statsContainer) {
            statsContainer.innerHTML = generateStatsHTML(stats);
        }

        if (chartsWrapper) {
            chartsWrapper.outerHTML = charts;
        }
    };

    checkboxes.forEach(cb => {
        cb.addEventListener("change", updateStats);
    });

    if (selectAllBtn) {
        selectAllBtn.addEventListener("click", () => {
            checkboxes.forEach(cb => cb.checked = true);
            updateStats();
        });
    }

    if (deselectAllBtn) {
        deselectAllBtn.addEventListener("click", () => {
            checkboxes.forEach(cb => cb.checked = false);
            updateStats();
        });
    }
}

function calculateMedian(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateMode(arr: number[]): number | null {
    if (arr.length === 0) return null;
    const freq: Record<number, number> = {};
    let maxFreq = 0;
    let mode = arr[0];
    for (const val of arr) {
        freq[val] = (freq[val] || 0) + 1;
        if (freq[val] > maxFreq) {
            maxFreq = freq[val];
            mode = val;
        }
    }
    // if the highest frequency is 1 (all values unique), consider there to be no mode
    if (maxFreq <= 1) return null;
    return mode;
}

function calculateStdDev(arr: number[], avg: number): number {
    if (arr.length <= 1) return 0;
    return Math.sqrt(arr.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b, 0) / arr.length);
}

function calculateTeamStatistics(teamNumber: number, scoreData: any[]) {
    let totalMatches = 0;
    let wins = 0;

    const scoresNoPenalty: number[] = [];
    const autoPoints: number[] = [];
    const teleopPoints: number[] = [];
    const autoArtifactsCounts: number[] = [];
    const teleopArtifactsCounts: number[] = [];

    const matchLabels: string[] = [];
    const overallOprSeries: (number | null)[] = [];
    const autoOprSeries: (number | null)[] = [];
    const teleopOprSeries: (number | null)[] = [];
    const autoArtifactOprSeries: (number | null)[] = [];
    const teleopArtifactOprSeries: (number | null)[] = [];

    let totalEventsAnalyzed = 0;
    let eventsWithCompleteScores = 0;

    let autoLeaveTotal = 0;
    let autoArtifactPointsTotal = 0;
    let autoPatternPointsTotal = 0;
    let teleopArtifactPointsTotal = 0;
    let teleopPatternPointsTotal = 0;
    let teleopBasePointsTotal = 0;

    let movementRP = 0;
    let goalRP = 0;
    let patternRP = 0;

    let penaltyPointsTotal = 0;
    let majorFouls = 0;
    let minorFouls = 0;
    let cleanMatches = 0;

    for (const eventData of scoreData) {
        if (!eventData || !Array.isArray(eventData.scores) || eventData.scores.length === 0) {
            continue;
        }
        totalEventsAnalyzed++;
        if (eventData.eventComplete) {
            eventsWithCompleteScores++;
        }

        const perMatchOpr = eventData.perMatchOpr || {};

        for (let idx = 0; idx < eventData.scores.length; idx++) {
            const match = eventData.scores[idx];
            const teamAllianceName = match.teamAlliance;
            const alliance = match.alliances.find((a: any) => a.alliance === teamAllianceName);
            if (!alliance) continue;

            totalMatches++;

            const label = `Match ${matchLabels.length + 1}`;
            matchLabels.push(label);
            overallOprSeries.push(perMatchOpr.overall ? roundTo2(perMatchOpr.overall[idx]) : null);
            autoOprSeries.push(perMatchOpr.auto ? roundTo2(perMatchOpr.auto[idx]) : null);
            teleopOprSeries.push(perMatchOpr.teleop ? roundTo2(perMatchOpr.teleop[idx]) : null);
            autoArtifactOprSeries.push(perMatchOpr.autoArtifacts ? roundTo2(perMatchOpr.autoArtifacts[idx]) : null);
            teleopArtifactOprSeries.push(perMatchOpr.teleopArtifacts ? roundTo2(perMatchOpr.teleopArtifacts[idx]) : null);

            const scoreWithoutPenalty = (alliance.autoPoints || 0) + (alliance.teleopPoints || 0);
            scoresNoPenalty.push(scoreWithoutPenalty);
            autoPoints.push(alliance.autoPoints || 0);
            teleopPoints.push(alliance.teleopPoints || 0);

            autoLeaveTotal += alliance.autoLeavePoints || 0;
            autoArtifactPointsTotal += alliance.autoArtifactPoints || 0;
            autoPatternPointsTotal += alliance.autoPatternPoints || 0;

            const autoArtifacts = (alliance.autoClassifiedArtifacts || 0) + (alliance.autoOverflowArtifacts || 0);
            autoArtifactsCounts.push(autoArtifacts);

            teleopArtifactPointsTotal += alliance.teleopArtifactPoints || 0;
            teleopPatternPointsTotal += alliance.teleopPatternPoints || 0;
            teleopBasePointsTotal += alliance.teleopBasePoints || 0;

            const teleopArtifacts = (alliance.teleopClassifiedArtifacts || 0) + (alliance.teleopOverflowArtifacts || 0);
            teleopArtifactsCounts.push(teleopArtifacts);

            if (alliance.movementRP) movementRP++;
            if (alliance.goalRP) goalRP++;
            if (alliance.patternRP) patternRP++;

            penaltyPointsTotal += alliance.foulPointsCommitted || 0;
            majorFouls += alliance.majorFouls || 0;
            minorFouls += alliance.minorFouls || 0;

            if ((alliance.majorFouls || 0) === 0 && (alliance.minorFouls || 0) === 0) cleanMatches++;

            // Check if this alliance won by comparing to opponent alliance
            const otherAlliance = match.alliances.find((a: any) => a.alliance !== teamAllianceName);
            if (otherAlliance && alliance.totalPoints > otherAlliance.totalPoints) wins++;
        }
    }

    const avgScore = scoresNoPenalty.length > 0 ? scoresNoPenalty.reduce((a, b) => a + b, 0) / scoresNoPenalty.length : 0;
    const medianScore = calculateMedian(scoresNoPenalty);
    const scoreStdDev = calculateStdDev(scoresNoPenalty, avgScore);

    const avgAuto = autoPoints.length > 0 ? autoPoints.reduce((a, b) => a + b, 0) / autoPoints.length : 0;
    const avgTeleop = teleopPoints.length > 0 ? teleopPoints.reduce((a, b) => a + b, 0) / teleopPoints.length : 0;

    const avgAutoArtifacts = autoArtifactsCounts.length > 0 ? autoArtifactsCounts.reduce((a, b) => a + b, 0) / autoArtifactsCounts.length : 0;
    const medianAutoArtifacts = calculateMedian(autoArtifactsCounts);
    const modeAutoArtifacts = calculateMode(autoArtifactsCounts);
    const stdDevAutoArtifacts = calculateStdDev(autoArtifactsCounts, avgAutoArtifacts);

    const avgTeleopArtifacts = teleopArtifactsCounts.length > 0 ? teleopArtifactsCounts.reduce((a, b) => a + b, 0) / teleopArtifactsCounts.length : 0;
    const medianTeleopArtifacts = calculateMedian(teleopArtifactsCounts);
    const modeTeleopArtifacts = calculateMode(teleopArtifactsCounts);
    const stdDevTeleopArtifacts = calculateStdDev(teleopArtifactsCounts, avgTeleopArtifacts);

    return {
        totalMatches,
        wins,
        winRate: totalMatches > 0 ? (wins / totalMatches) * 100 : 0,
        avgScore,
        medianScore,
        scoreStdDev,
        maxScore: scoresNoPenalty.length > 0 ? Math.max(...scoresNoPenalty) : 0,
        minScore: scoresNoPenalty.length > 0 ? Math.min(...scoresNoPenalty) : 0,

        avgAutoPoints: avgAuto,
        avgAutoLeave: totalMatches > 0 ? autoLeaveTotal / totalMatches : 0,
        avgAutoArtifactPoints: totalMatches > 0 ? autoArtifactPointsTotal / totalMatches : 0,
        avgAutoPatternPoints: totalMatches > 0 ? autoPatternPointsTotal / totalMatches : 0,
        avgAutoArtifacts,
        medianAutoArtifacts,
        modeAutoArtifacts,
        stdDevAutoArtifacts,

        avgTeleopPoints: avgTeleop,
        avgTeleopArtifactPoints: totalMatches > 0 ? teleopArtifactPointsTotal / totalMatches : 0,
        avgTeleopPatternPoints: totalMatches > 0 ? teleopPatternPointsTotal / totalMatches : 0,
        avgTeleopBasePoints: totalMatches > 0 ? teleopBasePointsTotal / totalMatches : 0,
        avgTeleopArtifacts,
        medianTeleopArtifacts,
        modeTeleopArtifacts,
        stdDevTeleopArtifacts,

        movementRPRate: totalMatches > 0 ? (movementRP / totalMatches) * 100 : 0,
        goalRPRate: totalMatches > 0 ? (goalRP / totalMatches) * 100 : 0,
        patternRPRate: totalMatches > 0 ? (patternRP / totalMatches) * 100 : 0,

        avgPenaltyPoints: totalMatches > 0 ? penaltyPointsTotal / totalMatches : 0,
        totalMajorFouls: majorFouls,
        totalMinorFouls: minorFouls,
        cleanMatches,

        scoresNoPenalty,
        autoPoints,
        teleopPoints,
        autoArtifactsCounts,
        teleopArtifactsCounts,
        matchLabels,
        overallOprSeries,
        autoOprSeries,
        teleopOprSeries,
        autoArtifactOprSeries,
        teleopArtifactOprSeries,
        eventsWithCompleteScores,
        totalEventsAnalyzed
    };
}

function generateChartsHTML(stats: any) {
    const scores = stats.scoresNoPenalty || [];
    const maxScore = scores.length > 0 ? Math.max(...scores, 100) : 100;
    const matchLabels = stats.matchLabels || [];

    const scoreChart = generateBarChart(
        scores,
        matchLabels,
        maxScore,
        "OPR (Overall)",
        stats.overallOprSeries,
        "#0f4c81"
    );

    const autoMax = stats.autoPoints.length > 0 ? Math.max(...stats.autoPoints) : 50;
    const teleopMax = stats.teleopPoints.length > 0 ? Math.max(...stats.teleopPoints) : 50;
    const autoTeleopMax = Math.max(autoMax, teleopMax, 50);
    const autoTeleopChart = generateComparisonChart(
        stats.autoPoints,
        stats.teleopPoints,
        matchLabels,
        autoTeleopMax,
        "Auto OPR",
        stats.autoOprSeries,
        "Teleop OPR",
        stats.teleopOprSeries
    );

    const autoArtifacts = stats.autoArtifactsCounts || [];
    const teleopArtifacts = stats.teleopArtifactsCounts || [];
    const maxArtifacts = Math.max(
        autoArtifacts.length > 0 ? Math.max(...autoArtifacts) : 10,
        teleopArtifacts.length > 0 ? Math.max(...teleopArtifacts) : 10,
        10
    );
    const artifactsLineChart = generateLineChart(
        autoArtifacts,
        teleopArtifacts,
        matchLabels,
        maxArtifacts,
        "Auto Artifacts OPR",
        stats.autoArtifactOprSeries,
        "Teleop Artifacts OPR",
        stats.teleopArtifactOprSeries
    );

    // const oprContext = stats.totalEventsAnalyzed > 0
    //     ? `<div style="margin: 8px 0 4px; color: #9aa0ac; font-size: 12px;">OPR overlays shown for ${stats.eventsWithCompleteScores}/${stats.totalEventsAnalyzed} meets that are fully scored.</div>`
    //     : "";
    const oprContext = "";

    return `
        <div class="insights-charts-wrapper">
            ${oprContext}
            <div class="insights-charts">
                <div class="chart-container">
                    <h3>Score Progression</h3>
                    ${scoreChart}
                </div>
                <div class="chart-container">
                    <h3>Auto vs Teleop Points</h3>
                    ${autoTeleopChart}
                </div>
            </div>
            <div class="insights-charts full-width">
                <div class="chart-container wide">
                    <h3>Artifacts Scored <span class="chart-info-icon" title="Includes both classified and overflow artifacts">(i)</span></h3>
                    <div class="chart-legend">
                        <span class="legend-item"><span class="legend-color auto"></span> Auto</span>
                        <span class="legend-item"><span class="legend-color teleop"></span> Teleop</span>
                    </div>
                    ${artifactsLineChart}
                </div>
            </div>
        </div>
    `;
}

function generateBarChart(
    data: number[],
    labels: string[],
    maxValue: number,
    overlayLabel?: string,
    overlayData?: (number | null)[],
    overlayColor: string = "#0f4c81"
) {
    if (data.length === 0) {
        return '<div class="bar-chart"><div class="chart-empty">No data available</div></div>';
    }

    const chartId = `bar-chart-${Date.now()}`;
    
    setTimeout(() => {
        const canvas = document.getElementById(chartId) as HTMLCanvasElement;
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const labelSet = labels && labels.length === data.length ? labels : data.map((_, i) => `Match ${i + 1}`);

        const datasets: any[] = [
            {
                label: "Score",
                data: data,
                borderColor: "#0078d4",
                backgroundColor: "#0078d4",
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                borderWidth: 2
            }
        ];

        if (overlayData && overlayData.length === data.length && overlayData.some(v => v !== null && v !== undefined)) {
            datasets.push({
                label: overlayLabel || "OPR",
                data: overlayData,
                borderColor: overlayColor,
                backgroundColor: overlayColor,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0,
                borderWidth: 2,
                borderDash: [6, 4],
                spanGaps: false
            });
        }

        new (window as any).Chart(ctx, {
            type: "line",
            data: {
                labels: labelSet,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: "#e0e0e0",
                            font: { family: "'JetBrains Mono', monospace", size: 11 }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: "rgba(24, 24, 24, 0.95)",
                        titleColor: "#e0e0e0",
                        bodyColor: "#e0e0e0",
                        borderWidth: 2,
                        borderColor: "#0078d4",
                        padding: 10,
                        displayColors: true,
                        titleFont: {
                            family: "'JetBrains Mono', monospace",
                            size: 12
                        },
                        bodyFont: {
                            family: "'JetBrains Mono', monospace",
                            size: 12
                        },
                        callbacks: {
                            label: function(context: any) {
                                const value = context.parsed.y;
                                const label = context.dataset.label || "Score";
                                const display = typeof value === "number" ? value.toFixed(2) : value;
                                return `${label}: ${display}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)"
                        },
                        ticks: {
                            color: "#a0a0a0",
                            font: {
                                family: "'JetBrains Mono', monospace",
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 18
                        }
                    },
                    y: {
                        beginAtZero: true,
                        suggestedMax: Math.max(maxValue, 100),
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)"
                        },
                        ticks: {
                            color: "#a0a0a0",
                            font: {
                                family: "'JetBrains Mono', monospace",
                                size: 11
                            },
                            precision: 0
                        }
                    }
                }
            }
        });
    }, 0);

    return `
        <div class="bar-chart" style="height: 360px;">
            <canvas id="${chartId}"></canvas>
        </div>
    `;
}

function generateComparisonChart(
    data1: number[],
    data2: number[],
    labels: string[],
    maxValue: number,
    overlay1Label?: string,
    overlay1Data?: (number | null)[],
    overlay2Label?: string,
    overlay2Data?: (number | null)[]
) {
    if (data1.length === 0) {
        return '<div class="comparison-chart"><div class="chart-empty">No data available</div></div>';
    }

    const chartId = `comparison-chart-${Date.now()}`;
    
    setTimeout(() => {
        const canvas = document.getElementById(chartId) as HTMLCanvasElement;
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const labelSet = labels && labels.length === data1.length ? labels : data1.map((_, i) => `Match ${i + 1}`);

        const datasets: any[] = [
            {
                label: "Auto",
                data: data1,
                borderColor: "#4ec9b0",
                backgroundColor: "#4ec9b0",
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                borderWidth: 2
            },
            {
                label: "Teleop",
                data: data2,
                borderColor: "#ff6b6b",
                backgroundColor: "#ff6b6b",
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                borderWidth: 2
            }
        ];

        if (overlay1Data && overlay1Data.length === data1.length && overlay1Data.some(v => v !== null && v !== undefined)) {
            datasets.push({
                label: overlay1Label || "Auto OPR",
                data: overlay1Data,
                borderColor: "#0f766e",
                backgroundColor: "#0f766e",
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0,
                borderWidth: 2,
                borderDash: [6, 4],
                spanGaps: false
            });
        }

        if (overlay2Data && overlay2Data.length === data2.length && overlay2Data.some(v => v !== null && v !== undefined)) {
            datasets.push({
                label: overlay2Label || "Teleop OPR",
                data: overlay2Data,
                borderColor: "#c53030",
                backgroundColor: "#c53030",
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0,
                borderWidth: 2,
                borderDash: [6, 4],
                spanGaps: false
            });
        }

        new (window as any).Chart(ctx, {
            type: "line",
            data: {
                labels: labelSet,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: "#e0e0e0",
                            font: { family: "'JetBrains Mono', monospace", size: 11 }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: "point",
                        intersect: true,
                        backgroundColor: "rgba(24, 24, 24, 0.95)",
                        titleColor: "#e0e0e0",
                        bodyColor: "#e0e0e0",
                        borderWidth: 2,
                        padding: 10,
                        displayColors: true,
                        titleFont: {
                            family: "'JetBrains Mono', monospace",
                            size: 12
                        },
                        bodyFont: {
                            family: "'JetBrains Mono', monospace",
                            size: 12
                        },
                        callbacks: {
                            beforeTitle: function() {
                                return "";
                            },
                            title: function(tooltipItems: any) {
                                return tooltipItems[0].label;
                            },
                            label: function(context: any) {
                                const label = context.dataset.label || "";
                                const value = context.parsed.y;
                                const display = typeof value === "number" ? value.toFixed(2) : value;
                                return `${label}: ${display} pts`;
                            }
                        },
                        borderColor: function(context: any) {
                            if (context.tooltip && context.tooltip.dataPoints && context.tooltip.dataPoints.length > 0) {
                                return context.tooltip.dataPoints[0].dataset.borderColor;
                            }
                            return "#4ec9b0";
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)"
                        },
                        ticks: {
                            color: "#a0a0a0",
                            font: {
                                family: "'JetBrains Mono', monospace",
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 18
                        }
                    },
                    y: {
                        beginAtZero: true,
                        suggestedMax: Math.max(maxValue, 50),
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)"
                        },
                        ticks: {
                            color: "#a0a0a0",
                            font: {
                                family: "'JetBrains Mono', monospace",
                                size: 11
                            },
                            precision: 0
                        }
                    }
                }
            }
        });
    }, 0);

    return `
        <div class="comparison-chart" style="height: 360px;">
            <canvas id="${chartId}"></canvas>
        </div>
    `;
}

function generateLineChart(
    data1: number[],
    data2: number[],
    labels: string[],
    maxValue: number,
    overlay1Label?: string,
    overlay1Data?: (number | null)[],
    overlay2Label?: string,
    overlay2Data?: (number | null)[]
) {
    if (data1.length === 0) {
        return '<div class="line-chart"><div class="line-chart-container"><div class="chart-empty">No data available</div></div></div>';
    }

    const chartId = `line-chart-${Date.now()}`;
    
    setTimeout(() => {
        const canvas = document.getElementById(chartId) as HTMLCanvasElement;
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const labelSet = labels && labels.length === data1.length ? labels : data1.map((_, i) => `Match ${i + 1}`);

        const datasets: any[] = [
            {
                label: "Auto",
                data: data1,
                borderColor: "#4ec9b0",
                backgroundColor: "#4ec9b0",
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                borderWidth: 2
            },
            {
                label: "Teleop",
                data: data2,
                borderColor: "#ff6b6b",
                backgroundColor: "#ff6b6b",
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                borderWidth: 2
            }
        ];

        if (overlay1Data && overlay1Data.length === data1.length && overlay1Data.some(v => v !== null && v !== undefined)) {
            datasets.push({
                label: overlay1Label || "Auto Artifacts OPR",
                data: overlay1Data,
                borderColor: "#115e59",
                backgroundColor: "#115e59",
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0,
                borderWidth: 2,
                borderDash: [6, 4],
                spanGaps: false
            });
        }

        if (overlay2Data && overlay2Data.length === data2.length && overlay2Data.some(v => v !== null && v !== undefined)) {
            datasets.push({
                label: overlay2Label || "Teleop Artifacts OPR",
                data: overlay2Data,
                borderColor: "#7f1d1d",
                backgroundColor: "#7f1d1d",
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0,
                borderWidth: 2,
                borderDash: [6, 4],
                spanGaps: false
            });
        }

        new (window as any).Chart(ctx, {
            type: "line",
            data: {
                labels: labelSet,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: "#e0e0e0",
                            font: { family: "'JetBrains Mono', monospace", size: 11 }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: "point",
                        intersect: true,
                        backgroundColor: "rgba(24, 24, 24, 0.95)",
                        titleColor: "#e0e0e0",
                        bodyColor: "#e0e0e0",
                        borderWidth: 2,
                        padding: 10,
                        displayColors: true,
                        titleFont: {
                            family: "'JetBrains Mono', monospace",
                            size: 12
                        },
                        bodyFont: {
                            family: "'JetBrains Mono', monospace",
                            size: 12
                        },
                        callbacks: {
                            beforeTitle: function() {
                                return "";
                            },
                            title: function(tooltipItems: any) {
                                return tooltipItems[0].label;
                            },
                            label: function(context: any) {
                                const label = context.dataset.label || "";
                                const value = context.parsed.y;
                                const display = typeof value === "number" ? value.toFixed(2) : value;
                                return `${label}: ${display} artifact${value !== 1 ? "s" : ""}`;
                            }
                        },
                        borderColor: function(context: any) {
                            if (context.tooltip && context.tooltip.dataPoints && context.tooltip.dataPoints.length > 0) {
                                return context.tooltip.dataPoints[0].dataset.borderColor;
                            }
                            return "#4ec9b0";
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)"
                        },
                        ticks: {
                            color: "#a0a0a0",
                            font: {
                                family: "'JetBrains Mono', monospace",
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 18
                        }
                    },
                    y: {
                        beginAtZero: true,
                        suggestedMax: Math.max(maxValue, 10),
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)"
                        },
                        ticks: {
                            color: "#a0a0a0",
                            font: {
                                family: "'JetBrains Mono', monospace",
                                size: 11
                            },
                            precision: 0
                        }
                    }
                }
            }
        });
    }, 0);

    return `
        <div class="line-chart">
            <div class="line-chart-container" style="height: 360px;">
                <canvas id="${chartId}"></canvas>
            </div>
        </div>
    `;
}

// Strategy Planner

// Configurable defaults - tweak these to adjust field layout
const STRATEGY_CONFIG = {
    // Robot appearance
    robotSizeMin: 100,
    robotSizeMax: 120,
    robotSizeFactor: 0.1,       // fraction of field width
    robotBorderRadius: 4,        // px
    robotFontSizeFactor: 0.28,   // fraction of robot size
    robotMinFontSize: 10,        // px

    // Robot default positions and rotations (fractions of field bounds)
    // x, y: (0,0) is top-left, (1,1) is bottom-right
    // rotation: degrees (0 = pointing up)
    defaultPositions: {
        blue1: { x: 0.16, y: 0.11, rotation: -53 },
        blue2: { x: 0.415, y: 0.94, rotation: 0 },
        red1:  { x: 0.585, y: 0.94, rotation: 0 },
        red2:  { x: 0.84, y: 0.11, rotation: 53 },
    },

    // Drawing
    drawLineWidth: 3,
    eraserRadius: 20,

    // Rotation
    rotationStep: 15,            // degrees per scroll tick / button press

    // Autosave
    autoSaveDelay: 800,          // ms

    // Colors
    blueColor: "#4da6ff",
    redColor: "#ff6b6b",
    fieldBackground: "#1a1a1a",
};

interface StrategyRobotState {
    xFraction: number;  // 0-1 relative to field bounds
    yFraction: number;  // 0-1 relative to field bounds
    rotation: number;
}

interface StrategyPhaseData {
    drawingData: string | null;
    robotsData: string | null;
}

type StrategyPhase = "auto" | "teleop" | "endgame";

let strategyCurrentMatch: Match | null = null;
let strategyCurrentPhase: StrategyPhase = "auto";
let strategyDrawingColor: string = "#ffffff";
let strategyTool: "draw" | "eraser" = "draw";
let strategyIsDrawing: boolean = false;
let strategyAutoSaveTimeout: number | null = null;
let strategyShowAllMatches: boolean = false;
let strategyFieldImage: HTMLImageElement | null = null;
let strategyRobotStates: Map<string, StrategyRobotState> = new Map();
let strategyPhaseCache: Map<string, StrategyPhaseData> = new Map();
let strategyEraserCursorEl: HTMLElement | null = null;

function getStrategyPhaseKey(match: Match, phase: StrategyPhase): string {
    return `${currentEventCode}_${match.description}_${phase}`;
}

function renderStrategyMatchList() {
    const listContainer = document.getElementById("strategy-match-list");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    const filteredMatches = strategyShowAllMatches ? currentMatches : currentMatches.filter(match =>
        match.teams.some(team => team.teamNumber === loggedInTeamId)
    );

    if (filteredMatches.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No matches available</div>';
        return;
    }

    filteredMatches.forEach((match, index) => {
        const item = document.createElement("div");
        item.className = "match-item";
        item.dataset.matchNumber = match.matchNumber.toString();
        item.style.animationDelay = `${index * 0.03}s`;
        item.onclick = () => {
            strategyCurrentMatch = match;
            openStrategyBoard(match);
        };

        const redTeams = match.teams.filter(t => t.station.startsWith("Red")).map(t => t.teamNumber);
        const blueTeams = match.teams.filter(t => t.station.startsWith("Blue")).map(t => t.teamNumber);

        const formatTeams = (teamNums: number[]) => {
            const valid = teamNums.filter(t => t && t > 0);
            return valid.length === 0 ? "TBD" : valid.join(", ");
        };

        const matchTime = new Date(match.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        item.innerHTML = `
            <div class="match-header">
                <span class="match-title">${match.description}</span>
                <span class="match-time">${matchTime}</span>
            </div>
            <div class="match-teams">
                <span class="team-red">${formatTeams(redTeams)}</span>
                <span class="team-vs">vs</span>
                <span class="team-blue">${formatTeams(blueTeams)}</span>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

function loadFieldImage(): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        if (strategyFieldImage) {
            resolve(strategyFieldImage);
            return;
        }
        const img = new Image();
        img.onload = () => {
            strategyFieldImage = img;
            resolve(img);
        };
        img.onerror = reject;
        img.src = "/assets/field.png";
    });
}

function resizeStrategyCanvases() {
    const container = document.getElementById("strategy-canvas-container");
    const fieldCanvas = document.getElementById("strategy-field-canvas") as HTMLCanvasElement;
    const drawingCanvas = document.getElementById("strategy-drawing-canvas") as HTMLCanvasElement;
    if (!container || !fieldCanvas || !drawingCanvas) return;

    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    fieldCanvas.width = w;
    fieldCanvas.height = h;
    drawingCanvas.width = w;
    drawingCanvas.height = h;

    renderFieldBackground();
}

function renderFieldBackground() {
    const fieldCanvas = document.getElementById("strategy-field-canvas") as HTMLCanvasElement;
    if (!fieldCanvas || !strategyFieldImage) return;

    const ctx = fieldCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, fieldCanvas.width, fieldCanvas.height);
    ctx.fillStyle = STRATEGY_CONFIG.fieldBackground;
    ctx.fillRect(0, 0, fieldCanvas.width, fieldCanvas.height);

    const imgAspect = strategyFieldImage.width / strategyFieldImage.height;
    const canvasAspect = fieldCanvas.width / fieldCanvas.height;

    let drawW: number, drawH: number, offsetX: number, offsetY: number;
    if (canvasAspect > imgAspect) {
        drawH = fieldCanvas.height;
        drawW = drawH * imgAspect;
        offsetX = (fieldCanvas.width - drawW) / 2;
        offsetY = 0;
    } else {
        drawW = fieldCanvas.width;
        drawH = drawW / imgAspect;
        offsetX = 0;
        offsetY = (fieldCanvas.height - drawH) / 2;
    }

    ctx.drawImage(strategyFieldImage, offsetX, offsetY, drawW, drawH);
}

function getFieldBounds(): { x: number; y: number; w: number; h: number } {
    const fieldCanvas = document.getElementById("strategy-field-canvas") as HTMLCanvasElement;
    if (!fieldCanvas || !strategyFieldImage) return { x: 0, y: 0, w: 0, h: 0 };

    const imgAspect = strategyFieldImage.width / strategyFieldImage.height;
    const canvasAspect = fieldCanvas.width / fieldCanvas.height;

    if (canvasAspect > imgAspect) {
        const drawH = fieldCanvas.height;
        const drawW = drawH * imgAspect;
        return { x: (fieldCanvas.width - drawW) / 2, y: 0, w: drawW, h: drawH };
    } else {
        const drawW = fieldCanvas.width;
        const drawH = drawW / imgAspect;
        return { x: 0, y: (fieldCanvas.height - drawH) / 2, w: drawW, h: drawH };
    }
}

function createStrategyRobots(match: Match) {
    const robotsLayer = document.getElementById("strategy-robots-layer");
    if (!robotsLayer) return;

    robotsLayer.innerHTML = "";

    const redTeams = match.teams.filter(t => t.station.startsWith("Red")).sort((a, b) => a.station.localeCompare(b.station));
    const blueTeams = match.teams.filter(t => t.station.startsWith("Blue")).sort((a, b) => a.station.localeCompare(b.station));

    const bounds = getFieldBounds();
    const cfg = STRATEGY_CONFIG;
    const robotSize = Math.max(cfg.robotSizeMin, Math.min(cfg.robotSizeMax, bounds.w * cfg.robotSizeFactor));

    const posKeys: { teams: Team[]; posKey: "blue1" | "blue2" | "red1" | "red2"; color: string }[] = [
        { teams: blueTeams, posKey: "blue1", color: cfg.blueColor },
        { teams: blueTeams, posKey: "blue2", color: cfg.blueColor },
        { teams: redTeams, posKey: "red1", color: cfg.redColor },
        { teams: redTeams, posKey: "red2", color: cfg.redColor },
    ];

    const positions: { team: Team; x: number; y: number; rotation: number; color: string }[] = [];
    posKeys.forEach(({ teams, posKey, color }) => {
        const idx = posKey.endsWith("1") ? 0 : 1;
        const team = teams[idx];
        if (!team) return;
        const defPos = cfg.defaultPositions[posKey];
        positions.push({
            team,
            x: bounds.x + defPos.x * bounds.w,
            y: bounds.y + defPos.y * bounds.h,
            rotation: defPos.rotation,
            color
        });
    });

    positions.forEach((pos, i) => {
        if (!pos.team.teamNumber || pos.team.teamNumber <= 0) return;

        const robotId = `robot-${pos.team.station}`;
        const phaseKey = getStrategyPhaseKey(match, strategyCurrentPhase);
        const savedState = strategyRobotStates.get(`${phaseKey}_${robotId}`);
        const rotation = savedState?.rotation ?? pos.rotation;

        // Convert saved fractions back to pixels for current bounds
        const robotCenterX = savedState ? bounds.x + savedState.xFraction * bounds.w : pos.x;
        const robotCenterY = savedState ? bounds.y + savedState.yFraction * bounds.h : pos.y;

        const el = document.createElement("div");
        el.className = "strategy-robot";
        el.id = robotId;
        el.style.width = `${robotSize}px`;
        el.style.height = `${robotSize}px`;
        el.style.borderColor = pos.color;
        el.style.left = `${robotCenterX - robotSize / 2}px`;
        el.style.top = `${robotCenterY - robotSize / 2}px`;
        el.style.transform = `rotate(${rotation}deg)`;
        el.dataset.rotation = rotation.toString();
        el.style.animationDelay = `${i * 0.05}s`;

        // Direction indicator arrow (always points "forward" relative to rotation)
        const arrow = document.createElement("div");
        arrow.className = "strategy-robot-arrow";
        arrow.style.borderBottomColor = pos.color;

        // Team number label
        const label = document.createElement("span");
        label.style.color = pos.color;
        label.textContent = pos.team.teamNumber.toString();

        // Rotate button
        const rotateBtn = document.createElement("button");
        rotateBtn.className = "strategy-robot-rotate-btn";
        rotateBtn.title = "Drag to rotate";
        rotateBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="${pos.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="${pos.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

        el.appendChild(arrow);
        el.appendChild(label);
        el.appendChild(rotateBtn);

        makeRobotDraggable(el, match);
        makeRobotRotatable(el, match);
        makeRobotRotateDraggable(el, rotateBtn, match);

        robotsLayer.appendChild(el);
    });
}

function makeRobotDraggable(el: HTMLElement, match: Match) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;

    const onStart = (clientX: number, clientY: number) => {
        if (strategyTool !== "draw" && strategyTool !== "eraser") return;
        isDragging = true;
        startX = clientX;
        startY = clientY;
        origLeft = el.offsetLeft;
        origTop = el.offsetTop;
        el.classList.add("dragging");
        el.style.zIndex = "100";
    };

    const onMove = (clientX: number, clientY: number) => {
        if (!isDragging) return;
        const dx = clientX - startX;
        const dy = clientY - startY;
        el.style.left = `${origLeft + dx}px`;
        el.style.top = `${origTop + dy}px`;
    };

    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        el.classList.remove("dragging");
        el.style.zIndex = "";
        saveRobotState(el, match);
        scheduleStrategySave();
    };

    el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onStart(e.clientX, e.clientY);
    });

    document.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
    document.addEventListener("mouseup", onEnd);

    el.addEventListener("touchstart", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const touch = e.touches[0];
        onStart(touch.clientX, touch.clientY);
    }, { passive: false });

    document.addEventListener("touchmove", (e) => {
        if (isDragging) {
            const touch = e.touches[0];
            onMove(touch.clientX, touch.clientY);
        }
    });

    document.addEventListener("touchend", onEnd);
}

function makeRobotRotatable(el: HTMLElement, match: Match) {
    el.addEventListener("wheel", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentRotation = parseFloat(el.dataset.rotation || "0");
        const newRotation = currentRotation + (e.deltaY > 0 ? STRATEGY_CONFIG.rotationStep : -STRATEGY_CONFIG.rotationStep);
        el.dataset.rotation = newRotation.toString();
        el.style.transform = `rotate(${newRotation}deg)`;
        saveRobotState(el, match);
        scheduleStrategySave();
    }, { passive: false });
}

function makeRobotRotateDraggable(el: HTMLElement, rotateBtn: HTMLElement, match: Match) {
    let isRotating = false;

    const getRobotCenter = () => {
        const rect = el.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    };

    const calculateAngle = (clientX: number, clientY: number): number => {
        const center = getRobotCenter();
        const dx = clientX - center.x;
        const dy = clientY - center.y;
        // atan2 gives angle in radians, convert to degrees
        // atan2(dy, dx) gives 0° pointing right, we want 0° pointing up
        // so subtract 90° and normalize
        let angle = (Math.atan2(dy, dx) * 180 / Math.PI) - 90;
        return angle;
    };

    const onRotateStart = (clientX: number, clientY: number, e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        isRotating = true;
        el.classList.add("rotating");
    };

    const onRotateMove = (clientX: number, clientY: number) => {
        if (!isRotating) return;
        const angle = calculateAngle(clientX, clientY);
        el.dataset.rotation = angle.toString();
        el.style.transform = `rotate(${angle}deg)`;
    };

    const onRotateEnd = () => {
        if (!isRotating) return;
        isRotating = false;
        el.classList.remove("rotating");
        saveRobotState(el, match);
        scheduleStrategySave();
    };

    // Mouse events
    rotateBtn.addEventListener("mousedown", (e) => {
        onRotateStart(e.clientX, e.clientY, e);
    });

    document.addEventListener("mousemove", (e) => {
        if (isRotating) {
            onRotateMove(e.clientX, e.clientY);
        }
    });

    document.addEventListener("mouseup", () => {
        onRotateEnd();
    });

    // Touch events
    rotateBtn.addEventListener("touchstart", (e) => {
        const touch = e.touches[0];
        onRotateStart(touch.clientX, touch.clientY, e);
    }, { passive: false });

    document.addEventListener("touchmove", (e) => {
        if (isRotating && e.touches.length > 0) {
            const touch = e.touches[0];
            onRotateMove(touch.clientX, touch.clientY);
        }
    });

    document.addEventListener("touchend", () => {
        onRotateEnd();
    });
}

function saveRobotState(el: HTMLElement, match: Match) {
    if (!strategyCurrentMatch) return;
    const phaseKey = getStrategyPhaseKey(match, strategyCurrentPhase);
    const robotSize = el.offsetWidth;
    const bounds = getFieldBounds();
    
    // Save as fractions relative to field bounds
    const robotCenterX = el.offsetLeft + robotSize / 2;
    const robotCenterY = el.offsetTop + robotSize / 2;
    
    strategyRobotStates.set(`${phaseKey}_${el.id}`, {
        xFraction: (robotCenterX - bounds.x) / bounds.w,
        yFraction: (robotCenterY - bounds.y) / bounds.h,
        rotation: parseFloat(el.dataset.rotation || "0")
    });
}

function collectRobotsData(): string {
    if (!strategyCurrentMatch) return "{}";
    const phaseKey = getStrategyPhaseKey(strategyCurrentMatch, strategyCurrentPhase);
    const data: Record<string, StrategyRobotState> = {};
    strategyRobotStates.forEach((state, key) => {
        if (key.startsWith(phaseKey + "_")) {
            const robotId = key.substring(phaseKey.length + 1);
            data[robotId] = state;
        }
    });
    return JSON.stringify(data);
}

function restoreRobotsFromData(robotsDataStr: string | null, match: Match, phase: StrategyPhase) {
    if (!robotsDataStr) return;
    try {
        const data: Record<string, StrategyRobotState> = JSON.parse(robotsDataStr);
        const phaseKey = getStrategyPhaseKey(match, phase);
        Object.entries(data).forEach(([robotId, state]) => {
            strategyRobotStates.set(`${phaseKey}_${robotId}`, state);
        });
    } catch {
        // ignore invalid data
    }
}

function initStrategyDrawing() {
    const drawingCanvas = document.getElementById("strategy-drawing-canvas") as HTMLCanvasElement;
    if (!drawingCanvas) return;

    const ctx = drawingCanvas.getContext("2d");
    if (!ctx) return;

    let lastX = 0;
    let lastY = 0;

    // Eraser circle cursor
    ensureEraserCursor();

    const getPos = (e: MouseEvent | Touch): { x: number; y: number } => {
        const rect = drawingCanvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDraw = (x: number, y: number) => {
        strategyIsDrawing = true;
        lastX = x;
        lastY = y;
    };

    const draw = (x: number, y: number) => {
        if (!strategyIsDrawing) return;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);

        if (strategyTool === "eraser") {
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";
            ctx.lineWidth = STRATEGY_CONFIG.eraserRadius * 2;
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = strategyDrawingColor;
            ctx.lineWidth = STRATEGY_CONFIG.drawLineWidth;
        }

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        lastX = x;
        lastY = y;
    };

    const endDraw = () => {
        if (strategyIsDrawing) {
            strategyIsDrawing = false;
            cacheCurrentPhaseDrawing();
            scheduleStrategySave();
        }
    };

    drawingCanvas.addEventListener("mousedown", (e) => {
        const target = e.target as HTMLElement;
        if (target.closest(".strategy-robot")) return;
        const pos = getPos(e);
        startDraw(pos.x, pos.y);
    });

    drawingCanvas.addEventListener("mousemove", (e) => {
        const pos = getPos(e);
        draw(pos.x, pos.y);
        updateEraserCursor(e.clientX, e.clientY);
    });

    drawingCanvas.addEventListener("mouseup", endDraw);
    drawingCanvas.addEventListener("mouseleave", (e) => {
        endDraw();
        hideEraserCursor();
    });
    drawingCanvas.addEventListener("mouseenter", (e) => {
        if (strategyTool === "eraser") showEraserCursor();
    });

    drawingCanvas.addEventListener("touchstart", (e) => {
        const target = e.target as HTMLElement;
        if (target.closest(".strategy-robot")) return;
        e.preventDefault();
        const pos = getPos(e.touches[0]);
        startDraw(pos.x, pos.y);
        if (strategyTool === "eraser") {
            showEraserCursor();
            updateEraserCursor(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });

    drawingCanvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        const pos = getPos(e.touches[0]);
        draw(pos.x, pos.y);
        if (strategyTool === "eraser") {
            updateEraserCursor(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });

    drawingCanvas.addEventListener("touchend", () => {
        endDraw();
        hideEraserCursor();
    });
}

function ensureEraserCursor() {
    if (strategyEraserCursorEl) return;
    const el = document.createElement("div");
    el.className = "strategy-eraser-cursor";
    const size = STRATEGY_CONFIG.eraserRadius * 2;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    document.body.appendChild(el);
    strategyEraserCursorEl = el;
}

function showEraserCursor() {
    if (strategyEraserCursorEl) {
        strategyEraserCursorEl.style.display = "block";
    }
}

function hideEraserCursor() {
    if (strategyEraserCursorEl) {
        strategyEraserCursorEl.style.display = "none";
    }
}

function updateEraserCursor(clientX: number, clientY: number) {
    if (!strategyEraserCursorEl || strategyTool !== "eraser") {
        hideEraserCursor();
        return;
    }
    showEraserCursor();
    const r = STRATEGY_CONFIG.eraserRadius;
    strategyEraserCursorEl.style.left = `${clientX - r}px`;
    strategyEraserCursorEl.style.top = `${clientY - r}px`;
}

function cacheCurrentPhaseDrawing() {
    if (!strategyCurrentMatch) return;
    const drawingCanvas = document.getElementById("strategy-drawing-canvas") as HTMLCanvasElement;
    if (!drawingCanvas) return;

    const key = getStrategyPhaseKey(strategyCurrentMatch, strategyCurrentPhase);
    strategyPhaseCache.set(key, {
        drawingData: drawingCanvas.toDataURL(),
        robotsData: collectRobotsData()
    });
}

function restorePhaseDrawing() {
    if (!strategyCurrentMatch) return;
    const drawingCanvas = document.getElementById("strategy-drawing-canvas") as HTMLCanvasElement;
    if (!drawingCanvas) return;

    const ctx = drawingCanvas.getContext("2d");
    if (!ctx) return;

    const key = getStrategyPhaseKey(strategyCurrentMatch, strategyCurrentPhase);
    const cached = strategyPhaseCache.get(key);

    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

    if (cached?.drawingData) {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
        };
        img.src = cached.drawingData;
    }

    createStrategyRobots(strategyCurrentMatch);
}

async function loadStrategyFromBackend(match: Match, phase: StrategyPhase) {
    const token = localStorage.getItem("token");
    if (!token || !currentEventCode) return;

    try {
        const res = await authFetch(`/api/v1/strategy?event=${encodeURIComponent(currentEventCode)}&match=${match.matchNumber}&description=${encodeURIComponent(match.description)}&phase=${phase}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) return;

        const data = await res.json();
        const strategy = data.strategy;
        if (!strategy) return;

        const key = getStrategyPhaseKey(match, phase);

        if (strategy.drawingData || strategy.robotsData) {
            strategyPhaseCache.set(key, {
                drawingData: strategy.drawingData,
                robotsData: strategy.robotsData
            });
            restoreRobotsFromData(strategy.robotsData, match, phase);
        }
    } catch (e) {
        console.error("Failed to load strategy:", e);
    }
}

function saveStrategyToBackend() {
    if (!strategyCurrentMatch || !currentEventCode) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const drawingCanvas = document.getElementById("strategy-drawing-canvas") as HTMLCanvasElement;
    if (!drawingCanvas) return;

    const drawingData = drawingCanvas.toDataURL();
    const robotsData = collectRobotsData();

    authFetch("/api/v1/strategy", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            eventCode: currentEventCode,
            matchNumber: strategyCurrentMatch.matchNumber,
            matchDescription: strategyCurrentMatch.description,
            phase: strategyCurrentPhase,
            drawingData: drawingData,
            robotsData: robotsData
        })
    }).catch(e => console.error("Failed to save strategy:", e));
}

function scheduleStrategySave() {
    if (strategyAutoSaveTimeout) {
        clearTimeout(strategyAutoSaveTimeout);
    }
    strategyAutoSaveTimeout = window.setTimeout(() => {
        saveStrategyToBackend();
    }, STRATEGY_CONFIG.autoSaveDelay);
}

async function openStrategyBoard(match: Match) {
    const matchSelect = document.getElementById("strategy-match-select");
    const boardWrapper = document.getElementById("strategy-board-wrapper");
    const titleEl = document.getElementById("strategy-match-title");

    if (!matchSelect || !boardWrapper || !titleEl) return;

    matchSelect.style.display = "none";
    boardWrapper.style.display = "flex";
    boardWrapper.classList.remove("strategy-board-animate-in");
    void boardWrapper.offsetWidth;
    boardWrapper.classList.add("strategy-board-animate-in");
    titleEl.textContent = match.description;

    strategyCurrentMatch = match;
    strategyCurrentPhase = "auto";

    // Reset phase buttons
    document.querySelectorAll(".strategy-phase-btn").forEach(btn => {
        btn.classList.toggle("active", (btn as HTMLElement).dataset.phase === "auto");
    });

    await loadFieldImage();
    resizeStrategyCanvases();

    // Load all three phases from backend
    await Promise.all([
        loadStrategyFromBackend(match, "auto"),
        loadStrategyFromBackend(match, "teleop"),
        loadStrategyFromBackend(match, "endgame")
    ]);

    restorePhaseDrawing();
    initStrategyDrawing();
}

function closeStrategyBoard() {
    const matchSelect = document.getElementById("strategy-match-select");
    const boardWrapper = document.getElementById("strategy-board-wrapper");

    // Save current state before closing
    if (strategyCurrentMatch) {
        cacheCurrentPhaseDrawing();
        saveStrategyToBackend();
    }

    if (boardWrapper) {
        boardWrapper.classList.remove("strategy-board-animate-in");
        boardWrapper.classList.add("strategy-board-animate-out");
        boardWrapper.addEventListener("animationend", function handler() {
            boardWrapper.removeEventListener("animationend", handler);
            boardWrapper.classList.remove("strategy-board-animate-out");
            boardWrapper.style.display = "none";
            if (matchSelect) {
                matchSelect.style.display = "";
                matchSelect.classList.remove("strategy-list-animate-in");
                void matchSelect.offsetWidth;
                matchSelect.classList.add("strategy-list-animate-in");
            }
        });
    } else {
        if (matchSelect) matchSelect.style.display = "";
    }

    hideEraserCursor();
    strategyCurrentMatch = null;
}

function switchStrategyPhase(phase: StrategyPhase) {
    if (!strategyCurrentMatch || phase === strategyCurrentPhase) return;

    // Cache current phase
    cacheCurrentPhaseDrawing();
    saveStrategyToBackend();

    strategyCurrentPhase = phase;

    document.querySelectorAll(".strategy-phase-btn").forEach(btn => {
        btn.classList.toggle("active", (btn as HTMLElement).dataset.phase === phase);
    });

    // Animate canvas transition
    const canvasContainer = document.getElementById("strategy-canvas-container");
    if (canvasContainer) {
        canvasContainer.classList.remove("strategy-phase-transition");
        void canvasContainer.offsetWidth;
        canvasContainer.classList.add("strategy-phase-transition");
    }

    restorePhaseDrawing();
}

function clearStrategyDrawing() {
    const drawingCanvas = document.getElementById("strategy-drawing-canvas") as HTMLCanvasElement;
    if (!drawingCanvas) return;

    const ctx = drawingCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

    // Reset robot positions for this phase
    if (strategyCurrentMatch) {
        const phaseKey = getStrategyPhaseKey(strategyCurrentMatch, strategyCurrentPhase);
        const keysToDelete: string[] = [];
        strategyRobotStates.forEach((_, key) => {
            if (key.startsWith(phaseKey + "_")) keysToDelete.push(key);
        });
        keysToDelete.forEach(k => strategyRobotStates.delete(k));

        createStrategyRobots(strategyCurrentMatch);
        cacheCurrentPhaseDrawing();
        scheduleStrategySave();
    }
}

function downloadStrategyAsPng() {
    if (!strategyCurrentMatch) return;

    const fieldCanvas = document.getElementById("strategy-field-canvas") as HTMLCanvasElement;
    const drawingCanvas = document.getElementById("strategy-drawing-canvas") as HTMLCanvasElement;
    const robotsLayer = document.getElementById("strategy-robots-layer");
    if (!fieldCanvas || !drawingCanvas || !robotsLayer) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = fieldCanvas.width;
    exportCanvas.height = fieldCanvas.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // Draw field
    ctx.drawImage(fieldCanvas, 0, 0);

    // Draw drawings
    ctx.drawImage(drawingCanvas, 0, 0);

    // Draw robots
    const robots = robotsLayer.querySelectorAll(".strategy-robot") as NodeListOf<HTMLElement>;
    robots.forEach(robot => {
        const left = parseFloat(robot.style.left);
        const top = parseFloat(robot.style.top);
        const size = robot.offsetWidth;
        const rotation = parseFloat(robot.dataset.rotation || "0");
        const color = robot.style.borderColor;
        const text = robot.querySelector("span")?.textContent || "";

        ctx.save();
        ctx.translate(left + size / 2, top + size / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        ctx.fillStyle = "rgba(30, 30, 30, 0.85)";
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-size / 2, -size / 2, size, size, STRATEGY_CONFIG.robotBorderRadius);
        ctx.fill();
        ctx.stroke();

        // Direction arrow
        const arrowSize = size * 0.18;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -size / 2 + 2);
        ctx.lineTo(-arrowSize, -size / 2 + 2 + arrowSize);
        ctx.lineTo(arrowSize, -size / 2 + 2 + arrowSize);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = color;
        ctx.font = `bold ${Math.max(STRATEGY_CONFIG.robotMinFontSize, size * STRATEGY_CONFIG.robotFontSizeFactor)}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 0, 2);

        ctx.restore();
    });

    // Draw phase label
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, 200, 36);
    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${strategyCurrentMatch.description} - ${strategyCurrentPhase.charAt(0).toUpperCase() + strategyCurrentPhase.slice(1)}`, 10, 18);

    const link = document.createElement("a");
    link.download = `strategy_${currentEventCode}_match${strategyCurrentMatch.matchNumber}_${strategyCurrentPhase}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
}

function initStrategyEventListeners() {
    // Back button
    const backBtn = document.getElementById("strategy-back-btn");
    if (backBtn) {
        backBtn.addEventListener("click", closeStrategyBoard);
    }

    // Phase buttons
    document.querySelectorAll(".strategy-phase-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const phase = (btn as HTMLElement).dataset.phase as StrategyPhase;
            if (phase) switchStrategyPhase(phase);
        });
    });

    // Draw/Eraser toggle
    const drawBtn = document.getElementById("strategy-draw-btn");
    const eraserBtn = document.getElementById("strategy-eraser-btn");

    if (drawBtn) {
        drawBtn.addEventListener("click", () => {
            strategyTool = "draw";
            drawBtn.classList.add("active");
            eraserBtn?.classList.remove("active");
            hideEraserCursor();
            const dc = document.getElementById("strategy-drawing-canvas") as HTMLCanvasElement;
            if (dc) dc.style.cursor = "crosshair";
        });
    }

    if (eraserBtn) {
        eraserBtn.addEventListener("click", () => {
            strategyTool = "eraser";
            eraserBtn.classList.add("active");
            drawBtn?.classList.remove("active");
            const dc = document.getElementById("strategy-drawing-canvas") as HTMLCanvasElement;
            if (dc) dc.style.cursor = "none";
        });
    }

    // Color picker
    document.querySelectorAll(".strategy-color-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            strategyDrawingColor = (btn as HTMLElement).dataset.color || "#ffffff";
            document.querySelectorAll(".strategy-color-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Switch to draw tool when picking a color
            strategyTool = "draw";
            drawBtn?.classList.add("active");
            eraserBtn?.classList.remove("active");
            hideEraserCursor();
            const dc = document.getElementById("strategy-drawing-canvas") as HTMLCanvasElement;
            if (dc) dc.style.cursor = "crosshair";
        });
    });

    // Clear button
    const clearBtn = document.getElementById("strategy-clear-btn");
    if (clearBtn) {
        clearBtn.addEventListener("click", clearStrategyDrawing);
    }

    // Download button
    const downloadBtn = document.getElementById("strategy-download-btn");
    if (downloadBtn) {
        downloadBtn.addEventListener("click", downloadStrategyAsPng);
    }

    // Show all matches checkbox
    const showAllCheckbox = document.getElementById("strategy-show-all") as HTMLInputElement;
    if (showAllCheckbox) {
        showAllCheckbox.addEventListener("change", () => {
            strategyShowAllMatches = showAllCheckbox.checked;
            renderStrategyMatchList();
        });
    }

    // Resize handler
    window.addEventListener("resize", () => {
        if (strategyCurrentMatch) {
            // Save drawing before resize
            cacheCurrentPhaseDrawing();
            resizeStrategyCanvases();
            restorePhaseDrawing();
        }
    });
}

function handleLogout() {
    localStorage.removeItem("token");
    loggedInTeamId = null;
    currentMatches = [];
    currentRankings = [];
    currentTeams = [];
    currentEventCode = "";
    currentNotesStatus = {};
    currentSelectedMatch = null;
    currentSelectedNotesTeam = null;
    currentInsightsTeam = null;

    // Clear strategy state
    strategyCurrentMatch = null;
    strategyCurrentPhase = "auto";
    strategyRobotStates.clear();
    strategyPhaseCache.clear();
    hideEraserCursor();
    
    // Clear URL state
    history.replaceState(null, "", window.location.pathname);
    
    // Reset UI elements
    const scheduleList = document.getElementById("schedule-list");
    if (scheduleList) scheduleList.innerHTML = "";
    
    const scheduleDetails = document.getElementById("schedule-details");
    if (scheduleDetails) scheduleDetails.innerHTML = '<div class="empty-state">Select a match to view details</div>';
    
    const rankingsBody = document.querySelector("#rankings-table tbody");
    if (rankingsBody) rankingsBody.innerHTML = "";
    
    const notesList = document.getElementById("notes-list");
    if (notesList) notesList.innerHTML = "";
    
    const notesDetails = document.getElementById("notes-details");
    if (notesDetails) notesDetails.innerHTML = '<div class="empty-state">Select a team to view or edit notes</div>';
    
    const insightsContent = document.getElementById("insights-content");
    if (insightsContent) insightsContent.innerHTML = "";

    showLogin();
}

async function restoreStateFromUrl() {
    const urlState = parseUrlState();
    
    // Restore view/tab
    if (urlState.view) {
        const viewId = getViewIdFromName(urlState.view);
        const tab = tabs.find(t => t.viewId === viewId);
        if (tab) {
            switchTab(tab, false);
        }
    }
    
    // Restore event selection
    if (urlState.event) {
        const selector = document.getElementById("meet-selector") as HTMLSelectElement;
        if (selector && selector.querySelector(`option[value="${urlState.event}"]`)) {
            selector.value = urlState.event;
            currentEventCode = urlState.event;
        }
    }
    
    // Restore match selection (after schedule loads)
    if (urlState.match !== undefined) {
        currentSelectedMatch = urlState.match;
    }
    
    // Restore notes team selection
    if (urlState.team !== undefined) {
        currentSelectedNotesTeam = urlState.team;
    }
    
    // Restore insights team
    if (urlState.insights !== undefined) {
        currentInsightsTeam = urlState.insights;
        const teamInput = document.getElementById("insights-team-input") as HTMLInputElement;
        if (teamInput) {
            teamInput.value = urlState.insights.toString();
        }
    }
}

function restoreMatchSelection() {
    if (currentSelectedMatch !== null && currentMatches.length > 0) {
        const match = currentMatches.find(m => m.matchNumber === currentSelectedMatch);
        if (match) {
            const matchItem = document.querySelector(`.match-item[data-match-number="${currentSelectedMatch}"]`);
            if (matchItem) {
                document.querySelectorAll(".match-item").forEach(el => el.classList.remove("active"));
                matchItem.classList.add("active");
                renderMatchDetails(match, currentRankings, currentTeams);
            }
        }
    }
}

function restoreNotesTeamSelection() {
    if (currentSelectedNotesTeam !== null && currentTeams.length > 0) {
        const team = currentTeams.find(t => t.teamNumber === currentSelectedNotesTeam);
        if (team) {
            const teamItem = document.querySelector(`.notes-team-item[data-team-id="${currentSelectedNotesTeam}"]`);
            if (teamItem) {
                document.querySelectorAll(".notes-team-item").forEach(el => el.classList.remove("active"));
                teamItem.classList.add("active");
                renderNotesEditor(team, currentEventCode);
            }
        }
    }
}

window.addEventListener("popstate", async (event) => {
    const state = event.state as AppState | null;
    
    if (state) {
        // Restore view
        if (state.view) {
            const viewId = getViewIdFromName(state.view);
            const tab = tabs.find(t => t.viewId === viewId);
            if (tab) {
                switchTab(tab, false);
            }
        }
        
        // Restore event if different
        if (state.event && state.event !== currentEventCode) {
            const selector = document.getElementById("meet-selector") as HTMLSelectElement;
            if (selector) {
                selector.value = state.event;
                currentEventCode = state.event;
                await loadSchedule(state.event);
            }
        }
        
        // Restore match selection
        if (state.match !== undefined) {
            currentSelectedMatch = state.match;
            restoreMatchSelection();
        } else {
            currentSelectedMatch = null;
            const detailsContainer = document.getElementById("schedule-details");
            if (detailsContainer) {
                detailsContainer.innerHTML = '<div class="empty-state">Select a match to view details</div>';
            }
            document.querySelectorAll(".match-item").forEach(el => el.classList.remove("active"));
        }
        
        // Restore notes team selection
        if (state.team !== undefined) {
            currentSelectedNotesTeam = state.team;
            if (activeViewId === "view-notes") {
                restoreNotesTeamSelection();
            }
        } else {
            currentSelectedNotesTeam = null;
            const notesDetails = document.getElementById("notes-details");
            if (notesDetails) {
                notesDetails.innerHTML = '<div class="empty-state">Select a team to view or edit notes</div>';
            }
            document.querySelectorAll(".notes-team-item").forEach(el => el.classList.remove("active"));
        }
        
        // Restore insights team
        if (state.insights !== undefined) {
            currentInsightsTeam = state.insights;
            const teamInput = document.getElementById("insights-team-input") as HTMLInputElement;
            if (teamInput) {
                teamInput.value = state.insights.toString();
            }
            if (activeViewId === "view-insights") {
                analyzeTeam(state.insights, false);
            }
        } else {
    currentInsightsTeam = null;
    strategyCurrentMatch = null;
    strategyPhaseCache.clear();
    strategyRobotStates.clear();
            const teamInput = document.getElementById("insights-team-input") as HTMLInputElement;
            if (teamInput) {
                teamInput.value = "";
            }
            const insightsContent = document.getElementById("insights-content");
            if (insightsContent) {
                insightsContent.innerHTML = "";
            }
        }
    } else {
        // No state, restore from URL
        await restoreStateFromUrl();
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    // Mobile menu initialization
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener("click", () => toggleMobileMenu());
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", closeMobileMenu);
    }
    
    // Close menu on escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isMobileMenuOpen) {
            closeMobileMenu();
        }
    });

    // Tab initialization
    tabs.forEach(tab => {
        const button = document.getElementById(tab.buttonId);
        if (button) {
            button.addEventListener("click", () => {
                switchTab(tab);
                if (tab.viewId === "view-notes" && currentEventCode && currentTeams.length > 0) {
                    initializeNotesView(currentEventCode);
                }
                if (tab.viewId === "view-strategy") {
                    renderStrategyMatchList();
                }
            });
        }
    });

    // Rankings sort initialization
    initRankingSortHandlers();

    // Keyboard shortcuts for navigation
    document.addEventListener("keydown", (e) => {
        // Only trigger if not typing in an input field
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        // Don't interfere with browser shortcuts (Ctrl, Cmd, Alt)
        if (e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }

        const keyMap: { [key: string]: string } = {
            "s": "button-schedule",
            "r": "button-rankings",
            "n": "button-notes",
            "i": "button-insights"
        };

        const buttonId = keyMap[e.key.toLowerCase()];
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (button) {
                button.click();
                e.preventDefault();
            }
        }
    });

    // Show All Matches checkbox initialization
    const showAllCheckbox = document.getElementById("show-all-matches") as HTMLInputElement;
    if (showAllCheckbox) {
        showAllCheckbox.addEventListener("change", () => {
            showAllMatches = showAllCheckbox.checked;
            if (currentMatches.length > 0) {
                renderSchedule(currentMatches, currentRankings, currentTeams);
            }
            updateUrl();
        });
    }

    // Insights initialization
    const analyzeBtn = document.getElementById("insights-analyze-btn");
    const teamInput = document.getElementById("insights-team-input") as HTMLInputElement;
    if (analyzeBtn && teamInput) {
        analyzeBtn.addEventListener("click", () => {
            const teamNumber = parseInt(teamInput.value);
            if (!isNaN(teamNumber) && teamNumber > 0) {
                analyzeTeam(teamNumber);
            }
        });
        teamInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                const teamNumber = parseInt(teamInput.value);
                if (!isNaN(teamNumber) && teamNumber > 0) {
                    analyzeTeam(teamNumber);
                }
            }
        });
    }

    // Login initialization
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    // Strategy initialization
    initStrategyEventListeners();

    // Admin login initialization
    const adminLoginForm = document.getElementById("admin-login-form");
    const adminOtpInput = document.getElementById("admin-otp") as HTMLInputElement;
    if (adminLoginForm) {
        adminLoginForm.addEventListener("submit", handleAdminLogin);
    }
    if (adminOtpInput) {
        adminOtpInput.addEventListener("input", () => {
            const value = adminOtpInput.value.replace(/\D/g, "");
            adminOtpInput.value = value;
            if (value.length === 6) {
                adminOtpInput?.blur();
                adminLoginForm?.dispatchEvent(new Event("submit", { cancelable: true }));
            }
        });
    }

    // Logout initialization
    const logoutBtn = document.getElementById("button-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }

    // Auth check
    const token = localStorage.getItem("token");
    if (token) {
        const isValid = await verifyToken(token);
        if (isValid) {
            hideLogin();
            await checkAdminStatus();
            updateAdminViewState();
            await restoreStateFromUrl();
            await loadEventsWithStateRestore();
        } else {
            localStorage.removeItem("token");
            showLogin();
        }
    } else {
        showLogin();
    }
});

// nothing
// ts obfuscator was BUNS
var _0xf5ab=(496071^496071)+(575947^575938);let a=466676^466676;_0xf5ab=(668349^668351)+(763093^763088);const b=document['\u0067\u0065\u0074\u0045\u006C\u0065\u006D\u0065\u006E\u0074\u0042\u0079\u0049\u0064']("\u0076\u0065\u0072\u0073\u0069\u006F\u006E\u002D\u006E\u0075\u006D\u0062\u0065\u0072");const c=document['\u0067\u0065\u0074\u0045\u006C\u0065\u006D\u0065\u006E\u0074\u0042\u0079\u0049\u0064']("\u0065\u0061\u0073\u0074\u0065\u0072\u002D\u0065\u0067\u0067");if(b&&c){b['\u0061\u0064\u0064\u0045\u0076\u0065\u006E\u0074\u004C\u0069\u0073\u0074\u0065\u006E\u0065\u0072']("\u0063\u006C\u0069\u0063\u006B",()=>{a++;if(a>=(631746^631745)){c['\u0073\u0074\u0079\u006C\u0065']['\u006F\u0070\u0061\u0063\u0069\u0074\u0079']="\u0031";c['\u0073\u0074\u0079\u006C\u0065']['\u0074\u0072\u0061\u006E\u0073\u0066\u006F\u0072\u006D']="\u0074\u0072\u0061\u006E\u0073\u006C\u0061\u0074\u0065\u0059\u0028\u0030\u0029";a=302601^302601;}});}