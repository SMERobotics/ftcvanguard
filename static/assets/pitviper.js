"use strict";
(() => {
    const BASE_URL = "";
    async function authFetch(url, options = {}) {
        const token = localStorage.getItem("token");
        const headers = new Headers(options.headers || {});
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
        return fetch(`${BASE_URL}${url}`, { ...options, headers });
    }
    let loggedInTeamId = null;
    let currentEventCode = null;
    let currentEventData = null;
    let scheduleOffsetMinutes = 0;
    let events = [];
    let schedule = [];
    let matches = [];
    let teams = [];
    let rankings = [];
    async function verifyToken() {
        const token = localStorage.getItem("token");
        if (!token)
            return false;
        try {
            const response = await authFetch("/api/v1/verify");
            if (response.ok) {
                const data = await response.json();
                loggedInTeamId = data.id;
                return true;
            }
        }
        catch (e) {
            console.error(e);
        }
        return false;
    }
    async function loadEvents() {
        try {
            const res = await authFetch("/api/v1/events");
            if (res.ok) {
                const data = await res.json();
                events = data.events || [];
                const selector = document.getElementById("pv-meet-selector");
                selector.innerHTML = "";
                events.forEach(e => {
                    const opt = document.createElement("option");
                    opt.value = e.eventCode;
                    opt.textContent = e.name;
                    selector.appendChild(opt);
                });
                if (events.length > 0) {
                    currentEventCode = events[0].eventCode;
                    loadEventData();
                }
                selector.addEventListener("change", (e) => {
                    currentEventCode = e.target.value;
                    loadEventData();
                });
            }
        }
        catch (e) {
            console.error(e);
        }
    }
    async function loadEventData() {
        if (!currentEventCode)
            return;
        await Promise.all([
            fetchEvent(),
            fetchSchedule(),
            fetchMatches(),
            fetchTeams(),
            fetchRankings(),
            fetchOffset()
        ]);
        loadStreamFromEvent();
        renderDashboard();
        // Set up auto-refresh
        setInterval(async () => {
            await Promise.all([
                fetchEvent(),
                fetchSchedule(),
                fetchMatches(),
                fetchRankings(),
                fetchOffset()
            ]);
            loadStreamFromEvent();
            renderDashboard();
        }, 60000);
    }
    async function fetchSchedule() {
        const res = await authFetch(`/api/v1/schedule?event=${currentEventCode}`);
        if (res.ok)
            schedule = (await res.json()).schedule || [];
    }
    async function fetchEvent() {
        const res = await authFetch(`/api/v1/event?event=${currentEventCode}`);
        if (res.ok) {
            const data = await res.json();
            currentEventData = data.events && data.events.length > 0 ? data.events[0] : null;
        }
    }
    async function fetchMatches() {
        const res = await authFetch(`/api/v1/matches?event=${currentEventCode}`);
        if (res.ok)
            matches = (await res.json()).matches || [];
    }
    async function fetchTeams() {
        const res = await authFetch(`/api/v1/teams?event=${currentEventCode}`);
        if (res.ok)
            teams = (await res.json()).teams || [];
    }
    async function fetchRankings() {
        const res = await authFetch(`/api/v1/rankings?event=${currentEventCode}`);
        if (res.ok)
            rankings = (await res.json()).rankings || [];
    }
    async function fetchOffset() {
        const res = await authFetch(`/api/v1/schedule/offset?event=${currentEventCode}`);
        if (res.ok) {
            const data = await res.json();
            scheduleOffsetMinutes = data.time_offset_minutes || 0;
        }
    }
    function renderDashboard() {
        document.getElementById("pv-your-team-num").textContent = loggedInTeamId?.toString() || "--";
        // Calculate current match
        const now = new Date();
        now.setMinutes(now.getMinutes() + scheduleOffsetMinutes);
        let currentMatch = null;
        let nextMatchForTeam = null;
        let upcomingMatches = [];
        const sortedSchedule = [...schedule].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        for (const m of sortedSchedule) {
            const mTime = new Date(m.startTime);
            if (mTime <= now) {
                currentMatch = m;
            }
            // Find upcoming matches for our team
            const isOurMatch = m.teams.some((t) => t.teamNumber === loggedInTeamId);
            if (isOurMatch && mTime > now) {
                upcomingMatches.push(m);
                if (!nextMatchForTeam)
                    nextMatchForTeam = m;
            }
        }
        document.getElementById("pv-current-match").textContent = currentMatch ? currentMatch.description : "None";
        document.getElementById("pv-event-progress").textContent = schedule.length ? `${Math.round(((sortedSchedule.indexOf(currentMatch) + 1) / schedule.length) * 100)}%` : "0%";
        // Rankings
        const teamRank = rankings.find(r => r.teamNumber === loggedInTeamId);
        document.getElementById("pv-team-rank").textContent = teamRank ? `${teamRank.rank}` : "--";
        document.getElementById("pv-team-opr").textContent = teamRank ? `${teamRank.opr?.toFixed(1) || "--"}` : "--";
        document.getElementById("pv-team-wlt").textContent = teamRank ? `${teamRank.wins}-${teamRank.losses}-${teamRank.ties}` : "--";
        document.getElementById("pv-team-next-match-num").textContent = nextMatchForTeam ? nextMatchForTeam.description : "None";
        // Top Teams
        const topTeamsList = document.querySelector("#pv-top-teams-table tbody");
        topTeamsList.innerHTML = "";
        [...rankings].sort((a, b) => a.rank - b.rank).slice(0, 5).forEach(r => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td>${r.rank}</td>
            <td>${r.teamNumber}</td>
            <td>${r.opr?.toFixed(1) || "--"}</td>
            <td>${r.wins}-${r.losses}-${r.ties}</td>
        `;
            topTeamsList.appendChild(tr);
        });
        // Upcoming matches list
        const upcomingList = document.getElementById("pv-upcoming-list");
        upcomingList.innerHTML = "";
        upcomingMatches.slice(0, 3).forEach(m => {
            const el = document.createElement("div");
            el.className = `pv-match-item ${m === nextMatchForTeam ? 'pv-next-match' : ''}`;
            const redTeams = m.teams.filter((t) => t.station.startsWith('Red')).map((t) => `<span class="${t.teamNumber === loggedInTeamId ? 'pv-my-team' : ''}">${t.teamNumber}</span>`).join(', ');
            const blueTeams = m.teams.filter((t) => t.station.startsWith('Blue')).map((t) => `<span class="${t.teamNumber === loggedInTeamId ? 'pv-my-team' : ''}">${t.teamNumber}</span>`).join(', ');
            el.innerHTML = `
            <div class="pv-match-details">
                <span class="pv-match-name">${m.description}</span>
                <span class="pv-match-time">${new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="pv-match-alliances">
                <div class="pv-alliance pv-red">${redTeams}</div>
                <div class="pv-alliance pv-blue">${blueTeams}</div>
            </div>
        `;
            upcomingList.appendChild(el);
        });
        if (nextMatchForTeam) {
            loadMatchTeamInfo(nextMatchForTeam);
        }
    }
    function loadMatchTeamInfo(match) {
        const container = document.getElementById("pv-match-teams-info");
        if (!match || !match.teams) {
            container.innerHTML = "<p class=\"pv-empty\">No upcoming match for your team</p>";
            return;
        }
        let html = "<table class=\"pv-table\">";
        html += "<thead><tr><th>Team</th><th>Alliance</th><th>Rank</th><th>OPR</th><th>W-L-T</th></tr></thead>";
        html += "<tbody>";
        match.teams.forEach((t) => {
            if (t.teamNumber !== loggedInTeamId) {
                const teamRank = rankings.find(r => r.teamNumber === t.teamNumber);
                const alliance = t.station.startsWith("Red") ? "Red" : "Blue";
                const allianceClass = alliance === "Red" ? "pv-red-text" : "pv-blue-text";
                html += `<tr>
                <td><strong>${t.teamNumber}</strong></td>
                <td class="${allianceClass}">${alliance}</td>
                <td>${teamRank ? teamRank.rank : "--"}</td>
                <td>${teamRank && teamRank.opr ? teamRank.opr.toFixed(1) : "--"}</td>
                <td>${teamRank ? `${teamRank.wins}-${teamRank.losses}-${teamRank.ties}` : "--"}</td>
            </tr>`;
            }
        });
        html += "</tbody></table>";
        container.innerHTML = html;
    }
    function loadStreamFromEvent() {
        if (!currentEventData || !currentEventData.webcasts || currentEventData.webcasts.length === 0) {
            return;
        }
        const container = document.getElementById("pv-stream-container");
        const webcast = currentEventData.webcasts[0];
        if (webcast.type === "twitch" && webcast.channel) {
            container.innerHTML = `<iframe src="https://player.twitch.tv/?channel=${webcast.channel}&parent=${window.location.hostname}" allowfullscreen></iframe>`;
        }
        else if (webcast.type === "youtube" && webcast.channel) {
            container.innerHTML = `<iframe src="https://www.youtube.com/embed/${webcast.channel}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        }
    }
    document.addEventListener("DOMContentLoaded", async () => {
        if (await verifyToken()) {
            document.getElementById("pitviper-container").style.display = "flex";
            await loadEvents();
        }
        else {
            document.getElementById("pv-login-overlay").style.display = "flex";
        }
    });
})();
