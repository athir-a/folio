import { useLayoutEffect, useMemo, useRef } from 'react';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useSettings } from '../../state/settingsStore';
import type { HallMaterials } from '../hall/materials';
import { plaqueTexture } from '../utils/textures';
import { SHELF } from './layout';

/**
 * Dressing for the visitor's bay: an engraved brass plaque, a picture light,
 * a warm spotlight on the books, and a few golden motes so the shelf feels
 * a little enchanted from across the hall. Local +z faces into the hall.
 */
export function UserBay({ m }: { m: HallMaterials }) {
  const spot = useRef<THREE.SpotLight>(null!);
  const high = useSettings((s) => s.quality === 'high');
  const plaque = useMemo(() => plaqueTexture('Your Shelf'), []);
  const plaqueY = SHELF.height + 0.42;

  useLayoutEffect(() => {
    // aim at the middle of the shelf (target lives in the same local space)
    spot.current.target.position.set(0, SHELF.height * 0.5, SHELF.depth / 2);
    spot.current.target.updateMatrixWorld();
  }, [high]);

  return (
    <group position={SHELF.position} rotation={[0, SHELF.rotationY, 0]}>
      <mesh position={[0, plaqueY, SHELF.depth / 2 - 0.13]} castShadow>
        <boxGeometry args={[0.62, 0.17, 0.012]} />
        <meshPhysicalMaterial map={plaque} metalness={1} roughness={0.35} />
      </mesh>
      {/* brass picture light over the plaque */}
      <group position={[0, plaqueY + 0.32, SHELF.depth / 2 - 0.12]}>
        <mesh material={m.brass} position={[0, 0, 0.06]} rotation={[Math.PI / 2 - 0.6, 0, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.16, 8]} />
        </mesh>
        <mesh material={m.brass} position={[0, -0.04, 0.15]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.7, 24, 1, false, 0, Math.PI]} />
        </mesh>
        <mesh position={[0, -0.06, 0.15]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.64, 12]} />
          <meshBasicMaterial color={[5, 3.8, 2.2]} />
        </mesh>
      </group>
      <spotLight
        key={high ? 'bay-hi' : 'bay-lo'}
        ref={spot}
        position={[0, SHELF.height + 1.6, SHELF.depth / 2 + 1.4]}
        angle={0.62}
        penumbra={0.75}
        intensity={45}
        decay={2}
        color="#ffcf8f"
        castShadow
        shadow-mapSize={high ? [2048, 2048] : [512, 512]}
        shadow-radius={high ? 6 : 1}
        shadow-bias={-0.0004}
      />
      <Sparkles count={26} scale={[SHELF.width + 0.4, SHELF.height, 0.6]} position={[0, SHELF.height / 2, SHELF.depth / 2 + 0.35]} size={2.2} speed={0.25} opacity={0.7} color="#ffd88a" />
    </group>
  );
}
