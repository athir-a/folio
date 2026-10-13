import { useMemo } from 'react';
import * as THREE from 'three';
import { useSurface } from '../utils/assets';
import { mergePieces, placed, placedBox, pointedArchCurve, pointedArchShape } from '../utils/geometry';
import { bannerTexture } from '../utils/textures';
import { HALL, WINDOW } from './layout';
import type { HallMaterials } from './materials';

const Z = HALL.back + 0.02;

function tube(points: THREE.Vector2[], radius: number, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, p.y, 0)), closed);
  return new THREE.TubeGeometry(curve, points.length * 2, radius, 8, closed);
}

/** The great pointed window: iron frame and tracery, glass, sill and a hanging banner. */
export function GothicWindow({ m }: { m: HallMaterials }) {
  const velvet = useSurface('velvet', [1, 2]);
  const { frame, glass, sill } = useMemo(() => {
    const { width: w, bottom, spring, archRadius } = WINDOW;
    const outline = pointedArchShape(w, bottom, spring, archRadius, 40);
    const pieces: THREE.BufferGeometry[] = [];
    pieces.push(placed(tube(outline.outline, 0.09, true), [0, 0, Z + 0.05]));
    // mullions and transoms
    for (const x of [-w / 4, 0, w / 4]) {
      const top = x === 0 ? spring + 1.2 : spring + 0.45;
      pieces.push(placedBox([x === 0 ? 0.12 : 0.08, top - bottom, 0.1], [x, (top + bottom) / 2, Z + 0.05]));
    }
    for (const y of [bottom + 2.0, bottom + 4.0]) pieces.push(placedBox([w, 0.07, 0.09], [0, y, Z + 0.05]));
    // two pointed lancets and a rose ring in the head of the arch
    for (const cx of [-w / 4, w / 4]) {
      const lancet = pointedArchCurve(w / 2 - 0.1, spring, (w / 2) * 0.82, 24).points.map((p) => new THREE.Vector2(p.x + cx, p.y));
      pieces.push(placed(tube(lancet, 0.06), [0, 0, Z + 0.05]));
    }
    const roseY = spring + (outline.apex - spring) * 0.62;
    const rose = Array.from({ length: 33 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2;
      return new THREE.Vector2(Math.cos(a) * 0.62, roseY + Math.sin(a) * 0.62);
    });
    pieces.push(placed(tube(rose.slice(0, 32), 0.06, true), [0, 0, Z + 0.05]));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      pieces.push(placedBox([0.05, 0.62, 0.06], [Math.cos(a) * 0.31, roseY + Math.sin(a) * 0.31, Z + 0.05], 0));
    }
    return {
      frame: mergePieces(pieces, 1),
      glass: new THREE.ShapeGeometry(outline.shape, 24),
      sill: placedBox([w + 0.6, 0.12, 0.5], [0, bottom - 0.06, Z + 0.25], 0, 0.02),
    };
  }, []);

  const banner = useMemo(() => {
    const s = new THREE.Shape();
    const bw = 0.75;
    const bh = 2.3;
    s.moveTo(-bw / 2, 0);
    s.lineTo(bw / 2, 0);
    s.lineTo(bw / 2, -bh);
    s.lineTo(0, -bh + 0.3); // swallow-tail
    s.lineTo(-bw / 2, -bh);
    s.closePath();
    const g = new THREE.ShapeGeometry(s, 4);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / bw + 0.5, 1 + pos.getY(i) / bh);
      pos.setZ(i, Math.sin(pos.getX(i) * 9) * 0.02);
    }
    g.computeVertexNormals();
    const material = new THREE.MeshPhysicalMaterial({
      map: bannerTexture(),
      normalMap: velvet.normalMap,
      roughness: 0.9,
      sheen: 1,
      sheenColor: new THREE.Color('#6d86c8'),
      sheenRoughness: 0.45,
      side: THREE.DoubleSide,
    });
    return { geometry: g, material };
  }, [velvet]);

  return (
    <group>
      <mesh geometry={frame} material={m.iron} castShadow receiveShadow />
      <mesh geometry={glass} position={[0, 0, Z + 0.03]}>
        <meshPhysicalMaterial color="#cfe0ff" transparent opacity={0.07} roughness={0.03} metalness={0} envMapIntensity={1.2} depthWrite={false} />
      </mesh>
      <mesh geometry={sill} material={m.walnut} castShadow receiveShadow />
      {/* banner hanging just inside the window */}
      <group position={[1.25, 5.2, Z + 0.45]}>
        <mesh material={m.brass} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.95, 12]} />
        </mesh>
        <mesh geometry={banner.geometry} material={banner.material} position={[0, -0.02, 0]} castShadow receiveShadow />
      </group>
    </group>
  );
}
