// Which canvas shows the game? Usage: node tools/rt/canvases.mjs
import { page } from './lib.mjs';
console.log(JSON.stringify(page(`const out = [...document.querySelectorAll('canvas')].map((c, i) => { const r = c.getBoundingClientRect(); const s = getComputedStyle(c);
  return { i, id: c.id, cls: String(c.className).slice(0, 40), w: c.width, h: c.height, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], parent: c.parentElement && (c.parentElement.id || c.parentElement.tagName), z: s.zIndex, disp: s.display, vis: s.visibility }; });
  const g = __rz.world.renderer.domElement; return { n: out.length, out, rendererCanvasIndex: [...document.querySelectorAll('canvas')].indexOf(g), xrSession: !!__rz.world.session, bodyChildren: [...document.body.children].map((e) => e.tagName + '#' + e.id).slice(0, 12) }`), null, 1));
