// Contracts of the gameplay domain. See docs/04-engineering/domain-model.md and data-contracts.md.
import type { Box, Pose } from './math.js';

export type Profile = 'arched' | 'square' | 'round';
export type Hand = 'left' | 'right';

export interface SocketDef {
  id: string;
  /** Position of the sill centre in the module's frame. */
  x: number;
  y: number;
  z: number;
  /** Outward horizontal normal in the module's frame. */
  nx: number;
  nz: number;
  profile: Profile;
}

export interface ModuleDef {
  id: string;
  name: string;
  /** Pose at its seam's parameter 0, or its fixed pose. */
  base: Pose;
  /** Interior size, for presentation and for the collision box. */
  size: { w: number; d: number; h: number };
  box: Box;
  sockets: SocketDef[];
  /** Surveyor timings in seconds. reach is absent where the player can never be. */
  crossSec: number;
  reachSec?: number;
}

export interface PairRule {
  a: string;
  b: string;
  player: boolean;
  enemy: boolean;
  lockedUntilFlag?: string;
  /** A hinge: mated whatever the geometry says. Used for the bridge's pivot end only. */
  permanent?: boolean;
}

export interface SeamDef {
  id: string;
  moves: string;
  path:
    | { kind: 'linear'; ax: number; ay: number; az: number; length: number }
    | { kind: 'rotary'; px: number; pz: number; angle: number; cyclic: boolean };
  /** Path parameters in [0,1), ascending. A cyclic seam wraps from the last back to the first. */
  detents: number[];
  initial: number;
  latched: boolean;
  ratchet: boolean;
  /** Vantages with a station for this seam. */
  stations: string[];
}

export interface VantageDef {
  id: string;
  module: string;
  adjacent: string[];
  /** Seated position in the module's frame, and the world heading to face on arrival. */
  x: number;
  y: number;
  z: number;
  worldYaw: number;
}

export interface CheckpointDef {
  id: string;
  postmark: string;
  /** First arrival at this vantage, or first opening of this edge. */
  vantage?: string;
  edge?: string;
  /** Extra condition: the Surveyor must be sealed in this room with no route out. */
  surveyorSealedIn?: string;
}

export interface SurveyorTuning {
  thresholdSec: number;
  wakeSec: number;
  measureSec: number;
  blockSec: number;
  replanSec: number;
  retreatSec: number;
  braceLimitSec: number;
  huntPace: number;
  countCap: number;
  /** Multiplier on every movement time. 1 for standard, 1.25 for reduced intensity. */
  slow: number;
}

export interface ObjectiveDef {
  id: string;
  station: string; // vantage where its hints are counted
  /** Solved when this edge is open, or when this flag is set. */
  edge?: string;
  flag?: string;
  hints: [string, string, string];
}

export interface ChapterContent {
  version: string;
  modules: ModuleDef[];
  pairs: PairRule[];
  seams: SeamDef[];
  vantages: VantageDef[];
  checkpoints: CheckpointDef[];
  objectives: ObjectiveDef[];
  startVantage: string;
  den: string;
  armAtVantage: string;
  /** Rooms the Surveyor can never enter. */
  noEnemy: string[];
  tolerances: { positionM: number; angleDeg: number; snapWindow: number; previewWindow: number };
  surveyor: SurveyorTuning;
}

export interface Edge {
  id: string;
  a: string; // socket
  b: string;
  ma: string; // module of a
  mb: string;
  player: boolean;
  enemy: boolean;
  locked: boolean;
  suspended: boolean;
  dependsOn: string[];
}

export type SeamPhase = 'rest' | 'held' | 'frozen' | 'settling';

export interface SeamState {
  committed: number;
  phase: SeamPhase;
  /** Continuous path parameter; equals the committed detent's parameter at rest. */
  param: number;
  station?: string;
  travelHand?: Hand;
  anchorHand?: Hand;
  settleTo?: number;
  settleFrom?: number;
  settleTicks?: number;
  settleTotal?: number;
  frozenTicks: number;
  latchOpenTicks: number;
  /** Last drag value received, for release on tracking loss. */
  lastParam: number;
}

export type SurveyorStateId =
  | 'Dormant' | 'Listening' | 'Replanning' | 'Investigating' | 'Approaching'
  | 'Hunting' | 'Blocked' | 'Searching' | 'Retreating';

export interface FreshJoint {
  edge: string;
  measureIn: string;
}

export interface SurveyorState {
  state: SurveyorStateId;
  room: string;
  /** Ticks walked across the current room. */
  walk: number;
  crossing?: { edge: string; to: string; left: number };
  target?: { kind: 'joint' | 'letter' | 'home' | 'patrol'; edge?: string; room: string };
  route: string[];
  stateTicks: number;
  measuring: boolean;
  fresh: FreshJoint[];
  inPlayerRoom: number;
  idle: number;
  brace: number;
  armed: boolean;
}

