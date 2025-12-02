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

const tabs: Tab[] = [
    { buttonId: "button-schedule", viewId: "view-schedule" },
    { buttonId: "button-rankings", viewId: "view-rankings" },
    { buttonId: "button-settings", viewId: "view-settings" },
];

let currentMatches: Match[] = [];
let currentRankings: Ranking[] = [];
let currentTeams: TeamInfo[] = [];
let loggedInTeamId: number | null = null;

function switchTab(activeTab: Tab) {
    tabs.forEach(tab => {
        const button = document.getElementById(tab.buttonId);
        const view = document.getElementById(tab.viewId);

        if (button && view) {
            if (tab === activeTab) {
                button.classList.add("sidebar-active");
                view.style.display = "block";
            } else {
                button.classList.remove("sidebar-active");
                view.style.display = "none";
            }
        }
    });
}

function showLoading() {
    const container = document.getElementById("loading-bar-container");
    const bar = document.getElementById("loading-bar");
    const status = document.getElementById("status-text");
    
    if (container) container.style.display = "block";
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
            if (container) container.style.display = "none";
            if (status) status.textContent = "Ready";
            bar.style.width = "0%";
        }, 300);
    } else {
        if (container) container.style.display = "none";
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
        loadSchedule(defaultEvent.code);
    }
    
    selector.addEventListener("change", () => {
        console.log("Selected meet:", selector.value);
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
            
            renderSchedule(currentMatches, currentRankings, currentTeams);
            renderRankings(currentRankings);
        }
    } catch (error) {
        console.error("Failed to load schedule/rankings/teams:", error);
    } finally {
        hideLoading();
    }
}

let queueInterval: number;

function renderRankings(rankings: Ranking[]) {
    const tbody = document.querySelector("#rankings-table tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    rankings.forEach(rank => {
        const tr = document.createElement("tr");
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

        item.innerHTML = `
            <div class="match-header">
                <span class="match-title">${match.description}</span>
                <span class="match-time">${new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="match-teams">
                <span class="team-red">${redTeams.join(", ")}</span>
                <span class="team-vs">vs</span>
                <span class="team-blue">${blueTeams.join(", ")}</span>
            </div>
            <div class="match-meta">
                <span class="queue-status ${queueClass}" ${queueTimeAttr} ${fieldInfoAttr}>${queueText}${fieldInfo}</span>
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

function renderMatchDetails(match: Match, rankings: Ranking[], teams: TeamInfo[]) {
    const detailsContainer = document.getElementById("schedule-details");
    if (!detailsContainer) return;

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

    detailsContainer.innerHTML = `
        <div class="details-header">
            <div class="details-title">${match.description}</div>
            <div class="details-time">Scheduled: ${new Date(match.startTime).toLocaleString()}</div>
            ${match.actualStartTime ? `<div class="details-time">Actual: ${new Date(match.actualStartTime).toLocaleString()}</div>` : ''}
            ${match.field ? `<div class="details-time">Field: ${match.field}</div>` : ''}
        </div>
        
        <div class="alliance-container">
            <div class="alliance-card red">
                <div class="alliance-title">Red Alliance ${match.scoreRedFinal !== undefined ? `- ${match.scoreRedFinal}` : ''}</div>
                ${redTeams.map(t => getTeamRow(t, 'team-red')).join("")}
            </div>
            <div class="alliance-card blue">
                <div class="alliance-title">Blue Alliance ${match.scoreBlueFinal !== undefined ? `- ${match.scoreBlueFinal}` : ''}</div>
                ${blueTeams.map(t => getTeamRow(t, 'team-blue')).join("")}
            </div>
        </div>

        ${statsTable}
    `;
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

document.addEventListener("DOMContentLoaded", async () => {
    // Tab initialization
    tabs.forEach(tab => {
        const button = document.getElementById(tab.buttonId);
        if (button) {
            button.addEventListener("click", () => switchTab(tab));
        }
    });

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


