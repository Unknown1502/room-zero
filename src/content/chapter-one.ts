// Chapter One: The Unreturned Letter. Authored data only. Source: docs/01-game-design/first-chapter.md.
// World frame: +X east, +Y up, -Z north. The house runs west to east at y = 6 after the stair.
import { rotateAbout, type Box } from '../domain/math.js';
import type { ChapterContent, ModuleDef, SocketDef } from '../domain/types.js';

const DEG = Math.PI / 180;
const EAST = -Math.PI / 2;
const NORTH = 0;

function box(w: number, d: number, h: number, margin = 0.15): Box {
  return { cx: 0, cy: h / 2, cz: 0, hx: w / 2 - margin, hy: h / 2 - margin, hz: d / 2 - margin };
}
const s = (id: string, x: number, y: number, z: number, nx: number, nz: number, profile: SocketDef['profile']): SocketDef => ({ id, x, y, z, nx, nz, profile });

function mod(id: string, name: string, x: number, y: number, z: number, w: number, d: number, h: number, crossSec: number, reachSec: number | undefined, sockets: SocketDef[]): ModuleDef {
  return { id, name, base: { x, y, z, yaw: 0 }, size: { w, d, h }, box: box(w, d, h), sockets, crossSec, reachSec };
}

const ARM_PIVOT = { x: 91.5, z: -24.9 };
const ARM_ANGLE = -110 * DEG;
// Docked, Room Zero sits against the lift's north face. Its arm swings it in from the south-east, through the lift's cell.
const zeroDocked = { x: 81.5, y: 6, z: -26.8, yaw: 0 };

const modules: ModuleDef[] = [
  mod('foyer', 'Entrance Hall', 0, 0, 0, 14, 16, 11, 6, 5, [s('foyer.north', 0, 0, -8, 0, -1, 'arched')]),
  mod('stair', 'Stair Wing', -4.5, 0, -17, 9, 18, 16, 8, 6, [
    s('stair.foot', 0, 0, 9, 0, 1, 'arched'),
    s('stair.head', 4.5, 6, -6, 1, 0, 'arched'),
  ]),
  mod('landing', 'The Landing', 9, 6, -37, 9, 9, 9, 5, 3, [
    s('landing.west', -4.5, 0, 0, -1, 0, 'arched'),
    s('landing.east', 4.5, 0, 0, 1, 0, 'arched'),
  ]),
  // A round drum, radius 5, so that it can turn between its neighbours. Its collision box is the inscribed square.
  { ...mod('turn', 'The Turning Room', 18.5, 6, -23, 10, 10, 9, 5, 3, [
    s('turn.f0', -5, 0, 0, -1, 0, 'arched'),
    s('turn.f1', 0, 0, -5, 0, -1, 'square'),
    s('turn.f3', 0, 0, 5, 0, 1, 'arched'),
  ]), box: { cx: 0, cy: 4.5, cz: 0, hx: 3.4, hy: 4.35, hz: 3.4 } },
  mod('c-west', 'West Corridor', 34.5, 6, -23, 22, 6, 8, 10, 6, [
    s('c-west.mouth', -11, 0, 0, -1, 0, 'square'),
    s('c-west.end', 11, 0, 0, 1, 0, 'square'),
  ]),
  { ...mod('bridge', 'The Swing Bridge', 51.5, 6, -23, 12, 6, 8, 6, 4, [
    s('bridge.free', -6, 0, 0, -1, 0, 'square'),
    s('bridge.pivot', 6, 0, 0, 1, 0, 'square'),
  ]), box: { cx: 0, cy: 4, cz: 0, hx: 4.5, hy: 3.85, hz: 2.5 } },
  mod('c-east', 'East Corridor', 68.5, 6, -23, 22, 6, 8, 10, 6, [
    s('c-east.west', -11, 0, 0, -1, 0, 'square'),
    s('c-east.north', -2, 0, -3, 0, -1, 'square'),
    s('c-east.end', 11, 0, 0, 1, 0, 'square'),
  ]),
  mod('dead-letter', 'Dead Letter Office', 58, 6, -42.5, 16, 9, 8, 5, undefined, [
    s('dead-letter.door', -3.5, 0, 4.5, 0, 1, 'square'),
    s('dead-letter.back', 6, 0, 4.5, 0, 1, 'square'),
  ]),
  mod('den', 'Survey Office', 66.5, 6, -32, 9, 12, 8, 3, undefined, [
    s('den.side', -2.5, 0, -6, 0, -1, 'square'),
    s('den.door', 0, 0, 6, 0, 1, 'square'),
  ]),
  mod('lift', 'Parcel Lift', 81.5, 13, -23, 4, 4, 6, 4, 4, [
    s('lift.near', -2, 0, 0, -1, 0, 'square'),
    s('lift.far', 0, 0, -2, 0, -1, 'round'),
  ]),
  { ...mod('zero', 'Room Zero', 0, 0, 0, 3.2, 3.6, 2.4, 3, undefined, [s('zero.door', 0, 0, 1.8, 0, 1, 'round')]),
    base: rotateAbout(zeroDocked, ARM_PIVOT.x, ARM_PIVOT.z, -ARM_ANGLE) },
];

