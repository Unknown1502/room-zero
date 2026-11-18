// The running game: owns the session, the built house and everything drawn or heard.
// The Game Director part (command, step) is the only caller of GameSession.apply and tick.
// Presentation reads the session and its events; it never decides a rule.
import {
  AudioSource, AudioUtils, BackSide, BoxGeometry, DirectionalLight, EdgesGeometry, FogExp2, Group, HemisphereLight, LineBasicMaterial,
  LineSegments, Mesh, MeshBasicMaterial, PlaneGeometry, PointLight, RayInteractable, SphereGeometry, CircleGeometry, TorusGeometry, Vector3,
  type Entity, type Object3D, type World,
} from '@iwsdk/core';
import { Beacon, Seal } from '../components/game.js';
import { replayReference } from '../domain/reference.js';
import { GameSession } from '../domain/session.js';
import { TICK_SEC, type ChapterContent, type Command, type CommandResult, type DomainEvent, type SeamDef, type Settings } from '../domain/types.js';
import { load, write, writeSettings, type Storage } from '../persistence/save.js';
import { RAILS, buildBeacon, buildHouse, buildStation, type Built, type Station } from '../world/build.js';
import { C, box, emissive, mat, plane, textTexture } from '../world/kit.js';
import { SurveyorFigure, type Pose } from '../world/surveyor-model.js';
import { canRequestHop, canRequestSnapTurn, placePlayerAtWorldAnchor, registerBeaconHierarchy, resolveWorldPoint, rotatePlayerAroundHead } from './navigation.js';
import { ACTION_SEAL_Y } from './interaction-layout.js';

const MAX_STEPS = 5;
const v3 = () => new Vector3();

interface Sound { entity: Entity; obj: Group; base: number }

export class Game {
  readonly session: GameSession;
  readonly built: Built;
  /** ECS entities for room roots, used to preserve their hierarchy in interactable children. */
  readonly moduleEntities = new Map<string, Entity>();
  /** ECS group entities for beacon hierarchy diagnostics and parent-preserving transforms. */
  readonly beaconGroupEntities = new Map<string, Entity>();
  readonly stations: Station[] = [];
  readonly beacons = new Map<string, { group: Group; glass: Mesh; entity: Entity }>();
  readonly seals = new Map<string, { mesh: Mesh; entity: Entity }>();
  readonly turnMarkers = new Map<'left' | 'right', Group>();
  readonly settingSeals = new Map<string, Mesh>();
  readonly figure = new SurveyorFigure();
  readonly letter: Mesh;
  readonly events: DomainEvent[] = [];
  readonly notice: boolean;
  /** Drawn seam parameters: chase the rules' values with weight. Presentation only. */
  readonly drawn: Record<string, number> = {};
  fade = 1;
  private fadeTarget = 1;
  private fadeRate = 4;
  private pending: { kind: 'hop'; vantage: string } | { kind: 'turn'; side: 'left' | 'right'; yaw: number } | { kind: 'intro' } | undefined;
  private introWait = 0;
  private acc = 0;
  private time = 0;
  private fadeMesh: Mesh;
  private sounds = new Map<string, Sound>();
  private knocks: number[] = [];
  private glowFlash = new Map<string, number>();
  private jitter = new Map<string, number>();
  private lastEdge: string | undefined;
  private chalk: Mesh[] = [];
  private chalkTime = 0;
  /** Short near-field prompts for the first three actions. Each shows only while its action is still undone. */
  private prompts: { mesh: Mesh; show: () => boolean; alpha: number; head: boolean }[] = [];
  private lastReach: string[] = [];
  private lastVantage = '';
  private lampPulse = new Map<string, number>();
  private frameDt = 0.016;
  private blockBox: LineSegments;
  private stationLight = new PointLight(C.lamp, 0, 16, 1.6);
  private goalLight = new PointLight(C.lamp, 0, 22, 1.6);
  private rigGroup = new Group();
  private letterTex = '';
  private settingStamp = '';
  private errorCard: Mesh;
  /** Shown after 5 s without a tracked hand. Public so runtime tests can read it. */
  readonly handsCard: Mesh;
  private noHands = 0;
  readonly errorRetry: Mesh;
  private stepTimer = 0;
  private scratch = { a: v3(), b: v3(), c: v3(), d: v3() };
  readonly stats = { ticks: 0, stepMs: 0, viewMs: 0, frames: 0 };

