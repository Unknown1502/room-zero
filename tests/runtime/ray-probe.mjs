/** Read-only diagnostic for an IWER hand ray against one beacon target. */
export default async function rayProbe({ frame }) {
  return frame.evaluate(() => {
    const game = globalThis.__rz;
    const rightRay = game.world.player.raySpaces.right;
    rightRay.updateWorldMatrix(true, false);
    const origin = rightRay.getWorldPosition(game.world.player.position.clone());
    const orientation = rightRay.getWorldQuaternion(game.world.player.quaternion.clone());
    const direction = new origin.constructor(0, 0, -1).applyQuaternion(orientation).normalize();
    const pointer = game.world.input.xr.multiPointers.right;
    const hit = pointer.ray.pointer.getIntersection();
    const hitAncestry = [];
    for (let object = hit?.object; object; object = object.parent) {
      const beacon = [...game.beacons].find(([, value]) => value.entity.object3D === object);
      hitAncestry.push({ name: object.name, type: object.type, beacon: beacon?.[0] });
    }
    const landingEntity = game.beacons.get('v-landing-east').entity;
    const targets = [...game.beacons].map(([id, beacon]) => {
      const target = beacon.entity.object3D;
      target.updateWorldMatrix(true, false);
      const center = target.getWorldPosition(origin.clone());
      const delta = center.clone().sub(origin);
      const alongRay = delta.dot(direction);
      const closest = origin.clone().addScaledVector(direction, alongRay);
      const scale = target.getWorldScale(origin.clone().set(1, 1, 1));
      const radius = target.geometry?.boundingSphere?.radius ?? null;
      return {
        id,
        center: center.toArray(),
        alongRay,
        perpendicularMiss: closest.distanceTo(center),
        worldScale: scale.toArray(),
        geometryRadius: radius,
        intersectsBounds: radius === null ? null : closest.distanceTo(center) <= radius * Math.max(scale.x, scale.y, scale.z),
        visible: beacon.group.visible,
        reachable: game.session.reachable().includes(id),
      };
    });
    return {
      origin: origin.toArray(),
      direction: direction.toArray(),
      pointer: {
        activeKind: pointer.activeKind,
        states: [...pointer.pointerStates.entries()],
        rayHit: hit ? { distance: hit.distance, objectName: hit.object?.name, objectType: hit.object?.type, point: hit.point?.toArray() } : null,
        hitAncestry,
      },
      landingEntity: {
        keys: Object.keys(landingEntity),
        prototype: Object.getOwnPropertyNames(Object.getPrototypeOf(landingEntity)),
        components: landingEntity.getComponents().map((component) => ({ id: component.id, description: component.description, schema: component.schema, typeId: component.typeId })),
      },
      targets,
    };
  });
}
