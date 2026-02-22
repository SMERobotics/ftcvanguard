<script lang="ts">
  import TopNav from "./components/TopNav.svelte"
  import LandingPage from "./pages/LandingPage.svelte"
  import AppPage from "./pages/AppPage.svelte"
  import RegisterPage from "./pages/RegisterPage.svelte"

  export let page: "index" | "app" | "register"
</script>

<TopNav active={page} />

{#if page === "register"}
  <RegisterPage />
{:else if page === "app"}
  <AppPage />
{:else}
  <LandingPage />
{/if}
