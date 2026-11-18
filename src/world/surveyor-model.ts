// The Surveyor's body: plaster over lath, long folding limbs, an open brass ring for a head.
// Built and animated procedurally. See docs/03-art-and-audio/character-design.md and animation-style.md.
import { CanvasTexture, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SRGBColorSpace, SphereGeometry, TorusGeometry } from '@iwsdk/core';
import { C, mat } from './kit.js';

export type Pose = 'idle' | 'walk' | 'measure' | 'brace' | 'plumb' | 'slack' | 'sweep' | 'frame' | 'door';

function plaster(): MeshStandardMaterial {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#c9c2b3'; g.fillRect(0, 0, 256, 256);
  let s = 77;
  const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 1600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(70,62,50,0.06)' : 'rgba(255,252,244,0.07)'; g.fillRect(r() * 256, r() * 256, 1 + r() * 7, 1 + r() * 4); }
  // Its own notebook: pencilled dimension lines and figures.
  g.strokeStyle = 'rgba(50,48,46,0.55)'; g.fillStyle = 'rgba(50,48,46,0.6)'; g.lineWidth = 0.7; g.font = '9px Georgia, serif';
  for (let i = 0; i < 34; i++) {
    const x = r() * 220, y = 12 + r() * 236, w = 20 + r() * 60;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.moveTo(x, y - 3); g.lineTo(x, y + 3); g.moveTo(x + w, y - 3); g.lineTo(x + w, y + 3); g.stroke();
    g.fillText(`${(2 + r() * 12).toFixed(2)}`, x + w / 2 - 9, y - 2);
  }
  const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace;
  return new MeshStandardMaterial({ map: t, roughness: 0.95 });
}

/** A limb segment hanging down from a joint at its top. */
function seg(len: number, r0: number, r1: number, m: MeshStandardMaterial): { joint: Group; end: Group } {
  const joint = new Group();
  const mesh = new Mesh(new CylinderGeometry(r0, r1, len, 7), m);
  mesh.position.y = -len / 2;
  const knuckle = new Mesh(new SphereGeometry(r0 * 1.25, 7, 5), mat('brass'));
  const end = new Group(); end.position.y = -len;
  joint.add(mesh, knuckle, end);
  return { joint, end };
}

export class SurveyorFigure {
  readonly root = new Group();
  private body = new Group();
  private torso = new Group();
  private neck = new Group();
  readonly ring: Mesh;
  private legs: { hip: Group; knee: Group; ankle: Group }[] = [];
  private arms: { shoulder: Group; elbow: Group; wrist: Group }[] = [];
  private plumb = new Group();
  private tape: Mesh;
  private phase = 0;
  private knock = 0;
  private blend = { stoop: 0.55, crouch: 0, kneel: 0 };

