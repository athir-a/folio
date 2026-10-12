import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { SHELF } from '../shelf/layout';

/** Floor lamp with a glowing warm shade. */
function FloorLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.03, 32]} />
        <meshStandardMaterial color="#3b2a20" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 1.42, 12]} />
        <meshStandardMaterial color="#d9a441" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 1.48, 0]}>
        <cylinderGeometry args={[0.13, 0.22, 0.26, 32, 1, true]} />
        <meshStandardMaterial color="#ffe1a8" emissive="#ffb35c" emissiveIntensity={1.1} side={2} roughness={0.9} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.4, 0.05]} intensity={0.9} distance={3} decay={1.8} color="#ffb867" castShadow={false} />
    </group>
  );
}

/** Little candle on top of the shelf with a flickering flame. */
function Candle({ position }: { position: [number, number, number] }) {
  const flame = useRef<THREE.Mesh>(null!);
  const light = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06;
    flame.current.scale.set(1, flicker, 1);
    light.current.intensity = 0.5 * flicker;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.1, 24]} />
        <meshStandardMaterial color="#fff4e2" roughness={0.6} />
      </mesh>
      <mesh ref={flame} position={[0, 0.125, 0]}>
        <coneGeometry args={[0.011, 0.04, 12]} />
        <meshBasicMaterial color="#ffcf6b" toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.16, 0.05]} distance={1.4} decay={2} color="#ffae52" />
    </group>
  );
}

/** A couple of small trinkets so the empty shelf still feels lived-in. */
function Trinkets() {
  const [sx, , sz] = SHELF.position;
  return (
    <group position={[sx - SHELF.width / 2 + 0.33, SHELF.height, sz]}>
      {/* stacked boxes */}
      <mesh position={[0, 0.03, 0]} castShadow>
        <boxGeometry args={[0.18, 0.06, 0.14]} />
        <meshStandardMaterial color="#ff8fab" roughness={0.6} />
      </mesh>
      <mesh position={[0.01, 0.08, 0]} rotation={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.14, 0.04, 0.11]} />
        <meshStandardMaterial color="#2ec4b6" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function Decor() {
  const [sx, , sz] = SHELF.position;
  return (
    <>
      <FloorLamp position={[1.95, 0, -0.25]} />
      <Candle position={[sx - SHELF.width / 2 + 0.6, SHELF.height, sz + 0.02]} />
      <Trinkets />
    </>
  );
}