  constructor(readonly world: World, readonly content: ChapterContent, private storage: Storage) {
    const loaded = load(storage, content, replayReference);
    this.notice = loaded.notice;
    this.session = new GameSession(content, loaded.settings, loaded.save);
    this.built = buildHouse(content);
    for (const sm of content.seams) this.drawn[sm.id] = sm.detents[sm.initial];

    const scene = world.scene;
    scene.fog = new FogExp2(C.void, 0.017);
    const add = (o: Object3D) => world.createTransformEntity(o, { persistent: true });
    for (const [id, g] of this.built.modules) this.moduleEntities.set(id, add(g));
    add(this.built.statics);
    add(new HemisphereLight(C.moon, 0x1a1410, 0.5));
    const moon = new DirectionalLight(C.moon, 0.55); moon.position.set(-30, 60, 40); add(moon);
    add(this.stationLight); add(this.goalLight);
    add(this.figure.root); this.figure.root.visible = false;
    add(this.rigGroup);
    for (const side of ['left', 'right'] as const) {
      const marker = new Group();
      marker.position.set(side === 'left' ? -0.43 : 0.43, 1.03, -0.48);
      const ring = new Mesh(new TorusGeometry(0.026, 0.003, 8, 24), new MeshBasicMaterial({ color: C.brassLit, side: 2, fog: false }));
      const glyph = new Mesh(new CircleGeometry(0.019, 24), new MeshBasicMaterial({ map: textTexture([{ text: side === 'left' ? 'Ã¢â‚¬Â¹' : 'Ã¢â‚¬Âº', size: 82, y: 105, color: '#f3d9c8' }], 128, 128, '#493719'), side: 2, fog: false }));
      glyph.position.z = 0.002;
      marker.add(ring, glyph);
      marker.visible = false;
      this.rigGroup.add(marker);
      this.turnMarkers.set(side, marker);
    }

    for (const spec of RAILS) {
      const st = buildStation(spec);
      const v = content.vantages.find((x) => x.id === spec.vantage)!;
      st.group.position.set(v.x, v.y, v.z);
      st.group.rotation.y = v.worldYaw;
      this.built.modules.get(v.module)!.add(st.group);
      this.stations.push(st);
    }
    for (const v of content.vantages) {
      const b = buildBeacon();
      const [sx, sz] = [Math.cos(v.worldYaw) * 0.75, -Math.sin(v.worldYaw) * 0.75];
      b.group.position.set(v.x + sx, v.y, v.z + sz);
      const moduleEntity = this.moduleEntities.get(v.module)!;
      const { groupEntity, targetEntity: entity } = registerBeaconHierarchy(world, moduleEntity, b.group, b.target);
      this.beaconGroupEntities.set(v.id, groupEntity);
      entity.addComponent(RayInteractable);
      entity.addComponent(Beacon, { vantage: v.id });
      this.beacons.set(v.id, { group: b.group, glass: b.glass, entity });
    }
    for (const action of ['begin', 'continue', 'again', 'leave']) {
      const mesh = new Mesh(new CircleGeometry(0.05, 24), new MeshBasicMaterial({ map: textTexture([{ text: action === 'begin' ? 'BEGIN' : action === 'continue' ? 'CONTINUE' : action === 'again' ? 'AGAIN' : 'LEAVE', size: 44, y: 142, color: '#f3d9c8', font: 'Georgia, serif' }], 256, 256, '#7d1f1a'), fog: false }));
      mesh.visible = false;
      const entity = world.createTransformEntity(mesh, { persistent: true });
      entity.addComponent(RayInteractable);
      entity.addComponent(Seal, { action });
      this.seals.set(action, { mesh, entity });
    }

    this.letter = plane(0.2, 0.14, new MeshBasicMaterial({ fog: false, side: 2 }), 0);
    this.letter.rotation.set(-0.9, 0, 0);
    this.rigGroup.add(this.letter);

    // First-time-player prompts (visual and UX QA): a new player in the headset had no in-world hint for the first three
    // actions; the page text before entering VR is gone by then. Two short lines on a paper card, near-field, only while the
    // matching action is still to do. They are not interactive and do not replace the letter's tiered hints.
    const addPrompt = (a: string, b: string, y: number, z: number, show: () => boolean, head = true): void => {
      const m = new Mesh(new PlaneGeometry(0.36, 0.113), new MeshBasicMaterial({
        map: textTexture([{ text: a, size: 48, y: 70, color: '#2b1a0a' }, { text: b, size: 36, y: 122, color: '#5a4a2e' }], 512, 160, '#efe5cc'),
        transparent: true, opacity: 0, fog: false, depthWrite: false,
      }));
      m.position.set(0, y, z); m.rotation.set(-0.5, 0, 0); m.renderOrder = 5; m.visible = false;
      this.rigGroup.add(m);
      this.prompts.push({ mesh: m, show, alpha: 0, head });
    };
    const st = () => this.session;
    addPrompt('Touch a seal.', 'A fingertip is enough.', ACTION_SEAL_Y - 0.125, -0.45, () => st().game === 'Title' && this.fade < 0.5, false);
    addPrompt('Point at the lit lamp.', 'Pinch to go there.', 1.28, -0.66, () => st().playing() && st().vantage === 'v-foyer-start' && st().postmarks.length <= 1);
    addPrompt('Pinch the brass grip.', 'Slide it along the rail.', 1.28, -0.66, () => st().playing() && st().vantage === 'v-foyer-door' && st().seams['seam-hall'].committed === 0 && st().seams['seam-hall'].phase === 'rest');
    addPrompt('Brace with one hand.', 'Pull with the other.', 1.28, -0.66, () => st().playing() && st().vantage === 'v-stair-head' && st().seams['seam-landing'].committed < 2 && st().seams['seam-landing'].phase === 'rest');
    const sealPositions: Record<string, [number, number]> = { turn: [-0.055, 0.033], intensity: [0.055, 0.033], hands: [-0.055, -0.033], restart: [0.055, -0.033] };
    for (const [name, [x, y]] of Object.entries(sealPositions)) {
      const seal = new Mesh(new CircleGeometry(0.015, 24), new MeshBasicMaterial({ side: 2, transparent: true, fog: false }));
      seal.position.set(x, y, 0.004);
      seal.renderOrder = 2;
      this.letter.add(seal);
      this.settingSeals.set(name, seal);
    }
    for (let i = 0; i < 5; i++) { const m = box(0.012, 0.07, 0.004, emissive(C.chalk, 0.9), -0.08 + i * 0.04, 1.32, -0.62); m.visible = false; this.chalk.push(m); this.rigGroup.add(m); }
    this.blockBox = new LineSegments(new EdgesGeometry(new BoxGeometry(1, 1, 1)), new LineBasicMaterial({ color: C.ash, fog: false }));
    this.blockBox.visible = false; add(this.blockBox);

    this.fadeMesh = new Mesh(new SphereGeometry(0.3, 16, 12), new MeshBasicMaterial({ color: 0x000000, side: BackSide, transparent: true, opacity: 1, depthTest: false, depthWrite: false, fog: false }));
    this.fadeMesh.renderOrder = 999; this.fadeMesh.frustumCulled = false;
    world.camera.add(this.fadeMesh);

    this.errorCard = new Mesh(new PlaneGeometry(0.46, 0.28), new MeshBasicMaterial({
      map: textTexture([
        // Lines sit above the RETRY seal, which covers texture rows 157 to 252 (visual QA, issue V4: the third line ran under it).
        { text: 'HOUSE INTERRUPTED', size: 34, y: 56, color: '#f0d9b0' },
        { text: 'Something went wrong.', size: 28, y: 100, color: '#e9dfc8' },
        { text: 'Touch the brass seal to restart.', size: 24, y: 138, color: '#c9c2b3' },
      ], 512, 256, '#21191b'), fog: false, depthTest: false, side: 2,
    }));
    this.errorCard.position.set(0, -0.01, -0.58);
    this.errorCard.renderOrder = 1000;
    this.errorCard.visible = false;
    world.camera.add(this.errorCard);
    this.errorRetry = new Mesh(new CircleGeometry(0.052, 32), new MeshBasicMaterial({
      map: textTexture([{ text: 'RETRY', size: 31, y: 82, color: '#f3d9c8' }], 128, 128, '#7d1f1a'),
      fog: false, depthTest: false, side: 2,
    }));
    this.errorRetry.position.set(0, -0.084, 0.003);
    this.errorRetry.renderOrder = 1001;
    this.errorCard.add(this.errorRetry);

    // REQ-INPUT-010: if hand tracking is not available the player is told how to enable it, and that controllers work.
    this.handsCard = new Mesh(new PlaneGeometry(0.46, 0.27), new MeshBasicMaterial({
      map: textTexture([
        { text: 'NO HANDS FOUND', size: 34, y: 66, color: '#3a2412' },
        { text: 'Put the controllers down, or turn on', size: 25, y: 118, color: '#3a2412' },
        { text: 'hand tracking in the headset settings.', size: 25, y: 150, color: '#3a2412' },
        { text: 'Controllers still work.', size: 25, y: 200, color: '#56462e' },
      ], 512, 256, '#e9dfc8'), fog: false, depthTest: false, side: 2,
    }));
    this.handsCard.position.set(0, 0.02, -0.6);
    this.handsCard.renderOrder = 1000;
    this.handsCard.visible = false;
    world.camera.add(this.handsCard);

    const snd = (name: string, positional: boolean, loop = false, base = 1) => {
      const obj = new Group();
      const entity = world.createTransformEntity(obj, { persistent: true });
      entity.addComponent(AudioSource, { src: `./audio/${name}.wav`, positional, loop, volume: loop ? 0 : base, refDistance: 6, rolloffFactor: 1, maxDistance: 400, maxInstances: loop ? 1 : 4, playbackMode: loop ? 'restart' : 'overlap' });
      this.sounds.set(name, { entity, obj, base });
    };
    for (const n of ['knock', 'tape', 'tape-long', 'pulse', 'pencil', 'plumb', 'step', 'strain', 'thud', 'groan', 'block', 'clank', 'lock']) snd(n, true);
    snd('grind', true, true, 0.9);
    for (const n of ['rattle', 'clack', 'ratchet', 'creak', 'brass', 'paper', 'stamp', 'pen', 'wax', 'lamp', 'hop', 'flap', 'title', 'chord']) snd(n, false, false, 0.7);
    snd('hum', false, true, 0.25); snd('tone', false, true, 0.35); snd('closing', false, true, 0.6);

    this.placeRig();
    this.drawLetter();
  }

