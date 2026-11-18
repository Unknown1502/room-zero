// The architectural kit: procedural textures, shared materials and wall, frame and prop builders.
// Everything is generated in code, so the chapter ships no model or texture files. Presentation only.
import {
  BoxGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, Path, PlaneGeometry, RepeatWrapping, SRGBColorSpace, Shape, ShapeGeometry, TorusGeometry, Vector2,
  type BufferGeometry, type Material, type Object3D, type Texture,
} from '@iwsdk/core';
import type { Profile } from '../domain/types.js';

// Palette: docs/03-art-and-audio/art-direction-bible.md section 5.
export const C = {
  void: 0x0b0e13, moon: 0x8fa3b8, plaster: 0xc9c2b3, sage: 0x6f7662, ochre: 0x9a8558, wood: 0x3a2a1e,
  brassDull: 0x7a6233, brassLit: 0xd9a441, lamp: 0xffb45a, fabric: 0x3b1f22, postal: 0x56657a, paper: 0xe9dfc8,
  chalk: 0xedeae2, ash: 0x8a8a86, iron: 0x1d1f22,
};

/** Deterministic noise so that textures are the same on every run. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed: number): Texture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d')!, rng(seed));
  const t = new CanvasTexture(cv);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
function speckle(g: CanvasRenderingContext2D, r: () => number, n: number, dark: string, light: string, max = 3): void {
  for (let i = 0; i < n; i++) {
    g.fillStyle = r() < 0.5 ? dark : light;
    g.globalAlpha = 0.03 + r() * 0.07;
    g.fillRect(r() * 256, r() * 256, 1 + r() * max, 1 + r() * max);
  }
  g.globalAlpha = 1;
}

const tex = {
  wood: () => canvasTexture(256, (g, r) => {
    g.fillStyle = hex(C.wood); g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 64) { g.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.2})`; g.fillRect(x, 0, 2, 256); }
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = r() < 0.5 ? 'rgba(20,12,8,0.35)' : 'rgba(110,80,55,0.18)';
      g.lineWidth = 0.5 + r();
      const x = r() * 256; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + r() * 6 - 3, 90, x + r() * 6 - 3, 170, x + r() * 4 - 2, 256); g.stroke();
    }
  }, 11),
  /** Wall: 16 m tall. Wallpaper below the dado at 3.2 m, plaster above, grime rising from the skirting. */
  wall: () => canvasTexture(512, (g, r) => {
    g.fillStyle = hex(C.plaster); g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(60,55,45,0.05)' : 'rgba(255,250,240,0.05)'; g.fillRect(r() * 512, r() * 512, 2 + r() * 10, 2 + r() * 6); }
    for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(40,35,30,0.25)'; g.lineWidth = 0.6; let x = r() * 512, y = r() * 380; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += r() * 24 - 12; y += r() * 26; g.lineTo(x, y); } g.stroke(); }
    const top = 512 - 512 * (3.2 / 16);
    g.fillStyle = hex(C.sage); g.fillRect(0, top, 512, 512 - top);
    g.fillStyle = hex(C.ochre); g.globalAlpha = 0.55;
    for (let y = top + 10; y < 512; y += 34) for (let x = (Math.round((y - top) / 34) % 2) * 32; x < 512; x += 64) { g.beginPath(); g.moveTo(x + 12, y); g.lineTo(x + 22, y + 12); g.lineTo(x + 12, y + 24); g.lineTo(x + 2, y + 12); g.closePath(); g.fill(); g.fillRect(x + 11, y + 24, 2, 8); }
    g.globalAlpha = 1;
    g.fillStyle = hex(C.wood); g.fillRect(0, top - 5, 512, 7);
    const grime = g.createLinearGradient(0, 512, 0, top - 40);
    grime.addColorStop(0, 'rgba(15,12,10,0.6)'); grime.addColorStop(1, 'rgba(15,12,10,0)');
    g.fillStyle = grime; g.fillRect(0, top - 40, 512, 552 - top);
  }, 23),
  tile: () => canvasTexture(256, (g, r) => {
    g.fillStyle = '#5b5348'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = (x + y) % 2 ? '#8c7f68' : '#3c3530'; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
      g.fillStyle = (x + y) % 2 ? '#3c3530' : '#7a6d58'; g.beginPath(); g.moveTo(x * 64 + 32, y * 64 + 14); g.lineTo(x * 64 + 50, y * 64 + 32); g.lineTo(x * 64 + 32, y * 64 + 50); g.lineTo(x * 64 + 14, y * 64 + 32); g.fill();
    }
    speckle(g, r, 900, '#000', '#fff');
  }, 31),
  plain: (base: number, seed: number) => canvasTexture(128, (g, r) => { g.fillStyle = hex(base); g.fillRect(0, 0, 128, 128); speckle(g, r, 500, '#000', '#fff', 6); }, seed),
};

