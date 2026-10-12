import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SHELF } from '../shelf/layout';
import { MODELS, useModel, useSurface } from '../utils/assets';

const BRASS = new THREE.MeshPhysicalMaterial({ color: '#c9a052', metalness: 1, roughness: 0.3 });

function lathe(points: [number, number][], segments = 48) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}

/** Brass floor lamp with a linen drum shade, lit from inside by a real bulb. */
function FloorLamp({ position }: { position: [number, number, number] }) {
  const linen = useSurface('linen', [4, 2]);
  const parts = useMemo(
    () => ({
      base: lathe([[0, 0], [0.17, 0], [0.175, 0.012], [0.16, 0.03], [0.05, 0.045], [0.03, 0.07], [0, 0.07]]),
      shade: new THREE.CylinderGeometry(0.15, 0.21, 0.3, 64, 1, true),
      shadeOuter: new THREE.MeshPhysicalMaterial({
        color: '#f6e6c8',
        roughness: 0.95,
        normalMap: linen.normalMap,
        normalScale: new THREE.Vector2(0.6, 0.6),
        sheen: 0.5,
        sheenColor: new THREE.Color('#fff2d8'),
        // light from the bulb shining through the fabric
        emissive: new THREE.Color('#ffb562'),
        emissiveIntensity: 0.4,
        side: THREE.FrontSide,
      }),
      shadeInner: new THREE.MeshStandardMaterial({ color: '#fff0d0', emissive: '#ffcf8a', emissiveIntensity: 1.6, side: THREE.BackSide }),
    }),
    [linen],
  );
  return (
    <group position={position}>
      <mesh geometry={parts.base} material={BRASS} castShadow receiveShadow />
      <mesh material={BRASS} position={[0, 0.78, 0]} castShadow>
        <cylinderGeometry args={[0.011, 0.013, 1.42, 16]} />
      </mesh>
      <group position={[0, 1.5, 0]}>
        <mesh geometry={parts.shade} material={parts.shadeOuter} castShadow />
        <mesh geometry={parts.shade} material={parts.shadeInner} />
        {[0.15, -0.15].map((y) => (
          <mesh key={y} material={BRASS} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[y > 0 ? 0.15 : 0.21, 0.003, 6, 64]} />
          </mesh>
        ))}
        <mesh position={[0, -0.04, 0]}>
          <sphereGeometry args={[0.035, 24, 16]} />
          <meshBasicMaterial color={[4, 3.2, 2]} toneMapped={false} />
        </mesh>
        <pointLight position={[0, -0.04, 0]} intensity={2.2} decay={2} color="#ffd2a0" />
      </group>
    </group>
  );
}

/** Pillar candle in a brass holder with a softly flickering flame. */
function Candle({ position }: { position: [number, number, number] }) {
  const flame = useRef<THREE.Mesh>(null!);
  const light = useRef<THREE.PointLight>(null!);
  const holder = useMemo(() => lathe([[0, 0], [0.05, 0], [0.052, 0.006], [0.03, 0.012], [0.026, 0.03], [0.04, 0.034], [0.04, 0.04], [0, 0.04]]), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker = 1 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7.3) * 0.05 + Math.sin(t * 23.1) * 0.03;
    flame.current.scale.set(1, flicker, 1);
    flame.current.rotation.z = Math.sin(t * 3.1) * 0.06;
    light.current.intensity = 0.35 * flicker;
  });
  return (
    <group position={position}>
      <mesh geometry={holder} material={BRASS} castShadow receiveShadow />
      <mesh position={[0, 0.04 + 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.032, 0.033, 0.1, 32]} />
        <meshPhysicalMaterial color="#fbf1e0" roughness={0.55} sheen={0.6} sheenColor="#fff6e6" emissive="#ff9a40" emissiveIntensity={0.04} />
      </mesh>
      <mesh position={[0, 0.148, 0]}>
        <cylinderGeometry args={[0.0012, 0.0012, 0.012, 6]} />
        <meshStandardMaterial color="#2a1a10" />
      </mesh>
      <mesh ref={flame} position={[0, 0.165, 0]}>
        <sphereGeometry args={[0.007, 16, 12]} />
        <meshBasicMaterial color={[3, 1.9, 0.7]} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.18, 0.03]} decay={2} color="#ffa64d" />
    </group>
  );
}

function Vase({ position }: { position: [number, number, number] }) {
  const vase = useModel(MODELS.vase);
  return <primitive object={vase} position={position} scale={0.8} rotation={[0, 0.4, 0]} />;
}

export function Decor() {
  const [sx, , sz] = SHELF.position;
  const top = SHELF.height;
  return (
    <>
      <FloorLamp position={[1.95, 0, -0.25]} />
      <Vase position={[sx - SHELF.width / 2 + 0.2, top, sz]} />
      <Candle position={[sx - SHELF.width / 2 + 0.48, top, sz + 0.04]} />
    </>
  );
}