  // ------------------------------------------------------------------ director
  /** Apply a command now. Input systems run before the simulation step, so order within a frame is fixed. */
  command(c: Command): CommandResult {
    return this.session.apply(c);
  }

  /** Fixed 50 ms steps from an accumulator; at most five per frame (REQ-STATE-004). Then drain events once. */
  step(delta: number): void {
    if (this.failed) return;
    const t0 = performance.now();
    this.acc = Math.min(this.acc + delta, 0.25);
    let n = 0;
    while (this.acc >= TICK_SEC && n < MAX_STEPS) { this.session.tick(); this.acc -= TICK_SEC; n++; }
    this.stats.ticks += n;
    this.events.length = 0;
    for (const e of this.session.drainEvents()) this.events.push(e);
    for (const e of this.events) this.on(e);
    this.stats.stepMs = performance.now() - t0;
  }

  returnToTitle(): void { this.command({ type: 'EndSession' }); }

  /** Reset the chapter and presentation together; shared by the web and in-world retry controls. */
  restart(): boolean {
    this.failed = false;
    this.errorCard.visible = false;
    this.pending = undefined;
    this.introWait = 0;
    this.fade = this.fadeTarget = 1;
    this.fadeRate = 4;
    const result = this.command({ type: 'Restart' });
    if (!result.ok) return false;
    this.snapDrawn();
    this.placeRig();
    this.drawLetter();
    return true;
  }

  /** An uncaught error in the rules: stop the simulation, say so, offer a restart. Never a frozen frame (REQ-REL-003). */
  failed = false;
  fail(err: unknown): void {
    if (this.failed) return;
    this.failed = true;
    console.error('Room Zero stopped:', err, 'state', this.session.hash());
    this.pending = undefined;
    // view() returns early while failed, so nothing would ever lower a loop that was running (a seam grinding when the failure came
    // kept grinding under the error card). Silence every loop but the quiet ambient tone; view() raises the others again after a restart.
    for (const name of [...this.loops.keys()]) if (name !== 'tone') this.setLoop(name, 0);
    this.fadeTarget = 0.3; this.fadeRate = 2;
    this.errorCard.visible = true;
    const el = document.getElementById('status');
    if (el) el.textContent = 'Something went wrong in the house. Touch the brass seal in VR or choose Begin again to restart.';
  }

  requestHop(vantage: string): void {
    if (!canRequestHop({ pending: !!this.pending, fade: this.fade, playing: this.session.playing(), reachable: this.session.reachable() }, vantage)) return;
    this.pending = { kind: 'hop', vantage };
    this.fadeTarget = 1; this.fadeRate = 1 / 0.2;
  }

  requestSnapTurn(side: 'left' | 'right'): boolean {
    if (!canRequestSnapTurn({ pending: !!this.pending, fade: this.fade, playing: this.session.playing(), snapTurn: this.session.settings.snapTurn })) return false;
    const direction = side === 'left' ? 1 : -1;
    this.pending = { kind: 'turn', side, yaw: direction * this.session.settings.snapTurn * Math.PI / 180 };
    this.fadeTarget = 1;
    this.fadeRate = 20; // 50 ms out + 50 ms back in.
    return true;
  }

  pressSetting(name: string): boolean {
    const current = this.session.settings;
    let settings: Partial<Settings>;
    if (name === 'turn') settings = { snapTurn: current.snapTurn === 0 ? 30 : current.snapTurn === 30 ? 45 : 0 };
    else if (name === 'intensity') settings = { intensity: current.intensity === 'standard' ? 'reduced' : 'standard' };
    else if (name === 'hands') settings = { hands: current.hands === 'two' ? 'one' : 'two' };
    else return false;
    const result = this.command({ type: 'SetSettings', settings });
    if (result.ok) this.play('wax');
    return result.ok;
  }

  pressSeal(action: string): void {
    const g = this.session.game;
    if (action === 'begin' && g === 'Title') this.command({ type: 'Begin', mode: 'new' });
    else if (action === 'continue' && g === 'Title') this.command({ type: 'Begin', mode: 'continue' });
    else if (action === 'again' && g === 'ChapterComplete') this.command({ type: 'AckEnding', choice: 'again' });
    else if (action === 'leave' && g === 'ChapterComplete') { this.command({ type: 'AckEnding', choice: 'leave' }); this.world.exitXR(); }
    else return;
    this.play('wax');
  }