export type MatName = 'wood' | 'wall' | 'tile' | 'brass' | 'handBrass' | 'iron' | 'fabric' | 'lath' | 'paper' | 'plaster' | 'dark' | 'glass' | 'lampGlass' | 'postal' | 'warmWood' | 'quilt';
const mats = new Map<string, Material>();

/** Shared materials. One instance each; never disposed by a room. */
export function mat(name: MatName): MeshStandardMaterial {
  let m = mats.get(name) as MeshStandardMaterial | undefined;
  if (m) return m;
  switch (name) {
    case 'wood': { const t = tex.wood(); t.repeat.set(0.4, 0.4); m = new MeshStandardMaterial({ map: t, roughness: 0.75 }); break; }
    case 'warmWood': m = new MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.7 }); break;
    case 'wall': { const t = tex.wall(); t.repeat.set(1 / 6, 1 / 16); m = new MeshStandardMaterial({ map: t, roughness: 0.95, side: DoubleSide }); break; }
    case 'tile': { const t = tex.tile(); t.repeat.set(0.25, 0.25); m = new MeshStandardMaterial({ map: t, roughness: 0.6 }); break; }
    case 'brass': m = new MeshStandardMaterial({ color: C.brassDull, roughness: 0.45, metalness: 0.85 }); break;
    case 'handBrass': m = new MeshStandardMaterial({ color: 0x9a7a3a, roughness: 0.35, metalness: 0.9, emissive: C.brassLit, emissiveIntensity: 0.12 }); break;
    case 'iron': m = new MeshStandardMaterial({ color: C.iron, roughness: 0.7, metalness: 0.6 }); break;
    case 'fabric': m = new MeshStandardMaterial({ map: tex.plain(C.fabric, 5), roughness: 1 }); break;
    case 'lath': m = new MeshStandardMaterial({ map: tex.plain(0x6b5a44, 7), roughness: 1, side: DoubleSide }); break;
    case 'paper': m = new MeshStandardMaterial({ color: C.paper, roughness: 0.9 }); break;
    case 'plaster': m = new MeshStandardMaterial({ map: tex.plain(C.plaster, 9), roughness: 0.95 }); break;
    case 'dark': m = new MeshStandardMaterial({ color: 0x0d0f12, roughness: 1, side: DoubleSide }); break;
    case 'glass': m = new MeshStandardMaterial({ color: 0x6f8291, roughness: 0.2, transparent: true, opacity: 0.22, side: DoubleSide, depthWrite: false }); break;
    case 'lampGlass': m = new MeshStandardMaterial({ color: 0x33200a, emissive: C.lamp, emissiveIntensity: 1.6, roughness: 0.4 }); break;
    case 'postal': m = new MeshStandardMaterial({ color: C.postal, roughness: 0.8 }); break;
    case 'quilt': m = new MeshStandardMaterial({ map: tex.plain(0x7a4a3a, 13), roughness: 1 }); break;
  }
  mats.set(name, m!);
  return m!;
}

const tints = new Map<string, MeshStandardMaterial>();
/** A room's own colour on a shared material: the same texture with a different tint. One clone per material and tint. */
export function tinted(name: MatName, hex: number): MeshStandardMaterial {
  const key = `${name}:${hex}`;
  let m = tints.get(key);
  if (!m) { m = mat(name).clone(); m.color.multiply(new Color(hex)); tints.set(key, m); }
  return m;
}

export function emissive(color: number, intensity = 1): MeshBasicMaterial {
  const c = new Color(color).multiplyScalar(intensity);
  return new MeshBasicMaterial({ color: c, fog: false });
}

