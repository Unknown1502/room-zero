import { describe, expect, it, vi } from 'vitest';
import { Group, Quaternion, Vector3, type Entity, type Object3D, type World } from '@iwsdk/core';
import { chapterOne } from '../../src/content/chapter-one';
import { Driver, replayReference } from '../../src/domain/reference';
import { GameSession } from '../../src/domain/session';
import {
  canRequestSnapTurn,
  canRequestHop,
  dispatchBeaconSelection,
  pinchClaimedByGrip,
  placePlayerAtWorldAnchor,
  registerBeaconHierarchy,
  resolveWorldPoint,
  rotatePlayerAroundHead,
  settingSealLive,
} from '../../src/app/navigation';

interface StubEntity { index: number; object3D: Object3D; parent?: StubEntity }

function stubWorld() {
  const scene = new Group();
  const entities: StubEntity[] = [];
  const world = {
    createTransformEntity(object3D: Object3D, options?: { parent?: Entity; persistent?: boolean }) {
      const parent = options?.parent as unknown as StubEntity | undefined;
      const entity: StubEntity = { index: entities.length, object3D, parent };
      (parent?.object3D ?? scene).add(object3D);
      entities.push(entity);
      return entity as unknown as Entity;
    },
  } as unknown as Pick<World, 'createTransformEntity'>;
  return { scene, entities, world };
}

function fresh() {
  const session = new GameSession(chapterOne);
  session.apply({ type: 'Begin', mode: 'new' });
  session.apply({ type: 'IntroDone' });
  session.drainEvents();
  return { session, driver: new Driver(session) };
}

