// Minimal geometry for the house. Every rotation in the chapter is about the vertical axis,
// so a pose is a position plus a yaw. Pure TypeScript: no Three.js, no SDK, no DOM.

export interface Pose {
  x: number;
  y: number;
  z: number;
  /** Rotation about +Y in radians, Three.js convention. */
  yaw: number;
}

/** Axis-aligned box in a module's own frame: centre and half extents. */
export interface Box {
  cx: number;
  cy: number;
  cz: number;
  hx: number;
  hy: number;
  hz: number;
}

/** Rotate the horizontal vector (x, z) by yaw about +Y. */
export function rotY(x: number, z: number, yaw: number): [number, number] {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [x * c + z * s, -x * s + z * c];
}

export function compose(parent: Pose, lx: number, ly: number, lz: number, lyaw = 0): Pose {
  const [rx, rz] = rotY(lx, lz, parent.yaw);
  return { x: parent.x + rx, y: parent.y + ly, z: parent.z + rz, yaw: parent.yaw + lyaw };
}

/** Rotate a pose about a vertical axis through (px, pz). */
export function rotateAbout(p: Pose, px: number, pz: number, angle: number): Pose {
  const [rx, rz] = rotY(p.x - px, p.z - pz, angle);
  return { x: px + rx, y: p.y, z: pz + rz, yaw: p.yaw + angle };
}

export function distance(a: Pose, b: Pose): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Angle in degrees between two horizontal unit vectors. */
export function angleDeg(ax: number, az: number, bx: number, bz: number): number {
  const d = Math.max(-1, Math.min(1, ax * bx + az * bz));
  return (Math.acos(d) * 180) / Math.PI;
}

/** Do two boxes, each placed by a pose, overlap? Separating-axis test in plan plus a height test. */
export function boxesOverlap(pa: Pose, a: Box, pb: Pose, b: Box): boolean {
  const ay = pa.y + a.cy;
  const by = pb.y + b.cy;
  if (Math.abs(ay - by) >= a.hy + b.hy) return false;
  const ca = compose(pa, a.cx, 0, a.cz);
  const cb = compose(pb, b.cx, 0, b.cz);
  const axes: [number, number][] = [rotY(1, 0, pa.yaw), rotY(0, 1, pa.yaw), rotY(1, 0, pb.yaw), rotY(0, 1, pb.yaw)];
  const dx = cb.x - ca.x;
  const dz = cb.z - ca.z;
  for (const [nx, nz] of axes) {
    const ra = radius(a, pa.yaw, nx, nz);
    const rb = radius(b, pb.yaw, nx, nz);
    if (Math.abs(dx * nx + dz * nz) >= ra + rb) return false;
  }
  return true;
}

function radius(b: Box, yaw: number, nx: number, nz: number): number {
  const [ux, uz] = rotY(1, 0, yaw);
  const [vx, vz] = rotY(0, 1, yaw);
  return b.hx * Math.abs(ux * nx + uz * nz) + b.hz * Math.abs(vx * nx + vz * nz);
}

/** 32-bit FNV-1a, for state hashes. */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
