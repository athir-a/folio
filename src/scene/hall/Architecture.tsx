import { useLayoutEffect, useMemo, useRef } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useSettings } from '../../state/settingsStore';
import { useSurface } from '../utils/assets';
import { mergePieces, placed, placedBox, pointedArchCurve, pointedArchShape } from '../utils/geometry';
import { BAYS, HALL, USER_BAY, WINDOW } from './layout';
import type { HallMaterials } from './materials';

const LENGTH = HALL.front - HALL.back;
const SLAB = 0.16; // balcony floor thickness
const RAIL_X = HALL.halfWidth - HALL.balconyDepth;
const RAIL_HEIGHT = 1.0;

/** z of every pilaster: between bays, plus one at each end of the run. */
function pilasterZs() {
  const pitch = BAYS.width + BAYS.pilaster;
  return [BAYS.z[0] + pitch / 2, ...BAYS.z.map((z) => z - pitch / 2)];
}

function Floor() {
  const high = useSettings((s) => s.quality === 'high');
  const oak = useSurface('oakFloor', [HALL.halfWidth, LENGTH / 2.2]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (HALL.front + HALL.back) / 2]} receiveShadow>
      <planeGeometry args={[HALL.halfWidth * 2, LENGTH]} />
      {high ? (
        <MeshReflectorMaterial
          {...oak}
          color="#b08a6c"
          roughness={0.75}
          metalness={0}
          blur={[400, 120]}
          resolution={1024}
          mixBlur={1}
          mixStrength={1.6}
          mixContrast={1}
          mirror={0}
          depthScale={0}
        />
      ) : (
        <meshStandardMaterial {...oak} color="#b08a6c" roughness={0.7} />
      )}
    </mesh>
  );
}

