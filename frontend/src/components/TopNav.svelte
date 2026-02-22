<script lang="ts">
  export let active: "index" | "app" | "register"
</script>

<header class="header">
  <div class="container header-inner">
    <a class="logo" href="/">Vanguard</a>
    <nav>
      <a class:active={active === "index"} href="/">Home</a>
      <a class:active={active === "app"} href="/app">App</a>
      <a class:active={active === "register"} href="/register">Register</a>
    </nav>
  </div>
</header>

<style>
  .header {
    border-bottom: 1px solid #2a2a2a;
    background: #181818;
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .header-inner {
    min-height: 66px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    color: #ffffff;
    text-decoration: none;
    font-size: 1.15rem;
    font-weight: 700;
  }

  nav {
    display: flex;
    gap: 16px;
  }

  nav a {
    text-decoration: none;
    color: #9c9c9c;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid transparent;
    font-size: 0.88rem;
  }

  nav a.active {
    color: #ffffff;
    border-color: #3d3d3d;
    background: #212121;
  }
</style>
