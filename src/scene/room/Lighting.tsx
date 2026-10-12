import { useLayoutEffect, useMemo, useRef } from 'react';
import { Environment, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { useSettings } from '../../state/settingsStore';
import { HDRI } from '../utils/assets';
import { beamTexture, windowCookieTexture } from '../utils/textures';
import { WALL_Z, WINDOW } from './Room';

RectAreaLightUniformsLib.init();

const SUN_FROM = new THREE.Vector3(-4.5, 3.4, 3);
const SUN_TO = new THREE.Vector3(0.6, 0.9, -0.6);

/** A barely-there shaft of light along the sunbeam: atmosphere without fog. */
function SunShaft() {
  const tex = useMemo(beamTexture, []);
  const { position, quaternion, length } = useMemo(() => {
    const dir = SUN_TO.clone().sub(SUN_FROM);
    const length = dir.length();
    const y = dir.normalize();
    const x = new THREE.Vector3().crossVectors(y, new THREE.Vector3(0, 0, 1)).normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    return {
      position: SUN_FROM.clone().lerp(SUN_TO, 0.55),
      quaternion: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)),
      length,
    };
  }, []);
  return (
    <mesh position={position} quaternion={quaternion}>
      <planeGeometry args={[1.4, length * 0.8]} />
      <meshBasicMaterial map={tex} color="#ffd9a0" transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/**
 * Late-afternoon sunshine. Image-based lighting from an HDRI gives soft fill and
 * reflections; a warm sun casts soft shadows; a spotlight projects window panes
 * and leaf shadows; the window itself is an area light; and a faint warm fill
 * near the floor stands in for light bouncing off the sunlit boards.
 */
export function Lighting() {
  const sun = useRef<THREE.SpotLight>(null!);
  const windowLight = useRef<THREE.RectAreaLight>(null!);
  const cookie = useMemo(windowCookieTexture, []);
  const high = useSettings((s) => s.quality === 'high');

  useLayoutEffect(() => {
    sun.current.target.position.copy(SUN_TO);
    sun.current.target.updateMatrixWorld();
    windowLight.current.lookAt(WINDOW.x, WINDOW.y, 5);
  }, [high]); // the spotlight is re-created when quality changes

  return (
    <>
      <Environment files={HDRI} environmentIntensity={0.7} environmentRotation={[0, Math.PI * 0.6, 0]} />
      <hemisphereLight args={['#f4f6ff', '#9a7a5a', 0.35]} />
      {/* keyed by quality so the shadow maps are re-created at the new size */}
      <directionalLight
        key={high ? 'sun-hi' : 'sun-lo'}
        position={[-3.5, 4.5, 3.5]}
        intensity={1.2}
        color="#fff0d6"
        castShadow
        shadow-mapSize={high ? [4096, 4096] : [1024, 1024]}
        shadow-radius={high ? 5 : 2}
        shadow-bias={-0.0003}
        shadow-normalBias={0.015}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-1}
      />
      <spotLight
        key={high ? 'cookie-hi' : 'cookie-lo'}
        ref={sun}
        position={SUN_FROM}
        angle={0.55}
        penumbra={0.45}
        intensity={45}
        decay={1.5}
        color="#ffe2b4"
        map={cookie}
        castShadow
        shadow-mapSize={high ? [2048, 2048] : [1024, 1024]}
        shadow-radius={high ? 4 : 1}
        shadow-bias={-0.0004}
      />
      {/* daylight pouring in through the window glass */}
      <rectAreaLight
        ref={windowLight}
        position={[WINDOW.x, WINDOW.y, WALL_Z - 0.1]}
        width={WINDOW.w}
        height={WINDOW.h}
        intensity={2}
        color="#eef4ff"
      />
      {/* warm bounce off the sunlit floor */}
      <pointLight position={[0.2, 0.25, 0.9]} intensity={0.5} distance={3.5} decay={2} color="#ffc79a" />
      {/* soft neutral daylight from the room behind the camera keeps colours true */}
      <directionalLight position={[2, 2.5, 5]} intensity={0.45} color="#eef3ff" />
      <SunShaft />
      {/* a few motes drifting in the sun, not a snow storm */}
      <Sparkles count={28} scale={[2.6, 2, 1.6]} position={[-0.9, 1.3, 0.6]} size={1.6} speed={0.12} opacity={0.45} color="#fff1d0" />
    </>
  );
}
