import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '../../lib/random';
import { nightSkyTexture } from '../utils/textures';

/** The painted backdrop: a big plane far beyond the window. */
const BACKDROP = { z: -60, width: 70, height: 52, centreY: 14 };
/** World height of the painted horizon (the texture's horizon sits 62% down). */
const HORIZON_Y = BACKDROP.centreY + BACKDROP.height / 2 - 0.62 * BACKDROP.height;
const CITY_TOP_Y = BACKDROP.centreY + BACKDROP.height / 2 - (1042 / 1536) * BACKDROP.height;

const twinkleVertex = /* glsl */ `
  attribute float size;
  attribute float phase;
  attribute vec3 tint;
  uniform float time;
  uniform float speed;
  uniform float depth;
  varying vec3 vTint;
  varying float vAlpha;
  void main() {
    vTint = tint;
    float t = sin(time * speed * (0.6 + fract(phase * 7.13)) + phase * 6.2831);
    vAlpha = 1.0 - depth + depth * (0.5 + 0.5 * t);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (60.0 / -mv.z) * (0.85 + 0.15 * t);
    gl_Position = projectionMatrix * mv;
  }
`;

const twinkleFragment = /* glsl */ `
  varying vec3 vTint;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vTint * core * 1.6, core * vAlpha);
  }
`;

/** Points that twinkle independently, for stars and the distant city's windows. */
function TwinklingPoints({ count, place, seed, speed, depth }: {
  count: number;
  place: (rand: () => number) => { position: [number, number, number]; size: number; tint: [number, number, number] };
  seed: number;
  speed: number;
  depth: number;
}) {
  const material = useRef<THREE.ShaderMaterial>(null!);
  const geometry = useMemo(() => {
    const rand = mulberry32(seed);
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const tint = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const p = place(rand);
      pos.set(p.position, i * 3);
      tint.set(p.tint, i * 3);
      size[i] = p.size;
      phase[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1));
    g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    g.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
    return g;
  }, [count, place, seed]);
  const uniforms = useMemo(() => ({ time: { value: 0 }, speed: { value: speed }, depth: { value: depth } }), [speed, depth]);
  useFrame(({ clock }) => {
    material.current.uniforms.time.value = clock.elapsedTime;
  });
  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={twinkleVertex}
        fragmentShader={twinkleFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const placeStar = (rand: () => number) => {
  const bright = rand() > 0.97;
  const warm = rand();
  return {
    position: [(rand() - 0.5) * BACKDROP.width, HORIZON_Y + 2 + Math.pow(rand(), 0.8) * (BACKDROP.height / 2 + BACKDROP.centreY - HORIZON_Y), BACKDROP.z + 1] as [number, number, number],
    size: bright ? 5 + rand() * 4 : 1.2 + rand() * 2.2,
    tint: (warm > 0.85 ? [1, 0.92, 0.8] : warm < 0.2 ? [0.75, 0.85, 1] : [0.95, 0.97, 1]) as [number, number, number],
  };
};

const placeCityLight = (rand: () => number) => {
  const t = rand();
  const y = CITY_TOP_Y - Math.pow(t, 0.7) * (CITY_TOP_Y - (BACKDROP.centreY - BACKDROP.height / 2));
  const spread = 0.3 + Math.pow(t, 0.7) * 0.7;
  return {
    position: [(rand() - 0.5) * BACKDROP.width * spread * 1.2, y, BACKDROP.z + 0.5] as [number, number, number],
    size: 1 + rand() * 1.6,
    tint: [1, 0.72 + rand() * 0.15, 0.42] as [number, number, number],
  };
};

/** A four-pointed sparkle sprite for the brightest star. */
function GuidingStar() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.12, 'rgba(200,220,255,0.6)');
    g.addColorStop(1, 'rgba(120,160,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(230,240,255,0.9)';
    for (const [w, h] of [[3, 256], [256, 3]]) ctx.fillRect(128 - w / 2, 128 - h / 2, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const ref = useRef<THREE.Sprite>(null!);
  useFrame(({ clock }) => {
    const s = 4.5 + Math.sin(clock.elapsedTime * 1.3) * 0.4;
    ref.current.scale.set(s, s, 1);
  });
  return (
    <sprite ref={ref} position={[-1.5, 26, BACKDROP.z + 2]}>
      <spriteMaterial map={texture} color={[1.6, 1.7, 2]} transparent depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}

/** Everything beyond the window: painted sky, mountains and city, plus twinkling stars and city lights. */
export function NightSky() {
  const sky = useMemo(nightSkyTexture, []);
  return (
    <group>
      <mesh position={[0, BACKDROP.centreY, BACKDROP.z]}>
        <planeGeometry args={[BACKDROP.width, BACKDROP.height]} />
        <meshBasicMaterial map={sky} fog={false} />
      </mesh>
      <TwinklingPoints count={1800} place={placeStar} seed={5} speed={1.4} depth={0.7} />
      <TwinklingPoints count={500} place={placeCityLight} seed={9} speed={0.6} depth={0.35} />
      <GuidingStar />
    </group>
  );
}
