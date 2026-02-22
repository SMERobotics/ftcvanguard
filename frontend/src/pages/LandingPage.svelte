<section class="hero container">
  <div class="hero-copy">
    <p class="eyebrow">CENTRALIZED FTC COMMAND CENTER</p>
    <h1>Live intel. Fast decisions. Cleaner match strategy.</h1>
    <p>
      Vanguard unifies schedule monitoring, rankings analysis, scouting notes, and registration in one focused interface.
    </p>
    <div class="actions">
      <a class="primary" href="/app">Open App</a>
      <a class="secondary" href="/register">Register Team</a>
    </div>
  </div>
  <div class="hero-panel card">
    <h2>What is included</h2>
    <ul>
      <li>Event schedule and match-state visibility</li>
      <li>Rankings, team drill-downs, and strategic snapshots</li>
      <li>Scouting notes and lightweight collaboration</li>
      <li>Admin workflows and registration review APIs</li>
    </ul>
  </div>
</section>

<style>
  .hero {
    min-height: calc(100vh - 66px);
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 24px;
    align-items: center;
    padding: 32px 0;
  }

  .eyebrow {
    font-size: 0.78rem;
    letter-spacing: 0.14em;
    color: #7f7f7f;
  }

  h1 {
    margin: 12px 0 16px;
    color: #ffffff;
    line-height: 1.2;
    font-size: clamp(1.75rem, 4vw, 2.55rem);
  }

  p {
    color: #adadad;
  }

  .actions {
    margin-top: 24px;
    display: flex;
    gap: 12px;
  }

  .actions a {
    text-decoration: none;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid #3d3d3d;
    font-size: 0.85rem;
  }

  .actions .primary {
    color: #ffffff;
    background: #232323;
  }

  .actions .secondary {
    color: #bdbdbd;
  }

  .hero-panel {
    padding: 20px;
  }

  h2 {
    color: #ffffff;
    font-size: 1rem;
    margin-top: 0;
  }

  ul {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 12px;
    color: #a6a6a6;
  }

  @media (max-width: 900px) {
    .hero {
      grid-template-columns: 1fr;
    }
  }
</style>
