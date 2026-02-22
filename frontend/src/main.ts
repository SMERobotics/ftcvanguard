import { mount } from "svelte"
import "./app.css"
import App from "./App.svelte"

const bodyPage = document.body.dataset.page
const pathPage = window.location.pathname === "/app" ? "app" : window.location.pathname === "/register" ? "register" : "index"
const page = (bodyPage ?? pathPage) as "index" | "app" | "register"

const app = mount(App, {
  target: document.getElementById("app")!,
  props: { page },
})

export default app
