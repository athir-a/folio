import { useLayoutEffect, useMemo, useRef } from 'react';
import { Sparkles } from '@react-three/drei';
import type * as THREE from 'three';
import { windowCookieTexture } from '../utils/textures';

/**
 * Late-afternoon sunshine: a warm key light for soft shadows, plus a spotlight
 * that projects window panes and leaf shadows across the wall and floor.
 */
export function Lighting() {
  const sun = useRef<THREE.SpotLight>(null!);
  const cookie = useMemo(windowCookieTexture, []);

  useLayoutEffect(() => {
    sun.current.target.position.set(0.6, 0.9, -0.6);
    sun.current.target.updateMatrixWorld();
  }, []);

  return (
    <>
      <hemisphereLight args={['#fff1dc', '#9a6a45', 0.9]} />
      <ambientLight intensity={0.15} color="#ffe4c4" />
      <directionalLight
        position={[-3.5, 4.5, 3.5]}
        intensity={1.3}
        color="#ffe2b8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-1}
      />
      <spotLight
        ref={sun}
        position={[-4.5, 3.4, 3]}
        angle={0.55}
        penumbra={0.4}
        intensity={90}
        decay={1.5}
        color="#ffcf8a"
        map={cookie}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
      {/* cool fill from the room so shadows don't go muddy */}
      <directionalLight position={[3, 2, 4]} intensity={0.35} color="#cfe3ff" />
      {/* dust motes floating in the sunbeam */}
      <Sparkles count={70} scale={[3.5, 2.4, 2.2]} position={[-0.6, 1.4, 0.4]} size={2.2} speed={0.18} opacity={0.6} color="#fff4d6" />
    </>
  );
}
