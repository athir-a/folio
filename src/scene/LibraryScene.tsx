import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useSettings } from '../state/settingsStore';
import { CameraRig } from './camera/CameraRig';
import { LandingBursts } from './effects/LandingBursts';
import { Hall } from './hall/Hall';
import { preloadAssets } from './utils/assets';

preloadAssets();

const NIGHT = '#0a0f1e';

/**
 * Post-processing kept restrained: ambient occlusion for contact depth, bloom
 * only on things that really glow (bulbs, flames, stars), neutral tone mapping
 * that keeps colours rich, and a soft vignette.
 */
function Effects({ high }: { high: boolean }) {
  return (
    <EffectComposer multisampling={high ? 4 : 0} enableNormalPass={false}>
      <N8AO enabled={high} aoRadius={0.7} distanceFalloff={1} intensity={2.5} quality="medium" color="#140c08" halfRes={false} />
      <Bloom luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.7} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Vignette offset={0.3} darkness={0.4} />
    </EffectComposer>
  );
}

export function LibraryScene() {
  const high = useSettings((s) => s.quality === 'high');

  return (
    <Canvas shadows dpr={high ? [1, 2] : 1} gl={{ antialias: false, powerPreference: 'high-performance' }} camera={{ fov: 52, near: 0.05, far: 120 }}>
      <color attach="background" args={[NIGHT]} />
      {/* a breath of depth haze; the sky outside opts out so the window stays clear */}
      <fog attach="fog" args={[NIGHT, 18, 46]} />
      <CameraRig />
      <Suspense fallback={null}>
        <Hall />
        <LandingBursts />
      </Suspense>
      <Effects high={high} />
    </Canvas>
  );
}
