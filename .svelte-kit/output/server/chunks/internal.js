import { r as root } from "./root.js";
import "./environment.js";
let public_env = {};
function set_private_env(environment) {
}
function set_public_env(environment) {
  public_env = environment;
}
let read_implementation = null;
function set_read_implementation(fn) {
  read_implementation = fn;
}
function set_manifest(_) {
}
const options = {
  app_template_contains_nonce: false,
  async: false,
  csp: { "mode": "auto", "directives": { "upgrade-insecure-requests": false, "block-all-mixed-content": false }, "reportOnly": { "upgrade-insecure-requests": false, "block-all-mixed-content": false } },
  csrf_check_origin: true,
  csrf_trusted_origins: [],
  embedded: false,
  env_public_prefix: "PUBLIC_",
  env_private_prefix: "",
  hash_routing: false,
  hooks: null,
  // added lazily, via `get_hooks`
  preload_strategy: "modulepreload",
  root,
  service_worker: false,
  service_worker_options: void 0,
  templates: {
    app: ({ head, body, assets, nonce, env }) => '<!doctype html>\n<html lang="en">\n	<head>\n        <meta charset="UTF-8">\n        <title>Vanguard</title>\n        \n        <meta name="description" content="The GP Palantir of FTC. A centralized command center providing streamlined, real-time match data and rapid strategic insights for FTC teams.">\n        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">\n        <meta name="theme-color" content="#181818">\n        <meta name="apple-mobile-web-app-capable" content="yes">\n        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n        <meta name="apple-mobile-web-app-title" content="Vanguard">\n        <meta name="mobile-web-app-capable" content="yes">\n        <meta name="application-name" content="Vanguard">\n        \n        <!-- SEO Meta Tags -->\n        <meta name="keywords" content="FTC, FIRST Tech Challenge, robotics, scouting, match tracking, performance analytics, FTC scouting app, robotics competition, FTC teams, FTC rankings, FTC schedule, OPR, FIRST robotics, FTC strategy, robot scouting, competition analytics">\n        <meta name="author" content="Vanguard">\n        <meta name="robots" content="index, follow">\n        <link rel="canonical" href="https://ftcvanguard.org/app">\n        \n        <!-- Open Graph / Facebook -->\n        <meta property="og:type" content="website">\n        <meta property="og:url" content="https://ftcvanguard.org/app">\n        <meta property="og:title" content="Vanguard - FTC Scouting Dashboard">\n        <meta property="og:description" content="The GP Palantir of FTC. A centralized command center providing streamlined, real-time match data and rapid strategic insights for FTC teams.">\n\n        <meta property="og:site_name" content="Vanguard">\n        \n        <!-- Twitter -->\n        <meta name="twitter:card" content="summary_large_image">\n        <meta name="twitter:title" content="Vanguard - FTC Scouting Dashboard">\n        <meta name="twitter:description" content="The GP Palantir of FTC. A centralized command center providing streamlined, real-time match data and rapid strategic insights for FTC teams.">\n        \n        <script src="https://cdn.jsdelivr.net/npm/chart.js/dist/chart.umd.min.js"><\/script>\n\n		' + head + '\n	</head>\n	<body data-sveltekit-preload-data="hover">\n		<div style="display: contents">' + body + "</div>\n	</body>\n</html>\n",
    error: ({ status, message }) => '<!doctype html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<title>' + message + `</title>

		<style>
			body {
				--bg: white;
				--fg: #222;
				--divider: #ccc;
				background: var(--bg);
				color: var(--fg);
				font-family:
					system-ui,
					-apple-system,
					BlinkMacSystemFont,
					'Segoe UI',
					Roboto,
					Oxygen,
					Ubuntu,
					Cantarell,
					'Open Sans',
					'Helvetica Neue',
					sans-serif;
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100vh;
				margin: 0;
			}

			.error {
				display: flex;
				align-items: center;
				max-width: 32rem;
				margin: 0 1rem;
			}

			.status {
				font-weight: 200;
				font-size: 3rem;
				line-height: 1;
				position: relative;
				top: -0.05rem;
			}

			.message {
				border-left: 1px solid var(--divider);
				padding: 0 0 0 1rem;
				margin: 0 0 0 1rem;
				min-height: 2.5rem;
				display: flex;
				align-items: center;
			}

			.message h1 {
				font-weight: 400;
				font-size: 1em;
				margin: 0;
			}

			@media (prefers-color-scheme: dark) {
				body {
					--bg: #222;
					--fg: #ddd;
					--divider: #666;
				}
			}
		</style>
	</head>
	<body>
		<div class="error">
			<span class="status">` + status + '</span>\n			<div class="message">\n				<h1>' + message + "</h1>\n			</div>\n		</div>\n	</body>\n</html>\n"
  },
  version_hash: "13rn25a"
};
async function get_hooks() {
  let handle;
  let handleFetch;
  let handleError;
  let handleValidationError;
  let init;
  let reroute;
  let transport;
  return {
    handle,
    handleFetch,
    handleError,
    handleValidationError,
    init,
    reroute,
    transport
  };
}
export {
  set_public_env as a,
  set_read_implementation as b,
  set_manifest as c,
  get_hooks as g,
  options as o,
  public_env as p,
  read_implementation as r,
  set_private_env as s
};
