// Plays the whole chapter with IWER hands, start to ending, as a player would. Used by RT-15 and the recording.
// Every action is a hand movement or a ray pinch. In-page setup is never used here. Nothing is retried silently:
// a retry is recorded as an observed interaction failure.
import {
  aimAt, fingertip, grabSteps, hand, moveSteps, page, parkHands, pointAndPinch, pointWith, rail, sleepSync, releaseSteps, rigPos, seq, sleep, specs, state, waitIn, xr,
} from './lib.mjs';

export async function playChapter({ log = () => {}, beat = async () => {}, startFresh = true, lookAhead = false, startFrom = undefined, stopAfter = undefined } = {}) {
  const t0 = Date.now();
  const timeline = [];
  const failures = [];
  const T = () => +((Date.now() - t0) / 1000).toFixed(1);
  const mark = (label, extra = {}) => { timeline.push({ t: T(), label, ...extra }); log(`[${String(T()).padStart(6)} s] ${label}`); };

  const quiet = (js, ms) => { try { return !!waitIn(js, ms, js); } catch { return false; } };
  /** Do something with the hands; check it took effect; if not, record the failure and try again (at most twice more). */
  const attempt = async (label, action, check, tries = 3, wait = 4500, park = true) => {
    for (let i = 1; i <= tries; i++) {
      if (label.startsWith('hop to')) {
        // A lamp that is not lit from here (the player was sent back by the Surveyor) is not pressed: nothing would happen.
        const target = label.slice('hop to '.length);
        if (!page(`return __rz.session.reachable().includes('${target}')`)) throw new Error(`${label}: not reachable from ${page('return __rz.session.vantage')}`);
        page('window.__hopCalls = window.__hopCalls || []; window.__hopCalls.length = 0; return 1');
      }
      action();
      if (quiet(check, wait)) { if (i > 1) failures.push({ t: T(), label, note: `needed ${i} attempts` }); return; }
      // What the game saw: did the ray press reach requestHop at all, which hand state was it in, and did the gate refuse?
      const diag = !label.startsWith('hop to') ? page(`const g = __rz, H = g.world.systems.find((x) => x.constructor.name === 'HandInputSystem'); return { hands: H.hands.map((h) => ({ tracked: h.tracked, pinch: h.pinch, hold: h.hold ? h.hold.kind + ':' + h.hold.seam : null })), seams: Object.fromEntries(Object.entries(g.session.seams).map(([k, v]) => [k, v.phase + ':' + v.committed + ':' + v.param.toFixed(2) + ':' + (v.travelHand ?? '-') + '/' + (v.anchorHand ?? '-')])), vantage: g.session.vantage, sv: g.session.surveyor.state, catches: g.session.catches, blocked: g.session.blockedBy ? g.session.blockedBy.by : null }`) : page(`const g = __rz, H = g.world.systems.find((x) => x.constructor.name === 'HandInputSystem'); return { calls: window.__hopCalls.slice(), hands: H.hands.map((h) => ({ tracked: h.tracked, pinch: h.pinch, hold: !!h.hold })), nearGrip: H.nearGrip(g), vantage: g.session.vantage, catches: g.session.catches, reachable: g.session.reachable(), fade: +g.fade.toFixed(2), pending: !!g.pending }`);
      failures.push({ t: T(), label, note: `attempt ${i} had no effect (${check})`, diag });
      if (park) parkHands();
    }
    const now = page(`const g = __rz, s = g.session; return { game: s.game, vantage: s.vantage, checkpoint: s.checkpoint, catches: s.catches, reachable: s.reachable(), sv: { state: s.surveyor.state, room: s.surveyor.room }, fade: +g.fade.toFixed(2), pending: !!g.pending, failed: g.failed }`);
    throw new Error(`${label} failed after ${tries} attempts; state at the end: ${JSON.stringify(now)}; failures so far: ${JSON.stringify(failures)}`);
  };

  const all = specs();
  // Count the game's hop requests (the ray press reaching the game), to tell "the press was lost" from "the gate said no".
  page(`const g = __rz; window.__hopCalls = []; if (!window.__hopWrapped) { window.__hopWrapped = true; const o = g.requestHop.bind(g);
    g.requestHop = (v) => { window.__hopCalls.push({ v, fade: +g.fade.toFixed(3), pending: !!g.pending, reachable: g.session.reachable().includes(v) }); return o(v); }; } return 1`);
  const seamInfo = page(`return __rz.content.seams.map(s => ({ id: s.id, detents: s.detents, ratchet: s.ratchet, latched: s.latched }))`);
  const uOf = (seamId) => {
    const sm = seamInfo.find((s) => s.id === seamId); const st = state().seams[seamId];
    if (sm.ratchet) return 0;
    const lo = sm.detents[0], hi = sm.detents[sm.detents.length - 1];
    return Math.max(0, Math.min(1, (st.p - lo) / (hi - lo)));
  };
  const lamp = (v) => `__rz.beacons.get('${v}').glass`;

  // A lost first press is retried at once with the hand where it is (the emulator quirk of lib.pointAndPinch); each loss is recorded.
  // For a recording only: a sequence turns the emulated head toward its target and leaves it there, so the view is put back
  // to looking along the room. The headset is the test's, not the game's; the game never moves the camera.
  const eyes = () => { if (lookAhead) xr('set-transform', { device: 'headset', orientation: { pitch: -8, yaw: 0, roll: 0 } }); };
  // The encounter's head turns are optional: a full-chapter recording leaves them off (RZ_NO_ENCOUNTER_EYES=1), the configuration that completed the final lift step reliably.
  const encounterEyes = () => { if (!process.env.RZ_NO_ENCOUNTER_EYES) eyes(); };
  const hop = async (v) => { await attempt(`hop to ${v}`, () => pointAndPinch('right', lamp(v)), `__rz.session.vantage === '${v}' && __rz.fade < 0.05`, 4, 2500, false); eyes(); };

  /** Move a seam to a committed detent: brace if it needs it, take the grip where it is, drag along the rail, release. */
  // (Putting the head back after a seam move made the next latched seam, the lift, fail to take its grip in two recordings
  // in a row, so the head is put back after hops only.)
  const moveSeam = (seamId, vantage, toU, detent) => moveSeamRaw(seamId, vantage, toU, detent);
  const moveSeamRaw = (seamId, vantage, toU, detent) => attempt(`${seamId} to detent ${detent}`, () => {
    const sm = seamInfo.find((s) => s.id === seamId); const r = rail(all, seamId, vantage);
    parkHands();
    if (sm.latched) seq(hand('left'), grabSteps(r.anchor)); // (a 1.2 s settle here for recordings did not help and is gone, so a recording runs as the tests do)
    seq(hand('right'), [...grabSteps(r.at(uOf(seamId))), ...moveSteps([r.at(toU)], 0.8), ...releaseSteps(0.25)]);
    // The anchor hand lets go directly (select value 0) instead of with a run-sequence: a hand that has just run a sequence
    // loses its next ray press (lib.pointWith), and the left hand is the one used for the hop that follows.
    if (sm.latched) xr('set-select-value', { device: hand('left'), value: 0 });
  }, `__rz.session.seams['${seamId}'].committed === ${detent} && __rz.session.seams['${seamId}'].phase === 'rest'`);

  // Hops for the finale: the Surveyor is racing, so every command counts. The lamps do not move once the arm has docked
  // (the lift ends where it starts), so both aims are taken before the race, and the left hand points, pose kept.
  let leftPinchReady = false;

  // ---- title and arrival ------------------------------------------------------------------------------------------
  // `startFrom: 'corridor'` skips the first four sequences: the caller has put the game at the corridor checkpoint (a disclosed
  // precondition, used only for the encounter clip of the trailer). The whole-chapter runs never use it.
  if (startFrom !== 'corridor') {
  if (startFresh) {
    page(`const g = __rz; g.command({ type: 'SetSettings', settings: { snapTurn: 0, intensity: 'standard', hands: 'two' } }); g.restart(); g.step(0); g.view(2.1, []); g.command({ type: 'EndSession' }); g.step(0); g.view(0.5, []); return 1`);
    await sleep(2500);
  }
  mark('Title: the envelope and the begin seal');
  await beat('title');
  parkHands();
  await attempt('press the begin seal', () => seq(hand('right'), [...fingertip(`__rz.seals.get('begin').mesh`), { label: 'rest', duration: 0.3 }]), `__rz.session.playing()`, 3, 8000);
  parkHands();
  mark('Sequence 1, The Arrival: fade into the foyer');
  waitIn('__rz.fade < 0.05', 12000);
  await sleep(4000);
  await beat('arrival');

  await hop('v-foyer-door'); mark('hop to the foyer door'); await beat('foyer-door');
  await moveSeam('seam-hall', 'v-foyer-door', 1, 1); mark('seam-hall slid and seated: the stair wing joins'); await beat('stair-joined');
  await hop('v-stair-head'); mark('Sequence 2, The Missing Staircase: top of the stair'); await beat('stair-head');
  if (stopAfter === 'stair') return { timeline, failures, end: state(), seconds: T() };
  await moveSeam('seam-landing', 'v-stair-head', 1, 2); mark('seam-landing braced, pulled and seated'); await beat('landing-docked');
  await hop('v-landing-east'); mark('Sequence 3, The Wrong Door: the Turning Room in view'); await beat('wrong-door');
  await moveSeam('seam-rotunda', 'v-landing-east', 1, 1); mark('seam-rotunda: one quarter turn'); await beat('rotunda-turned');
  await hop('v-turn-centre'); mark('hop into the Turning Room');
  await hop('v-cwest-end');
  }
  mark('Sequence 4, First Surveyor Encounter: the corridor; the Surveyor is armed'); await beat('corridor');

  // ---- the encounter: take the bridge lever, then swing when the Surveyor is on the corridor, and swing back when it is in the office
  const bridge = rail(all, 'seam-bridge', 'v-cwest-end');
  parkHands();
  await attempt('take the bridge lever', () => seq(hand('right'), grabSteps(bridge.at(0))), `__rz.session.seams['seam-bridge'].phase === 'held'`);
  mark('holding the bridge lever; the Surveyor wakes and counts');
  encounterEyes(); // recording only: look down the corridor, where the Surveyor will appear, while the lever is held
  waitIn(`__rz.session.surveyor.room === 'c-east' && !__rz.session.surveyor.crossing`, 60000, 'Surveyor in the East Corridor');
  mark('the Surveyor is in the East Corridor: swing the bridge'); await beat('surveyor-seen');
  seq(hand('right'), [...moveSteps([bridge.at(1)], 0.7), ...releaseSteps(0.25)]);
  waitIn(`__rz.session.seams['seam-bridge'].committed === 1 && __rz.session.seams['seam-bridge'].phase === 'rest'`, 8000, 'bridge swung');
  mark('bridge seated against the Dead Letter Office; the Surveyor turns to the new joint');
  encounterEyes();
  parkHands();
  // RZ_LEFT_SECOND=1 (recordings): the second grab and the swing back use the left hand, which has not just run a sequence. The
  // right hand's next grab was lost often enough that the Surveyor left the office before the bridge came back.
  const second = process.env.RZ_LEFT_SECOND ? 'left' : 'right';
  await attempt('take the bridge lever again', () => seq(hand(second), grabSteps(bridge.at(1))), `__rz.session.seams['seam-bridge'].phase === 'held'`);
  encounterEyes();
  waitIn(`__rz.session.surveyor.room === 'dead-letter' && !__rz.session.surveyor.crossing`, 60000, 'Surveyor in the office');
  mark('the Surveyor is inside the office: swing the bridge back'); await beat('surveyor-in-office');
  // RZ_FAST_SWING=1 (recordings): the swing back is quick, because the Surveyor measures in the office for only about 6 s and
  // each emulator command costs about 1.4 s; two full recordings lost that race by a few seconds.
  seq(hand(second), [...moveSteps([bridge.at(0)], process.env.RZ_FAST_SWING ? 0.3 : 0.7), ...releaseSteps(process.env.RZ_FAST_SWING ? 0.12 : 0.25)]);
  waitIn(`__rz.session.seams['seam-bridge'].committed === 0 && __rz.session.seams['seam-bridge'].phase === 'rest'`, 8000, 'bridge back');
  waitIn(`__rz.session.flags.surveyorSealed`, 20000, 'office sealed');
  mark('office sealed: the Surveyor has no route'); await beat('sealed');
  if (stopAfter === 'sealed') return { timeline, failures, end: state(), seconds: T() };
  parkHands();
  await hop('v-bridge-mid'); await hop('v-ceast-west'); mark('across the bridge to the East Corridor');
  await hop('v-ceast-end'); mark('Sequence 5, Room Zero: the lift and the crane arm'); await beat('final-puzzle');

  const aimLift = aimAt('left', lamp('v-lift')); // from this vantage; the lift is at the detent it will return to
  await moveSeam('seam-lift', 'v-ceast-end', 0, 0); mark('seam-lift raised out of the way'); await beat('lift-away');
  await moveSeam('seam-arm', 'v-ceast-end', 1, 1); mark('seam-arm: Room Zero swung in'); await beat('arm-docked');
  let aimZero; // taken from the lift, see the race loop
  await moveSeam('seam-lift', 'v-ceast-end', 0.5, 1); mark('seam-lift lowered: the round doors meet; the house is closing'); // no screenshot here: from now on the Surveyor is racing for the lift
  // The Surveyor is racing for the lift. If it reaches the player's vantage the game returns them to the last postmark
  // (REQ-FAIL), and the player tries again from there. Each lost race is recorded, not hidden.
  // The Surveyor needs about 9 s from the dock to the player's vantage in this corridor and about 17 s to the lift, so this
  // loop spends one page call and one press per step and keeps nothing else in the way. State-driven: whatever the vantage
  // is (the start of the race, or the postmark after a catch), press the lamp that leads on.
  const race = { presses: 0, noEffect: 0, caught: 0 };
  const raceEnd = Date.now() + 240000;
  let vantage = page('return __rz.session.vantage');
  while (vantage !== 'v-zero') {
    if (Date.now() > raceEnd) throw new Error(`no arrival in Room Zero after ${race.presses} presses; caught ${race.caught} times; failures: ${JSON.stringify(failures)}`);
    const before = vantage;
    if (vantage === 'v-ceast-end' || vantage === 'v-lift') {
      race.presses++;
      // An aim is in the rig's own space, and the rig moves with each hop, so the aim for Room Zero is taken once, from the lift.
      if (vantage === 'v-lift' && !aimZero) aimZero = aimAt('left', lamp('v-zero'));
      pointWith('left', vantage === 'v-ceast-end' ? aimLift : aimZero, 300, !leftPinchReady); leftPinchReady = true;
    } else await sleep(500);
    const now = page(`const s = __rz.session; return { v: s.vantage, c: s.catches, pending: !!__rz.pending, fade: __rz.fade }`);
    if (now.c > race.caught) { race.caught = now.c; mark(`caught by the Surveyor (${now.c} so far): sent back to the last postmark; trying the lift again`); }
    if (now.v === before && !now.pending && now.fade < 0.05 && (before === 'v-ceast-end' || before === 'v-lift')) { race.noEffect++; failures.push({ t: T(), label: `fast hop from ${before}`, note: 'press had no effect' }); }
    vantage = now.v;
  }
  mark(`into Room Zero (${race.presses} presses, ${race.noEffect} without effect, caught ${race.caught} times)`); await beat('room-zero');

  // ---- the letter ------------------------------------------------------------------------------------------------------
  parkHands();
  const letterAt = rigPos('__rz.letter'); const slot = rigPos('__rz.built.pigeonhole');
  await attempt('take the letter', () => seq(hand('right'), grabSteps(letterAt)), `__rz.session.letter === 'held'`, 3, 3000);
  mark('letter in hand');
  seq(hand('right'), [...moveSteps([[slot[0] * 0.5 + letterAt[0] * 0.5, slot[1], slot[2] * 0.5 + letterAt[2] * 0.5], slot], 0.9), { label: 'hold at pigeonhole 0', duration: 0.5 }, ...releaseSteps(0.3)]);
  waitIn(`__rz.session.letter === 'delivered'`, 6000, 'letter delivered');
  mark('letter delivered into pigeonhole 0'); parkHands();
  waitIn(`__rz.session.ending && __rz.session.ending.step >= 3`, 40000, 'card');
  mark('the card: You are the return address.'); await beat('card');
  waitIn(`__rz.session.game === 'ChapterComplete'`, 60000, 'ChapterComplete');
  mark('ChapterComplete: title card'); await beat('complete');
  const end = state();
  return { timeline, failures, end, seconds: T() };
}
