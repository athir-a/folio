import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useLibrary } from '../state/libraryStore';
import { useSettings } from '../state/settingsStore';
import { LandingBursts } from './effects/LandingBursts';
import { Decor } from './room/Decor';
import { Lighting } from './room/Lighting';
import { Plants } from './room/Plants';
import { Room } from './room/Room';
import { Books } from './shelf/Books';
import { Bookshelf } from './shelf/Bookshelf';
import { preloadAssets } from './utils/assets';

preloadAssets();

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

/**
 * Post-processing kept deliberately restrained: ambient occlusion for contact
 * depth, bloom only on things that really glow (bulb, flame, sunlit window),
 * neutral tone mapping that keeps colours rich, and a very light vignette.
 */
function Effects({ high }: { high: boolean }) {
  return (
    <EffectComposer multisampling={high ? 4 : 0} enableNormalPass={false}>
      <N8AO enabled={high} aoRadius={0.35} distanceFalloff={0.6} intensity={2.2} quality="medium" color="#2a1a10" halfRes={false} />
      <Bloom luminanceThreshold={1} luminanceSmoothing={0.15} intensity={0.35} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Vignette offset={0.35} darkness={0.22} />
    </EffectComposer>
  );
}

export function LibraryScene() {
  const reading = useLibrary((s) => s.selectedId !== null);
  const high = useSettings((s) => s.quality === 'high');

  return (
    <Canvas
      shadows
      dpr={high ? [1, 2] : 1}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ fov: 40, near: 0.05, far: 40, position: [0.15, 1.45, 4.1] }}
    >
      <color attach="background" args={['#efe0c8']} />
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
        minDistance={1.6}
        maxDistance={8}
        minPolarAngle={Math.PI * 0.36}
        maxPolarAngle={Math.PI * 0.52}
        minAzimuthAngle={-0.6}
        maxAzimuthAngle={0.6}
      />
      <Effects high={high} />
    </Canvas>
  );
}