export type GameStateId =
  | 'Boot' | 'Title' | 'ChapterIntro' | 'Exploration' | 'PuzzleActive' | 'SeamInteraction'
  | 'ThreatEncounter' | 'Checkpoint' | 'Pause' | 'FailureRecovery' | 'ChapterComplete';

export interface Settings {
  snapTurn: 0 | 30 | 45;
  intensity: 'standard' | 'reduced';
  hands: 'two' | 'one';
  volume: number;
}

export interface SaveData {
  schemaVersion: number;
  contentVersion: string;
  chapter: string;
  checkpoint: string;
  seams: Record<string, number>;
  flags: Record<string, boolean>;
  solved: string[];
  edges: string[];
  surveyor: { state: SurveyorStateId; room: string; armed: boolean; fresh: FreshJoint[] };
  catches: number;
  complete: boolean;
  settings: Settings;
}

export type Reason =
  | 'NotAtStation' | 'Latched' | 'HeldBySurveyor' | 'Busy' | 'PlayerInside' | 'NotPlaying'
  | 'HandBusy' | 'NotHeld' | 'NotAdjacent' | 'EdgeNotUsable' | 'NoSave' | 'NotOneHanded'
  | 'NotComplete' | 'Unknown' | 'NotAtSlot';

export type Command =
  | { type: 'Begin'; mode: 'new' | 'continue' }
  | { type: 'IntroDone' }
  | { type: 'Restart' }
  | { type: 'EndSession' }
  | { type: 'GripTake'; seam: string; role: 'travel' | 'anchor'; hand: Hand }
  | { type: 'GripDrag'; seam: string; u: number }
  | { type: 'GripRelease'; seam: string; role: 'travel' | 'anchor'; reason: 'open' | 'lost' | 'leftRail' | 'forced' }
  | { type: 'LatchPinPress'; seam: string }
  | { type: 'Hop'; vantage: string }
  | { type: 'LetterTake'; hand: Hand }
  | { type: 'LetterRelease'; atSlot: boolean }
  | { type: 'SetSettings'; settings: Partial<Settings> }
  | { type: 'SetVisibility'; visible: boolean }
  | { type: 'AckEnding'; choice: 'again' | 'leave' };

export type CommandResult = { ok: true } | { ok: false; reason: Reason };

export type DomainEvent =
  | { type: 'GripTaken'; seam: string; role: 'travel' | 'anchor'; hand: Hand }
  | { type: 'GripRefused'; seam: string; reason: Reason }
  | { type: 'LatchChanged'; seam: string; open: boolean }
  | { type: 'SeamLimit'; seam: string }
  | { type: 'SeamBlocked'; seam: string; by: string }
  | { type: 'SeamFrozen'; seam: string }
  | { type: 'SeamReleased'; seam: string; kind: 'snap' | 'return'; toDetent: number }
  | { type: 'SeamCommitted'; seam: string; detent: number }
  | { type: 'SeamRested'; seam: string; detent: number; opened: number }
  | { type: 'PairRefused'; a: string; b: string }
  | { type: 'GraphChanged'; opened: string[]; closed: string[] }
  | { type: 'EdgeUnlocked'; edge: string }
  | { type: 'VantagesChanged'; reachable: string[] }
  | { type: 'PlayerHopped'; from: string; to: string }
  | { type: 'LetterStateChanged'; state: 'held' | 'strap' | 'delivered' }
  | { type: 'CheckpointReached'; checkpoint: string; postmark: string }
  | { type: 'ObjectiveSolved'; objective: string }
  | { type: 'HintShown'; objective: string; tier: number; text: string }
  | { type: 'FlagSet'; flag: string }
  | { type: 'SettingsChanged'; settings: Settings }
  | { type: 'GameStateChanged'; from: GameStateId; to: GameStateId }
  | { type: 'PlayerCaught'; room: string }
  | { type: 'CheckpointRestored'; checkpoint: string }
  | { type: 'EndingStep'; step: number }
  | { type: 'SaveRequested'; data: SaveData }
  | { type: 'SurveyorStateChanged'; from: SurveyorStateId; to: SurveyorStateId }
  | { type: 'SurveyorLoggedJoint' }
  | { type: 'SurveyorCount'; n: number; kind: 'plan' | 'enter' }
  | { type: 'SurveyorNoRoute' }
  | { type: 'SurveyorCrossingStarted'; edge: string; from: string; to: string }
  | { type: 'SurveyorEnteredRoom'; room: string }
  | { type: 'SurveyorMeasuring'; room: string }
  | { type: 'SurveyorBracing'; room: string };

export const TICK_SEC = 0.05;
export const ticks = (sec: number): number => Math.max(1, Math.round(sec / TICK_SEC));