  // ------------------------------------------------------------------ events
  private on(e: DomainEvent): void {
    const s = this.session;
    switch (e.type) {
      case 'GameStateChanged':
        if (e.to === 'ChapterIntro') { this.fade = this.fadeTarget = 1; this.pending = { kind: 'intro' }; this.introWait = 0.5; this.snapDrawn(); this.placeRig(); this.drawLetter(); if (s.checkpoint === 'cp-arrival') this.play('flap'); }
        if (e.to === 'Title') { this.fadeTarget = 0; this.fadeRate = 1; this.snapDrawn(); this.placeRig(); }
        if (e.to === 'Pause') this.setLoop('grind', 0);
        if (e.to === 'ChapterComplete') this.play('title');
        break;
      case 'PlayerCaught': this.fadeTarget = 1; this.fadeRate = 1; this.playAt('tape-long', this.figure.root); break;
      case 'SaveRequested': write(this.storage, e.data); break;
      case 'SettingsChanged': writeSettings(this.storage, e.settings); break;
      case 'GripTaken': this.play('creak'); break;
      case 'GripRefused': this.jitter.set(e.seam, 0.35); if (e.reason === 'Latched') this.play('rattle'); else if (e.reason === 'HeldBySurveyor') this.play('creak'); break;
      case 'LatchChanged': this.play('clack'); break;
      case 'SeamLimit': this.play('clack', 0.4); break;
      case 'SeamBlocked': this.playAt('block', this.built.modules.get(e.by)!); break;
      case 'SeamFrozen': this.play('clack'); break;
      case 'SeamReleased': if (e.kind === 'return') this.playAt('groan', this.moduleOf(e.seam)); if (s.house.seamById.get(e.seam)!.ratchet && e.kind === 'snap') this.play('ratchet'); break;
      case 'SeamRested': if (e.opened > 0 || s.seams[e.seam].committed === e.detent) this.playAt('thud', this.moduleOf(e.seam), e.opened > 0 ? 1 : 0.45); break;
      case 'PairRefused': this.playAt('clank', this.moduleOf(s.house.seamOfModule.get(s.house.socketById.get(e.a)!.module.id)?.id ?? s.house.seamOfModule.get(s.house.socketById.get(e.b)!.module.id)!.id)); break;
      case 'GraphChanged': for (const id of e.opened) this.glowFlash.set(id, 2.2); break; // held at full for about a second, then fades
      case 'EdgeUnlocked': this.playAt('lock', this.built.modules.get('dead-letter')!); break;
      case 'VantagesChanged': {
        // A lamp that has just become reachable because a seam joined something pulses for a moment, so the eye goes to the new way
        // on. Not after a hop, when every neighbouring lamp is new.
        const hopped = this.lastVantage !== s.vantage; this.lastVantage = s.vantage;
        if (!hopped) for (const v of e.reachable) if (!this.lastReach.includes(v)) this.lampPulse.set(v, 2.6);
        this.lastReach = [...e.reachable];
        this.play('lamp', 0.5);
        break;
      }
      case 'PlayerHopped': this.play('hop'); break;
      case 'LetterStateChanged': this.play('paper'); if (e.state === 'delivered') this.play('wax'); break;
      case 'CheckpointReached': this.play('stamp'); this.drawLetter(); break;
      case 'HintShown': this.play('pen'); this.drawLetter(); break;
      case 'CheckpointRestored': this.drawLetter(); break;
      case 'FlagSet': if (e.flag === 'houseClosing') this.setLoop('closing', 0.6); break;
      case 'SurveyorLoggedJoint': this.playAt('knock', this.built.modules.get('den')!, 0.5); break;
      case 'SurveyorCount': for (let i = 0; i < e.n; i++) this.knocks.push(this.time + 0.3 + i * 0.6); this.showChalk(e.n); break;
      case 'SurveyorNoRoute': this.playAt('tape-long', this.figure.root); this.showChalk(0); break;
      case 'SurveyorCrossingStarted': this.lastEdge = e.edge; break;
      case 'SurveyorMeasuring': this.playAt('pencil', this.figure.root); this.playAt('tape', this.figure.root); break;
      case 'SurveyorBracing': this.playAt('strain', this.figure.root); break;
      case 'SurveyorStateChanged':
        if (e.to === 'Listening') { this.playAt('tape', this.built.modules.get('den')!); this.playAt('pencil', this.built.modules.get('den')!); }
        if (e.to === 'Blocked') this.playAt('plumb', this.figure.root);
        break;
      case 'EndingStep':
        if (e.step === 2) this.play('wax');
        if (e.step === 3) { this.built.card.visible = true; this.play('paper'); this.setLoop('chord', 0); }
        if (e.step === 6) this.setLoop('closing', 0.9);
        if (e.step === 7) this.built.titleCard.visible = true;
        break;
      default: break;
    }
  }

  private moduleOf(seamId: string): Object3D { return this.built.modules.get(this.session.house.seamById.get(seamId)!.moves)!; }

  // ------------------------------------------------------------------ audio
  private volumeFor(obj: Object3D | undefined, base: number): number {
    const vol = base * this.session.settings.volume;
    if (!obj) return vol;
    let room: string | undefined;
    for (const [id, g] of this.built.modules) { let o: Object3D | null = obj; while (o) { if (o === g) room = id; o = o.parent; } }
    if (obj === this.figure.root) room = this.session.surveyor.room;
    if (!room) return vol;
    const doors = this.session.audioDoorways(room);
    // Through walls: about 6 dB down per doorway beyond the first; never silent (REQ-AUDIO-003).
    return doors === undefined ? vol * 0.12 : vol * Math.max(0.12, Math.pow(0.5, Math.max(0, doors - 1)));
  }

  play(name: string, gain = 1): void {
    const s = this.sounds.get(name);
    if (!s) return;
    AudioUtils.setVolume(s.entity, s.base * gain * this.session.settings.volume);
    AudioUtils.play(s.entity);
  }

  playAt(name: string, at: Object3D, gain = 1): void {
    const s = this.sounds.get(name);
    if (!s) return;
    at.getWorldPosition(s.obj.position);
    s.obj.position.y += 2;
    AudioUtils.setVolume(s.entity, this.volumeFor(at, s.base * gain));
    AudioUtils.play(s.entity);
  }

  private loops = new Map<string, number>();
  private setLoop(name: string, vol: number): void {
    const s = this.sounds.get(name);
    if (!s) return;
    const was = this.loops.get(name) ?? 0;
    if (vol > 0 && was === 0) AudioUtils.play(s.entity);
    if (Math.abs(vol - was) > 0.01 || (vol === 0 && was !== 0)) AudioUtils.setVolume(s.entity, vol * this.session.settings.volume);
    this.loops.set(name, vol);
  }

  /** Called from the Enter VR gesture and whenever the session becomes visible (REQ-AUDIO-004). */
  startAudio(): void {
    this.loops.clear();
    this.setLoop('tone', 0.35);
  }

