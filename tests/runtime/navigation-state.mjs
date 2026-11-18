/** Live assertions for the active IWSDK/IWER session. Run with `npm run test:runtime`. */
export default async function navigationState({ frame }) {
  return frame.evaluate(() => {
    const game = globalThis.__rz;
    if (!game) throw new Error('Room Zero development hook is unavailable');
    if (!game.world.session) throw new Error('Enter immersive XR before running the live navigation audit');
    if (!game.session.playing() || game.failed) {
      game.restart();
      game.step(0);
      game.view(0.6, []);
    }
    if (!game.session.playing()) throw new Error(`Expected an active playable session, got ${game.session.game}`);

    const fail = (message) => { throw new Error(`Navigation audit: ${message}`); };
    const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const worldPosition = (object) => {
      object.updateWorldMatrix(true, false);
      return object.getWorldPosition(new object.position.constructor()).toArray();
    };
    const vantages = game.content.vantages;
    if (vantages.length !== 11) fail(`expected 11 authored vantages, got ${vantages.length}`);
    if (new Set(vantages.map((v) => v.id)).size !== vantages.length) fail('viewpoint IDs are not unique');

    const playerWorld = worldPosition(game.world.player);
    const headWorld = worldPosition(game.world.player.head);
    const beaconAudit = vantages.map((v) => {
      const beacon = game.beacons.get(v.id);
      const groupEntity = game.beaconGroupEntities.get(v.id);
      const moduleEntity = game.moduleEntities.get(v.module);
      if (!beacon || !groupEntity || !moduleEntity) fail(`missing registry entry for ${v.id}`);
      if (beacon.group.parent !== moduleEntity.object3D) fail(`${v.id} group is not parented under its room module`);
      if (beacon.entity.object3D.parent !== beacon.group) fail(`${v.id} ray target is not parented under its beacon group`);
      const targetWorld = worldPosition(beacon.entity.object3D);
      const anchor = game.vantageWorld(v.id, new beacon.entity.object3D.position.constructor()).toArray();
      return {
        targetId: v.id,
        entityId: beacon.entity.index,
        parentEntityId: groupEntity.index,
        moduleEntityId: moduleEntity.index,
        localTarget: beacon.entity.object3D.position.toArray(),
        localGroup: beacon.group.position.toArray(),
        module: v.module,
        targetWorld,
        worldMatrix: beacon.entity.object3D.matrixWorld.toArray(),
        expectedPlayerAnchor: anchor,
        distanceFromPlayerOrigin: distance(playerWorld, anchor),
      };
    });
    if (new Set(beaconAudit.map((b) => b.entityId)).size !== vantages.length) fail('two vantages share an ECS target entity');
    if (new Set(beaconAudit.map((b) => b.targetWorld.map((n) => n.toFixed(3)).join(','))).size !== vantages.length) fail('two beacon targets resolve to the same world position');

    return {
      runtime: 'IWSDK 1.1.0 / IWER immersive session',
      game: game.session.game,
      playing: game.session.playing(),
      vantage: game.session.vantage,
      reachable: game.session.reachable(),
      playerWorld,
      headWorld,
      headLocal: game.world.player.head.position.toArray(),
      headLocalOrientation: game.world.player.head.quaternion.toArray(),
      beaconCount: beaconAudit.length,
      beacons: beaconAudit,
    };
  });
}
