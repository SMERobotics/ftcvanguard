<script lang="ts">
  let teamId = ""
  let password = ""
  let registering = false
  let message = ""
  let error = false

  const register = async (event: SubmitEvent) => {
    event.preventDefault()
    registering = true
    error = false
    message = ""

    try {
      const response = await fetch("/api/v1/uaregister", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: teamId, password }),
      })
      const payload = await response.json()
      error = !response.ok
      message = payload.error || payload.status || (response.ok ? "Registration submitted." : "Registration failed.")
      if (response.ok) {
        teamId = ""
        password = ""
      }
    } catch {
      error = true
      message = "Unable to reach registration endpoint."
    } finally {
      registering = false
    }
  }
</script>

<section class="container register-wrap">
  <div class="content">
    <h1>Register your FTC team</h1>
    <p>Request access for scouting and live event workflows.</p>
    <form class="card form" on:submit={register}>
      <label for="team-id">Team ID</label>
      <input id="team-id" bind:value={teamId} placeholder="12345" inputmode="numeric" required />

      <label for="password">Password</label>
      <input id="password" bind:value={password} type="password" minlength="8" required />

      <button type="submit" disabled={registering}>{registering ? "Submitting..." : "Submit"}</button>
      {#if message}
        <p class:error>{message}</p>
      {/if}
    </form>
  </div>
</section>

<style>
  .register-wrap {
    padding: 40px 0;
  }

  .content {
    max-width: 560px;
  }

  h1 {
    color: #ffffff;
    margin-bottom: 8px;
  }

  p {
    color: #a6a6a6;
  }

  .form {
    margin-top: 20px;
    display: grid;
    gap: 10px;
    padding: 20px;
  }

  label {
    font-size: 0.82rem;
    color: #d0d0d0;
  }

  input {
    border: 1px solid #3c3c3c;
    background: #252526;
    color: #ffffff;
    padding: 10px;
    border-radius: 8px;
  }

  button {
    margin-top: 8px;
    border: 1px solid #3d3d3d;
    background: #232323;
    color: #ffffff;
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
  }

  .error {
    color: #ff8787;
  }
</style>
