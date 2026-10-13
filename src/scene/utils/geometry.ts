import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Helpers for building architecture out of many simple pieces and merging them
 * into one geometry per material (one draw call instead of hundreds).
 */

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();

/** A rounded box, already moved/rotated into place. Non-indexed, so it merges with others. */
export function placedBox(
  size: [number, number, number],
  position: [number, number, number],
  rotationY = 0,
  radius = 0.006,
): THREE.BufferGeometry {
  const r = Math.min(radius, size[0] / 2 - 1e-4, size[1] / 2 - 1e-4, size[2] / 2 - 1e-4);
  const g = new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.max(r, 1e-4));
  g.clearGroups();
  tmpQuat.setFromEuler(tmpEuler.set(0, rotationY, 0));
  g.applyMatrix4(tmpMatrix.compose(new THREE.Vector3(...position), tmpQuat, new THREE.Vector3(1, 1, 1)));
  return g;
}

/** Moves any geometry into place and makes it non-indexed so it can be merged with boxes. */
export function placed(geometry: THREE.BufferGeometry, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.clearGroups();
  g.applyMatrix4(tmpMatrix.compose(new THREE.Vector3(...position), tmpQuat.setFromEuler(tmpEuler.set(...rotation)), new THREE.Vector3(1, 1, 1)));
  return g;
}

/**
 * Replaces UVs with box-projected world-space UVs (in tiles), so a texture keeps
 * the same real-world scale on every piece, and wood grain runs vertically on
 * upright surfaces.
 */
export function worldBoxUV(geometry: THREE.BufferGeometry, metresPerTile: number) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    let u: number;
    let v: number;
    if (ny >= nx && ny >= nz) {
      u = pos.getX(i);
      v = pos.getZ(i);
    } else if (nx >= nz) {
      u = pos.getZ(i);
      v = pos.getY(i);
    } else {
      u = pos.getX(i);
      v = pos.getY(i);
    }
    uv[i * 2] = u / metresPerTile;
    uv[i * 2 + 1] = v / metresPerTile;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

/** Merges pieces into one geometry, with world-scale UVs. */
export function mergePieces(pieces: THREE.BufferGeometry[], metresPerTile = 1.2) {
  const merged = mergeGeometries(pieces.map((p) => (p.index ? p.toNonIndexed() : p)), false);
  pieces.forEach((p) => p.dispose());
  if (!merged) throw new Error('mergePieces: incompatible geometries');
  return worldBoxUV(merged, metresPerTile);
}

/**
 * Points along a pointed (gothic) arch from the right springing point, over the
 * apex, to the left one. Two arcs of radius `r` (> width / 2) meet at the apex.
 */
export function pointedArchCurve(width: number, spring: number, r: number, segments = 32) {
  const half = width / 2;
  const centreOffset = half - r; // x of the right-hand arc's centre (negative for a pointed arch)
  const theta = Math.acos(-centreOffset / r);
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (theta * i) / segments;
    points.push(new THREE.Vector2(centreOffset + r * Math.cos(a), spring + r * Math.sin(a)));
  }
  for (let i = 1; i <= segments; i++) {
    const a = Math.PI - theta + (theta * i) / segments;
    points.push(new THREE.Vector2(-centreOffset + r * Math.cos(a), spring + r * Math.sin(a)));
  }
  return { points, apex: spring + r * Math.sin(theta) };
}

/** Closed outline of a pointed-arch opening: straight sides from `bottom` to `spring`, then the arch. */
export function pointedArchShape(width: number, bottom: number, spring: number, r: number, segments = 32) {
  const { points, apex } = pointedArchCurve(width, spring, r, segments);
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, bottom);
  shape.lineTo(width / 2, bottom);
  points.forEach((p) => shape.lineTo(p.x, p.y));
  shape.lineTo(-width / 2, bottom);
  // the full closed outline (sides and arch), without the repeated start point
  const outline = shape.getPoints().slice(0, -1);
  return { shape, apex, outline };
}
