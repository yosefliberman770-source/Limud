/** Pure geometry of the book choreography. All units are centimetres; +y up, +z toward the viewer. */
import { P_MAX } from './machine';

export interface BookDims { W: number; H: number; T: number }
export interface Vec3 { x: number; y: number; z: number }

export const COVER_OPEN_MAX = (155 * Math.PI) / 180;
export const FOLIO_COUNT = 6;
export const FAN_MAX = (150 * Math.PI) / 180;
export const SHELF_ROT_Y = -Math.PI / 2;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface Stage {
  /** Where the book stands on the shelf (center of the book box in world space, spine toward +z). */
  home: Vec3;
  dims: BookDims;
  /** Where the presented book is centred in world space. */
  present: Vec3;
  /** Extra lift while travelling. */
  arc?: number;
}

export interface Pose {
  position: Vec3;
  rotY: number;
  rotX: number;
  cover: number; // radians
  fan: number; // 0..1
  /** 0..1 how much the environment should dim/haze. */
  dim: number;
  /** 0..1 how close we are to the fully opened log state (for camera dolly). */
  open: number;
  /** Stage progress values for debugging/tests. */
  s: [number, number, number, number];
}

export function poseAt(p: number, st: Stage): Pose {
  const pp = Math.min(P_MAX, Math.max(0, p));
  const s1 = easeInOut(clamp01(pp));
  const s2 = easeInOut(clamp01(pp - 1));
  const s3 = easeInOut(clamp01(pp - 2));
  const s4 = easeInOut(clamp01(pp - 3));
  const { home, dims, present } = st;
  const slide = dims.W * 0.62 + 2.5;
  // 1) slide straight out of the shelf along +z (neighbours untouched), tiny lift
  const out: Vec3 = { x: home.x, y: home.y + 0.5 * s1, z: home.z + slide * s1 };
  // 2) travel to the presentation spot along an arc, turning to face the front cover
  const arc = (st.arc ?? 3) * Math.sin(Math.PI * s2);
  const position: Vec3 = {
    x: lerp(out.x, present.x, s2),
    y: lerp(out.y, present.y, s2) + arc,
    z: lerp(out.z, present.z, s2),
  };
  const rotY = lerp(SHELF_ROT_Y, 0, s2);
  // gentle forward tilt while handled, settling flat when fully open
  const rotX = -0.16 * Math.sin(Math.PI * clamp01(s2 * 0.9 + 0.1)) * (1 - s3) - 0.0 * s4;
  return {
    position,
    rotY,
    rotX,
    cover: s3 * COVER_OPEN_MAX,
    fan: s4,
    dim: easeOut(clamp01(pp / 2)),
    open: s4,
    s: [s1, s2, s3, s4],
  };
}

/** Angle of folio `i` (0 = top-most) for a fan value in [0,1]. */
export function folioAngle(i: number, fan: number, count = FOLIO_COUNT): number {
  const t = 1 - i / (count + 0.5);
  return fan * FAN_MAX * t;
}

/** Screen-space helper: distance at which an object of the given height fills `fraction` of the visible height. */
export function distanceForHeight(height: number, fraction: number, fovDeg: number): number {
  const half = Math.tan((fovDeg * Math.PI) / 360);
  return height / (2 * half * fraction);
}

export function distanceForWidth(width: number, fraction: number, fovDeg: number, aspect: number): number {
  const half = Math.tan((fovDeg * Math.PI) / 360);
  return width / (2 * half * aspect * fraction);
}