  // ------------------------------------------------------------------ rig
  vantageWorld(id: string, out: Vector3): Vector3 {
    const v = this.content.vantages.find((x) => x.id === id)!;
    const g = this.built.modules.get(v.module)!;
    return resolveWorldPoint(g, v.x, v.y, v.z, out);
  }

  placeRig(): void {
    const v = this.content.vantages.find((x) => x.id === this.session.vantage)!;
    const anchor = this.vantageWorld(v.id, this.scratch.a);
    const placement = placePlayerAtWorldAnchor(this.world.player, this.world.player.head, anchor, v.worldYaw);
    if (placement.headError > 0.02) throw new Error(`Viewpoint placement missed ${v.id} by ${placement.headError.toFixed(3)} m`);
    this.world.player.getWorldPosition(this.rigGroup.position);
    this.world.player.getWorldQuaternion(this.rigGroup.quaternion);
  }

  /** Put every room exactly where the rules say, with no animation. After a restore or restart. */
  snapDrawn(): void {
    for (const sm of this.content.seams) this.drawn[sm.id] = this.session.seams[sm.id].param;
    this.built.card.visible = false;
    this.built.titleCard.visible = false;
    this.figure.root.visible = false;
    this.lastEdge = undefined;
    this.setLoop('closing', this.session.flags.houseClosing ? 0.6 : 0);
    this.poseModules();
  }

  private poseModules(): void {
    for (const sm of this.content.seams) {
      const p = this.session.house.poseAt(sm.moves, this.drawn[sm.id]);
      const g = this.built.modules.get(sm.moves)!;
      g.position.set(p.x, p.y, p.z);
      g.rotation.y = p.yaw;
    }
    for (const m of this.content.modules) if (!this.session.house.seamOfModule.has(m.id)) { const g = this.built.modules.get(m.id)!; g.position.set(m.base.x, m.base.y, m.base.z); g.rotation.y = m.base.yaw; }
  }

  // ------------------------------------------------------------------ view
  view(dt: number, hands: { pos: Vector3; tracked: boolean; isHand?: boolean }[]): void {
    const t0 = performance.now();
    const s = this.session;
    this.time += dt;
    this.frameDt = dt;
    this.stats.frames++;

    // After 5 s in a session with no tracked hand, say so. An empty list means "unknown" (tests step the view directly).
    if (!this.world.session) this.noHands = 0;
    else if (hands.length > 0) this.noHands = hands.some((h) => h.tracked && h.isHand) ? 0 : this.noHands + dt;
    this.handsCard.visible = this.noHands >= 5 && !this.failed;

    if (this.failed) {
      this.fade += Math.sign(this.fadeTarget - this.fade) * Math.min(Math.abs(this.fadeTarget - this.fade), this.fadeRate * dt);
      (this.fadeMesh.material as MeshBasicMaterial).opacity = this.fade;
      this.fadeMesh.visible = this.fade > 0.003;
      this.errorCard.visible = true;
      this.stats.viewMs = performance.now() - t0;
      return;
    }

    // fade and the things that happen behind it
    if (this.pending?.kind === 'intro') { this.introWait -= dt; if (this.introWait <= 0) { this.command({ type: 'IntroDone' }); this.pending = undefined; this.fadeTarget = 0; this.fadeRate = s.checkpoint === 'cp-arrival' ? 0.5 : 1 / 0.6; } }
    this.fade += Math.sign(this.fadeTarget - this.fade) * Math.min(Math.abs(this.fadeTarget - this.fade), this.fadeRate * dt);
    if (this.pending?.kind === 'hop' && this.fade >= 0.999) {
      this.command({ type: 'Hop', vantage: this.pending.vantage });
      this.placeRig();
      this.pending = undefined; this.fadeTarget = 0; this.fadeRate = 1 / 0.25;
    } else if (this.pending?.kind === 'turn' && this.fade >= 0.999) {
      rotatePlayerAroundHead(this.world.player, this.world.player.head, this.pending.yaw);
      this.world.player.getWorldPosition(this.rigGroup.position);
      this.world.player.getWorldQuaternion(this.rigGroup.quaternion);
      this.pending = undefined; this.fadeTarget = 0; this.fadeRate = 20;
    }
    const paused = s.game === 'Pause';
    (this.fadeMesh.material as MeshBasicMaterial).opacity = Math.max(this.fade, paused ? 0.7 : 0);
    this.fadeMesh.visible = this.fade > 0.003 || paused;

    // rooms follow the rules' parameters with weight: speed-capped, never leading (REQ-COMFORT-006)
    let speed = 0; let mover: Object3D | undefined;
    for (const sm of this.content.seams) {
      let target = s.seams[sm.id].param;
      const cyc = sm.path.kind === 'rotary' && sm.path.cyclic;
      if (cyc) { while (target - this.drawn[sm.id] > 0.5) this.drawn[sm.id] += 1; while (this.drawn[sm.id] - target > 0.5) this.drawn[sm.id] -= 1; }
      const cap = sm.path.kind === 'rotary' ? (Math.PI / 3) / Math.abs(sm.path.angle) : 1 / 1.2;
      const d = target - this.drawn[sm.id];
      const stepv = Math.sign(d) * Math.min(Math.abs(d), cap * dt, Math.abs(d) * Math.min(1, dt * 9) + 0.0005);
      this.drawn[sm.id] += stepv;
      if (Math.abs(stepv) / Math.max(dt, 1e-4) > speed) { speed = Math.abs(stepv) / Math.max(dt, 1e-4); mover = this.built.modules.get(sm.moves); }
    }
    this.poseModules();
    const grind = this.sounds.get('grind')!;
    if (mover && speed > 0.02 && !paused) { mover.getWorldPosition(grind.obj.position); this.setLoop('grind', Math.min(0.9, 0.25 + speed * 1.2) * (this.volumeFor(mover, 1))); } else this.setLoop('grind', 0);
    this.setLoop('hum', s.preview ? 0.1 + 0.2 * s.preview.strength : 0);

    this.viewStations(dt, hands);
    this.viewGlows(dt);
    this.viewBeaconsAndSeals();
    this.viewLetter(hands);
    this.viewPrompts(dt);
    this.viewSurveyor(dt);
    this.viewLights(dt);

    // scheduled knocks: the count
    while (this.knocks.length && this.knocks[0] <= this.time) { this.knocks.shift(); this.playAt('knock', this.figure.root.visible ? this.figure.root : this.built.modules.get(s.surveyor.room)!); this.figure.strike(); }
    this.chalkTime -= dt;
    if (this.chalkTime <= 0) for (const m of this.chalk) m.visible = false;

    // the blocked path: an ash outline of what is in the way
    if (s.blockedBy) {
      const m = this.content.modules.find((x) => x.id === s.blockedBy!.by)!;
      const g = this.built.modules.get(m.id)!;
      this.blockBox.visible = true;
      this.blockBox.position.copy(g.position).y += m.size.h / 2;
      this.blockBox.rotation.y = g.rotation.y;
      this.blockBox.scale.set(m.size.w, m.size.h, m.size.d);
    } else this.blockBox.visible = false;

    // rooms too far to matter are not drawn
    const head = this.world.player.position;
    for (const [id, g] of this.built.modules) g.visible = id === 'zero' || g.position.distanceTo(head) < 85;
    this.stats.viewMs = performance.now() - t0;
  }

