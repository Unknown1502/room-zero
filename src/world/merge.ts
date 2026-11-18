// Draw-call reduction for the procedural house: static meshes that share one opaque standard material become one mesh per
// material, per room. Rooms move as whole groups, so nothing static inside one needs its own draw call.
// Left alone: transparent and basic (emissive, text) materials, anything the view animates (the caller's `keep` set),
// invisible objects, instanced meshes. Pure presentation: no rules depend on it.
import { BufferGeometry, Float32BufferAttribute, Matrix3, Matrix4, Mesh, Uint32BufferAttribute, Vector3, type Material, type MeshStandardMaterial, type Object3D } from '@iwsdk/core';

export interface MergeResult { before: number; after: number }

export function mergeStatic(root: Object3D, keep: ReadonlySet<Object3D> = new Set()): MergeResult {
  root.updateMatrixWorld(true);
  const inverse = new Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map<Material, Mesh[]>();
  let before = 0;
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || (m as { isInstancedMesh?: boolean }).isInstancedMesh) return;
    const material = m.material;
    if (Array.isArray(material) || !(material as MeshStandardMaterial).isMeshStandardMaterial || material.transparent) return;
    for (let p: Object3D | null = m; p && p !== root.parent; p = p.parent) if (keep.has(p) || !p.visible) return;
    if (!m.geometry.getAttribute('position') || !m.geometry.getAttribute('normal')) return;
    before++;
    const list = groups.get(material);
    if (list) list.push(m); else groups.set(material, [m]);
  });

  let after = before;
  const normal = new Matrix3();
  const to = new Matrix4();
  const v = new Vector3();
  for (const [material, meshes] of groups) {
    if (meshes.length < 2) continue;
    const position: number[] = [];
    const normals: number[] = [];
    const uv: number[] = [];
    const index: number[] = [];
    for (const m of meshes) {
      to.multiplyMatrices(inverse, m.matrixWorld);
      normal.getNormalMatrix(to);
      const g = m.geometry;
      const p = g.getAttribute('position'), n = g.getAttribute('normal'), t = g.getAttribute('uv');
      const base = position.length / 3;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(to); position.push(v.x, v.y, v.z);
        v.fromBufferAttribute(n, i).applyMatrix3(normal).normalize(); normals.push(v.x, v.y, v.z);
        if (t) uv.push(t.getX(i), t.getY(i)); else uv.push(0, 0);
      }
      const idx = g.getIndex();
      if (idx) for (let i = 0; i < idx.count; i++) index.push(base + idx.getX(i));
      else for (let i = 0; i < p.count; i++) index.push(base + i);
    }
    const merged = new BufferGeometry();
    merged.setAttribute('position', new Float32BufferAttribute(position, 3));
    merged.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    merged.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    merged.setIndex(new Uint32BufferAttribute(index, 1));
    const mesh = new Mesh(merged, material);
    mesh.name = 'merged-static';
    for (const m of meshes) { m.parent?.remove(m); m.geometry.dispose(); }
    root.add(mesh);
    after -= meshes.length - 1;
  }
  return { before, after };
}
