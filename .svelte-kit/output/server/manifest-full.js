export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["assets/favicon.ico","assets/icon.png","assets/pitviper.css","assets/pitviper.js","assets/pitviper.ts","landing.html","pitviper.html"]),
	mimeTypes: {".png":"image/png",".css":"text/css",".js":"text/javascript",".ts":"video/mp2t",".html":"text/html"},
	_: {
		client: {start:"_app/immutable/entry/start.CKpFtRMT.js",app:"_app/immutable/entry/app.BFW7GXCW.js",imports:["_app/immutable/entry/start.CKpFtRMT.js","_app/immutable/chunks/D0Yc41QG.js","_app/immutable/chunks/DPRdPi5B.js","_app/immutable/chunks/DGxQTmk2.js","_app/immutable/entry/app.BFW7GXCW.js","_app/immutable/chunks/DPRdPi5B.js","_app/immutable/chunks/BTtBXQmR.js","_app/immutable/chunks/D-966yEw.js","_app/immutable/chunks/BgcL6Ro-.js","_app/immutable/chunks/DGxQTmk2.js","_app/immutable/chunks/BF9OdkrU.js","_app/immutable/chunks/UcV5EWnq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