export function box(w: number, h: number, d: number, material: Material, x = 0, y = 0, z = 0): Mesh {
  const m = new Mesh(new BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
}
export function cyl(r: number, h: number, material: Material, x = 0, y = 0, z = 0, seg = 12): Mesh {
  const m = new Mesh(new CylinderGeometry(r, r, h, seg), material);
  m.position.set(x, y, z);
  return m;
}

// ---- doorways -----------------------------------------------------------------------------------
/** Door openings by profile, at house scale except the round one, which is courier scale. */
export const DOOR = {
  arched: { w: 2.7, h: 6.3 },
  square: { w: 3.0, h: 5.2 },
  round: { w: 1.0, h: 1.0, lift: 0.35 },
};

/** The outline of a door opening in wall coordinates: x across, y up from the floor. */
export function doorPath(profile: Profile, cx: number, grow = 0): Path {
  const p = new Path();
  if (profile === 'round') {
    const r = DOOR.round.w / 2 + grow;
    p.absarc(cx, DOOR.round.lift + DOOR.round.w / 2, r, 0, Math.PI * 2, false);
    return p;
  }
  const w = (profile === 'arched' ? DOOR.arched.w : DOOR.square.w) / 2 + grow;
  const h = (profile === 'arched' ? DOOR.arched.h : DOOR.square.h) + grow;
  p.moveTo(cx - w, 0);
  if (profile === 'arched') {
    p.lineTo(cx - w, h - w);
    p.absarc(cx, h - w, w, Math.PI, 0, true);
    p.lineTo(cx + w, 0);
  } else {
    p.lineTo(cx - w, h);
    p.lineTo(cx + w, h);
    p.lineTo(cx + w, 0);
  }
  p.closePath();
  return p;
}

export interface Opening { profile: Profile; at: number; y?: number }

/** A wall of width w and height h in its own XY plane, centred on x, with door openings cut through it. */
export function wall(w: number, h: number, openings: Opening[] = [], material: Material = mat('wall')): Mesh {
  const s = new Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath();
  for (const o of openings) s.holes.push(new Path(doorPath(o.profile, o.at).getPoints(20).map((p) => new Vector2(p.x, p.y + (o.y ?? 0)))));
  const m = new Mesh(new ShapeGeometry(s, 12), material);
  m.receiveShadow = false;
  return m;
}

/** The brass seam plate round a doorway, and the threshold plate in its sill. Faces +Z of the wall. */
export function doorFrame(profile: Profile): Group {
  const g = new Group();
  const outer = new Shape(doorPath(profile, 0, profile === 'round' ? 0.09 : 0.22).getPoints(24));
  outer.holes.push(new Path(doorPath(profile, 0, 0).getPoints(24)));
  const geo: BufferGeometry = new ExtrudeGeometry(outer, { depth: profile === 'round' ? 0.08 : 0.24, bevelEnabled: false, curveSegments: 16 });
  const frame = new Mesh(geo, mat('brass'));
  frame.position.z = profile === 'round' ? -0.04 : -0.12;
  g.add(frame);
  if (profile !== 'round') {
    const w = profile === 'arched' ? DOOR.arched.w : DOOR.square.w;
    const sill = box(w, 0.05, 0.5, mat('brass'), 0, 0.025, 0);
    g.add(sill);
    // The threshold plate carries the profile's own shape, so it can be read from above: REQ-A11Y-005.
    const mark = profile === 'arched' ? new Mesh(new TorusGeometry(0.35, 0.05, 6, 16, Math.PI), mat('handBrass')) : box(0.7, 0.04, 0.7, mat('handBrass'));
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(0, 0.06, 0);
    g.add(mark);
  }
  return g;
}

/** The line of warm light round a doorway that will connect or is connected. */
export function doorGlow(profile: Profile): Mesh {
  const outer = new Shape(doorPath(profile, 0, profile === 'round' ? 0.05 : 0.1).getPoints(24));
  outer.holes.push(new Path(doorPath(profile, 0, -0.02).getPoints(24)));
  const m = new Mesh(new ShapeGeometry(outer, 16), new MeshBasicMaterial({ color: C.lamp, transparent: true, opacity: 0, fog: false, side: DoubleSide, depthWrite: false }));
  m.renderOrder = 2;
  return m;
}

// ---- props --------------------------------------------------------------------------------------
/** A wall lamp: bracket, mantle and glass. `lit` lamps glow; most in the house are out. */
export function wallLamp(lit: boolean, scale = 1): Group {
  const g = new Group();
  g.add(box(0.12 * scale, 0.5 * scale, 0.12 * scale, mat('brass'), 0, 0, 0.06 * scale));
  g.add(box(0.08 * scale, 0.08 * scale, 0.5 * scale, mat('brass'), 0, 0.2 * scale, 0.3 * scale));
  const glass = cyl(0.16 * scale, 0.42 * scale, lit ? mat('lampGlass') : mat('glass'), 0, 0.45 * scale, 0.5 * scale, 10);
  g.add(glass);
  return g;
}

/** Skirting, dado rail and cornice along one wall of width w. */
export function trim(w: number, h: number): Group {
  const g = new Group();
  g.add(box(w, 0.9, 0.12, mat('wood'), 0, 0.45, 0.06));
  g.add(box(w, 0.16, 0.14, mat('wood'), 0, 3.2, 0.07));
  g.add(box(w, 0.5, 0.4, mat('plaster'), 0, h - 0.25, 0.2));
  return g;
}

export function plane(w: number, d: number, material: Material, y = 0): Mesh {
  const m = new Mesh(new PlaneGeometry(w, d), material);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  return m;
}

/** Text drawn to a texture. No font file ships: REQ-ART-001. */
export function textTexture(lines: { text: string; size: number; y: number; color?: string; font?: string; align?: CanvasTextAlign; x?: number }[], w = 512, h = 512, bg?: string): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d')!;
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  for (const l of lines) {
    g.font = `${l.size}px ${l.font ?? 'Georgia, "Times New Roman", serif'}`;
    g.fillStyle = l.color ?? '#3a2412';
    g.textAlign = l.align ?? 'center';
    g.fillText(l.text, l.x ?? w / 2, l.y);
  }
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function setShadowless(o: Object3D): void {
  o.traverse((c) => { c.castShadow = false; c.receiveShadow = false; });
}
