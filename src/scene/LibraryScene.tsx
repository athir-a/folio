import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useLibrary } from '../state/libraryStore';
import { LandingBursts } from './effects/LandingBursts';
import { Decor } from './room/Decor';
import { Lighting } from './room/Lighting';
import { Plants } from './room/Plants';
import { Room } from './room/Room';
import { Books } from './shelf/Books';
import { Bookshelf } from './shelf/Bookshelf';

const TARGET: [number, number, number] = [0.05, 1.2, -0.3];

/** Pulls the camera back on narrow (portrait) screens so the whole shelf fits. */
function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const distance = aspect < 0.8 ? 7.2 : aspect < 1.2 ? 5.6 : 4.4;
    camera.position.set(0.15, 1.45, TARGET[2] + distance);
    camera.lookAt(...TARGET);
  }, [camera, size.width, size.height]);
  return null;
}

export function LibraryScene() {
  const reading = useLibrary((s) => s.selectedId !== null);

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ fov: 40, near: 0.1, far: 40, position: [0.15, 1.45, 4.1] }}>
      <color attach="background" args={['#f6e6cf']} />
      <fog attach="fog" args={['#f6e6cf', 8, 16]} />
      <ResponsiveCamera />
      <Suspense fallback={null}>
        <Lighting />
        <Room />
        <Plants />
        <Decor />
        <Bookshelf>
          <Books />
        </Bookshelf>
        <LandingBursts />
      </Suspense>
      <OrbitControls
        makeDefault
        target={TARGET}
        enabled={!reading}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={2.4}
        maxDistance={8}
        minPolarAngle={Math.PI * 0.36}
        maxPolarAngle={Math.PI * 0.52}
        minAzimuthAngle={-0.6}
        maxAzimuthAngle={0.6}
      />
      <EffectComposer multisampling={4}>
        <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.55} mipmapBlur />
        <Vignette offset={0.3} darkness={0.45} />
      </EffectComposer>
    </Canvas>
  );
}