describe('navigation and beacon transforms', () => {
  it('keeps all 11 authored viewpoint IDs unique and creates a separate module/group/target chain for each', () => {
    expect(chapterOne.vantages).toHaveLength(11);
    expect(new Set(chapterOne.vantages.map((v) => v.id)).size).toBe(11);

    const { world, entities } = stubWorld();
    const modules = new Map<string, Entity>();
    for (const module of chapterOne.modules) {
      const object = new Group();
      modules.set(module.id, world.createTransformEntity(object, { persistent: true }));
    }

    const targets = chapterOne.vantages.map((v, i) => {
      const group = new Group();
      group.position.set(v.x, v.y, v.z);
      const target = new Group();
      target.position.set(0.26, 1.58, 0);
      const chain = registerBeaconHierarchy(world, modules.get(v.module)!, group, target);
      return { id: v.id, group, target, ...chain };
    });

    expect(new Set(targets.map((t) => t.groupEntity)).size).toBe(11);
    expect(new Set(targets.map((t) => t.targetEntity)).size).toBe(11);
    expect(targets.every((t) => t.targetEntity.index !== t.groupEntity.index)).toBe(true);
    expect(targets.every((t) => entities[t.groupEntity.index].parent === modules.get(chapterOne.vantages.find((v) => v.id === t.id)!.module))).toBe(true);
    expect(targets.every((t) => entities[t.targetEntity.index].parent === t.groupEntity)).toBe(true);
  });

  it('resolves a local point through the parent translation and rotation', () => {
    const parent = new Group();
    parent.position.set(10, 2, -3);
    parent.rotation.y = Math.PI / 2;
    const actual = resolveWorldPoint(parent, 0.25, 1.5, -2, new Vector3());
    expect(actual.x).toBeCloseTo(8, 5);
    expect(actual.y).toBeCloseTo(3.5, 5);
    expect(actual.z).toBeCloseTo(-3.25, 5);
  });

  it('updates a beacon world position after its moving module changes', () => {
    const { world } = stubWorld();
    const module = new Group();
    module.position.set(-4.5, 0, -17);
    const moduleEntity = world.createTransformEntity(module, { persistent: true });
    const group = new Group(); group.position.set(2.6, 6, -6);
    const target = new Group(); target.position.set(0.26, 1.58, 0);
    registerBeaconHierarchy(world, moduleEntity, group, target);
    const before = target.getWorldPosition(new Vector3());
    module.position.x = 0;
    module.updateMatrixWorld(true);
    const after = target.getWorldPosition(new Vector3());
    expect(after.x - before.x).toBeCloseTo(4.5, 5);
    expect(after.z).toBeCloseTo(before.z, 5);
  });

  it('does not alias one beacon destination to another beacon', () => {
    const { world } = stubWorld();
    const leftModule = new Group(); leftModule.position.x = -5;
    const rightModule = new Group(); rightModule.position.x = 7;
    const leftParent = world.createTransformEntity(leftModule, { persistent: true });
    const rightParent = world.createTransformEntity(rightModule, { persistent: true });
    const left = registerBeaconHierarchy(world, leftParent, new Group(), new Group());
    const right = registerBeaconHierarchy(world, rightParent, new Group(), new Group());
    expect(left.targetEntity).not.toBe(right.targetEntity);
    expect(left.targetEntity.object3D).not.toBe(right.targetEntity.object3D);
    expect(left.targetEntity.object3D.getWorldPosition(new Vector3()).x).not.toBe(right.targetEntity.object3D.getWorldPosition(new Vector3()).x);
  });

  it('dispatches the selected beacon ID into the actual domain hop command', () => {
    const { session } = fresh();
    const request = vi.fn((vantage: string) => session.apply({ type: 'Hop', vantage }));
    expect(dispatchBeaconSelection('v-foyer-door', true, false, request)).toBe(true);
    expect(request).toHaveBeenCalledExactlyOnceWith('v-foyer-door');
    expect(session.vantage).toBe('v-foyer-door');
  });

  it('does not dispatch a released or lost-hand selection without a press event', () => {
    const request = vi.fn();
    expect(dispatchBeaconSelection('v-stair-head', false, false, request)).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });

  it('gives a nearby active grip priority over beacon selection', () => {
    const request = vi.fn();
    expect(dispatchBeaconSelection('v-stair-head', true, true, request)).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });

  it('allows a reachable hop only when gameplay is idle and visible', () => {
    expect(canRequestHop({ pending: false, fade: 0, playing: true, reachable: ['v-foyer-door'] }, 'v-foyer-door')).toBe(true);
  });

  it('rejects a pending, fading, title-screen, or unreachable hop', () => {
    const reachable = ['v-foyer-door'];
    for (const gate of [
      { pending: true, fade: 0, playing: true, reachable },
      { pending: false, fade: 0.03, playing: true, reachable },
      { pending: false, fade: 0, playing: false, reachable },
      { pending: false, fade: 0, playing: true, reachable: [] },
    ]) expect(canRequestHop(gate, 'v-stair-head')).toBe(false);

    const { session } = fresh();
    expect(session.apply({ type: 'Hop', vantage: 'v-stair-head' })).toEqual({ ok: false, reason: 'NotAdjacent' });
    expect(session.vantage).toBe('v-foyer-start');

    const closedEdge = fresh();
    closedEdge.driver.hop('v-foyer-door');
    expect(closedEdge.session.reachable()).not.toContain('v-stair-head');
    expect(closedEdge.session.apply({ type: 'Hop', vantage: 'v-stair-head' })).toEqual({ ok: false, reason: 'EdgeNotUsable' });
    expect(closedEdge.session.vantage).toBe('v-foyer-door');
  });

  it('only permits snap turns during visible play when a 30 or 45 degree step is enabled', () => {
    expect(canRequestSnapTurn({ pending: false, fade: 0, playing: true, snapTurn: 30 })).toBe(true);
    expect(canRequestSnapTurn({ pending: false, fade: 0, playing: true, snapTurn: 45 })).toBe(true);
    for (const gate of [
      { pending: true, fade: 0, playing: true, snapTurn: 30 as const },
      { pending: false, fade: 0.03, playing: true, snapTurn: 30 as const },
      { pending: false, fade: 0, playing: false, snapTurn: 30 as const },
      { pending: false, fade: 0, playing: true, snapTurn: 0 as const },
    ]) expect(canRequestSnapTurn(gate)).toBe(false);
  });

  it('moves the player origin by the world-space delta and preserves the tracked head local pose', () => {
    const scene = new Group();
    const player = new Group(); scene.add(player);
    player.position.set(1, 0, 2);
    player.rotation.y = 0.35;
    const head = new Group();
    head.position.set(0.08, 1.54, -0.12);
    head.rotation.set(0.2, -0.1, 0.05);
    player.add(head);
    scene.updateMatrixWorld(true);
    const headLocalPosition = head.position.clone();
    const headLocalRotation = head.quaternion.clone();
    const anchor = new Vector3(4, 3, -5);
    const beforeRoot = player.getWorldPosition(new Vector3());
    const placement = placePlayerAtWorldAnchor(player, head, anchor, -Math.PI / 2);
    const afterRoot = player.getWorldPosition(new Vector3());
    const expectedHead = anchor.clone().add(headLocalPosition.clone().applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2)));

    expect(placement.headError).toBeLessThan(0.001);
    expect(placement.actualHead.distanceTo(expectedHead)).toBeLessThan(0.001);
    expect(afterRoot.clone().sub(beforeRoot).distanceTo(placement.worldDelta)).toBeLessThan(0.001);
    expect(head.position.distanceTo(headLocalPosition)).toBeLessThan(1e-8);
    expect(Math.abs(head.quaternion.dot(headLocalRotation))).toBeCloseTo(1, 7);
  });

  it('converts the world-space hop through a transformed player parent', () => {
    const scene = new Group();
    scene.position.set(5, 1, -2); scene.rotation.y = 0.4; scene.scale.setScalar(1.5);
    const player = new Group(); scene.add(player);
    const head = new Group(); head.position.set(0, 1.6, 0); player.add(head);
    scene.updateMatrixWorld(true);
    const anchor = new Vector3(12, 4, 9);
    const placement = placePlayerAtWorldAnchor(player, head, anchor, 0.7);
    expect(placement.headError).toBeLessThan(0.001);
    expect(head.getWorldPosition(new Vector3()).distanceTo(placement.destinationHead)).toBeLessThan(0.001);
  });

  it('snap-turns around the tracked head in world space under a transformed parent', () => {
    const scene = new Group();
    scene.position.set(3, 2, -4); scene.rotation.y = 0.4; scene.scale.setScalar(1.5);
    const player = new Group(); player.position.set(1, 0, 2); scene.add(player);
    player.rotation.y = -0.2;
    const head = new Group(); head.position.set(0.08, 1.54, -0.12); head.rotation.set(0.2, -0.1, 0.05); player.add(head);
    scene.updateMatrixWorld(true);
    const headLocalPosition = head.position.clone();
    const headLocalRotation = head.quaternion.clone();
    const headBefore = head.getWorldPosition(new Vector3());
    const orientationBefore = head.getWorldQuaternion(new Quaternion());
    const delta = Math.PI / 6;

    const result = rotatePlayerAroundHead(player, head, delta);
    const orientationAfter = head.getWorldQuaternion(new Quaternion());
    const expectedOrientation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), delta).multiply(orientationBefore);

    expect(result.headError).toBeLessThan(0.001);
    expect(result.headAfter.distanceTo(headBefore)).toBeLessThan(0.001);
    expect(Math.abs(orientationAfter.dot(expectedOrientation))).toBeCloseTo(1, 6);
    expect(head.position.distanceTo(headLocalPosition)).toBeLessThan(1e-8);
    expect(Math.abs(head.quaternion.dot(headLocalRotation))).toBeCloseTo(1, 7);
  });

  it('repeats hops across three destinations without accumulating head-local drift', () => {
    const scene = new Group();
    const player = new Group(); scene.add(player);
    const head = new Group(); head.position.set(-0.02, 1.58, -0.03); player.add(head);
    const localPosition = head.position.clone();
    const localRotation = head.quaternion.clone();
    const destinations = [
      { point: new Vector3(0, 0, -6.2), yaw: 0 },
      { point: new Vector3(2.6, 6, -23), yaw: -Math.PI / 2 },
      { point: new Vector3(0, 0, 4), yaw: 0 },
    ];
    for (const destination of [...destinations, ...destinations]) {
      const result = placePlayerAtWorldAnchor(player, head, destination.point, destination.yaw);
      expect(result.headError).toBeLessThan(0.001);
      expect(head.position.distanceTo(localPosition)).toBeLessThan(1e-8);
      expect(Math.abs(head.quaternion.dot(localRotation))).toBeCloseTo(1, 7);
    }
  });

  it('retains the authored viewpoint through XR end-session state changes', () => {
    const { session, driver } = fresh();
    driver.hop('v-foyer-door');
    expect(session.vantage).toBe('v-foyer-door');
    expect(session.apply({ type: 'EndSession' }).ok).toBe(true);
    expect(session.game).toBe('Title');
    expect(session.vantage).toBe('v-foyer-door');
  });
});

