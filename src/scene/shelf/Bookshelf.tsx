import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { useLibrary } from '../../state/libraryStore';
import { COMPARTMENT_HEIGHT, SHELF, rowFloorY } from './layout';

const BLUE = '#2b64e3';
const BLUE_BACK = '#3a6fe0';

function Board({ size, position, color = BLUE }: { size: [number, number, number]; position: [number, number, number]; color?: string }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.12} roughness={0.42} metalness={0.02} />
    </mesh>
  );
}

/** The cobalt-blue bookcase. Children (the books) wobble along with it when a book lands. */
export function Bookshelf({ children }: { children?: ReactNode }) {
  const group = useRef<THREE.Group>(null!);
  const { width: W, height: H, depth: D, side, board, base } = SHELF;

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

  const innerW = W - side * 2;
  return (
    <group position={SHELF.position}>
      <group ref={group}>
        {/* sides */}
        <Board size={[side, H, D]} position={[-W / 2 + side / 2, H / 2, 0]} />
        <Board size={[side, H, D]} position={[W / 2 - side / 2, H / 2, 0]} />
        {/* top with a small overhang */}
        <Board size={[W + 0.04, board, D + 0.03]} position={[0, H - board / 2, 0.005]} />
        {/* back panel */}
        <Board size={[innerW, H - base, 0.015]} position={[0, (H + base) / 2, -D / 2 + 0.0075]} color={BLUE_BACK} />
        {/* kick plate */}
        <Board size={[innerW, base, 0.02]} position={[0, base / 2, D / 2 - 0.03]} />
        {/* shelves */}
        {Array.from({ length: SHELF.rows }, (_, row) => (
          <Board key={row} size={[innerW, board, D - 0.02]} position={[0, rowFloorY(row) - board / 2, 0.005]} />
        ))}
        {/* soft inner shadowing so empty compartments still read as depth */}
        {Array.from({ length: SHELF.rows }, (_, row) => (
          <mesh key={`shade-${row}`} position={[0, rowFloorY(row) + COMPARTMENT_HEIGHT - 0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[innerW, D - 0.02]} />
            <meshBasicMaterial color="#000" transparent opacity={0.08} depthWrite={false} />
          </mesh>
        ))}
        {children}
      </group>
    </group>
  );
}
