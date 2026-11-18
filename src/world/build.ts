// Builds the house from the chapter content: one Group per module, in module coordinates.
// Socket positions come from the same data the rules use, so drawing and rules cannot disagree.
import {
  CircleGeometry, CylinderGeometry, DoubleSide, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PointLight,
  RingGeometry, SphereGeometry, TorusGeometry, Vector3, type Object3D,
} from '@iwsdk/core';
import type { ChapterContent, ModuleDef, SocketDef } from '../domain/types.js';
import { C, DOOR, box, cyl, doorFrame, doorGlow, emissive, mat, plane, textTexture, tinted, trim, wall, wallLamp, type Opening } from './kit.js';
import { mergeStatic } from './merge.js';

export interface Built {
  modules: Map<string, Group>;
  glows: Map<string, Mesh>;
  /** Things the view animates. */
  fanlight: Mesh;
  officeLamp: Mesh;
  voidRooms: InstancedMesh;
  statics: Group;
  zeroLight: PointLight;
  pigeonhole: Object3D;
  card: Mesh;
  titleCard: Mesh;
}

type Side = 'n' | 's' | 'e' | 'w';
const sideOf = (s: SocketDef): Side => (s.nz < 0 ? 'n' : s.nz > 0 ? 's' : s.nx > 0 ? 'e' : 'w');
const alongWall = (s: SocketDef, side: Side) => (side === 'n' ? s.x : side === 's' ? -s.x : side === 'e' ? s.z : -s.z);
const YAW: Record<Side, number> = { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };

interface ShellOpts { floor?: 'wood' | 'tile' | 'warmWood' | 'none'; ceiling?: boolean; skip?: Side[]; trimless?: boolean; wallMat?: 'wall' | 'plaster' | 'lath' | 'iron' | 'glass' }

/** Floor, ceiling and four walls with a doorway cut for every socket; brass frames and glow rings at each. */
function shell(m: ModuleDef, glows: Map<string, Mesh>, o: ShellOpts = {}): Group {
  const g = new Group();
  const { w, d, h } = m.size;
  if (o.floor !== 'none') g.add(plane(w, d, mat(o.floor ?? 'wood'), 0.001));
  if (o.ceiling !== false) g.add(plane(w, d, mat('dark'), h));
  for (const side of ['n', 's', 'e', 'w'] as Side[]) {
    const len = side === 'n' || side === 's' ? w : d;
    const pos = side === 'n' ? [0, -d / 2] : side === 's' ? [0, d / 2] : side === 'e' ? [w / 2, 0] : [-w / 2, 0];
    const socks = m.sockets.filter((s) => sideOf(s) === side);
    if (!o.skip?.includes(side)) {
      const openings: Opening[] = socks.map((s) => ({ profile: s.profile, at: alongWall(s, side), y: s.y }));
      const wl = wall(len, h, openings, mat(o.wallMat ?? 'wall'));
      wl.position.set(pos[0], 0, pos[1]);
      wl.rotation.y = YAW[side];
      g.add(wl);
      if (!o.trimless) { const t = trim(len, h); t.position.copy(wl.position); t.rotation.y = YAW[side]; g.add(t); }
    }
    for (const s of socks) addDoor(g, s, glows);
  }
  return g;
}

function addDoor(g: Group, s: SocketDef, glows: Map<string, Mesh>): void {
  const yaw = Math.atan2(s.nx, s.nz);
  const f = doorFrame(s.profile);
  f.position.set(s.x, s.y, s.z); f.rotation.y = yaw;
  g.add(f);
  const glow = doorGlow(s.profile);
  glow.position.set(s.x - s.nx * 0.16, s.y, s.z - s.nz * 0.16); glow.rotation.y = yaw;
  g.add(glow);  glows.set(s.id, glow);
}

function numberedDoor(n: number): Group {
  const g = new Group();
  g.add(box(2.4, 5.6, 0.12, mat('wood'), 0, 2.8, 0.06));
  g.add(box(2.8, 0.3, 0.2, mat('wood'), 0, 5.75, 0.1));
  const plate = new Mesh(new CircleGeometry(0.28, 20), new MeshBasicMaterial({ map: textTexture([{ text: String(n), size: 150, y: 180, color: '#2a1c0c' }], 256, 256, '#a8873f') }));
  plate.position.set(0, 4.3, 0.13);
  g.add(plate, cyl(0.09, 0.3, mat('brass'), 0.85, 3.0, 0.2, 8));
  return g;
}