describe('regression (RT-15): a resting hand near a grip must not block a hop', () => {
  it('only a pinching hand on a grip, or a hand holding one, claims the pinch', () => {
    expect(pinchClaimedByGrip([{ pinching: false, holding: false, nearestGrip: 0.05 }, { pinching: true, holding: false, nearestGrip: Infinity }], 0.2)).toBe(false);
    expect(pinchClaimedByGrip([{ pinching: true, holding: false, nearestGrip: 0.15 }], 0.2)).toBe(true);
    expect(pinchClaimedByGrip([{ pinching: true, holding: false, nearestGrip: 0.25 }], 0.2)).toBe(false);
    expect(pinchClaimedByGrip([{ pinching: false, holding: true, nearestGrip: 0.5 }], 0.2)).toBe(true);
    expect(pinchClaimedByGrip([], 0.2)).toBe(false);
  });
});

describe('regression (RT-15): reaching for the letter must not change a setting', () => {
  const calm = [{ pinching: false, holding: false }];
  it('turn, intensity and hands answer only while the letter is offered at the chest', () => {
    for (const name of ['turn', 'intensity', 'hands']) {
      expect(settingSealLive(name, 'held', 'Playing', calm)).toBe(true);
      expect(settingSealLive(name, 'strap', 'Title', calm)).toBe(true);
      expect(settingSealLive(name, 'strap', 'Pause', calm)).toBe(true);
      expect(settingSealLive(name, 'strap', 'Playing', calm)).toBe(false);
      expect(settingSealLive(name, 'delivered', 'Playing', calm)).toBe(false);
    }
  });
  it('no seal answers while a hand pinches or holds (taking the letter, a grip)', () => {
    for (const name of ['turn', 'intensity', 'hands', 'restart']) {
      expect(settingSealLive(name, 'held', 'Title', [{ pinching: true, holding: false }])).toBe(false);
      expect(settingSealLive(name, 'held', 'Title', [{ pinching: false, holding: false }, { pinching: false, holding: true }])).toBe(false);
    }
  });
  it('restart (a 2 s dwell) needs only quiet hands', () => {
    expect(settingSealLive('restart', 'strap', 'Playing', calm)).toBe(true);
  });
});