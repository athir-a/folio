import { useLayoutEffect, useRef } from 'react';
import { Environment, Lightformer, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { useSettings } from '../../state/settingsStore';
import { BAYS, HALL, WINDOW } from './layout';
import type { HallMaterials } from './materials';

RectAreaLightUniformsLib.init();

const MOON_FROM = new THREE.Vector3(-2, 17, HALL.back - 24);
const MOON_TO = new THREE.Vector3(0.5, 0, -4);

/** Candle sconce on a balcony pilaster: a brass cup, a glowing chimney and a flame. */
function Sconce({ m, position, rotationY }: { m: HallMaterials; position: [number, number, number]; rotationY: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh material={m.brass} position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />
      </mesh>
      <mesh material={m.brass} position={[0, 0.02, 0.2]}>
        <cylinderGeometry args={[0.06, 0.035, 0.05, 20]} />
      </mesh>
      <mesh position={[0, 0.13, 0.2]}>
        <cylinderGeometry args={[0.045, 0.055, 0.18, 20, 1, true]} />
        <meshPhysicalMaterial color="#fff0d0" emissive="#ffb35a" emissiveIntensity={1.4} transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.1, 0.2]}>
        <sphereGeometry args={[0.018, 12, 8]} />
        <meshBasicMaterial color={[6, 3.8, 1.6]} />
      </mesh>
    </group>
  );
}

/**
 * Night lighting with two moods held in balance: cool moonlight and the blue
 * glow of the great window, against the warm amber of lamps and candles.
 * Image-based lighting adds a faint fill so shadows keep their colour.
 */
export function HallLighting({ m }: { m: HallMaterials }) {
  const moon = useRef<THREE.DirectionalLight>(null!);
  const windowLight = useRef<THREE.RectAreaLight>(null!);
  const high = useSettings((s) => s.quality === 'high');
  const apexY = WINDOW.spring + 3.2;

  useLayoutEffect(() => {
    moon.current.target.position.copy(MOON_TO);
    moon.current.target.updateMatrixWorld();
    windowLight.current.lookAt(0, 2, 10);
  }, [high]);

  // sconces on the upper pilasters, alternating sides
  const sconces: { position: [number, number, number]; rotationY: number }[] = [];
  const pitch = BAYS.width + BAYS.pilaster;
  for (const side of [-1, 1]) {
    BAYS.z.forEach((z) => {
      sconces.push({ position: [side * (HALL.halfWidth - 0.55), HALL.balconyY + 1.7, z + pitch / 2], rotationY: (-side * Math.PI) / 2 });
    });
  }

  return (
    <>
      {/* reflections come from a tiny night version of this room: a blue window
          at the far end, warm lamp glows down both sides, a dark vault */}
      <Environment resolution={256} frames={1} environmentIntensity={0.6}>
        <color attach="background" args={['#06080f']} />
        <Lightformer form="rect" color="#6d8fe0" intensity={2.2} position={[0, 4, -12]} scale={[4.6, 9, 1]} />
        {[-4, 4].flatMap((x) =>
          [-8, -3, 2].map((z) => (
            <Lightformer key={`${x}:${z}`} form="circle" color="#ffb46a" intensity={3} position={[x, 1.6, z]} scale={0.8} target={[0, 1.6, z]} />
          )),
        )}
        <Lightformer form="rect" color="#4a2c18" intensity={0.6} position={[0, -1, 0]} rotation-x={Math.PI / 2} scale={[10, 20, 1]} />
      </Environment>
      <hemisphereLight args={['#2c4682', '#4a3020', 0.55]} />
      {/* moonlight through the window: casts the tracery across the floor */}
      <directionalLight
        key={high ? 'moon-hi' : 'moon-lo'}
        ref={moon}
        position={MOON_FROM}
        intensity={3}
        color="#a9c1ff"
        castShadow
        shadow-mapSize={high ? [4096, 4096] : [1024, 1024]}
        shadow-radius={high ? 4 : 1}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={80}
      />
      {/* the window glass itself glows a soft night blue */}
      <rectAreaLight ref={windowLight} position={[0, (WINDOW.bottom + apexY) / 2, HALL.back + 0.15]} width={WINDOW.width} height={apexY - WINDOW.bottom} intensity={7} color="#7d9be0" />
      {/* warm light from the balcony sconces */}
      <pointLight position={[-3.9, HALL.balconyY + 1.6, -4.5]} intensity={28} decay={2} color="#ffb46a" />
      <pointLight position={[3.9, HALL.balconyY + 1.6, 2.2]} intensity={28} decay={2} color="#ffb46a" />
      <pointLight position={[3.9, HALL.balconyY + 1.6, -7.8]} intensity={24} decay={2} color="#ffb46a" />
      {sconces.map((s, i) => (
        <Sconce key={i} m={m} position={s.position} rotationY={s.rotationY} />
      ))}
      {/* dust drifting in the moonbeam, and a few warm motes by the lamps */}
      <Sparkles count={60} scale={[4, 5, 9]} position={[0, 3, -6]} size={1.4} speed={0.1} opacity={0.35} color="#c8d8ff" />
      <Sparkles count={30} scale={[8, 3, 14]} position={[0, 1.8, -2]} size={1.2} speed={0.08} opacity={0.3} color="#ffd9a0" />
    </>
  );
}
