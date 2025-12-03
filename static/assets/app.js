"use strict";
const tabs = [
    { buttonId: "button-schedule", viewId: "view-schedule" },
    { buttonId: "button-rankings", viewId: "view-rankings" },
    { buttonId: "button-notes", viewId: "view-notes" },
    { buttonId: "button-insights", viewId: "view-insights" },
    { buttonId: "button-settings", viewId: "view-settings" },
    { buttonId: "button-about", viewId: "view-about" },
];
let currentMatches = [];
let currentRankings = [];
let currentTeams = [];
let currentEventCode = "";
let currentNotesStatus = {};
let loggedInTeamId = null;
let notesAutoSaveTimeout = null;
let activeViewId = tabs[0]?.viewId || "view-schedule";
let currentEventStartTimestamp = null;
function switchTab(activeTab) {
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
                    }
                    else {
                        button.classList.remove("sidebar-active");
                        view.style.display = "none";
                        view.classList.remove("fade-out");
                    }
                }
            });
        }, 200);
    }
    else {
        tabs.forEach(tab => {
            const button = document.getElementById(tab.buttonId);
            const view = document.getElementById(tab.viewId);
            if (button && view) {
                if (tab === activeTab) {
                    button.classList.add("sidebar-active");
                    view.style.display = "block";
                    activeViewId = activeTab.viewId;
                }
                else {
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
    if (status)
        status.textContent = "Loading...";
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
            if (status)
                status.textContent = "Ready";
        }, 300);
    }
    else {
        if (container) {
            container.classList.add("hide");
            setTimeout(() => {
                container.style.display = "none";
                container.classList.remove("hide");
            }, 150);
        }
        if (status)
            status.textContent = "Ready";
    }
}
async function loadEvents() {
    const token = localStorage.getItem("token");
    if (!token)
        return;
    showLoading();
    try {
        const response = await fetch("/api/v1/events", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok)
            return;
        const data = await response.json();
        const events = data.events || [];
        populateMeetSelector(events);
    }
    catch (error) {
        console.error("Failed to load events:", error);
    }
    finally {
        hideLoading();
    }
}
function populateMeetSelector(events) {
    const selector = document.getElementById("meet-selector");
    if (!selector)
        return;
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
    let defaultEvent;
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
async function loadSchedule(eventCode) {
    const token = localStorage.getItem("token");
    if (!token)
        return;
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
    }
    catch (error) {
        console.error("Failed to load schedule/rankings/teams:", error);
    }
    finally {
        hideLoading();
    }
}
let queueInterval;
function parseScore(value) {
    if (typeof value === "number") {
        return value;
    }
    if (typeof value === "string") {
        const parsed = parseInt(value, 10);
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
}
function buildMatchKey(match) {
    const level = match.tournamentLevel || "";
    const seriesValue = typeof match.series === "number" ? match.series : 0;
    return `${level}-${seriesValue}-${match.matchNumber}`;
}
function mergeMatchResults(scheduleMatches, resultMatches) {
    const resultMap = new Map();
    resultMatches.forEach(result => {
        resultMap.set(buildMatchKey(result), result);
    });
    scheduleMatches.forEach(match => {
        const result = resultMap.get(buildMatchKey(match));
        if (!result)
            return;
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
async function enrichMatchesWithResults(eventCode, matches, token) {
    if (!matches.length)
        return;
    const uniqueLevels = Array.from(new Set(matches
        .map(match => match.tournamentLevel)
        .filter((level) => typeof level === "string" && level.length > 0)));
    if (!uniqueLevels.length)
        return;
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
    }
    catch (error) {
        console.warn("Failed to enrich match results", error);
    }
}
function getMatchResultIndicator(match) {
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
function renderRankings(rankings) {
    const tbody = document.querySelector("#rankings-table tbody");
    if (!tbody)
        return;
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
function renderSchedule(matches, rankings, teams) {
    const listContainer = document.getElementById("schedule-list");
    if (!listContainer)
        return;
    if (queueInterval)
        clearInterval(queueInterval);
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
            let queueTime;
            if (prevMatch) {
                queueTime = new Date(prevMatch.actualStartTime || prevMatch.startTime);
            }
            else {
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
            }
            else {
                queueText = `Queueing in ${diffMins}m ${diffSecs}s`;
            }
        }
        else {
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
        if (!time)
            return;
        const diffMs = time - now.getTime();
        let text = "";
        if (diffMs <= 0) {
            text = "Queueing Now";
            el.classList.add("queueing");
        }
        else {
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffSecs = Math.ceil((diffMs % (1000 * 60)) / 1000);
            text = `Queueing in ${diffMins}m ${diffSecs}s`;
            el.classList.remove("queueing");
        }
        el.textContent = text + fieldInfo;
    });
}
async function renderMatchDetails(match, rankings, teams) {
    const detailsContainer = document.getElementById("schedule-details");
    if (!detailsContainer)
        return;
    showLoading();
    const redTeams = match.teams.filter(t => t.station.startsWith("Red"));
    const blueTeams = match.teams.filter(t => t.station.startsWith("Blue"));
    const allTeams = [...redTeams, ...blueTeams];
    const getTeamRow = (team, colorClass) => {
        const rank = rankings.find(r => r.teamNumber === team.teamNumber);
        const teamInfo = teams.find(t => t.teamNumber === team.teamNumber);
        const rankText = rank ? `#${rank.rank}` : "-";
        let name = `Team ${team.teamNumber}`;
        if (rank && rank.teamName) {
            name = rank.teamName;
        }
        else if (teamInfo) {
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
            const escapeHtml = (text) => {
                const div = document.createElement("div");
                div.textContent = text;
                return div.innerHTML;
            };
            const formatMultiline = (text) => {
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
async function verifyToken(token) {
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
    }
    catch (error) {
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
async function handleLogin(event) {
    event.preventDefault();
    const idInput = document.getElementById("login-id");
    const passwordInput = document.getElementById("login-password");
    const errorElement = document.getElementById("login-error");
    if (!idInput || !passwordInput || !errorElement)
        return;
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
        }
        else {
            errorElement.textContent = data.error || "Login failed";
            errorElement.style.display = "block";
        }
    }
    catch (error) {
        console.error("Login error:", error);
        errorElement.textContent = "An error occurred. Please try again.";
        errorElement.style.display = "block";
    }
}
function getRelativeTime(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60)
        return "just now";
    if (diff < 3600)
        return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) !== 1 ? "s" : ""} ago`;
    if (diff < 86400)
        return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? "s" : ""} ago`;
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? "s" : ""} ago`;
}
async function loadNotesStatus() {
    const token = localStorage.getItem("token");
    if (!token)
        return;
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
    }
    catch (error) {
        console.error("Failed to load notes status:", error);
    }
}
async function loadNotesForTeams(teamIds) {
    const token = localStorage.getItem("token");
    const notesMap = new Map();
    if (!token)
        return notesMap;
    try {
        const promises = teamIds.map(teamId => fetch(`/api/v1/notes?team=${teamId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : null));
        const results = await Promise.all(promises);
        teamIds.forEach((teamId, index) => {
            if (results[index]) {
                notesMap.set(teamId, results[index].notes);
            }
        });
    }
    catch (error) {
        console.error("Failed to load notes for teams:", error);
    }
    return notesMap;
}
async function loadNotes(teamId) {
    const token = localStorage.getItem("token");
    if (!token)
        return { autoPerformance: "", teleopPerformance: "", generalNotes: "", updatedAt: null };
    try {
        const response = await fetch(`/api/v1/notes?team=${teamId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            return data.notes;
        }
    }
    catch (error) {
        console.error("Failed to load notes:", error);
    }
    return { autoPerformance: "", teleopPerformance: "", generalNotes: "", updatedAt: null };
}
function isNoteStale(updatedAt) {
    if (!updatedAt || currentEventStartTimestamp === null)
        return false;
    const noteTimeMs = updatedAt * 1000;
    const oneDayMs = 24 * 60 * 60 * 1000;
    return noteTimeMs < currentEventStartTimestamp - oneDayMs;
}
function updateTeamNoteStatus(teamId) {
    const item = document.querySelector(`.notes-team-item[data-team-id="${teamId}"]`);
    if (!item)
        return;
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
        }
        else if (stale) {
            statusIndicator.className = "notes-status-warning";
            statusIndicator.textContent = "!";
        }
        else {
            statusIndicator.className = "notes-status-complete";
            statusIndicator.textContent = "✓";
        }
    }
}
async function saveNotes(teamId, notes) {
    const token = localStorage.getItem("token");
    if (!token)
        return;
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
    }
    catch (error) {
        console.error("Failed to save notes:", error);
    }
}
function renderNotesTeamList(teams, eventCode) {
    const listContainer = document.getElementById("notes-list");
    if (!listContainer)
        return;
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
        }
        else if (stale) {
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
async function renderNotesEditor(team, eventCode) {
    const detailsContainer = document.getElementById("notes-details");
    if (!detailsContainer)
        return;
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
    const autoTextarea = document.getElementById("notes-auto");
    const teleopTextarea = document.getElementById("notes-teleop");
    const generalTextarea = document.getElementById("notes-general");
    const handleInput = () => {
        if (notesAutoSaveTimeout) {
            clearTimeout(notesAutoSaveTimeout);
        }
        notesAutoSaveTimeout = window.setTimeout(() => {
            const updatedNotes = {
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
async function initializeNotesView(eventCode) {
    if (!currentTeams.length)
        return;
    await loadNotesStatus();
    renderNotesTeamList(currentTeams, eventCode);
}
function findTeamMatches(teamNumber, schedule, matchScores) {
    const teamMatchNumbers = new Set();
    const teamAlliances = new Map();
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
    const filteredScores = [];
    for (const matchScore of matchScores) {
        if (teamMatchNumbers.has(matchScore.matchNumber)) {
            const teamAllianceName = teamAlliances.get(matchScore.matchNumber);
            filteredScores.push({
                ...matchScore,
                teamAlliance: teamAllianceName
            });
        }
    }
    return filteredScores;
}
async function analyzeTeam(teamNumber) {
    const token = localStorage.getItem("token");
    if (!token)
        return;
    const content = document.getElementById("insights-content");
    if (!content)
        return;
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
        const allScoreData = [];
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
            }
            catch (e) {
                console.warn(`Failed to fetch scores for ${event.code}`, e);
            }
        }
        renderInsights(teamNumber, events, allScoreData);
    }
    catch (error) {
        console.error("Failed to analyze team:", error);
        content.innerHTML = '<div class="insights-error">An error occurred while analyzing the team.</div>';
    }
    finally {
        hideLoading();
    }
}
function generateStatsHTML(stats) {
    return `
        <div class="insight-card">
            <h3>Overall Statistics</h3>
            <div class="stat-row"><span>Total Matches:</span><strong>${stats.totalMatches}</strong></div>
            <div class="stat-row"><span>Win Rate:</span><strong>${stats.winRate.toFixed(1)}% (${stats.wins}ts)</strong></div>
            <div class="stat-row"><span>Avg Score:</span><strong>${stats.avgScore.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Median Score:</span><strong>${stats.medianScore.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Standard Deviation:</span><strong>${stats.scoreStdDev.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Max Score:</span><strong>${stats.maxScore}</strong></div>
            <div class="stat-row"><span>Min Score:</span><strong>${stats.minScore}</strong></div>
        </div>

        <div class="insight-card">
            <h3>Autonomous Performance</h3>
            <div class="stat-row"><span>Avg Auto Points:</span><strong>${stats.avgAutoPoints.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Avg Leave Points:</span><strong>${stats.avgAutoLeave.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Avg Artifact Points:</span><strong>${stats.avgAutoArtifactPoints.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Avg Pattern Points:</span><strong>${stats.avgAutoPatternPoints.toFixed(1)}</strong></div>
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
            <div class="stat-row"><span>Avg Artifacts Scored:</span><strong>${stats.avgTeleopArtifacts.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Median Artifacts Scored:</span><strong>${stats.medianTeleopArtifacts.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Mode Artifacts Scored:</span><strong>${stats.modeTeleopArtifacts !== null && stats.modeTeleopArtifacts !== undefined ? stats.modeTeleopArtifacts : 'n/a'}</strong></div>
            <div class="stat-row"><span>Std Dev Artifacts:</span><strong>${stats.stdDevTeleopArtifacts.toFixed(1)}</strong></div>
        </div>

        <div class="insight-card">
            <h3>Ranking Points</h3>
            <div class="stat-row"><span>Movement RP:</span><strong>${stats.movementRPRate.toFixed(1)}%</strong></div>
            <div class="stat-row"><span>Goal RP:</span><strong>${stats.goalRPRate.toFixed(1)}%</strong></div>
            <div class="stat-row"><span>Pattern RP:</span><strong>${stats.patternRPRate.toFixed(1)}%</strong></div>
        </div>

        <div class="insight-card">
            <h3>Penalties</h3>
            <div class="stat-row"><span>Avg Points Committed:</span><strong>${stats.avgPenaltyPoints.toFixed(1)}</strong></div>
            <div class="stat-row"><span>Major Fouls:</span><strong>${stats.totalMajorFouls}</strong></div>
            <div class="stat-row"><span>Minor Fouls:</span><strong>${stats.totalMinorFouls}</strong></div>
            <div class="stat-row"><span>Clean Matches:</span><strong>${stats.cleanMatches}</strong></div>
        </div>
    `;
}
function renderInsights(teamNumber, events, scoreData) {
    const content = document.getElementById("insights-content");
    if (!content)
        return;
    const eventCodes = new Set(scoreData.map(s => s.eventCode));
    const playedEvents = events.filter(e => eventCodes.has(e.code));
    const stats = calculateTeamStatistics(teamNumber, scoreData);
    const charts = generateChartsHTML(stats);
    content.innerHTML = `
        <div class="insights-results">
            <div class="insights-team-header">
                <h2>Team ${teamNumber} - Performance Analysis <span class="header-info-icon" title="Most statistics exclude penalty points">(i)</span></h2>
                <p>${playedEvents.length} events completed</p>
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
function setupEventSelectors(teamNumber, events, allScoreData) {
    const checkboxes = document.querySelectorAll(".event-checkbox");
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
function calculateMedian(arr) {
    if (arr.length === 0)
        return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function calculateMode(arr) {
    if (arr.length === 0)
        return null;
    const freq = {};
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
    if (maxFreq <= 1)
        return null;
    return mode;
}
function calculateStdDev(arr, avg) {
    if (arr.length <= 1)
        return 0;
    return Math.sqrt(arr.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b, 0) / arr.length);
}
function calculateTeamStatistics(teamNumber, scoreData) {
    let totalMatches = 0;
    let wins = 0;
    const scoresNoPenalty = [];
    const autoPoints = [];
    const teleopPoints = [];
    const autoArtifactsCounts = [];
    const teleopArtifactsCounts = [];
    let autoLeaveTotal = 0;
    let autoArtifactPointsTotal = 0;
    let autoPatternPointsTotal = 0;
    let teleopArtifactPointsTotal = 0;
    let teleopPatternPointsTotal = 0;
    let movementRP = 0;
    let goalRP = 0;
    let patternRP = 0;
    let penaltyPointsTotal = 0;
    let majorFouls = 0;
    let minorFouls = 0;
    let cleanMatches = 0;
    for (const eventData of scoreData) {
        for (const match of eventData.scores) {
            const teamAllianceName = match.teamAlliance;
            const alliance = match.alliances.find((a) => a.alliance === teamAllianceName);
            if (!alliance)
                continue;
            totalMatches++;
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
            const teleopArtifacts = (alliance.teleopClassifiedArtifacts || 0) + (alliance.teleopOverflowArtifacts || 0);
            teleopArtifactsCounts.push(teleopArtifacts);
            if (alliance.movementRP)
                movementRP++;
            if (alliance.goalRP)
                goalRP++;
            if (alliance.patternRP)
                patternRP++;
            penaltyPointsTotal += alliance.foulPointsCommitted || 0;
            majorFouls += alliance.majorFouls || 0;
            minorFouls += alliance.minorFouls || 0;
            if ((alliance.majorFouls || 0) === 0 && (alliance.minorFouls || 0) === 0)
                cleanMatches++;
            // Check if this alliance won by comparing to opponent alliance
            const otherAlliance = match.alliances.find((a) => a.alliance !== teamAllianceName);
            if (otherAlliance && alliance.totalPoints > otherAlliance.totalPoints)
                wins++;
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
        teleopArtifactsCounts
    };
}
function generateChartsHTML(stats) {
    const scores = stats.scoresNoPenalty || [];
    const maxScore = scores.length > 0 ? Math.max(...scores, 100) : 100;
    const scoreChart = generateBarChart(scores, maxScore);
    const autoMax = stats.autoPoints.length > 0 ? Math.max(...stats.autoPoints) : 50;
    const teleopMax = stats.teleopPoints.length > 0 ? Math.max(...stats.teleopPoints) : 50;
    const autoTeleopMax = Math.max(autoMax, teleopMax, 50);
    const autoTeleopChart = generateComparisonChart(stats.autoPoints, stats.teleopPoints, autoTeleopMax);
    const autoArtifacts = stats.autoArtifactsCounts || [];
    const teleopArtifacts = stats.teleopArtifactsCounts || [];
    const maxArtifacts = Math.max(autoArtifacts.length > 0 ? Math.max(...autoArtifacts) : 10, teleopArtifacts.length > 0 ? Math.max(...teleopArtifacts) : 10, 10);
    const artifactsLineChart = generateLineChart(autoArtifacts, teleopArtifacts, maxArtifacts);
    return `
        <div class="insights-charts-wrapper">
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
function generateBarChart(data, maxValue) {
    if (data.length === 0) {
        return '<div class="bar-chart"><div class="chart-empty">No data available</div></div>';
    }
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
function generateComparisonChart(data1, data2, maxValue) {
    if (data1.length === 0) {
        return '<div class="comparison-chart"><div class="chart-empty">No data available</div></div>';
    }
    const bars = data1.map((value, index) => {
        const height1 = (value / maxValue) * 100;
        const height2 = ((data2[index] || 0) / maxValue) * 100;
        return `
            <div class="chart-group">
                <div class="chart-group-bars">
                    <div class="chart-bar-container">
                        <div class="chart-bar-value">${value}</div>
                        <div class="chart-bar auto" style="height: ${height1}%" title="Auto: ${value}"></div>
                    </div>
                    <div class="chart-bar-container">
                        <div class="chart-bar-value">${data2[index] || 0}</div>
                        <div class="chart-bar teleop" style="height: ${height2}%" title="Teleop: ${data2[index] || 0}"></div>
                    </div>
                </div>
                <div class="chart-group-index">${index + 1}</div>
            </div>
        `;
    }).join("");
    return `<div class="comparison-chart">${bars}</div>`;
}
function generateLineChart(data1, data2, maxValue) {
    if (data1.length === 0) {
        return '<div class="line-chart"><div class="line-chart-container"><div class="chart-empty">No data available</div></div></div>';
    }
    const chartId = `line-chart-${Date.now()}`;
    const xLabels = data1.map((_, i) => {
        if (data1.length <= 15 || i % Math.ceil(data1.length / 15) === 0 || i === data1.length - 1) {
            return `<span class="line-x-label">${i + 1}</span>`;
        }
        return "";
    }).filter(l => l).join("");
    setTimeout(() => {
        const canvas = document.getElementById(chartId);
        if (!canvas)
            return;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        const width = rect.width;
        const height = rect.height;
        const padding = 10;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const getX = (i) => padding + (i / (data1.length - 1 || 1)) * chartWidth;
        const getY = (v) => padding + chartHeight - (v / maxValue) * chartHeight;
        // Draw lines
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        // Auto line (green)
        ctx.strokeStyle = "#4ec9b0";
        ctx.beginPath();
        data1.forEach((v, i) => {
            const x = getX(i);
            const y = getY(v);
            if (i === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        });
        ctx.stroke();
        // Teleop line (red)
        ctx.strokeStyle = "#ff6b6b";
        ctx.beginPath();
        data2.forEach((v, i) => {
            const x = getX(i);
            const y = getY(v);
            if (i === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        });
        ctx.stroke();
        // Draw dots
        data1.forEach((v, i) => {
            ctx.fillStyle = "#4ec9b0";
            ctx.beginPath();
            ctx.arc(getX(i), getY(v), 5, 0, Math.PI * 2);
            ctx.fill();
        });
        data2.forEach((v, i) => {
            ctx.fillStyle = "#ff6b6b";
            ctx.beginPath();
            ctx.arc(getX(i), getY(v), 5, 0, Math.PI * 2);
            ctx.fill();
        });
        // Handle hover
        const tooltip = document.getElementById(`${chartId}-tooltip`);
        canvas.addEventListener("mousemove", (e) => {
            const canvasRect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - canvasRect.left;
            const mouseY = e.clientY - canvasRect.top;
            let found = false;
            const checkPoint = (data, label, color) => {
                for (let i = 0; i < data.length; i++) {
                    const x = getX(i);
                    const y = getY(data[i]);
                    const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
                    if (dist < 10) {
                        if (tooltip) {
                            tooltip.textContent = `${data[i]} artifact${data[i] !== 1 ? "s" : ""} (${label} @ Match ${i + 1})`;
                            tooltip.style.display = "block";
                            tooltip.style.borderColor = color;
                            const tooltipRect = tooltip.getBoundingClientRect();
                            let tooltipX = mouseX + 10;
                            let tooltipY = mouseY - 25;
                            if (tooltipX + tooltipRect.width > canvasRect.width) {
                                tooltipX = mouseX - tooltipRect.width - 10;
                            }
                            if (tooltipY < 0) {
                                tooltipY = mouseY + 15;
                            }
                            tooltip.style.left = `${tooltipX}px`;
                            tooltip.style.top = `${tooltipY}px`;
                        }
                        canvas.style.cursor = "pointer";
                        found = true;
                        return true;
                    }
                }
                return false;
            };
            if (!checkPoint(data1, "Auto", "#4ec9b0")) {
                checkPoint(data2, "Teleop", "#ff6b6b");
            }
            if (!found) {
                if (tooltip)
                    tooltip.style.display = "none";
                canvas.style.cursor = "default";
            }
        });
        canvas.addEventListener("mouseleave", () => {
            if (tooltip)
                tooltip.style.display = "none";
            canvas.style.cursor = "default";
        });
    }, 0);
    return `
        <div class="line-chart">
            <div class="line-chart-container">
                <canvas id="${chartId}"></canvas>
                <div id="${chartId}-tooltip" class="line-chart-tooltip"></div>
            </div>
            <div class="line-chart-x-axis">${xLabels}</div>
        </div>
    `;
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
    const teamInput = document.getElementById("insights-team-input");
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
        }
        else {
            localStorage.removeItem("token");
            showLogin();
        }
    }
    else {
        showLogin();
    }
});
