import { describe, expect, it } from 'vitest';
import { BoxGeometry, Box3, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from '@iwsdk/core';
import { mergeStatic } from '../../src/world/merge';

const standard = () => new MeshStandardMaterial({ color: 0x884422 });
const meshes = (root: Group) => { const out: Mesh[] = []; root.traverse((o) => { if ((o as Mesh).isMesh) out.push(o as Mesh); }); return out; };
const bounds = (root: Group) => { root.updateMatrixWorld(true); return new Box3().setFromObject(root); };

describe('static merge (draw-call reduction)', () => {
  it('turns meshes sharing one opaque material into one, keeping the room exactly where it was', () => {
    const wood = standard();
    const room = new Group();
    const a = new Mesh(new BoxGeometry(1, 1, 1), wood); a.position.set(2, 0.5, 0);
    const b = new Mesh(new CylinderGeometry(0.3, 0.3, 2, 8), wood); b.position.set(-1, 1, 3); b.rotation.z = 0.4;
    const nested = new Group(); nested.position.set(0, 5, 0); nested.rotation.y = 1.1; const c = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), wood); c.position.set(1, 0, 0); nested.add(c);
    room.add(a, b, nested);
    const before = bounds(room);
    const vertices = meshes(room).reduce((n, m) => n + m.geometry.getAttribute('position').count, 0);

    const result = mergeStatic(room);
    const after = meshes(room);
    expect(result).toEqual({ before: 3, after: 1 });
    expect(after).toHaveLength(1);
    expect(after[0].geometry.getAttribute('position').count).toBe(vertices);
    const box = bounds(room);
    for (const [x, y] of [[box.min, before.min], [box.max, before.max]] as [Vector3, Vector3][]) expect(x.distanceTo(y)).toBeLessThan(1e-4);
  });

  it('leaves transparent, basic and kept meshes, and one-off materials, as they are', () => {
    const room = new Group();
    const wood = standard(), other = standard();
    const glass = new MeshStandardMaterial({ transparent: true, opacity: 0.2 });
    const lit = new MeshBasicMaterial({ color: 0xffcc88 });
    const animated = new Mesh(new BoxGeometry(1, 1, 1), wood);
    const adds = [new Mesh(new BoxGeometry(1, 1, 1), wood), new Mesh(new BoxGeometry(1, 1, 1), wood), animated, new Mesh(new BoxGeometry(1, 1, 1), other),
      new Mesh(new BoxGeometry(1, 1, 1), glass), new Mesh(new BoxGeometry(1, 1, 1), glass), new Mesh(new BoxGeometry(1, 1, 1), lit), new Mesh(new BoxGeometry(1, 1, 1), lit)];
    adds.forEach((m, i) => { m.position.x = i * 2; });
    room.add(...adds);
    const hidden = new Mesh(new BoxGeometry(1, 1, 1), wood); hidden.visible = false; room.add(hidden);

    const result = mergeStatic(room, new Set([animated]));
    const names = meshes(room);
    expect(result.after).toBe(result.before - 1); // only the two plain wood boxes merged
    expect(names).toContain(animated);
    expect(names).toContain(hidden);
    expect(names.filter((m) => m.material === glass)).toHaveLength(2);
    expect(names.filter((m) => m.material === lit)).toHaveLength(2);
    expect(names.filter((m) => m.material === other)).toHaveLength(1);
    expect(names.filter((m) => m.name === 'merged-static')).toHaveLength(1);
  });
});
