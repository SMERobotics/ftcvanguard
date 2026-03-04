import "clsx";
import { a0 as derived, a1 as ensure_array_like, a2 as attr_class, a as attr, a3 as attr_style } from "../../chunks/index.js";
function Footer($$renderer) {
  $$renderer.push(`<footer class="footer svelte-j8kxtz"></footer>`);
}
function Header($$renderer) {
  $$renderer.push(`<header class="header svelte-83253x"></header>`);
}
function RankingsView($$renderer) {
  $$renderer.push(`<section class="view svelte-yigrd6"><h2 class="svelte-yigrd6">Rankings View</h2> <p class="svelte-yigrd6">Example rankings content goes here.</p></section>`);
}
function ScheduleView($$renderer) {
  $$renderer.push(`<section class="view svelte-1ib4ge4"><h2 class="svelte-1ib4ge4">Schedule View</h2> <p class="svelte-1ib4ge4">Example schedule content goes here.</p></section>`);
}
function AboutView($$renderer) {
  $$renderer.push(`<section class="view svelte-8ssi24"><h2 class="svelte-8ssi24">About View</h2> <p class="svelte-8ssi24">Example about content goes here.</p></section>`);
}
function AdminView($$renderer) {
  $$renderer.push(`<section class="view svelte-19irlzu"><h2 class="svelte-19irlzu">Admin View</h2> <p class="svelte-19irlzu">Example admin content goes here.</p></section>`);
}
function LogoutView($$renderer) {
  $$renderer.push(`<section class="view svelte-ylr97n"><h2 class="svelte-ylr97n">Logout View</h2> <p class="svelte-ylr97n">Example logout content goes here.</p></section>`);
}
function Content($$renderer, $$props) {
  let { selectedView } = $$props;
  const viewComponents = {
    schedule: ScheduleView,
    rankings: RankingsView,
    about: AboutView,
    admin: AdminView,
    logout: LogoutView
  };
  const ActiveView = derived(() => viewComponents[selectedView] ?? ScheduleView);
  $$renderer.push(`<main class="content svelte-18pxct7">`);
  if (ActiveView()) {
    $$renderer.push("<!--[-->");
    ActiveView()($$renderer, {});
    $$renderer.push("<!--]-->");
  } else {
    $$renderer.push("<!--[!-->");
    $$renderer.push("<!--]-->");
  }
  $$renderer.push(`</main>`);
}
const VIEW_DEFINITIONS = [
  { id: "schedule", label: "Schedule" },
  { id: "rankings", label: "Rankings" },
  { id: "about", label: "About" },
  { id: "admin", label: "Admin" },
  { id: "logout", label: "Logout" }
];
function Sidebar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { selectedView } = $$props;
    $$renderer2.push(`<aside class="sidebar svelte-qe711u" id="sidebar"><nav class="nav" aria-label="View selection"><!--[-->`);
    const each_array = ensure_array_like(VIEW_DEFINITIONS);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let view = each_array[$$index];
      $$renderer2.push(`<button type="button"${attr_class("sidebar-button svelte-qe711u", void 0, { "sidebar-active": selectedView === view.id })}${attr("id", `button-${view.id}`)}${attr("aria-pressed", selectedView === view.id)}${attr("title", view.label)}${attr_style(view.id === "admin" ? "display: none;" : "")}>`);
      if (view.id === "schedule") {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="svelte-qe711u"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svelte-qe711u"><g id="SVGRepo_bgCarrier"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path stroke-width="0.1" d="M12,1A11,11,0,1,0,23,12,11.013,11.013,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9.01,9.01,0,0,1,12,21Zm6-9a1,1,0,0,1-1,1H12a1,1,0,0,1-1-1V6a1,1,0,0,1,2,0v5h4A1,1,0,0,1,18,12Z"></path></g></svg></svg>`);
      } else if (view.id === "rankings") {
        $$renderer2.push("<!--[1-->");
        $$renderer2.push(`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="svelte-qe711u"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 2em; height: 2em;" class="svelte-qe711u"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9 7H4.6C4.03995 7 3.75992 7 3.54601 7.10899C3.35785 7.20487 3.20487 7.35785 3.10899 7.54601C3 7.75992 3 8.03995 3 8.6V19.4C3 19.9601 3 20.2401 3.10899 20.454C3.20487 20.6422 3.35785 20.7951 3.54601 20.891C3.75992 21 4.03995 21 4.6 21H9M9 21H15M9 21L9 4.6C9 4.03995 9 3.75992 9.10899 3.54601C9.20487 3.35785 9.35785 3.20487 9.54601 3.10899C9.75992 3 10.0399 3 10.6 3L13.4 3C13.9601 3 14.2401 3 14.454 3.10899C14.6422 3.20487 14.7951 3.35785 14.891 3.54601C15 3.75992 15 4.03995 15 4.6V21M15 11H19.4C19.9601 11 20.2401 11 20.454 11.109C20.6422 11.2049 20.7951 11.3578 20.891 11.546C21 11.7599 21 12.0399 21 12.6V19.4C21 19.9601 21 20.2401 20.891 20.454C20.7951 20.6422 20.6422 20.7951 20.454 20.891C20.2401 21 19.9601 21 19.4 21H15" stroke="#181818" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg></svg>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></button>`);
    }
    $$renderer2.push(`<!--]--></nav></aside>`);
  });
}
function Application($$renderer) {
  let selectedView = "schedule";
  $$renderer.push(`<div class="app svelte-dakbw8">`);
  Header($$renderer);
  $$renderer.push(`<!----> <div class="content-row svelte-dakbw8">`);
  Sidebar($$renderer, {
    selectedView
  });
  $$renderer.push(`<!----> `);
  Content($$renderer, { selectedView });
  $$renderer.push(`<!----></div> `);
  Footer($$renderer);
  $$renderer.push(`<!----></div>`);
}
function _page($$renderer) {
  Application($$renderer);
}
export {
  _page as default
};