function corridor(m: ModuleDef, glows: Map<string, Mesh>, firstNumber: number, lit: number[]): Group {
  const g = shell(m, glows);
  const { w, d } = m.size;
  g.add(plane(w - 1, 1.8, mat('fabric'), 0.012));
  let n = firstNumber;
  for (let x = -w / 2 + 2.75; x < w / 2 - 1; x += 5.5) {
    for (const sgn of [-1, 1]) {
      if (m.sockets.some((s) => Math.abs(s.x - x) < 3 && Math.sign(s.nz) === sgn)) continue;
      const door = numberedDoor(n++);
      door.position.set(x, 0, sgn * (d / 2 - 0.01)); door.rotation.y = sgn > 0 ? Math.PI : 0;
      g.add(door);
    }
    const lamp = wallLamp(lit.includes(Math.round(x)), 1.4);
    lamp.position.set(x + 2.75, 4.6, -d / 2 + 0.02);
    g.add(lamp);
  }
  return g;
}

export function buildHouse(content: ChapterContent): Built {
  const modules = new Map<string, Group>();
  const glows = new Map<string, Mesh>();
  const M = (id: string) => content.modules.find((x) => x.id === id)!;
  const put = (id: string, g: Group) => { g.name = id; modules.set(id, g); return g; };

  // ---- Entrance Hall: the widest, tallest room. Tile, a doormat, a letter plate four metres up.
  {
    const g = put('foyer', shell(M('foyer'), glows, { floor: 'tile' }));
    g.add(plane(3.4, 2.2, mat('fabric'), 0.02).translateX(0).translateZ(-4)); // doormat (plane is rotated: local Z is world -Y)
    g.children[g.children.length - 1].position.set(0, 0.02, 4.4);
    g.add(box(4.2, 8.6, 0.3, mat('wood'), 0, 4.3, 7.85), box(1.3, 0.28, 0.1, mat('brass'), 0, 4.0, 7.66)); // front door, letter plate
    const fan = new Mesh(new CircleGeometry(2.1, 24, 0, Math.PI), emissive(C.moon, 0.9));
    fan.position.set(0, 8.7, 7.9); fan.rotation.y = Math.PI; g.add(fan);
    const pool = plane(4.2, 6, new MeshBasicMaterial({ color: C.moon, transparent: true, opacity: 0.1, depthWrite: false }), 0.03);
    pool.position.z = 2.5; g.add(pool);
    g.add(box(5.5, 0.35, 1.6, mat('wood'), -4.9, 3.6, 3), box(0.3, 3.6, 0.3, mat('wood'), -6.9, 1.8, 2.4), box(0.3, 3.6, 0.3, mat('wood'), -2.9, 1.8, 2.4), box(0.3, 3.6, 0.3, mat('wood'), -6.9, 1.8, 3.6), box(0.3, 3.6, 0.3, mat('wood'), -2.9, 1.8, 3.6)); // console table
    g.add(cyl(0.35, 3.2, mat('brass'), 5.6, 1.6, 5.5, 10), cyl(0.9, 0.2, mat('brass'), 5.6, 0.1, 5.5, 12)); // umbrella stand
    // Cast-iron radiators: two banks with brass caps and bands, so they read as radiators and not as black slabs (visual QA).
    for (const z of [-2, -3.2]) {
      g.add(box(0.5, 4.4, 0.25, mat('iron'), 6.85, 2.4, z), box(0.58, 0.14, 0.33, mat('brass'), 6.85, 4.67, z), box(0.58, 0.14, 0.33, mat('brass'), 6.85, 0.1, z));
      for (const y of [1.1, 2.4, 3.7]) g.add(box(0.03, 0.09, 0.27, mat('brass'), 6.585, y, z));
      for (let k = -1; k <= 1; k++) g.add(box(0.02, 4.0, 0.03, mat('handBrass'), 6.58, 2.4, z + k * 0.08));
    }
    const lamp = wallLamp(true, 1.6); lamp.position.set(-3.2, 4.2, -7.98); g.add(lamp);
    g.add(box(0.04, 0.12, 0.06, mat('handBrass'), 1.9, 1.3, -7.95)); // a coat hook at courier height, empty
  }

  // ---- Stair Wing: one broad flight rising north to a platform that ends in air.
  {
    const m = M('stair');
    const g = put('stair', shell(m, glows, { floor: 'wood' }));
    const steps = 11, rise = 6 / steps, run = 12 / steps;
    for (let i = 0; i < steps; i++) {
      const z = 9 - run * (i + 0.5);
      g.add(box(8.8, rise * (i + 1), run, mat('wood'), 0, (rise * (i + 1)) / 2, z));
      g.add(box(3, 0.02, run, mat('fabric'), 0, rise * (i + 1) + 0.011, z));
      if (i % 2 === 0) g.add(cyl(0.035, 3.3, mat('brass'), 0, rise * (i + 1) + 0.05, z + run / 2 - 0.05, 6).rotateZ(Math.PI / 2));
    }
    g.add(box(8.8, 6, 6, mat('wood'), 0, 3, -6), plane(8.8, 6, mat('wood'), 6.002).translateY(0));
    g.children[g.children.length - 1].position.set(0, 6.002, -6);
    g.add(box(0.5, 2.2, 0.5, mat('wood'), 3.6, 7.1, -3.2), cyl(0.36, 0.36, mat('brass'), 3.6, 8.4, -3.2, 10)); // newel post
    const lamp = wallLamp(true, 1.5); lamp.position.set(0, 10.4, -8.98); g.add(lamp);
  }

  // ---- The Landing: a floor, two doors and a balustrade, open to the void so the far lantern can be seen.
  {
    const m = M('landing');
    const g = put('landing', shell(m, glows, { skip: ['n', 's'], ceiling: false }));
    g.add(box(9, 0.5, 9, mat('lath'), 0, -0.26, 0));
    for (const z of [-4.4, 4.4]) {
      g.add(box(9, 0.14, 0.18, mat('wood'), 0, 2.6, z));
      for (let x = -4.2; x <= 4.2; x += 0.7) g.add(cyl(0.07, 2.6, mat('wood'), x, 1.3, z, 6));
    }
    g.add(plane(5, 5, mat('fabric'), 0.012));
    const lamp = wallLamp(true, 1.4); lamp.position.set(3.4, 4.4, -4.3); lamp.rotation.y = 0; g.add(lamp);
  }

  // ---- The Turning Room: a round drum on a turntable with four flat faces: arch, square, blank, arch.
  {
    const m = M('turn');
    const g = put('turn', new Group());
    g.add(new Mesh(new CylinderGeometry(5.3, 5.3, 0.4, 40), mat('wood')).translateY(-0.2));
    g.add(new Mesh(new CircleGeometry(5.3, 40), mat('dark')).rotateX(Math.PI / 2).translateZ(-9));
    const rug = new Mesh(new CircleGeometry(3.1, 32), mat('fabric')); rug.rotation.x = -Math.PI / 2; rug.position.y = 0.012; g.add(rug);
    const faces: { yaw: number; s?: SocketDef }[] = [
      { yaw: Math.PI / 2, s: m.sockets[0] }, { yaw: 0, s: m.sockets[1] }, { yaw: -Math.PI / 2 }, { yaw: Math.PI, s: m.sockets[2] },
    ];
    for (const f of faces) {
      const p = wall(3.6, 9, f.s ? [{ profile: f.s.profile, at: 0 }] : []);
      const n = new Vector3(0, 0, -5).applyAxisAngle(new Vector3(0, 1, 0), f.yaw);
      p.position.copy(n); p.rotation.y = f.yaw;
      g.add(p);
      if (f.s) {
        addDoor(g, f.s, glows);
        // Overdoor: the profile repeated in plaster above the door, so the faces can be read as the room turns.
        const mark = f.s.profile === 'arched' ? new Mesh(new TorusGeometry(0.5, 0.09, 6, 16, Math.PI), mat('brass')) : box(0.9, 0.9, 0.08, mat('brass'));
        mark.position.copy(n).multiplyScalar(0.985).setY(7.6); mark.rotation.y = f.yaw; g.add(mark);
      } else {
        const fire = new Group(); // a cold fireplace on the blank wall
        fire.add(box(2.6, 2.6, 0.5, mat('plaster'), 0, 1.3, 0.25), box(1.5, 1.7, 0.3, mat('dark'), 0, 0.85, 0.42), box(3, 0.2, 0.7, mat('wood'), 0, 2.7, 0.3));
        fire.position.copy(n); fire.rotation.y = f.yaw; g.add(fire);
      }
      const arc = new Mesh(new CylinderGeometry(5.31, 5.31, 9, 10, 1, true, f.yaw + Math.PI + 0.347, Math.PI / 2 - 0.694), mat('wall'));
      arc.position.y = 4.5; g.add(arc);
    }
    const lamp = wallLamp(true, 1.3); lamp.position.set(0, 4.6, 4.9); lamp.rotation.y = Math.PI; g.add(lamp);
  }

  // ---- Corridors: bedroom doors numbered from 1. There is no 0 here.
  put('c-west', corridor(M('c-west'), glows, 1, [-9, 8]));
  const ce = put('c-east', corridor(M('c-east'), glows, 9, [8]));
  const fanlight = new Mesh(new CircleGeometry(1.5, 20, 0, Math.PI), new MeshBasicMaterial({ color: C.moon, fog: false }));
  fanlight.position.set(-2, 5.5, -2.97); ce.add(fanlight);

  // ---- The Swing Bridge: a deck with open railings, so whoever is on it can be seen from both corridors.
  {
    const g = put('bridge', new Group());
    g.add(box(12, 0.4, 4.6, mat('wood'), 0, -0.2, 0), plane(11.6, 1.8, mat('fabric'), 0.012));
    for (const z of [-2.2, 2.2]) {
      g.add(box(12, 0.12, 0.12, mat('iron'), 0, 2.4, z), box(12, 0.08, 0.08, mat('iron'), 0, 1.2, z));
      for (let x = -5.8; x <= 5.8; x += 1.45) g.add(box(0.1, 2.4, 0.1, mat('iron'), x, 1.2, z));
    }
    g.add(cyl(1.3, 14, mat('iron'), 6, -7.4, -3, 14), cyl(1.5, 0.5, mat('brass'), 6, -0.25, -3, 14)); // pivot drum
    for (const [nx, x] of [[-1, -6], [1, 6]] as const) glows.set(nx < 0 ? 'bridge.free' : 'bridge.pivot', addGlowOnly(g, x));
  }

  // ---- Dead Letter Office: a dead end with a glazed partition, so you can watch what goes in.
  let officeLamp: Mesh;
  {
    const m = M('dead-letter');
    const g = put('dead-letter', shell(m, glows, { skip: ['s'] }));
    const glazed = wall(16, 8, m.sockets.map((s) => ({ profile: s.profile, at: -s.x })), mat('glass'));
    glazed.position.set(0, 0, 4.5); glazed.rotation.y = Math.PI; g.add(glazed);
    for (let x = -8; x <= 8; x += 2) if (!m.sockets.some((s) => Math.abs(s.x - x) < 1.6)) g.add(box(0.14, 8, 0.14, mat('wood'), x, 4, 4.5));
    for (const s of [-8, -5.2, -1.8, 4.4, 7.6]) g.add(box(Math.min(1.6, 16), 1.3, 0.12, mat('wood'), s + 0.2, 0.65, 4.5));
    for (let i = 0; i < 9; i++) { // mail sacks and drifts of undelivered letters
      const sack = new Mesh(new SphereGeometry(0.9 + (i % 3) * 0.25, 8, 6), mat('lath'));
      sack.scale.set(1, 0.75, 1); sack.position.set(-6.5 + ((i * 3.1) % 13), 0.6, -3.4 + ((i * 1.7) % 4)); g.add(sack);
    }
    for (let i = 0; i < 26; i++) { const l = plane(0.5, 0.34, mat('paper'), 0.02 + i * 0.001); l.position.x = -7 + ((i * 2.37) % 14); l.position.z = -3 + ((i * 1.93) % 6.5); l.rotation.z = i; g.add(l); }
    g.add(box(6, 3.6, 0.5, mat('wood'), -2, 1.8, -4.2)); // sorting frame
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) g.add(box(1, 0.9, 0.1, mat('dark'), -4.4 + i * 1.2, 0.7 + j * 1.1, -3.92));
    officeLamp = new Mesh(new SphereGeometry(0.3, 10, 8), emissive(C.lamp, 0.5)); officeLamp.position.set(0, 6.4, 0); g.add(officeLamp);
    g.add(cyl(0.03, 1.6, mat('iron'), 0, 7.2, 0, 5));
  }

  // ---- Survey Office: never entered. A door, and the top edge of a very large drawing board.
  {
    const g = put('den', shell(M('den'), glows, {}));
    g.add(box(6, 4.2, 0.3, mat('paper'), 0, 4.4, -3).rotateX(-0.3), box(0.3, 4.4, 0.3, mat('wood'), -2.6, 2.2, -2.6), box(0.3, 4.4, 0.3, mat('wood'), 2.6, 2.2, -2.6));
  }

  // ---- Parcel Lift: an iron cage sized for parcels. Its round port is the first courier-sized opening in the house.
  {
    const m = M('lift');
    const g = put('lift', new Group());
    g.add(box(4, 0.25, 4, mat('iron'), 0, -0.12, 0), box(4, 0.2, 4, mat('iron'), 0, 6, 0));
    for (const [x, z] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) g.add(box(0.18, 6, 0.18, mat('iron'), x, 3, z));
    for (let i = -1.4; i <= 1.4; i += 0.7) { g.add(box(0.06, 6, 0.06, mat('iron'), 1.95, 3, i), box(0.06, 6, 0.06, mat('iron'), i, 3, 1.95)); }
    const port = wall(4, 6, [{ profile: 'round', at: 0 }], mat('iron')); port.material = mat('iron').clone(); (port.material as typeof port.material & { side: number }).side = DoubleSide;
    // 1 cm inside the lift, not on its face: Room Zero docks flush against this plane, and two coplanar walls z-fought into
    // spikes (visual QA, issue V5). Each viewer now sees the nearer of the two, which is the wall of their own room.
    port.position.set(0, 0, -1.99); g.add(port);
    for (const s of m.sockets) addDoor(g, s, glows);
    g.add(box(0.5, 0.5, 0.5, mat('lath'), 1.2, 0.25, 1.2), box(0.7, 0.4, 0.5, mat('lath'), 0.9, 0.2, -1.1)); // parcels
  }

  // ---- Room Zero: the only room at the courier's own scale. Warm, cluttered, lived in today.
  const zeroLight = new PointLight(0xffc48a, 6, 9, 1.6);
  let pigeonhole: Object3D;
  let card: Mesh;
  let titleCard: Mesh;
  {
    const m = M('zero');
    const g = put('zero', shell(m, glows, { floor: 'warmWood', trimless: true, wallMat: 'plaster' }));
    g.traverse((o) => { if ((o as Mesh).isMesh && (o as Mesh).material === mat('plaster')) (o as Mesh).material = zeroWall(); });
    g.add(box(3.4, 0.12, 3.8, mat('lath'), 0, 2.46, 0)); // roof
    const lantern = new Mesh(new SphereGeometry(0.5, 10, 8), emissive(C.lamp, 1.4)); lantern.position.set(0, 3.1, 0); g.add(lantern); // seen across the void
    g.add(box(11, 0.3, 0.3, mat('iron'), 5, 2.75, 0.95).rotateY(-Math.atan2(1.9, 10)), cyl(0.3, 26, mat('iron'), 10, -4, 1.9, 8)); // the crane arm and its mast
    // bed along the north wall
    g.add(box(1.9, 0.35, 0.9, mat('warmWood'), -0.55, 0.3, -1.3), box(1.86, 0.16, 0.86, mat('quilt'), -0.5, 0.56, -1.3), box(0.5, 0.12, 0.6, mat('paper'), -1.25, 0.66, -1.3), box(0.06, 0.9, 0.9, mat('iron'), -1.5, 0.6, -1.3));
    const blanket = box(0.9, 0.05, 0.7, mat('quilt'), 0.1, 0.62, -1.15); blanket.rotation.z = 0.25; g.add(blanket); // thrown back
    // writing desk with pigeonholes on the east wall
    g.add(box(0.6, 0.05, 1.3, mat('warmWood'), 1.25, 0.74, 0), box(0.05, 0.74, 0.05, mat('warmWood'), 1.0, 0.37, -0.6), box(0.05, 0.74, 0.05, mat('warmWood'), 1.0, 0.37, 0.6));
    const rack = new Group(); rack.position.set(1.5, 0.78, 0);
    rack.add(box(0.16, 0.62, 1.2, mat('postal')));
    rack.position.y += 0.31;
    pigeonhole = new Group();
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
      const hole = box(0.02, 0.15, 0.19, mat('dark'), -0.085, 0.18 - r * 0.19, -0.46 + c * 0.23);
      rack.add(hole);
      if (r === 1 && c === 2) { pigeonhole.position.set(1.5 - 0.1, 1.09 + 0.18 - 0.19, 0); continue; }
      const env = box(0.03, 0.1, 0.15, mat('paper'), -0.1, 0.165 - r * 0.19, -0.46 + c * 0.23); rack.add(env);
      if (r === 2 && c === 4) env.name = 'room-1';
    }
    const label = new Mesh(new CircleGeometry(0.022, 14), new MeshBasicMaterial({ map: textTexture([{ text: '0', size: 200, y: 200, color: '#2a1c0c' }], 256, 256, '#c79a45') }));
    label.position.set(-0.097, -0.085, 0); label.rotation.y = -Math.PI / 2; rack.add(label);
    g.add(rack, pigeonhole);
    g.add(box(0.4, 0.04, 0.4, mat('warmWood'), 0.7, 0.45, 0), box(0.04, 0.5, 0.4, mat('warmWood'), 0.5, 0.7, 0)); // chair
    for (const [x, z] of [[0.52, -0.18], [0.88, -0.18], [0.52, 0.18], [0.88, 0.18]]) g.add(box(0.035, 0.45, 0.035, mat('warmWood'), x, 0.225, z));
    g.add(cyl(0.2, 0.6, mat('iron'), -1.25, 0.3, 1.2, 10), cyl(0.05, 1.8, mat('iron'), -1.25, 1.5, 1.2, 6), cyl(0.09, 0.1, mat('brass'), -1.25, 0.66, 1.2, 10)); // stove, flue, kettle
    g.add(box(0.36, 0.7, 0.07, mat('postal'), -1.56, 1.25, 0.2), box(0.03, 0.03, 0.08, mat('handBrass'), -1.57, 1.62, 0.2)); // a coat with the courier's cuff, on its hook
    const rug = new Mesh(new CircleGeometry(0.7, 20), mat('quilt')); rug.rotation.x = -Math.PI / 2; rug.position.set(-0.1, 0.004, 0.3); g.add(rug);
    const lampBase = cyl(0.04, 0.2, mat('brass'), 1.3, 0.86, -0.5, 8); const lampGlass = new Mesh(new SphereGeometry(0.07, 10, 8), emissive(0xffc48a, 1.3)); lampGlass.position.set(1.3, 1.02, -0.5);
    g.add(lampBase, lampGlass);
    zeroLight.position.set(0.6, 1.5, -0.2); g.add(zeroLight);
    const win = new Mesh(new RingGeometry(0.3, 0.36, 24), mat('brass')); win.position.set(0.9, 1.5, -1.79); g.add(win);
    card = new Mesh(new CircleGeometry(0.0001, 3), mat('paper')); // replaced by the view when the seal breaks
    // The line the chapter ends on was 0.2 m wide with small, light-looking type: about 1 degree tall at the seat (visual QA, issue V3).
    // Larger card, larger and darker type; still inside the desk and clear of the rack.
    card = plane(0.34, 0.2, new MeshBasicMaterial({ map: textTexture([{ text: 'You are the', size: 66, y: 112, color: '#241608' }, { text: 'return address.', size: 66, y: 190, color: '#241608' }], 512, 300, '#efe5cc'), fog: false }), 0);
    card.rotation.set(-0.9, -Math.PI / 2, 0, 'YXZ'); card.position.set(1.22, 0.86, 0.0); card.visible = false; g.add(card);
    titleCard = plane(1.5, 0.4, new MeshBasicMaterial({ map: textTexture([{ text: 'The Unreturned Letter', size: 72, y: 150, color: '#2b1a0a' }], 1024, 256), transparent: true, fog: false, depthWrite: false }), 0);
    // Upright, facing the seat at x = 0.88. It had been laid flat (rotation.x = PI / 2), so the closing title was a foreshortened
    // strip on the ceiling line (visual QA, issue V2).
    titleCard.rotation.set(0, -Math.PI / 2, 0, 'YXZ'); titleCard.position.set(1.45, 1.75, 0); titleCard.visible = false; g.add(titleCard);
  }

  // ---- Fixed machinery of the house and the void beyond it.
  const statics = new Group();
  statics.add(box(0.5, 0.5, 30, mat('iron'), 9, 5.2, -30), box(14, 0.4, 0.4, mat('iron'), -2, -0.3, -8.6)); // landing rail, stair track
  statics.add(cyl(4.6, 3, mat('iron'), 18.5, 4.1, -23, 20), cyl(0.9, 30, mat('iron'), 18.5, -11, -23, 10)); // turntable
  for (const [x, z] of [[79.4, -25.1], [83.6, -25.1], [79.4, -20.9], [83.6, -20.9]]) statics.add(box(0.2, 34, 0.2, mat('iron'), x, 8, z)); // lift guides
  for (const m of content.modules) for (const [dx, dz] of [[-1, -1], [1, 1]]) statics.add(box(0.07, 60, 0.07, mat('iron'), m.base.x + (dx * m.size.w) / 3, m.base.y + m.size.h + 30, m.base.z + (dz * m.size.d) / 3)); // chains up into the dark
  const voidRooms = new InstancedMesh(new SphereGeometry(1, 6, 4), emissive(C.lamp, 0.55), 46);
  const mtx = new Matrix4();
  for (let i = 0; i < 46; i++) {
    const a = i * 2.399, r = 95 + ((i * 37) % 120);
    mtx.makeScale(0.5, 0.75, 0.2).setPosition(40 + Math.cos(a) * r, -30 + ((i * 53) % 110), -23 + Math.sin(a) * r);
    voidRooms.setMatrixAt(i, mtx);
  }
  statics.add(voidRooms);

  // Each room gets its own wall colour on the shared wallpaper texture, so a player can tell rooms apart at a glance and the
  // house reads as a place with a warm lived-in side (foyer, west corridor, dead-letter office) and a colder side toward the
  // Surveyor (east corridor, den). One clone per tint, so the merge below still gives one draw call per material per room.
  const wallTint: Record<string, number> = {
    foyer: 0xffe3b8, stair: 0xcfd8dc, landing: 0xd7e3d2, 'c-west': 0xf2d6ae, 'c-east': 0xb4c1d6, 'dead-letter': 0xe6d3b0, den: 0x9ea8ba,
  };
  for (const [id, hex] of Object.entries(wallTint)) {
    const g = modules.get(id);
    g?.traverse((o) => { const m = o as Mesh; if (m.isMesh && m.material === mat('wall')) m.material = tinted('wall', hex); });
  }

  // One draw call per material per room instead of one per box. What the view animates is kept apart.
  const keep = new Set<Object3D>([fanlight, officeLamp!, voidRooms, pigeonhole!, card!, titleCard!, ...glows.values()]);
  mergeStats = { before: 0, after: 0 };
  for (const g of [...modules.values(), statics]) { const r = mergeStatic(g, keep); mergeStats.before += r.before; mergeStats.after += r.after; }

  return { modules, glows, fanlight, officeLamp: officeLamp!, voidRooms, statics, zeroLight, pigeonhole: pigeonhole!, card: card!, titleCard: titleCard! };
}

