import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useLibrary } from '../../state/libraryStore';
import { useSurface } from '../utils/assets';
import { SHELF, rowFloorY } from './layout';

const CROWN = 0.03; // how far the crown moulding projects
const LIP = 0.018; // extra depth of each shelf's front edge band

/**
 * Polished walnut, matching the hall's bookcases: grain runs along each piece
 * (vertical on uprights, horizontal on shelves) under a soft clear coat. The
 * back panel is a shade darker so books stand out against it.
 */
function useWoodMaterials() {
  const vertical = useSurface('walnut', [1, 2]);
  const horizontal = useSurface('walnut', [2, 1]);
  return useMemo(() => {
    // the scan's grain runs horizontally, so it is the uprights that need turning
    for (const t of [vertical.map!, vertical.normalMap, vertical.roughnessMap]) {
      t.center.set(0.5, 0.5);
      t.rotation = Math.PI / 2;
    }
    const make = (color: string, maps: typeof vertical) =>
      new THREE.MeshPhysicalMaterial({ ...maps, color, roughness: 0.85, clearcoat: 0.4, clearcoatRoughness: 0.3 });
    return {
      vertical: make('#d0915f', vertical),
      horizontal: make('#d0915f', horizontal),
      back: make('#8a5636', vertical),
      brass: new THREE.MeshPhysicalMaterial({ color: '#c9a052', metalness: 1, roughness: 0.3 }),
    };
  }, [vertical, horizontal]);
}

/** Concave cove profile, extruded to make the crown moulding. Shape x = outward, y = down. */
function crownGeometry(length: number) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(CROWN, 0);
  s.lineTo(CROWN, -0.006);
  s.quadraticCurveTo(0.006, -0.008, 0.003, -0.038);
  s.lineTo(0, -0.04);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false, curveSegments: 12 });
}

function Part({ geometry, material, position }: { geometry: THREE.BufferGeometry; material: THREE.Material; position: [number, number, number] }) {
  return <mesh geometry={geometry} material={material} position={position} castShadow receiveShadow />;
}

/** The visitor's walnut bookcase. Children (the books) wobble along with it when a book lands. */
export function Bookshelf({ children }: { children?: ReactNode }) {
  const group = useRef<THREE.Group>(null!);
  const paint = useWoodMaterials();
  const { width: W, height: H, depth: D, side, board, base, rows } = SHELF;
  const innerW = W - side * 2;

  const parts = useMemo(() => {
    const backPlanks = 9;
    const plankW = innerW / backPlanks;
    return {
      side: new RoundedBoxGeometry(side, H, D, 3, 0.006),
      top: new RoundedBoxGeometry(W + CROWN * 2 + 0.01, board, D + CROWN + 0.008, 3, 0.008),
      // spans from the back planks to the front lip
      shelf: new RoundedBoxGeometry(innerW, board, D - LIP - 0.012, 2, 0.004),
      lip: new RoundedBoxGeometry(innerW, board + 0.014, LIP, 3, 0.005),
      plank: new RoundedBoxGeometry(plankW - 0.0025, H - base - board, 0.012, 2, 0.003),
      plankX: Array.from({ length: backPlanks }, (_, i) => -innerW / 2 + plankW * (i + 0.5)),
      plinth: new RoundedBoxGeometry(innerW, base, 0.022, 2, 0.004),
      crownFront: crownGeometry(W + CROWN * 2),
      crownSide: crownGeometry(D),
    };
  }, [W, H, D, side, board, base, innerW]);

  useFrame(() => {
    const since = (performance.now() - useLibrary.getState().shakeAt) / 1000;
    if (since < 0.7) {
      const k = 1 - since / 0.7;
      group.current.rotation.z = Math.sin(since * 38) * 0.006 * k;
      group.current.position.y = Math.abs(Math.sin(since * 30)) * 0.008 * k;
    } else if (group.current.rotation.z !== 0) {
      group.current.rotation.z = 0;
      group.current.position.y = 0;
    }
  });

  const topY = H - board / 2;
  return (
    <group position={SHELF.position} rotation={[0, SHELF.rotationY, 0]}>
      <group ref={group}>
        <Part geometry={parts.side} material={paint.vertical} position={[-W / 2 + side / 2, H / 2, 0]} />
        <Part geometry={parts.side} material={paint.vertical} position={[W / 2 - side / 2, H / 2, 0]} />
        <Part geometry={parts.top} material={paint.horizontal} position={[0, topY + 0.002, (CROWN + 0.008) / 2]} />

        {/* crown moulding under the top's overhang: front, then each side */}
        <mesh geometry={parts.crownFront} material={paint.horizontal} rotation={[0, -Math.PI / 2, 0]} position={[W / 2 + CROWN, H - board, D / 2]} castShadow receiveShadow />
        <mesh geometry={parts.crownSide} material={paint.vertical} position={[W / 2, H - board, -D / 2]} castShadow receiveShadow />
        <mesh geometry={parts.crownSide} material={paint.vertical} rotation={[0, Math.PI, 0]} position={[-W / 2, H - board, D / 2]} castShadow receiveShadow />

        {/* tongue-and-groove back panel */}
        {parts.plankX.map((x, i) => (
          <Part key={i} geometry={parts.plank} material={paint.back} position={[x, (H + base - board) / 2, -D / 2 + 0.008]} />
        ))}

        {/* shelves with a thicker front edge band, like real furniture */}
        {Array.from({ length: rows }, (_, row) => {
          const y = rowFloorY(row) - board / 2;
          return (
            <group key={row}>
              <Part geometry={parts.shelf} material={paint.horizontal} position={[0, y, (0.016 - LIP) / 2]} />
              <Part geometry={parts.lip} material={paint.horizontal} position={[0, y - 0.007, D / 2 - LIP / 2]} />
              {/* thin brass rail along the shelf edge */}
              <mesh material={paint.brass} position={[0, y - 0.004, D / 2 + 0.004]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.004, 0.004, innerW, 8]} />
              </mesh>
            </group>
          );
        })}

        {/* recessed plinth */}
        <Part geometry={parts.plinth} material={paint.horizontal} position={[0, base / 2, D / 2 - 0.03]} />
        {children}
      </group>
    </group>
  );
}
