interface Tab {
    buttonId: string;
    viewId: string;
}

interface FTCEvent {
    code: string;
    name: string;
    dateStart: string;
    dateEnd: string;
    regionCode?: string;
    leagueCode?: string;
}

interface Team {
    teamNumber: number;
    station: string;
    surrogate: boolean;
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

interface TeamInfo {
    teamNumber: number;
    nameShort: string;
    nameFull: string;
}

interface Notes {
    autoPerformance: string;
    teleopPerformance: string;
    generalNotes: string;
    updatedAt: number | null;
}

const tabs: Tab[] = [
    { buttonId: "button-schedule", viewId: "view-schedule" },
    { buttonId: "button-rankings", viewId: "view-rankings" },
    { buttonId: "button-notes", viewId: "view-notes" },
    { buttonId: "button-insights", viewId: "view-insights" },
    { buttonId: "button-settings", viewId: "view-settings" },
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

function switchTab(activeTab: Tab) {
    const currentView = document.getElementById(activeViewId);
    
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
        const response = await fetch("/api/v1/events", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!response.ok) return;

        const data = await response.json();
        const events: FTCEvent[] = data.events || [];
        populateMeetSelector(events);

    } catch (error) {
        console.error("Failed to load events:", error);
    } finally {
        hideLoading();
    }
}

function populateMeetSelector(events: FTCEvent[]) {
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

    let defaultEvent: FTCEvent | undefined;

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
        loadSchedule(selector.value);
    });
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
        // First, fetch event details to get regionCode and leagueCode
        const eventRes = await fetch(`/api/v1/event?event=${eventCode}`, { headers: { "Authorization": `Bearer ${token}` } });
        
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

        const regionCode = event.regionCode;
        const leagueCode = event.leagueCode;

        const [scheduleRes, rankingsRes, teamsRes] = await Promise.all([
            fetch(`/api/v1/schedule?event=${eventCode}`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`/api/v1/rankings?event=${eventCode}&region=${regionCode}&league=${leagueCode}`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`/api/v1/teams?event=${eventCode}`, { headers: { "Authorization": `Bearer ${token}` } })
        ]);

        if (scheduleRes.ok && rankingsRes.ok && teamsRes.ok) {
            const scheduleData = await scheduleRes.json();
            const rankingsData = await rankingsRes.json();
            const teamsData = await teamsRes.json();
            
            currentMatches = scheduleData.schedule || [];
            currentRankings = rankingsData.rankings || [];
            currentTeams = teamsData.teams || [];
            await enrichMatchesWithResults(eventCode, currentMatches, token);
            
            renderSchedule(currentMatches, currentRankings, currentTeams);
            renderRankings(currentRankings);

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

let queueInterval: number;

type MatchResultVariant = "win" | "loss" | "tie";

interface MatchResultIndicator {
    label: string;
    variant: MatchResultVariant;
    tooltip: string;
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

function buildMatchKey(match: Pick<Match, "matchNumber" | "series" | "tournamentLevel">): string {
    const level = match.tournamentLevel || "";
    const seriesValue = typeof match.series === "number" ? match.series : 0;
    return `${level}-${seriesValue}-${match.matchNumber}`;
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
            return fetch(`/api/v1/matches?${params.toString()}`, { headers })
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
    const tbody = document.querySelector("#rankings-table tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    rankings.forEach((rank, index) => {
        const tr = document.createElement("tr");
        tr.style.animationDelay = `${index * 0.03}s`;
        if (loggedInTeamId && rank.teamNumber === loggedInTeamId) {
            tr.classList.add("current-team-rank");
        }
        tr.innerHTML = `
            <td>${rank.rank}</td>
            <td>${rank.teamNumber}</td>
            <td>${rank.teamName}</td>
            <td>${rank.sortOrder1}</td>
            <td>${rank.sortOrder2}</td>
            <td>${rank.sortOrder3}</td>
            <td>${rank.sortOrder4}</td>
            <td>${Math.floor(rank.sortOrder6)}</td>
            <td>${rank.wins}-${rank.losses}-${rank.ties}</td>
            <td>${rank.matchesPlayed}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderSchedule(matches: Match[], rankings: Ranking[], teams: TeamInfo[]) {
    const listContainer = document.getElementById("schedule-list");
    if (!listContainer) return;

    if (queueInterval) clearInterval(queueInterval);

    listContainer.innerHTML = "";

    matches.forEach((match, index) => {
        const item = document.createElement("div");
        item.className = "match-item";
        item.style.animationDelay = `${index * 0.03}s`;
        item.onclick = () => {
            document.querySelectorAll(".match-item").forEach(el => el.classList.remove("active"));
            item.classList.add("active");
            renderMatchDetails(match, rankings, teams);
        };

        const redTeams = match.teams.filter(t => t.station.startsWith("Red")).map(t => t.teamNumber);
        const blueTeams = match.teams.filter(t => t.station.startsWith("Blue")).map(t => t.teamNumber);

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
            const prevMatch = index > 0 ? matches[index - 1] : null;
            
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
                <span class="team-red">${redTeams.join(", ")}</span>
                <span class="team-vs">vs</span>
                <span class="team-blue">${blueTeams.join(", ")}</span>
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

async function renderMatchDetails(match: Match, rankings: Ranking[], teams: TeamInfo[]) {
    const detailsContainer = document.getElementById("schedule-details");
    if (!detailsContainer) return;

    showLoading();

    const redTeams = match.teams.filter(t => t.station.startsWith("Red"));
    const blueTeams = match.teams.filter(t => t.station.startsWith("Blue"));
    const allTeams = [...redTeams, ...blueTeams];

    const getTeamRow = (team: Team, colorClass: string) => {
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
                <span class="${colorClass}">${team.teamNumber} ${name}</span>
                <span class="team-rank">${rankText}</span>
            </div>
        `;
    };

    const statsTableRows = allTeams.map(team => {
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
                <td class="${allianceClass}">${team.teamNumber}</td>
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
                        <th>Ranking Points</th>
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
    
    const notesLoadingSection = allTeams.length > 0 ? `
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

            ${statsTable}
            ${notesLoadingSection}
        </div>
    `;

    if (allTeams.length > 0) {
        const teamNumbers = allTeams.map(t => t.teamNumber);
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
                ${allTeams.map(team => {
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
        const response = await fetch("/api/v1/verify", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            loggedInTeamId = data.id;
            return true;
        }
        return false;
    } catch (error) {
        console.error("Token verification failed:", error);
        return false;
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
            hideLogin();
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
        const response = await fetch(`/api/v1/notes/list`, {
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

async function loadNotesForTeams(teamIds: number[]): Promise<Map<number, Notes>> {
    const token = localStorage.getItem("token");
    const notesMap = new Map<number, Notes>();
    
    if (!token) return notesMap;

    try {
        const promises = teamIds.map(teamId => 
            fetch(`/api/v1/notes?team=${teamId}`, {
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

async function loadNotes(teamId: number): Promise<Notes> {
    const token = localStorage.getItem("token");
    if (!token) return { autoPerformance: "", teleopPerformance: "", generalNotes: "", updatedAt: null };

    try {
        const response = await fetch(`/api/v1/notes?team=${teamId}`, {
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

async function saveNotes(teamId: number, notes: Notes) {
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
        fetch("/api/v1/notes", {
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
            renderNotesEditor(team, eventCode);
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
            const updatedNotes: Notes = {
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
    const teamMatchNumbers = new Set<number>();
    const teamAlliances = new Map<number, string>();

    for (const match of schedule) {
        for (const team of match.teams) {
            if (team.teamNumber === teamNumber) {
                teamMatchNumbers.add(match.matchNumber);
                const alliance = team.station.startsWith("Red") ? "Red" : "Blue";
                teamAlliances.set(match.matchNumber, alliance);
                break;
            }
        }
    }

    const filteredScores: any[] = [];
    for (const matchScore of matchScores) {
        if (teamMatchNumbers.has(matchScore.matchNumber)) {
            const alliance = teamAlliances.get(matchScore.matchNumber);
            const allianceData = matchScore.alliances.find((a: any) => a.alliance === alliance);
            
            if (allianceData) {
                filteredScores.push({
                    ...matchScore,
                    alliances: [allianceData]
                });
            }
        }
    }

    return filteredScores;
}

async function analyzeTeam(teamNumber: number) {
    const token = localStorage.getItem("token");
    if (!token) return;

    const content = document.getElementById("insights-content");
    if (!content) return;

    content.innerHTML = '<div class="insights-loading">Loading team data...</div>';
    showLoading();

    try {
        const eventsRes = await fetch(`/api/v1/team/${teamNumber}/events`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!eventsRes.ok) {
            content.innerHTML = '<div class="insights-error">Failed to load team events. Please check the team number.</div>';
            hideLoading();
            return;
        }

        const eventsData = await eventsRes.json();
        const events = eventsData.events || [];

        if (events.length === 0) {
            content.innerHTML = '<div class="insights-error">No events found for this team.</div>';
            hideLoading();
            return;
        }

        const allScoreData: any[] = [];
        for (const event of events) {
            try {
                const [scoresRes, scheduleRes] = await Promise.all([
                    fetch(`/api/v1/scores/${event.code}/qual`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    }),
                    fetch(`/api/v1/schedule?event=${event.code}&teamNumber=${teamNumber}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    })
                ]);

                if (scoresRes.ok && scheduleRes.ok) {
                    const scoresData = await scoresRes.json();
                    const scheduleData = await scheduleRes.json();
                    
                    if (scoresData.matchScores && scheduleData.schedule) {
                        const teamMatches = findTeamMatches(teamNumber, scheduleData.schedule, scoresData.matchScores);
                        if (teamMatches.length > 0) {
                            allScoreData.push({ event: event.name, eventCode: event.code, scores: teamMatches });
                        }
                    }
                }
            } catch (e) {
                console.warn(`Failed to fetch scores for ${event.code}`, e);
            }
        }

        renderInsights(teamNumber, events, allScoreData);
    } catch (error) {
        console.error("Failed to analyze team:", error);
        content.innerHTML = '<div class="insights-error">An error occurred while analyzing the team.</div>';
    } finally {
        hideLoading();
    }
}

function renderInsights(teamNumber: number, events: any[], scoreData: any[]) {
    const content = document.getElementById("insights-content");
    if (!content) return;

    const eventCodes = new Set(scoreData.map(s => s.eventCode));
    const playedEvents = events.filter(e => eventCodes.has(e.code));

    const stats = calculateTeamStatistics(teamNumber, scoreData);
    const charts = generateChartsHTML(stats);

    content.innerHTML = `
        <div class="insights-results">
            <div class="insights-team-header">
                <h2>Team ${teamNumber} - Performance Analysis</h2>
                <p>${playedEvents.length} events competed</p>
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
                <div class="insight-card">
                    <h3>Overall Statistics</h3>
                    <div class="stat-row"><span>Total Matches:</span><strong>${stats.totalMatches}</strong></div>
                    <div class="stat-row"><span>Win Rate:</span><strong>${stats.winRate.toFixed(1)}%</strong></div>
                    <div class="stat-row"><span>Avg Score:</span><strong>${stats.avgScore.toFixed(1)}</strong></div>
                    <div class="stat-row"><span>Max Score:</span><strong>${stats.maxScore}</strong></div>
                    <div class="stat-row"><span>Min Score:</span><strong>${stats.minScore}</strong></div>
                </div>

                <div class="insight-card">
                    <h3>Autonomous Performance</h3>
                    <div class="stat-row"><span>Avg Auto Points:</span><strong>${stats.avgAutoPoints.toFixed(1)}</strong></div>
                    <div class="stat-row"><span>Auto Success Rate:</span><strong>${stats.autoSuccessRate.toFixed(1)}%</strong></div>
                    <div class="stat-row"><span>Avg Leave Points:</span><strong>${stats.avgAutoLeave.toFixed(1)}</strong></div>
                    <div class="stat-row"><span>Avg Artifact Points:</span><strong>${stats.avgAutoArtifacts.toFixed(1)}</strong></div>
                </div>

                <div class="insight-card">
                    <h3>Teleop Performance</h3>
                    <div class="stat-row"><span>Avg Teleop Points:</span><strong>${stats.avgTeleopPoints.toFixed(1)}</strong></div>
                    <div class="stat-row"><span>Avg Classified:</span><strong>${stats.avgTeleopClassified.toFixed(1)}</strong></div>
                    <div class="stat-row"><span>Endgame Rate:</span><strong>${stats.endgameRate.toFixed(1)}%</strong></div>
                    <div class="stat-row"><span>Full Hang Rate:</span><strong>${stats.fullHangRate.toFixed(1)}%</strong></div>
                </div>

                <div class="insight-card">
                    <h3>Ranking Points</h3>
                    <div class="stat-row"><span>Movement RP:</span><strong>${stats.movementRP} (${stats.movementRPRate.toFixed(1)}%)</strong></div>
                    <div class="stat-row"><span>Goal RP:</span><strong>${stats.goalRP} (${stats.goalRPRate.toFixed(1)}%)</strong></div>
                    <div class="stat-row"><span>Pattern RP:</span><strong>${stats.patternRP} (${stats.patternRPRate.toFixed(1)}%)</strong></div>
                </div>

                <div class="insight-card">
                    <h3>Fouls & Penalties</h3>
                    <div class="stat-row"><span>Avg Fouls Committed:</span><strong>${stats.avgFoulsCommitted.toFixed(1)}</strong></div>
                    <div class="stat-row"><span>Major Fouls:</span><strong>${stats.totalMajorFouls}</strong></div>
                    <div class="stat-row"><span>Minor Fouls:</span><strong>${stats.totalMinorFouls}</strong></div>
                    <div class="stat-row"><span>Clean Matches:</span><strong>${stats.cleanMatchRate.toFixed(1)}%</strong></div>
                </div>

                <div class="insight-card">
                    <h3>Consistency Metrics</h3>
                    <div class="stat-row"><span>Score Std Dev:</span><strong>${stats.scoreStdDev.toFixed(1)}</strong></div>
                    <div class="stat-row"><span>Auto Consistency:</span><strong>${stats.autoConsistency.toFixed(1)}%</strong></div>
                    <div class="stat-row"><span>Teleop Consistency:</span><strong>${stats.teleopConsistency.toFixed(1)}%</strong></div>
                </div>
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
        const chartsContainer = document.querySelector(".insights-charts");

        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="insight-card">
                    <h3>Overall Statistics</h3>
                    <div class="stat-row"><span>Total Matches:</span><strong>${stats.totalMatches}</strong></div>
                    <div class="stat-row"><span>Win Rate:</span><strong>${stats.winRate.toFixed(1)}%</strong></div>
                    <div class="stat-row"><span>Avg Score:</span><strong>${stats.avgScore.toFixed(1)}</strong></div>
                    <div class="stat-row"><span>Max Score:</span><strong>${stats.maxScore}</strong></div>
                    <div class="stat-row"><span>Min Score:</span><strong>${stats.minScore}</strong></div>
                </div>

                <div class="insight-card">
                    <h3>Autonomous Performance</h3>
                    <div class="stat-row"><span>Avg Auto Points:</span><strong>${stats.avgAutoPoints.toFixed(1)}</strong></div>
                    <div class="stat-row"><span>Auto Success Rate:</span><strong>${stats.autoSuccessRate.toFixed(1)}%</strong></div>
                    <div class="stat-row"><span>Avg Leave Points:</span><strong>${stats.avgAutoLeave.toFixed(1)}</strong></div>
                    <div class="stat-row"><span>Avg Artifact Points:</span><strong>${stats.avgAutoArtifacts.toFixed(1)}</strong></div>
                </div>

                <div class="insight-card">
                    <h3>Teleop Performance</h3>
                    <div class="stat-row"><span>Avg Teleop Points:</span><strong>${stats.avgTeleopPoints.toFixed(1)}</strong></div>
                    <div class="stat-row"><span>Avg Classified:</span><strong>${stats.avgTeleopClassified.toFixed(1)}</strong></div>
                    <div class="stat-row"><span>Endgame Rate:</span><strong>${stats.endgameRate.toFixed(1)}%</strong></div>
                    <div class="stat-row"><span>Full Hang Rate:</span><strong>${stats.fullHangRate.toFixed(1)}%</strong></div>
                </div>

                <div class="insight-card">
                    <h3>Ranking Points</h3>
                    <div class="stat-row"><span>Movement RP:</span><strong>${stats.movementRP} (${stats.movementRPRate.toFixed(1)}%)</strong></div>
                    <div class="stat-row"><span>Goal RP:</span><strong>${stats.goalRP} (${stats.goalRPRate.toFixed(1)}%)</strong></div>
                    <div class="stat-row"><span>Pattern RP:</span><strong>${stats.patternRP} (${stats.patternRPRate.toFixed(1)}%)</strong></div>
                </div>

                <div class="insight-card">
                    <h3>Fouls & Penalties</h3>
                    <div class="stat-row"><span>Avg Fouls Committed:</span><strong>${stats.avgFoulsCommitted.toFixed(1)}</strong></div>
                    <div class="stat-row"><span>Major Fouls:</span><strong>${stats.totalMajorFouls}</strong></div>
                    <div class="stat-row"><span>Minor Fouls:</span><strong>${stats.totalMinorFouls}</strong></div>
                    <div class="stat-row"><span>Clean Matches:</span><strong>${stats.cleanMatchRate.toFixed(1)}%</strong></div>
                </div>

                <div class="insight-card">
                    <h3>Consistency Metrics</h3>
                    <div class="stat-row"><span>Score Std Dev:</span><strong>${stats.scoreStdDev.toFixed(1)}</strong></div>
                    <div class="stat-row"><span>Auto Consistency:</span><strong>${stats.autoConsistency.toFixed(1)}%</strong></div>
                    <div class="stat-row"><span>Teleop Consistency:</span><strong>${stats.teleopConsistency.toFixed(1)}%</strong></div>
                </div>
            `;
        }

        if (chartsContainer) {
            chartsContainer.innerHTML = charts;
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

function calculateTeamStatistics(teamNumber: number, scoreData: any[]) {
    let totalMatches = 0;
    let wins = 0;
    const scores: number[] = [];
    const autoPoints: number[] = [];
    const teleopPoints: number[] = [];
    let autoSuccessCount = 0;
    let teleopClassified = 0;
    let autoLeaveTotal = 0;
    let autoArtifactsTotal = 0;
    let endgameCount = 0;
    let fullHangCount = 0;
    let movementRP = 0;
    let goalRP = 0;
    let patternRP = 0;
    let foulsCommitted = 0;
    let majorFouls = 0;
    let minorFouls = 0;
    let cleanMatches = 0;

    for (const eventData of scoreData) {
        for (const match of eventData.scores) {
            for (const alliance of match.alliances) {
                totalMatches++;
                scores.push(alliance.totalPoints);
                autoPoints.push(alliance.autoPoints);
                teleopPoints.push(alliance.teleopPoints);

                if (alliance.robot1Auto || alliance.robot2Auto) autoSuccessCount++;
                autoLeaveTotal += alliance.autoLeavePoints;
                autoArtifactsTotal += alliance.autoArtifactPoints;
                teleopClassified += alliance.teleopClassifiedArtifacts;

                if (alliance.robot1Teleop !== "NONE" || alliance.robot2Teleop !== "NONE") endgameCount++;
                if (alliance.robot1Teleop === "FULL" || alliance.robot2Teleop === "FULL") fullHangCount++;

                if (alliance.movementRP) movementRP++;
                if (alliance.goalRP) goalRP++;
                if (alliance.patternRP) patternRP++;

                foulsCommitted += alliance.foulPointsCommitted;
                majorFouls += alliance.majorFouls;
                minorFouls += alliance.minorFouls;

                if (alliance.majorFouls === 0 && alliance.minorFouls === 0) cleanMatches++;

                const otherAlliance = match.alliances.find((a: any) => a.alliance !== alliance.alliance);
                if (otherAlliance && alliance.totalPoints > otherAlliance.totalPoints) wins++;
            }
        }
    }

    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const scoreStdDev = scores.length > 1 
        ? Math.sqrt(scores.map(s => Math.pow(s - avgScore, 2)).reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    const avgAuto = autoPoints.length > 0 ? autoPoints.reduce((a, b) => a + b, 0) / autoPoints.length : 0;
    const avgTeleop = teleopPoints.length > 0 ? teleopPoints.reduce((a, b) => a + b, 0) / teleopPoints.length : 0;

    const autoStdDev = autoPoints.length > 1
        ? Math.sqrt(autoPoints.map(a => Math.pow(a - avgAuto, 2)).reduce((a, b) => a + b, 0) / autoPoints.length)
        : 0;

    const teleopStdDev = teleopPoints.length > 1
        ? Math.sqrt(teleopPoints.map(t => Math.pow(t - avgTeleop, 2)).reduce((a, b) => a + b, 0) / teleopPoints.length)
        : 0;

    return {
        totalMatches,
        winRate: totalMatches > 0 ? (wins / totalMatches) * 100 : 0,
        avgScore,
        maxScore: scores.length > 0 ? Math.max(...scores) : 0,
        minScore: scores.length > 0 ? Math.min(...scores) : 0,
        avgAutoPoints: avgAuto,
        autoSuccessRate: totalMatches > 0 ? (autoSuccessCount / totalMatches) * 100 : 0,
        avgAutoLeave: totalMatches > 0 ? autoLeaveTotal / totalMatches : 0,
        avgAutoArtifacts: totalMatches > 0 ? autoArtifactsTotal / totalMatches : 0,
        avgTeleopPoints: avgTeleop,
        avgTeleopClassified: totalMatches > 0 ? teleopClassified / totalMatches : 0,
        endgameRate: totalMatches > 0 ? (endgameCount / totalMatches) * 100 : 0,
        fullHangRate: totalMatches > 0 ? (fullHangCount / totalMatches) * 100 : 0,
        movementRP,
        movementRPRate: totalMatches > 0 ? (movementRP / totalMatches) * 100 : 0,
        goalRP,
        goalRPRate: totalMatches > 0 ? (goalRP / totalMatches) * 100 : 0,
        patternRP,
        patternRPRate: totalMatches > 0 ? (patternRP / totalMatches) * 100 : 0,
        avgFoulsCommitted: totalMatches > 0 ? foulsCommitted / totalMatches : 0,
        totalMajorFouls: majorFouls,
        totalMinorFouls: minorFouls,
        cleanMatchRate: totalMatches > 0 ? (cleanMatches / totalMatches) * 100 : 0,
        scoreStdDev,
        autoConsistency: avgAuto > 0 ? Math.max(0, 100 - (autoStdDev / avgAuto) * 100) : 0,
        teleopConsistency: avgTeleop > 0 ? Math.max(0, 100 - (teleopStdDev / avgTeleop) * 100) : 0,
        scores,
        autoPoints,
        teleopPoints
    };
}

function generateChartsHTML(stats: any) {
    const maxScore = Math.max(...stats.scores, 100);
    const scoreChart = generateBarChart(stats.scores, maxScore, "Match Performance");
    const autoTeleopChart = generateComparisonChart(stats.autoPoints, stats.teleopPoints, Math.max(...stats.autoPoints, ...stats.teleopPoints, 50));

    return `
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
    `;
}

function generateBarChart(data: number[], maxValue: number, label: string) {
    const bars = data.map((value, index) => {
        const height = (value / maxValue) * 100;
        return `
            <div class="chart-bar-container">
                <div class="chart-bar-value">${value}</div>
                <div class="chart-bar" style="height: ${height}%" title="Match ${index + 1}: ${value}"></div>
                <div class="chart-bar-index">${index + 1}</div>
            </div>
        `;
    }).join("");

    return `<div class="bar-chart">${bars}</div>`;
}

function generateComparisonChart(data1: number[], data2: number[], maxValue: number) {
    const bars = data1.map((value, index) => {
        const height1 = (value / maxValue) * 100;
        const height2 = (data2[index] / maxValue) * 100;
        return `
            <div class="chart-group">
                <div class="chart-group-bars">
                    <div class="chart-bar-container">
                        <div class="chart-bar-value">${value}</div>
                        <div class="chart-bar auto" style="height: ${height1}%" title="Auto: ${value}"></div>
                    </div>
                    <div class="chart-bar-container">
                        <div class="chart-bar-value">${data2[index]}</div>
                        <div class="chart-bar teleop" style="height: ${height2}%" title="Teleop: ${data2[index]}"></div>
                    </div>
                </div>
                <div class="chart-group-index">${index + 1}</div>
            </div>
        `;
    }).join("");

    return `<div class="comparison-chart">${bars}</div>`;
}

document.addEventListener("DOMContentLoaded", async () => {
    // Tab initialization
    tabs.forEach(tab => {
        const button = document.getElementById(tab.buttonId);
        if (button) {
            button.addEventListener("click", () => {
                switchTab(tab);
                if (tab.viewId === "view-notes" && currentEventCode && currentTeams.length > 0) {
                    initializeNotesView(currentEventCode);
                }
            });
        }
    });

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

    // Auth check
    const token = localStorage.getItem("token");
    if (token) {
        const isValid = await verifyToken(token);
        if (isValid) {
            hideLogin();
            loadEvents();
            if (tabs.length > 0) {
                switchTab(tabs[0]);
            }
        } else {
            localStorage.removeItem("token");
            showLogin();
        }
    } else {
        showLogin();
    }
});