  constructor() {
    const p = plaster();
    this.root.add(this.body);
    this.body.position.y = 4.0;
    this.body.add(new Mesh(new CylinderGeometry(0.34, 0.26, 0.5, 8), p));
    for (const side of [-1, 1]) { // legs: thigh, shin, and one joint too many
      const thigh = seg(1.55, 0.17, 0.13, p), shin = seg(1.45, 0.13, 0.1, p), foot = seg(1.05, 0.1, 0.07, p);
      thigh.joint.position.set(side * 0.24, -0.15, 0);
      thigh.end.add(shin.joint); shin.end.add(foot.joint);
      const pad = new Mesh(new CylinderGeometry(0.16, 0.2, 0.1, 8), p); pad.position.y = -0.03; foot.end.add(pad);
      this.body.add(thigh.joint);
      this.legs.push({ hip: thigh.joint, knee: shin.joint, ankle: foot.joint });
    }
    this.torso.position.y = 0.2; this.body.add(this.torso);
    const chest = new Mesh(new CylinderGeometry(0.22, 0.32, 1.25, 8), p); chest.position.y = 0.62; this.torso.add(chest);
    for (const side of [-1, 1]) { // arms reaching to mid-shin, with a second elbow
      const upper = seg(1.35, 0.11, 0.09, p), fore = seg(1.3, 0.09, 0.075, p), hand = seg(1.1, 0.075, 0.05, p);
      upper.joint.position.set(side * 0.34, 1.15, 0);
      upper.end.add(fore.joint); fore.end.add(hand.joint);
      for (let f = 0; f < 4; f++) { const fin = new Mesh(new CylinderGeometry(0.022, 0.012, 0.5, 4), p); fin.position.set((f - 1.5) * 0.045, -0.25, 0); fin.rotation.z = (f - 1.5) * 0.1; hand.end.add(fin); }
      this.torso.add(upper.joint);
      this.arms.push({ shoulder: upper.joint, elbow: fore.joint, wrist: hand.joint });
    }
    this.neck.position.y = 1.3; this.torso.add(this.neck);
    const lath = new Mesh(new CylinderGeometry(0.07, 0.09, 0.7, 6), mat('lath')); lath.position.y = 0.3; this.neck.add(lath);
    // The head: an open brass circle with a gap at the lower front, graduated like a theodolite. Nothing inside it.
    // The ring glows faintly (an own material, so the shared brass is untouched): from the far end of a corridor the figure was a
    // dim shape in the dark, and the ring is what a player should notice first (visual QA).
    const ringMat = mat('brass').clone(); ringMat.emissive.setHex(C.lamp); ringMat.emissiveIntensity = 0.85;
    this.ring = new Mesh(new TorusGeometry(0.55, 0.05, 8, 40, (310 * Math.PI) / 180), ringMat);
    this.ring.rotation.z = (-65 * Math.PI) / 180 - Math.PI / 2 + (25 * Math.PI) / 180; this.ring.position.y = 1.15;
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; const tick = new Mesh(new CylinderGeometry(0.008, 0.008, i % 6 ? 0.07 : 0.13, 4), mat('handBrass')); tick.position.set(Math.cos(a) * 0.47, Math.sin(a) * 0.47, 0); tick.rotation.z = a + Math.PI / 2; this.ring.add(tick); }
    this.neck.add(this.ring);
    const reel = new Mesh(new CylinderGeometry(0.16, 0.16, 0.07, 12), mat('brass')); reel.rotation.z = Math.PI / 2; this.arms[0].wrist.add(reel);
    this.tape = new Mesh(new CylinderGeometry(0.012, 0.012, 1, 4), new MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.8, roughness: 0.3 }));
    this.tape.position.y = -0.5; this.tape.visible = false; this.arms[0].wrist.add(this.tape);
    const line = new Mesh(new CylinderGeometry(0.006, 0.006, 3.2, 4), mat('iron')); line.position.y = -1.6;
    const bob = new Mesh(new CylinderGeometry(0.01, 0.09, 0.26, 8), mat('brass')); bob.position.y = -3.3;
    this.plumb.add(line, bob); this.plumb.visible = false; this.arms[1].wrist.add(this.plumb);
    const blob = new Mesh(new CylinderGeometry(1.5, 1.5, 0.01, 20), new MeshStandardMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false }));
    blob.position.y = 0.02; this.root.add(blob); // a soft contact shadow; it casts no true one
    this.root.traverse((o) => { o.frustumCulled = false; });
  }

  strike(): void { this.knock = 1; }

  /** Advance the animation. `speed` is walking pace in strides per second; ringYaw aims the ring, relative to the body. */
  update(dt: number, pose: Pose, speed: number, ringYaw: number, time: number): void {
    const k = Math.min(1, dt * 3.3); // 0.3 s blends
    const want = {
      stoop: pose === 'measure' || pose === 'door' ? 1.15 : pose === 'brace' ? 0.9 : pose === 'frame' ? 0.95 : pose === 'plumb' ? 0.75 : 0.55,
      crouch: pose === 'brace' ? 1 : pose === 'door' ? 0.9 : 0,
      kneel: pose === 'measure' || pose === 'door' ? 1 : 0,
    };
    this.blend.stoop += (want.stoop - this.blend.stoop) * k;
    this.blend.crouch += (want.crouch - this.blend.crouch) * k;
    this.blend.kneel += (want.kneel - this.blend.kneel) * k;
    const walking = pose === 'walk';
    if (walking) this.phase += dt * speed * Math.PI * 2;
    const sway = Math.sin(time * 0.6) * 0.03;
    const low = this.blend.kneel * 2.2 + this.blend.crouch * 1.3;
    this.body.position.y = 4.0 - low + (walking ? Math.abs(Math.sin(this.phase)) * 0.12 : 0);
    this.torso.rotation.x = this.blend.stoop + sway;
    this.neck.rotation.x = -this.blend.stoop * 0.65 + (pose === 'frame' ? 0.5 : 0);
    this.neck.rotation.y += (ringYaw + (pose === 'sweep' ? Math.sin(time * 2.2) * 0.9 : 0) - this.neck.rotation.y) * Math.min(1, dt * 2);
    this.legs.forEach((leg, i) => {
      const s = walking ? Math.sin(this.phase + i * Math.PI) : 0;
      const fold = this.blend.kneel * 1.1 + this.blend.crouch * 0.7;
      leg.hip.rotation.x = -0.25 - s * 0.45 - fold;
      leg.knee.rotation.x = 0.6 + Math.max(0, -s) * 0.5 + fold * 1.6;
      leg.ankle.rotation.x = -0.35 - fold * 0.6;
    });
    this.knock = Math.max(0, this.knock - dt * 3.5);
    this.arms.forEach((arm, i) => {
      const s = walking ? Math.sin(this.phase + (i + 1) * Math.PI) * 0.25 : 0;
      let sh = -this.blend.stoop * 0.8 + s, el = -0.25, out = 0;
      if (pose === 'brace') { sh = -1.4; el = -0.2; out = (i ? -1 : 1) * 1.1; }
      if (pose === 'measure' || pose === 'door') { sh = -1.7 + Math.sin(time * 5 + i) * 0.08; el = -0.5; }
      if (pose === 'plumb' && i === 1) { sh = -2.1; el = 0.2; }
      if (pose === 'slack' && i === 0) { sh = -1.2; el = -0.6; }
      if (i === 1 && this.knock > 0) { sh = -2.3 + (1 - this.knock) * 0.9; el = -1.2 * this.knock; }
      arm.shoulder.rotation.x += (sh - arm.shoulder.rotation.x) * Math.min(1, dt * 8);
      arm.shoulder.rotation.z += (out - arm.shoulder.rotation.z) * k;
      arm.elbow.rotation.x += (el - arm.elbow.rotation.x) * Math.min(1, dt * 8);
    });
    this.plumb.visible = pose === 'plumb';
    this.plumb.rotation.z = Math.sin(time * 1.6) * 0.12 * Math.exp(-((time % 4) / 2));
    this.plumb.rotation.x = -this.arms[1].shoulder.rotation.x - this.torso.rotation.x; // hangs true
    this.tape.visible = pose === 'slack' || pose === 'measure';
    this.tape.scale.y = pose === 'slack' ? 2.6 : 1.4;
    this.tape.position.y = pose === 'slack' ? -1.3 : -0.7;
  }
}

export const RING_INNER = 0.5;
export const CHALK = C.chalk;
