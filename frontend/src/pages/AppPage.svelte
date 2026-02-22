<script lang="ts">
  type EventSummary = { code: string; name?: string }
  type RankingRow = {
    rank: number
    teamNumber: number
    teamNameShort?: string
    rankingScore?: number
    opr?: number
  }

  let teamId = ""
  let password = ""
  let token = ""
  let activeEvent = ""
  let events: EventSummary[] = []
  let rankings: RankingRow[] = []
  let loading = false
  let status = "Sign in to begin."

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: token,
  })

  const login = async (event: SubmitEvent) => {
    event.preventDefault()
    loading = true
    status = "Signing in..."
    try {
      const response = await fetch("/api/v1/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: teamId, password }),
      })
      const payload = await response.json()
      if (!response.ok) {
        status = payload.error || "Login failed."
        return
      }
      token = payload.token
      status = "Loading events..."
      await loadEvents()
    } catch {
      status = "Unable to contact login endpoint."
    } finally {
      loading = false
    }
  }

  const loadEvents = async () => {
    if (!token) {
      return
    }
    const response = await fetch("/api/v1/events", { headers: authHeaders() })
    const payload = await response.json()
    if (!response.ok) {
      status = payload.error || "Failed to load events."
      return
    }
    events = payload.events || []
    if (events.length > 0) {
      activeEvent = events[0].code
      await loadRankings()
    } else {
      status = "No events available for this account."
    }
  }

  const loadRankings = async () => {
    if (!activeEvent || !token) {
      return
    }
    loading = true
    status = `Loading rankings for ${activeEvent}...`
    const response = await fetch(`/api/v1/rankings?event=${activeEvent}`, {
      headers: authHeaders(),
    })
    const payload = await response.json()
    if (!response.ok) {
      status = payload.error || "Failed to load rankings."
      loading = false
      return
    }
    rankings = payload.rankings || []
    status = `Loaded ${rankings.length} ranking rows.`
    loading = false
  }
</script>

<section class="container wrap">
  <div class="card panel">
    <h1>Svelte app shell</h1>
    <p>One-shot port preview using existing Vanguard APIs.</p>

    {#if !token}
      <form class="login" on:submit={login}>
        <label for="login-id">Team ID</label>
        <input id="login-id" bind:value={teamId} placeholder="12345" required />
        <label for="login-password">Password</label>
        <input id="login-password" bind:value={password} type="password" required />
        <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
      </form>
    {:else}
      <div class="toolbar">
        <label for="event-select">Event</label>
        <select id="event-select" bind:value={activeEvent} on:change={loadRankings}>
          {#each events as eventOption}
            <option value={eventOption.code}>{eventOption.code} {eventOption.name ?? ""}</option>
          {/each}
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Name</th>
              <th>Ranking Score</th>
              <th>OPR</th>
            </tr>
          </thead>
          <tbody>
            {#if rankings.length === 0}
              <tr><td colspan="5">No ranking data loaded.</td></tr>
            {:else}
              {#each rankings as row}
                <tr>
                  <td>{row.rank}</td>
                  <td>{row.teamNumber}</td>
                  <td>{row.teamNameShort ?? "-"}</td>
                  <td>{row.rankingScore ?? "-"}</td>
                  <td>{row.opr ?? "-"}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    {/if}

    <p class="status">{status}</p>
  </div>
</section>

<style>
  .wrap {
    padding: 24px 0;
  }

  .panel {
    padding: 20px;
  }

  h1 {
    margin: 0 0 6px;
    color: #ffffff;
    font-size: 1.35rem;
  }

  p {
    margin-top: 0;
    color: #a6a6a6;
  }

  .login {
    display: grid;
    gap: 10px;
    max-width: 380px;
  }

  input,
  select {
    border: 1px solid #3c3c3c;
    background: #252526;
    color: #ffffff;
    padding: 10px;
    border-radius: 8px;
  }

  button {
    border: 1px solid #3d3d3d;
    background: #232323;
    color: #ffffff;
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
  }

  .toolbar {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 16px;
  }

  .table-wrap {
    border: 1px solid #333333;
    border-radius: 10px;
    overflow: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 620px;
  }

  th,
  td {
    text-align: left;
    padding: 10px;
    border-bottom: 1px solid #2e2e2e;
    font-size: 0.84rem;
  }

  th {
    color: #ffffff;
    background: #202020;
  }

  .status {
    margin-top: 14px;
    font-size: 0.82rem;
    color: #8f8f8f;
  }
</style>
