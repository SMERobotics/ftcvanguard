import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.BsS0pM8Z.js","_app/immutable/chunks/BgcL6Ro-.js","_app/immutable/chunks/DPRdPi5B.js","_app/immutable/chunks/UcV5EWnq.js","_app/immutable/chunks/9ixqr08_.js"];
export const stylesheets = ["_app/immutable/assets/0.DGrMbUvQ.css"];
export const fonts = [];