/** Static meshes before and after the merge of the last build, for the performance report. */
export let mergeStats = { before: 0, after: 0 };

function addGlowOnly(g: Group, x: number): Mesh {
  const glow = doorGlow('square');
  glow.position.set(x, 0, 0); glow.rotation.y = Math.PI / 2;
  g.add(glow);
  return glow;
}

let zeroWallMat: ReturnType<typeof mat> | undefined;
function zeroWall() {
  if (!zeroWallMat) { zeroWallMat = mat('plaster').clone(); zeroWallMat.side = DoubleSide; zeroWallMat.color.set(0xd9c9a8); }
  return zeroWallMat;
}

// ---- stations, lamps -------------------------------------------------------------------------------
export interface RailSpec { seam: string; vantage: string; origin: [number, number, number]; dir: [number, number, number]; length: number; anchor?: [number, number, number] }

/** Where each seam's grips sit, in the seated player's frame: +x right, +y up, -z forward. All inside the reach envelope. */
export const RAILS: RailSpec[] = [
  { seam: 'seam-hall', vantage: 'v-foyer-door', origin: [-0.18, 0.95, -0.42], dir: [1, 0, 0], length: 0.36 },
  { seam: 'seam-landing', vantage: 'v-stair-head', origin: [0.02, 0.95, -0.42], dir: [1, 0, 0], length: 0.36, anchor: [-0.3, 0.95, -0.4] },
  { seam: 'seam-rotunda', vantage: 'v-landing-east', origin: [0.02, 0.95, -0.42], dir: [1, 0, 0], length: 0.36, anchor: [-0.3, 0.95, -0.4] },
  { seam: 'seam-bridge', vantage: 'v-cwest-end', origin: [0.18, 0.95, -0.42], dir: [-1, 0, 0], length: 0.36 },
  { seam: 'seam-bridge', vantage: 'v-ceast-west', origin: [-0.4, 0.95, -0.3], dir: [0, 0, -1], length: 0.25 }, // ends 0.55 m forward: the edge of the seated reach envelope (found by RT-22)
  { seam: 'seam-lift', vantage: 'v-ceast-end', origin: [-0.12, 1.22, -0.44], dir: [0, -1, 0], length: 0.36, anchor: [-0.38, 0.98, -0.4] },
  { seam: 'seam-arm', vantage: 'v-ceast-end', origin: [0.1, 0.95, -0.42], dir: [1, 0, 0], length: 0.32 },
];