  private viewStations(dt: number, hands: { pos: Vector3; tracked: boolean }[]): void {
    const s = this.session;
    const { a } = this.scratch;
    for (const st of this.stations) {
      const sm = s.house.seamById.get(st.spec.seam)!;
      const state = s.seams[sm.id];
      const active = st.spec.vantage === s.vantage && s.playing();
      st.group.visible = st.spec.vantage === s.vantage || st.group.position.distanceTo(a.set(0, 0, 0)) < 0;
      const u = railU(sm, state.param, state.committed);
      const j = this.jitter.get(sm.id) ?? 0;
      if (j > 0) this.jitter.set(sm.id, j - dt);
      const wob = j > 0 ? Math.sin(this.time * 90) * 0.002 : 0;
      st.travel.position.set(st.spec.origin[0] + st.spec.dir[0] * st.spec.length * u + wob, st.spec.origin[1] + st.spec.dir[1] * st.spec.length * u, st.spec.origin[2] + st.spec.dir[2] * st.spec.length * u);
      const near = (m: Mesh) => { let d = 9; for (const h of hands) if (h.tracked) d = Math.min(d, m.getWorldPosition(a).distanceTo(h.pos)); return d; };
      const glow = (m: Mesh, held: boolean, pulse: boolean) => {
        const d = active ? near(m) : 9;
        const k = held ? 1 : d < 0.08 ? 0.8 : d < 0.2 ? 0.45 + 0.25 * Math.sin(this.time * 5) : 0.14 + (pulse ? 0.3 * (0.5 + 0.5 * Math.sin(this.time * 3.2)) : 0.04 * Math.sin(this.time * 1.3));
        (m.material as typeof m.material & { emissiveIntensity: number }).emissiveIntensity = active ? k : 0.05;
      };
      const refusal = active ? s.gripRefusal(sm.id) : undefined;
      glow(st.travel, state.phase === 'held' && state.station === st.spec.vantage, false);
      if (st.anchor) {
        const one = s.settings.hands === 'one';
        st.anchor.visible = !one;
        st.pin!.visible = one;
        glow(one ? st.pin! : st.anchor, !!state.anchorHand, refusal === 'Latched' && (j > 0 || state.phase === 'rest'));
        st.latch!.rotation.z = state.anchorHand || state.latchOpenTicks > 0 ? 0.9 : 0;
      }
    }
  }

  private viewGlows(dt: number): void {
    const s = this.session;
    for (const [id, f] of this.glowFlash) { if (f <= 0) this.glowFlash.delete(id); else this.glowFlash.set(id, f - dt); }
    for (const [socket, mesh] of this.built.glows) {
      let o = 0;
      const edge = s.edges.find((e) => e.a === socket || e.b === socket);
      if (edge && !edge.locked) o = 0.16 + Math.min(1, this.glowFlash.get(edge.id) ?? 0) * 0.84;
      if (s.preview) for (const id of s.preview.pairs) if (id.split('|').includes(socket)) o = Math.max(o, 0.25 + 0.75 * s.preview.strength);
      const m = mesh.material as MeshBasicMaterial;
      m.opacity += (o - m.opacity) * Math.min(1, dt * 10);
      mesh.visible = m.opacity > 0.01;    }
  }

  private viewBeaconsAndSeals(): void {
    const s = this.session;
    const reach = s.playing() ? s.reachable() : [];
    for (const [id, b] of this.beacons) {
      const lit = reach.includes(id);
      b.group.visible = id !== s.vantage;
      // A far lamp gets a wider ray target (about 3.4 degrees either side, never under 0.45 m) so a drifting hand ray still finds it.
      b.entity.object3D!.getWorldPosition(this.scratch.a); this.world.camera.getWorldPosition(this.scratch.b);
      b.entity.object3D!.scale.setScalar(Math.max(1, (this.scratch.a.distanceTo(this.scratch.b) * 0.06) / 0.45));
      const pulse = Math.min(1, this.lampPulse.get(id) ?? 0);
      if (pulse > 0) this.lampPulse.set(id, (this.lampPulse.get(id) ?? 0) - this.frameDt); else this.lampPulse.delete(id);
      b.glass.scale.setScalar(1 + 0.9 * pulse * (0.5 + 0.5 * Math.sin(this.time * 9)));
      (b.glass.material as MeshBasicMaterial).color.setHex(lit ? C.lamp : 0x241a0e).multiplyScalar(lit ? 1.25 + 0.1 * Math.sin(this.time * 7 + id.length) + 1.1 * pulse : 1);
    }
    for (const [side, marker] of this.turnMarkers) marker.visible = s.playing() && !this.failed && s.settings.snapTurn !== 0;
    const show = (action: string, on: boolean, x: number, y: number, z: number) => {
      const seal = this.seals.get(action)!;
      seal.mesh.visible = on && !!this.world.session; // headset only, like the letter
      if (!seal.mesh.visible) return;
      seal.mesh.position.set(x, y, z).applyAxisAngle(this.scratch.d.set(0, 1, 0), this.world.player.rotation.y).add(this.world.player.position);
      seal.mesh.rotation.set(-0.5, this.world.player.rotation.y, 0, 'YXZ');
    };
    const title = s.game === 'Title' && this.fade < 0.5;
    show('begin', title, s.canContinue() ? 0.09 : 0, ACTION_SEAL_Y, -0.45);
    show('continue', title && s.canContinue(), -0.09, ACTION_SEAL_Y, -0.45);
    show('again', s.game === 'ChapterComplete', -0.08, ACTION_SEAL_Y, -0.42);
    show('leave', s.game === 'ChapterComplete', 0.08, ACTION_SEAL_Y, -0.42);
  }