export const chapterOne: ChapterContent = {
  version: 'chapter-one@1',
  modules,
  pairs: [
    { a: 'foyer.north', b: 'stair.foot', player: true, enemy: true },
    { a: 'stair.head', b: 'landing.west', player: true, enemy: true },
    { a: 'landing.east', b: 'turn.f0', player: true, enemy: true },
    { a: 'landing.east', b: 'turn.f3', player: true, enemy: true },
    { a: 'landing.east', b: 'turn.f1', player: true, enemy: true },
    { a: 'c-west.mouth', b: 'turn.f1', player: true, enemy: true },
    { a: 'c-west.mouth', b: 'turn.f0', player: true, enemy: true },
    { a: 'c-west.mouth', b: 'turn.f3', player: true, enemy: true },
    { a: 'c-west.end', b: 'bridge.free', player: true, enemy: true },
    { a: 'bridge.pivot', b: 'c-east.west', player: true, enemy: true, permanent: true },
    { a: 'dead-letter.door', b: 'bridge.free', player: false, enemy: true },
    { a: 'dead-letter.back', b: 'den.side', player: false, enemy: true, lockedUntilFlag: 'houseClosing' },
    { a: 'den.door', b: 'c-east.north', player: false, enemy: true },
    { a: 'c-east.end', b: 'lift.near', player: true, enemy: true },
    { a: 'lift.far', b: 'zero.door', player: true, enemy: false },
  ],
  seams: [
    { id: 'seam-hall', moves: 'stair', path: { kind: 'linear', ax: 1, ay: 0, az: 0, length: 4.5 }, detents: [0, 1], initial: 0, latched: false, ratchet: false, stations: ['v-foyer-door'] },
    { id: 'seam-landing', moves: 'landing', path: { kind: 'linear', ax: 0, ay: 0, az: 1, length: 14 }, detents: [0, 0.5, 1], initial: 0, latched: true, ratchet: false, stations: ['v-stair-head'] },
    { id: 'seam-rotunda', moves: 'turn', path: { kind: 'rotary', px: 18.5, pz: -23, angle: -2 * Math.PI, cyclic: true }, detents: [0, 0.25, 0.5, 0.75], initial: 0, latched: true, ratchet: true, stations: ['v-landing-east'] },
    { id: 'seam-bridge', moves: 'bridge', path: { kind: 'rotary', px: 57.5, pz: -26, angle: -Math.PI / 2, cyclic: false }, detents: [0, 1], initial: 0, latched: false, ratchet: false, stations: ['v-cwest-end', 'v-ceast-west'] },
    { id: 'seam-lift', moves: 'lift', path: { kind: 'linear', ax: 0, ay: -1, az: 0, length: 14 }, detents: [0, 0.5, 1], initial: 1, latched: true, ratchet: false, stations: ['v-ceast-end'] },
    { id: 'seam-arm', moves: 'zero', path: { kind: 'rotary', px: ARM_PIVOT.x, pz: ARM_PIVOT.z, angle: ARM_ANGLE, cyclic: false }, detents: [0, 1], initial: 0, latched: false, ratchet: false, stations: ['v-ceast-end'] },
  ],
  vantages: [
    { id: 'v-foyer-start', module: 'foyer', adjacent: ['v-foyer-door'], x: 0, y: 0, z: 4, worldYaw: NORTH },
    { id: 'v-foyer-door', module: 'foyer', adjacent: ['v-foyer-start', 'v-stair-head'], x: 0, y: 0, z: -6.2, worldYaw: NORTH },
    { id: 'v-stair-head', module: 'stair', adjacent: ['v-foyer-door', 'v-landing-east'], x: 2.6, y: 6, z: -6, worldYaw: EAST },
    { id: 'v-landing-east', module: 'landing', adjacent: ['v-stair-head', 'v-turn-centre'], x: 2.8, y: 0, z: 0, worldYaw: EAST },
    { id: 'v-turn-centre', module: 'turn', adjacent: ['v-landing-east', 'v-cwest-end'], x: 0, y: 0, z: 0, worldYaw: EAST },
    { id: 'v-cwest-end', module: 'c-west', adjacent: ['v-turn-centre', 'v-bridge-mid'], x: 9, y: 0, z: 0, worldYaw: EAST },
    { id: 'v-bridge-mid', module: 'bridge', adjacent: ['v-cwest-end', 'v-ceast-west'], x: 0, y: 0, z: 0, worldYaw: EAST },
    { id: 'v-ceast-west', module: 'c-east', adjacent: ['v-bridge-mid', 'v-ceast-end'], x: -9, y: 0, z: 0, worldYaw: EAST },
    { id: 'v-ceast-end', module: 'c-east', adjacent: ['v-ceast-west', 'v-lift'], x: 9, y: 0, z: 0, worldYaw: EAST },
    { id: 'v-lift', module: 'lift', adjacent: ['v-ceast-end', 'v-zero'], x: -0.6, y: 0, z: 0, worldYaw: EAST },
    // Seated at the writing desk: the pigeonhole is 0.52 m ahead, inside the seated reach envelope (RT-21 found it at 1.6 m).
    { id: 'v-zero', module: 'zero', adjacent: ['v-lift'], x: 0.88, y: 0, z: 0, worldYaw: EAST },
  ],
  checkpoints: [
    { id: 'cp-arrival', postmark: 'ENTRANCE' },
    { id: 'cp-stairhead', postmark: 'STAIR', vantage: 'v-stair-head' },
    { id: 'cp-landing', postmark: 'LANDING', vantage: 'v-landing-east' },
    { id: 'cp-corridor', postmark: 'WEST', vantage: 'v-cwest-end' },
    { id: 'cp-east', postmark: 'EAST', vantage: 'v-ceast-west', surveyorSealedIn: 'dead-letter' },
    { id: 'cp-docked', postmark: 'LAST POST', edge: 'lift.far|zero.door' },
  ],
  objectives: [
    { id: 'obj-first-seam', station: 'v-foyer-door', edge: 'foyer.north|stair.foot', hints: ['The stair is waiting.', 'Brass is for hands.', 'Take the grip. Slide it.'] },
    { id: 'obj-staircase', station: 'v-stair-head', edge: 'landing.west|stair.head', hints: ['The landing has wandered.', 'Hold on with one hand. Pull with the other.', 'Pull until the door lights.'] },
    { id: 'obj-wrong-door', station: 'v-landing-east', edge: 'c-west.mouth|turn.f1', hints: ['The corridor is square.', 'Count the doors as they turn.', 'A quarter turn. Arch to you, square to it.'] },
    { id: 'obj-bridge', station: 'v-cwest-end', flag: 'surveyorSealed', hints: ['It only uses doors.', 'It must measure every new joint.', 'Let it into the office. Then take the door away.'] },
    { id: 'obj-room-zero', station: 'v-ceast-end', edge: 'lift.far|zero.door', hints: ['The room cannot pass.', 'Something is in its way.', 'Lift away. Room in. Lift back.'] },
  ],
  startVantage: 'v-foyer-start',
  den: 'den',
  armAtVantage: 'v-cwest-end',
  noEnemy: ['zero'],
  tolerances: { positionM: 0.05, angleDeg: 2, snapWindow: 0.15, previewWindow: 0.3 },
  surveyor: { thresholdSec: 1.5, wakeSec: 8, measureSec: 6, blockSec: 4, replanSec: 1.5, retreatSec: 45, braceLimitSec: 10, huntPace: 1.3, countCap: 5, slow: 1 },
};
