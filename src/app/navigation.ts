import { Matrix3, Quaternion, Vector3, type Entity, type Object3D, type World } from '@iwsdk/core';

const UP = new Vector3(0, 1, 0);

export interface HopGate {
  pending: boolean;
  fade: number;
  playing: boolean;
  reachable: readonly string[];
}

export interface SnapTurnGate {
  pending: boolean;
  fade: number;
  playing: boolean;
  snapTurn: 0 | 30 | 45;
}

/** Snap turns are available only during play, with the setting enabled and the view clear. */
export function canRequestSnapTurn(gate: SnapTurnGate): boolean {
  return !gate.pending && gate.fade <= 0.02 && gate.playing && (gate.snapTurn === 30 || gate.snapTurn === 45);
}

/** The visual target remains below its beacon, which remains below its moving room. */
export function registerBeaconHierarchy(
  world: Pick<World, 'createTransformEntity'>,
  moduleEntity: Entity,
  group: Object3D,
  target: Object3D,
): { groupEntity: Entity; targetEntity: Entity } {
  const groupEntity = world.createTransformEntity(group, { parent: moduleEntity, persistent: true });
  const targetEntity = world.createTransformEntity(target, { parent: groupEntity, persistent: true });
  return { groupEntity, targetEntity };
}

/** Resolve a point authored in an Object3D's local space after updating its parent matrices. */
export function resolveWorldPoint(parent: Object3D, x: number, y: number, z: number, out: Vector3): Vector3 {
  parent.updateWorldMatrix(true, false);
  return out.set(x, y, z).applyMatrix4(parent.matrixWorld);
}

/** One eligibility rule for both runtime hops and navigation regression tests. */
export function canRequestHop(gate: HopGate, vantage: string): boolean {
  return !gate.pending && gate.fade <= 0.02 && gate.playing && gate.reachable.includes(vantage);
}

/**
 * A pinch means "take this grip" and not "go there" only when the pinching hand is on, or holding, a grip.
 * A resting hand does not count: a seated player's idle hand sits near the rails, and counting it made lamps
 * silently ignore the selecting hand (found by RT-15 under IWER).
 */
export function pinchClaimedByGrip(hands: { pinching: boolean; holding: boolean; nearestGrip: number }[], radius: number): boolean {
  return hands.some((h) => h.holding || (h.pinching && h.nearestGrip < radius));
}

/**
 * The settings seals sit on the letter's face, which the player also reaches for to take it (found by RT-15: taking the
 * letter in Room Zero switched "hands" to one hand). Turn, intensity and hands therefore answer only while the letter is
 * offered at the chest (title, chapter opening, pause) and no hand is pinching or holding. The restart seal needs a 2 s
 * dwell, so it needs only the quiet hands.
 */
export function settingSealLive(
  name: string,
  letter: 'held' | 'strap' | 'delivered',
  game: string,
  hands: { pinching: boolean; holding: boolean }[],
): boolean {
  if (hands.some((h) => h.pinching || h.holding)) return false;
  if (name === 'restart') return true;
  return letter === 'held' || game === 'Title' || game === 'Pause';
}

/** Dispatch only a real press, and let a hand on a nearby rail keep priority over travel. */
export function dispatchBeaconSelection(
  vantage: string,
  pressed: boolean,
  handNearGrip: boolean,
  requestHop: (vantage: string) => void,
): boolean {
  if (!pressed || handNearGrip) return false;
  requestHop(vantage);
  return true;
}

export interface RigPlacement {
  destinationHead: Vector3;
  actualHead: Vector3;
  headError: number;
  worldDelta: Vector3;
}

export interface RigTurn {
  headBefore: Vector3;
  headAfter: Vector3;
  headError: number;
  worldYaw: number;
}

/** Rotate the rig around the tracked head in world yaw, preserving the head's world position. */
export function rotatePlayerAroundHead(player: Object3D, head: Object3D, worldYaw: number): RigTurn {
  const parent = player.parent;
  parent?.updateWorldMatrix(true, false);
  player.updateWorldMatrix(true, true);

  const headBefore = head.getWorldPosition(new Vector3());
  const parentWorldRotation = parent?.getWorldQuaternion(new Quaternion()) ?? new Quaternion();
  const playerWorldRotation = player.getWorldQuaternion(new Quaternion());
  const yawRotation = new Quaternion().setFromAxisAngle(UP, worldYaw);
  const destinationWorldRotation = yawRotation.multiply(playerWorldRotation);
  player.quaternion.copy(parentWorldRotation.invert().multiply(destinationWorldRotation));
  player.updateMatrixWorld(true);
  head.updateMatrixWorld(true);

  const headAfterRotation = head.getWorldPosition(new Vector3());
  const rootDestinationWorld = player.getWorldPosition(new Vector3()).add(headBefore.clone().sub(headAfterRotation));
  const rootDestinationLocal = parent ? parent.worldToLocal(rootDestinationWorld) : rootDestinationWorld;
  player.position.copy(rootDestinationLocal);
  player.updateMatrixWorld(true);
  head.updateMatrixWorld(true);

  const headAfter = head.getWorldPosition(new Vector3());
  return { headBefore, headAfter, headError: headAfter.distanceTo(headBefore), worldYaw };
}

/**
 * Translate the player origin so the tracked head reaches the authored anchor plus its
 * yaw-adjusted local tracking offset. The camera's local position and orientation are
 * never changed. World-space deltas are converted through the player's parent.
 */
export function placePlayerAtWorldAnchor(
  player: Object3D,
  head: Object3D,
  anchor: Vector3,
  worldYaw: number,
): RigPlacement {
  const parent = player.parent;
  parent?.updateWorldMatrix(true, false);
  player.updateWorldMatrix(true, true);

  const headBefore = head.getWorldPosition(new Vector3());
  const rootBefore = player.getWorldPosition(new Vector3());
  const headLocal = player.worldToLocal(headBefore.clone());
  const yawRotation = new Quaternion().setFromAxisAngle(UP, worldYaw);
  const currentHeadOffsetWorld = headBefore.clone().sub(rootBefore);
  const parentWorldRotation = parent?.getWorldQuaternion(new Quaternion()) ?? new Quaternion();
  const localRotation = parentWorldRotation.clone().invert().multiply(yawRotation);
  const parentLinear = parent ? new Matrix3().setFromMatrix4(parent.matrixWorld) : new Matrix3();
  const destinationHeadOffsetWorld = headLocal.clone().multiply(player.scale).applyQuaternion(localRotation).applyMatrix3(parentLinear);
  const destinationHead = anchor.clone().add(destinationHeadOffsetWorld);
  // Subtract the offset rotation change: it will happen when the origin yaw changes.
  const worldDelta = destinationHead.clone().sub(headBefore).sub(destinationHeadOffsetWorld.sub(currentHeadOffsetWorld));
  const rootDestinationWorld = rootBefore.add(worldDelta);
  const rootDestinationLocal = parent ? parent.worldToLocal(rootDestinationWorld) : rootDestinationWorld;

  player.position.copy(rootDestinationLocal);
  player.quaternion.copy(localRotation);
  player.updateMatrixWorld(true);
  head.updateMatrixWorld(true);

  const actualHead = head.getWorldPosition(new Vector3());
  return { destinationHead, actualHead, headError: actualHead.distanceTo(destinationHead), worldDelta };
}