  private viewPrompts(dt: number): void {
    const inXr = !!this.world.session && !this.failed;
    for (const p of this.prompts) {
      const target = inXr && this.fade < 0.3 && p.show() ? 1 : 0;
      if (target === 1 && p.alpha < 0.05 && p.head) {
        // Placed once, when it starts to show: 0.6 m in front of the head, a little below the eyes, facing them. Held still
        // while shown. The height therefore follows the player's own seated height, which the rig cannot know.
        const cam = this.world.camera;
        cam.getWorldPosition(this.scratch.a);
        cam.getWorldDirection(this.scratch.b); this.scratch.b.y = 0; this.scratch.b.normalize();
        this.scratch.c.copy(this.scratch.a).addScaledVector(this.scratch.b, 0.6); this.scratch.c.y = this.scratch.a.y - 0.17;
        this.rigGroup.updateMatrixWorld(true);
        p.mesh.position.copy(this.rigGroup.worldToLocal(this.scratch.c));
        p.mesh.lookAt(this.scratch.a);
      }
      p.alpha += (target - p.alpha) * Math.min(1, dt * 5);
      p.mesh.visible = p.alpha > 0.02;
      (p.mesh.material as MeshBasicMaterial).opacity = p.alpha * 0.96;
    }
  }

  private viewLetter(hands: { pos: Vector3; tracked: boolean }[]): void {
    const s = this.session;
    const L = this.letter;
    this.world.player.getWorldPosition(this.rigGroup.position);
    this.world.player.getWorldQuaternion(this.rigGroup.quaternion);
    this.viewSettingSeals();
    // The letter and its seals are for the headset. On the flat page they showed through the title text (visual QA, issue V1).
    L.visible = s.game !== 'Boot' && !!this.world.session;
    const holder = this.letterHand;
    if (s.letter === 'delivered') {
      this.built.pigeonhole.getWorldPosition(this.scratch.a);
      this.rigGroup.worldToLocal(this.scratch.a);
      L.position.lerp(this.scratch.a, 0.2); L.rotation.set(0, 0, Math.PI / 2); L.scale.setScalar(0.75);
    } else if (s.letter === 'held' && holder !== undefined && hands[holder]?.tracked) {
      this.rigGroup.worldToLocal(this.scratch.a.copy(hands[holder].pos));
      L.position.copy(this.scratch.a); L.rotation.set(-0.7, 0, 0); L.scale.setScalar(1);
    } else {
      // In front of the chest at the start; otherwise on the satchel strap at the left hip, face up to be read.
      const offered = s.letter === 'held' || s.game === 'Title';
      this.scratch.a.set(offered ? 0 : -0.3, offered ? 1.08 : 0.82, offered ? -0.42 : -0.3);
      L.position.lerp(this.scratch.a, 0.15); L.rotation.set(offered ? -0.5 : -1.1, offered ? 0 : 0.35, 0); L.scale.setScalar(1);
    }
  }
  letterHand: number | undefined;

  private drawLetter(): void {
    const s = this.session;
    const key = `${s.postmarks.join()}|${s.hint?.text ?? ''}|${s.catches}|${this.notice}`;
    if (key === this.letterTex) return;
    this.letterTex = key;
    const lines: Parameters<typeof textTexture>[0] = [
      { text: 'ROOM 0', size: 96, y: 130, font: '"Segoe Script", "Bradley Hand", cursive' },
      { text: 'Return before the house closes.', size: 40, y: 200, font: '"Segoe Script", "Bradley Hand", cursive' },
    ];
    s.postmarks.forEach((p, i) => lines.push({ text: `( ${p} )`, size: 30, y: 300 + Math.floor(i / 3) * 44, x: 150 + (i % 3) * 250, color: '#1b1b1b', font: '"Courier New", monospace' }));
    if (s.hint) lines.push({ text: s.hint.text, size: 46, y: 470, color: '#1d2a44', font: '"Segoe Script", "Bradley Hand", cursive' });
    else if (this.notice && s.postmarks.length <= 1) lines.push({ text: 'The postmarks have faded.', size: 36, y: 470, color: '#5a4a3a', font: '"Segoe Script", "Bradley Hand", cursive' });
    if (s.catches > 0) lines.push({ text: '|'.repeat(Math.min(12, s.catches)), size: 54, y: 545, x: 80, align: 'left', color: '#8d8a84' });
    const m = this.letter.material as MeshBasicMaterial;
    m.map?.dispose();
    m.map = textTexture(lines, 800, 560, '#e9dfc8');
    m.needsUpdate = true;
  }

  private viewSettingSeals(): void {
    const s = this.session.settings;
    const stamp = `${s.snapTurn}|${s.intensity}|${s.hands}`;
    if (stamp === this.settingStamp) return;
    this.settingStamp = stamp;
    const labels: Record<string, { text: string; active: boolean }> = {
      turn: { text: s.snapTurn === 0 ? 'T0' : `T${s.snapTurn}`, active: s.snapTurn !== 0 },
      intensity: { text: s.intensity === 'standard' ? 'STD' : 'RED', active: s.intensity === 'reduced' },
      hands: { text: s.hands === 'two' ? '2H' : '1H', active: s.hands === 'one' },
      restart: { text: 'R', active: false },
    };
    for (const [name, seal] of this.settingSeals) {
      const state = labels[name];
      const material = seal.material as MeshBasicMaterial;
      material.map?.dispose();
      material.map = textTexture([{ text: state.text, size: state.text.length > 2 ? 42 : 58, y: 88, color: '#f3d9c8' }], 128, 128, state.active ? '#80602a' : '#46382a');
      material.needsUpdate = true;
    }
  }

  private showChalk(n: number): void {
    this.chalk.forEach((m, i) => { m.visible = i < n; });
    this.chalkTime = 6;
  }

  /** A point just inside a doorway of a room, in world space. */
  private doorPoint(edgeId: string, room: string, out: Vector3): Vector3 {
    const e = this.session.edges.find((x) => x.id === edgeId);
    const pair = edgeId.split('|');
    const sid = pair.find((x) => this.session.house.socketById.get(x)?.module.id === room) ?? (e ? e.a : pair[0]);
    const sk = this.session.house.socketById.get(sid)!.socket;
    const g = this.built.modules.get(room)!;
    g.updateWorldMatrix(true, false);
    return out.set(sk.x - sk.nx * 2.6, sk.y, sk.z - sk.nz * 2.6).applyMatrix4(g.matrixWorld);
  }