/** Window wall (with the great arched opening), the wall behind the camera, and the vault. */
function Shell({ m }: { m: HallMaterials }) {
  const geo = useMemo(() => {
    const W = HALL.halfWidth * 2;
    const vault = pointedArchCurve(W, HALL.wallTop, HALL.vaultRadius, 40);
    const wallOutline = (withWindow: boolean) => {
      const s = new THREE.Shape();
      s.moveTo(-HALL.halfWidth, 0);
      s.lineTo(HALL.halfWidth, 0);
      vault.points.forEach((p) => s.lineTo(p.x, p.y));
      s.lineTo(-HALL.halfWidth, 0);
      if (withWindow) {
        const win = pointedArchShape(WINDOW.width, WINDOW.bottom, WINDOW.spring, WINDOW.archRadius);
        s.holes.push(new THREE.Path(win.outline.slice().reverse()));
      }
      return new THREE.ShapeGeometry(s, 24);
    };
    // the vault: a thin band following the arch, extruded the length of the nave
    const band = new THREE.Shape();
    const outer = pointedArchCurve(W + 0.4, HALL.wallTop, HALL.vaultRadius + 0.2, 40).points;
    band.moveTo(outer[0].x, outer[0].y);
    outer.forEach((p) => band.lineTo(p.x, p.y));
    vault.points.slice().reverse().forEach((p) => band.lineTo(p.x, p.y));
    const vaultGeo = new THREE.ExtrudeGeometry(band, { depth: LENGTH, bevelEnabled: false, curveSegments: 40 });
    // ribs across the vault at every pilaster
    const ribCurve = new THREE.CatmullRomCurve3(vault.points.map((p) => new THREE.Vector3(p.x * 0.995, p.y - 0.05, 0)));
    const ribs = pilasterZs().map((z) => placed(new THREE.TubeGeometry(ribCurve, 64, 0.12, 8), [0, 0, z]));
    return { endWall: wallOutline(true), frontWall: wallOutline(false), vaultGeo, ribs: mergePieces(ribs, 1.5) };
  }, []);

  return (
    <group>
      <mesh geometry={geo.endWall} material={m.plaster} position={[0, 0, HALL.back]} receiveShadow castShadow />
      <mesh geometry={geo.frontWall} material={m.plaster} position={[0, 0, HALL.front]} rotation={[0, Math.PI, 0]} receiveShadow />
      <mesh geometry={geo.vaultGeo} material={m.plaster} position={[0, 0, HALL.back]} receiveShadow />
      <mesh geometry={geo.ribs} material={m.darkWalnut} castShadow receiveShadow />
      {/* plain walls behind the bookcases */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * HALL.halfWidth, HALL.wallTop / 2, (HALL.front + HALL.back) / 2]} rotation={[0, -side * (Math.PI / 2), 0]} material={m.plaster} receiveShadow>
          <planeGeometry args={[LENGTH, HALL.wallTop]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Pilasters, balcony slabs and fascias, cornices and the arched headers over
 * every ground-floor bay, merged into one walnut mesh.
 */
function Woodwork({ m }: { m: HallMaterials }) {
  const geometry = useMemo(() => {
    const pieces: THREE.BufferGeometry[] = [];
    const balconyTop = HALL.balconyY;
    for (const side of [-1, 1] as const) {
      const sx = (inset: number, depth: number) => side * (HALL.halfWidth - inset - depth / 2);
      for (const z of pilasterZs()) {
        // ground-floor pilaster with base and capital
        pieces.push(placedBox([0.6, balconyTop - SLAB, BAYS.pilaster], [sx(0, 0.6), (balconyTop - SLAB) / 2, z]));
        pieces.push(placedBox([0.68, 0.22, BAYS.pilaster + 0.1], [sx(0, 0.68), 0.11, z]));
        pieces.push(placedBox([0.7, 0.14, BAYS.pilaster + 0.12], [sx(0, 0.7), balconyTop - SLAB - 0.07, z]));
        // corbel under the balcony
        pieces.push(placedBox([HALL.balconyDepth - 0.55, 0.35, 0.22], [side * (HALL.halfWidth - 0.6 - (HALL.balconyDepth - 0.6) / 2), balconyTop - SLAB - 0.18, z]));
        // upper pilaster, up to the cornice
        const upperH = HALL.wallTop - balconyTop;
        pieces.push(placedBox([0.55, upperH, BAYS.pilaster], [sx(0, 0.55), balconyTop + upperH / 2, z]));
      }
      // balcony slab and its moulded fascia
      pieces.push(placedBox([HALL.balconyDepth, SLAB, LENGTH], [sx(0, HALL.balconyDepth), balconyTop - SLAB / 2, (HALL.front + HALL.back) / 2], 0, 0.02));
      pieces.push(placedBox([0.08, SLAB + 0.12, LENGTH], [side * (RAIL_X - 0.02), balconyTop - SLAB / 2 - 0.04, (HALL.front + HALL.back) / 2], 0, 0.02));
      // handrail
      pieces.push(placedBox([0.09, 0.06, LENGTH], [side * (RAIL_X + 0.05), balconyTop + RAIL_HEIGHT, (HALL.front + HALL.back) / 2], 0, 0.02));
      // cornice where the vault springs
      pieces.push(placedBox([0.7, 0.3, LENGTH], [sx(0, 0.7), HALL.wallTop - 0.15, (HALL.front + HALL.back) / 2], 0, 0.04));
      pieces.push(placedBox([0.85, 0.1, LENGTH], [sx(0, 0.85), HALL.wallTop + 0.03, (HALL.front + HALL.back) / 2], 0, 0.03));

      // arched header panel over each ground-floor bay
      BAYS.z.forEach((z, i) => {
        const isUser = side === USER_BAY.side && i === USER_BAY.index;
        const bottom = isUser ? 2.42 : BAYS.groundHeight;
        const top = balconyTop - SLAB;
        pieces.push(placedBox([0.06, top - bottom, BAYS.width], [side * (HALL.halfWidth - BAYS.depth - 0.03), (top + bottom) / 2, z]));
        const r = BAYS.width / 2 - 0.12;
        const arcY = top - 0.12 - r * 0.55;
        const arc = new THREE.CatmullRomCurve3(
          Array.from({ length: 25 }, (_, k) => {
            const a = Math.PI * 0.08 + (Math.PI * 0.84 * k) / 24;
            return new THREE.Vector3(0, arcY + Math.sin(a) * r * 0.55, Math.cos(a) * r);
          }),
        );
        pieces.push(placed(new THREE.TubeGeometry(arc, 40, 0.035, 8), [side * (HALL.halfWidth - BAYS.depth - 0.06), 0, z]));
        pieces.push(placedBox([0.08, 0.2, 0.14], [side * (HALL.halfWidth - BAYS.depth - 0.07), arcY + r * 0.55, z])); // keystone
      });
    }
    return mergePieces(pieces, 1.2);
  }, []);

  return <mesh geometry={geometry} material={m.darkWalnut} castShadow receiveShadow />;
}

/** Wrought-iron balusters along both balconies. */
function Railings({ m }: { m: HallMaterials }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const spacing = 0.14;
  const perSide = Math.floor(LENGTH / spacing);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    let i = 0;
    for (const side of [-1, 1]) {
      for (let k = 0; k < perSide; k++) {
        o.position.set(side * (RAIL_X + 0.05), HALL.balconyY + RAIL_HEIGHT / 2, HALL.back + 0.1 + k * spacing);
        o.updateMatrix();
        ref.current.setMatrixAt(i++, o.matrix);
      }
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, [perSide]);
  return (
    <instancedMesh ref={ref} args={[undefined, m.iron, perSide * 2]} castShadow>
      <cylinderGeometry args={[0.012, 0.012, RAIL_HEIGHT, 6]} />
    </instancedMesh>
  );
}

export function Architecture({ m }: { m: HallMaterials }) {
  return (
    <group>
      <Floor />
      <Shell m={m} />
      <Woodwork m={m} />
      <Railings m={m} />
    </group>
  );
}