export interface Station { spec: RailSpec; group: Group; travel: Mesh; anchor?: Mesh; latch?: Mesh; pin?: Mesh }

export function buildStation(spec: RailSpec): Station {
  const g = new Group();
  const [ox, oy, oz] = spec.origin, [dx, dy, dz] = spec.dir, L = spec.length;
  const rail = box(dx ? L + 0.06 : 0.025, dy ? L + 0.06 : 0.025, dz ? L + 0.06 : 0.025, mat('brass'), ox + (dx * L) / 2, oy - (dy ? 0 : 0.03) + (dy * L) / 2, oz + (dz * L) / 2 - (dy ? 0.03 : 0));
  g.add(rail);
  const n = spec.seam === 'seam-rotunda' ? 2 : spec.seam === 'seam-landing' || spec.seam === 'seam-lift' ? 3 : 2;
  for (let i = 0; i < n; i++) { const t = i / (n - 1); g.add(box(0.012, 0.012, 0.012, mat('handBrass'), ox + dx * L * t + (dx ? 0 : 0.03), oy + dy * L * t + (dy ? 0 : 0.012), oz + dz * L * t)); } // notches
  const grip = (): Mesh => { const m = cyl(0.016, 0.1, mat('handBrass').clone(), 0, 0, 0, 10); m.rotation.x = Math.PI / 2; if (dz) m.rotation.set(0, 0, Math.PI / 2); return m; };
  const travel = grip(); travel.position.set(ox, oy, oz); g.add(travel);
  const st: Station = { spec, group: g, travel };
  // a small lectern under the grips
  g.add(box(0.9, 0.04, 0.3, mat('wood'), 0, 0.72, -0.45), box(0.1, 0.72, 0.1, mat('wood'), -0.35, 0.36, -0.45), box(0.1, 0.72, 0.1, mat('wood'), 0.35, 0.36, -0.45));
  if (spec.anchor) {
    const a = grip(); a.position.set(...spec.anchor); g.add(a);
    const stamp = new Mesh(new TorusGeometry(0.02, 0.005, 5, 10), mat('brass')); stamp.position.set(spec.anchor[0], spec.anchor[1] - 0.05, spec.anchor[2] + 0.02); g.add(stamp);
    st.anchor = a;
    st.latch = box(0.03, 0.012, 0.05, mat('handBrass'), ox - 0.05 * (dx || 1), oy + 0.03, oz); g.add(st.latch);
    st.pin = cyl(0.014, 0.03, mat('handBrass').clone(), spec.anchor[0], spec.anchor[1] + 0.06, spec.anchor[2], 8); st.pin.visible = false; g.add(st.pin);
  }
  return st;
}

/** A courier-sized signal lamp. Its glass is the ray target: larger than it looks, so far lamps are easy to hit. */
export function buildBeacon(): { group: Group; glass: Mesh; target: Mesh } {
  const group = new Group();
  group.add(cyl(0.02, 1.7, mat('brass'), 0, 0.85, 0, 6), box(0.26, 0.02, 0.02, mat('brass'), 0.13, 1.68, 0));
  const glass = new Mesh(new SphereGeometry(0.09, 12, 10), new MeshBasicMaterial({ color: C.lamp, fog: false }));
  glass.position.set(0.26, 1.58, 0);
  const target = new Mesh(new SphereGeometry(0.45, 10, 8), new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  target.position.copy(glass.position);
  group.add(glass, target, cyl(0.11, 0.03, mat('brass'), 0.26, 1.69, 0, 8));
  return { group, glass, target };
}