  private viewSurveyor(dt: number): void {
    const s = this.session; const sv = s.surveyor; const fig = this.figure;
    const { a, b, c } = this.scratch;
    const seen = sv.armed && !(sv.room === 'den' && !sv.crossing) && s.game !== 'Title';
    const justShown = seen && !fig.root.visible;
    fig.root.visible = seen;
    if (!seen) return;
    const g = this.built.modules.get(sv.room)!;
    const m = this.content.modules.find((x) => x.id === sv.room)!;
    const centre = (out: Vector3) => { g.updateWorldMatrix(true, false); return out.set(0, m.sockets[0]?.y ?? 0, 0).applyMatrix4(g.matrixWorld); };
    let moving = false;
    if (sv.crossing) {
      const total = Math.max(1, Math.round(this.content.surveyor.thresholdSec / TICK_SEC));
      this.doorPoint(sv.crossing.edge, sv.room, a); this.doorPoint(sv.crossing.edge, sv.crossing.to, b);
      c.lerpVectors(a, b, 1 - sv.crossing.left / total); moving = true;
    } else {
      if (this.lastEdge && this.lastEdge.split('|').some((x) => s.house.socketById.get(x)?.module.id === sv.room)) this.doorPoint(this.lastEdge, sv.room, a); else centre(a);
      if (sv.route[0]) this.doorPoint(sv.route[0], sv.room, b); else centre(b);
      c.lerpVectors(a, b, sv.route[0] ? s.surveyorWalkProgress() : Math.min(1, sv.stateTicks / 60));
      moving = !!sv.route[0] && ['Investigating', 'Approaching', 'Hunting', 'Searching', 'Retreating'].includes(sv.state) && !sv.measuring && sv.brace === 0 && s.playing();
    }
    let pose: Pose = moving ? 'walk' : 'idle';
    if (sv.measuring) pose = 'measure';
    else if (sv.brace > 0) pose = 'brace';
    else if (sv.state === 'Blocked') pose = 'plumb';
    else if (sv.state === 'Replanning') pose = 'sweep';
    else if (sv.state === 'Searching' && !sv.route[0]) pose = 'slack';
    if (s.game === 'FailureRecovery') pose = 'frame';
    const ending = s.ending && s.ending.step >= 4 && sv.room === 'lift';
    if (ending) { // the ring brought to the round door; it does not reach in
      const lift = this.built.modules.get('lift')!;
      lift.updateWorldMatrix(true, false);
      c.set(0, 0, s.settings.intensity === 'reduced' ? 1.9 : 0.5).applyMatrix4(lift.matrixWorld);
      b.set(0, 0, -2).applyMatrix4(lift.matrixWorld);
      pose = 'door';
    }
    // keep its distance from the camera (REQ-COMFORT-007)
    const min = s.settings.intensity === 'reduced' ? 2.5 : 1.5;
    this.world.player.head.getWorldPosition(a);
    const dx = c.x - a.x, dz = c.z - a.z, dist = Math.hypot(dx, dz);
    if (dist < min && dist > 1e-3 && Math.abs(c.y - a.y) < 6) { c.x = a.x + (dx / dist) * min; c.z = a.z + (dz / dist) * min; }
    // Never glide in from wherever the body was last left (it starts at the world origin): snap when it first appears.
    if (justShown) fig.root.position.copy(c); else fig.root.position.lerp(c, Math.min(1, dt * 6));
    const fx = b.x - fig.root.position.x, fz = b.z - fig.root.position.z;
    if (Math.hypot(fx, fz) > 0.3) { const yaw = Math.atan2(fx, fz); let d = yaw - fig.root.rotation.y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; fig.root.rotation.y += d * Math.min(1, dt * 2.5); }
    fig.update(dt, pose, sv.state === 'Hunting' ? 0.55 : 0.42, 0, this.time);
    if (pose === 'walk' && s.playing()) { this.stepTimer -= dt; if (this.stepTimer <= 0) { this.stepTimer = sv.state === 'Hunting' ? 0.9 : 1.2; this.playAt('step', fig.root, 0.8); if (sv.state === 'Hunting' && s.settings.intensity !== 'reduced' && sv.target?.kind === 'letter') this.playAt('pulse', fig.root, 0.8); } }
  }

  private viewLights(dt: number): void {
    const s = this.session;
    const { a } = this.scratch;
    this.vantageWorld(s.vantage, a);
    this.stationLight.position.set(a.x, a.y + 2.6, a.z);
    this.stationLight.intensity = s.vantage === 'v-zero' ? 0 : 26;
    const next = s.playing() ? s.reachable().find((v) => this.content.vantages.findIndex((x) => x.id === v) > this.content.vantages.findIndex((x) => x.id === s.vantage)) : undefined;
    if (next) { this.vantageWorld(next, a); this.goalLight.position.set(a.x, a.y + 3, a.z); }
    this.goalLight.intensity += ((next ? 22 : 0) - this.goalLight.intensity) * Math.min(1, dt * 3);
    const listening = s.surveyor.state === 'Listening';
    (this.built.fanlight.material as MeshBasicMaterial).color.setHex(C.moon).multiplyScalar(listening ? 0.5 + 0.5 * Math.abs(Math.sin(this.time * 9) * Math.sin(this.time * 2.3)) : 0.35);
    (this.built.officeLamp.material as MeshBasicMaterial).color.setHex(C.lamp).multiplyScalar(s.flags.houseClosing ? 1.5 : 0.5);
    this.built.zeroLight.intensity = 6 * (s.ending && s.ending.step >= 5 ? 1 : 0.9 + 0.1 * Math.sin(this.time * 11) * Math.sin(this.time * 3.7));
    if (s.vantage === 'v-zero' && !this.loops.get('chord') && !this.built.card.visible && s.playing()) { this.play('chord'); this.loops.set('chord', 1); }
    // the house folding toward itself: far rooms drift inward, never the player's
    const closing = s.ending && s.ending.step >= 6 ? 1 : s.flags.houseClosing ? 0.25 : 0;
    const vr = this.built.voidRooms;
    const k = 1 - closing * 0.004 * dt * 10;
    vr.position.x += (40 - vr.position.x) * 0; vr.scale.multiplyScalar(k < 1 && vr.scale.x > 0.55 ? k : 1);
  }
}

/** Where the travel grip sits on its rail, 0 to 1, from the rules' parameter. */
export function railU(sm: SeamDef, param: number, committed: number): number {
  if (sm.ratchet) return Math.max(0, Math.min(1, (param - sm.detents[committed]) * sm.detents.length));
  const lo = sm.detents[0], hi = sm.detents[sm.detents.length - 1];
  return Math.max(0, Math.min(1, (param - lo) / (hi - lo)));
}
