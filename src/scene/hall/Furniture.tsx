import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mulberry32 } from '../../lib/random';
import { useSurface } from '../utils/assets';
import { persianRugTexture } from '../utils/textures';
import type { HallMaterials } from './materials';

type Vec3 = [number, number, number];

const rounded = (w: number, h: number, d: number, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, r);

function lathe(points: [number, number][], segments = 40) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

/** Shared geometry for the repeated furniture pieces. */
function useFurnitureGeometry() {
  return useMemo(() => {
    const shade = new THREE.CylinderGeometry(0.17, 0.27, 0.3, 120, 1, true);
    // knife pleats around the shade
    const p = shade.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const k = 1 + Math.abs(Math.sin(Math.atan2(z, x) * 28)) * 0.035;
      p.setXYZ(i, x * k, p.getY(i), z * k);
    }
    shade.computeVertexNormals();
    return {
      shade,
      lampBase: lathe([[0, 0], [0.11, 0], [0.12, 0.02], [0.06, 0.06], [0.09, 0.2], [0.05, 0.36], [0.02, 0.42], [0, 0.42]]),
      floorLampBase: lathe([[0, 0], [0.18, 0], [0.19, 0.015], [0.15, 0.04], [0.04, 0.06], [0, 0.06]]),
      chair: {
        base: rounded(0.84, 0.3, 0.8, 0.06),
        seat: rounded(0.62, 0.13, 0.62, 0.05),
        back: rounded(0.84, 0.66, 0.18, 0.07),
        arm: rounded(0.15, 0.28, 0.78, 0.06),
      },
      sofa: {
        base: rounded(2.2, 0.3, 0.86, 0.06),
        seat: rounded(0.95, 0.13, 0.66, 0.05),
        back: rounded(2.2, 0.7, 0.2, 0.07),
        arm: rounded(0.18, 0.32, 0.86, 0.07),
      },
      pillow: new THREE.SphereGeometry(1, 24, 16),
    };
  }, []);
}

type FurnitureGeometry = ReturnType<typeof useFurnitureGeometry>;

function Legs({ m, w, d, h = 0.12 }: { m: HallMaterials; w: number; d: number; h?: number }) {
  return (
    <>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} material={m.darkWalnut} position={[(sx * w) / 2, h / 2, (sz * d) / 2]} castShadow>
            <cylinderGeometry args={[0.028, 0.02, h, 10]} />
          </mesh>
        )),
      )}
    </>
  );
}

const PILLOW_COLOURS = ['#c79a45', '#7a2e2e', '#2f4a3a'];

function Pillow({ g, position, rotation, color }: { g: FurnitureGeometry; position: Vec3; rotation: Vec3; color: string }) {
  const material = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.9, sheen: 0.8, sheenColor: new THREE.Color(color).offsetHSL(0, 0, 0.25) }),
    [color],
  );
  return <mesh geometry={g.pillow} material={material} position={position} rotation={rotation} scale={[0.21, 0.19, 0.07]} castShadow />;
}

/** Wing-backed velvet armchair; local +z is the front. */
function Armchair({ g, m, position, rotationY, pillow = 0 }: { g: FurnitureGeometry; m: HallMaterials; position: Vec3; rotationY: number; pillow?: number }) {
  const c = g.chair;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Legs m={m} w={0.66} d={0.62} />
      <mesh geometry={c.base} material={m.velvet} position={[0, 0.27, 0]} castShadow receiveShadow />
      <mesh geometry={c.seat} material={m.velvet} position={[0, 0.48, 0.07]} castShadow receiveShadow />
      <mesh geometry={c.back} material={m.velvet} position={[0, 0.74, -0.32]} rotation={[-0.12, 0, 0]} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={c.arm} material={m.velvet} position={[s * 0.36, 0.55, 0]} castShadow receiveShadow />
      ))}
      <Pillow g={g} color={PILLOW_COLOURS[pillow % 3]} position={[0, 0.66, -0.18]} rotation={[-0.25, 0, 0.1]} />
    </group>
  );
}

function Sofa({ g, m, position, rotationY }: { g: FurnitureGeometry; m: HallMaterials; position: Vec3; rotationY: number }) {
  const s = g.sofa;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Legs m={m} w={2.0} d={0.66} />
      <mesh geometry={s.base} material={m.velvet} position={[0, 0.27, 0]} castShadow receiveShadow />
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} geometry={s.seat} material={m.velvet} position={[x, 0.48, 0.07]} castShadow receiveShadow />
      ))}
      <mesh geometry={s.back} material={m.velvet} position={[0, 0.76, -0.34]} rotation={[-0.1, 0, 0]} castShadow receiveShadow />
      {[-1, 1].map((x) => (
        <mesh key={x} geometry={s.arm} material={m.velvet} position={[x * 1.02, 0.57, 0]} castShadow receiveShadow />
      ))}
      <Pillow g={g} color={PILLOW_COLOURS[0]} position={[-0.7, 0.68, -0.18]} rotation={[-0.25, 0.3, 0.12]} />
      <Pillow g={g} color={PILLOW_COLOURS[1]} position={[0.72, 0.68, -0.18]} rotation={[-0.25, -0.3, -0.1]} />
    </group>
  );
}

/** Brass table lamp with a pleated silk shade; the bulb really lights the room. */
function TableLamp({ g, m, position, light = true }: { g: FurnitureGeometry; m: HallMaterials; position: Vec3; light?: boolean }) {
  return (
    <group position={position}>
      <mesh geometry={g.lampBase} material={m.brass} castShadow />
      <LampShade g={g} y={0.55} />
      {light && <pointLight position={[0, 0.5, 0]} intensity={14} decay={2} color="#ffbf73" />}
    </group>
  );
}

function FloorLamp({ g, m, position, dim = false }: { g: FurnitureGeometry; m: HallMaterials; position: Vec3; dim?: boolean }) {
  return (
    <group position={position}>
      <mesh geometry={g.floorLampBase} material={m.brass} castShadow receiveShadow />
      <mesh material={m.brass} position={[0, 0.78, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.014, 1.5, 12]} />
      </mesh>
      <LampShade g={g} y={1.62} scale={1.15} />
      <pointLight position={[0, 1.55, 0]} intensity={dim ? 9 : 18} decay={2} color="#ffbf73" />
    </group>
  );
}

function LampShade({ g, y, scale = 1 }: { g: FurnitureGeometry; y: number; scale?: number }) {
  const linen = useSurface('linen', [6, 2]);
  const shade = useMemo(() => ({
    outer: new THREE.MeshPhysicalMaterial({
      color: '#f1d79a',
      roughness: 0.9,
      normalMap: linen.normalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
      sheen: 0.5,
      sheenColor: new THREE.Color('#fff0c8'),
      // light from the bulb glowing through the silk
      emissive: new THREE.Color('#ffb04a'),
      emissiveIntensity: 0.85,
    }),
    inner: new THREE.MeshStandardMaterial({ color: '#fff0d0', emissive: '#ffd08a', emissiveIntensity: 2.2, side: THREE.BackSide }),
  }), [linen]);
  return (
    <group position={[0, y, 0]} scale={scale}>
      <mesh geometry={g.shade} material={shade.outer} castShadow />
      <mesh geometry={g.shade} material={shade.inner} />
      <mesh position={[0, -0.05, 0]}>
        <sphereGeometry args={[0.04, 16, 12]} />
        <meshBasicMaterial color={[5, 3.8, 2.2]} />
      </mesh>
    </group>
  );
}

function SideTable({ m, position }: { m: HallMaterials; position: Vec3 }) {
  return (
    <group position={position}>
      <mesh material={m.walnut} position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 48]} />
      </mesh>
      <mesh material={m.darkWalnut} position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 0.58, 16]} />
      </mesh>
      <mesh material={m.darkWalnut} position={[0, 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.04, 32]} />
      </mesh>
    </group>
  );
}

/** Brass lantern with a candle glowing behind its glass. */
function Lantern({ m, position, scale = 1 }: { m: HallMaterials; position: Vec3; scale?: number }) {
  const flame = useRef<THREE.Mesh>(null!);
  const phase = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    flame.current.scale.setScalar(1 + Math.sin(t * 11) * 0.08 + Math.sin(t * 6.7) * 0.06);
  });
  return (
    <group position={position} scale={scale}>
      <mesh material={m.brass} position={[0, 0.015, 0]} castShadow>
        <boxGeometry args={[0.2, 0.03, 0.2]} />
      </mesh>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <mesh key={`${x}${z}`} material={m.brass} position={[x * 0.085, 0.16, z * 0.085]}>
            <boxGeometry args={[0.015, 0.28, 0.015]} />
          </mesh>
        )),
      )}
      <mesh material={m.brass} position={[0, 0.34, 0]} castShadow>
        <coneGeometry args={[0.15, 0.1, 4]} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.16, 0.26, 0.16]} />
        <meshPhysicalMaterial color="#ffe2a8" transparent opacity={0.18} roughness={0.1} emissive="#ffae4a" emissiveIntensity={0.25} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.09, 16]} />
        <meshStandardMaterial color="#f6ead2" />
      </mesh>
      <mesh ref={flame} position={[0, 0.135, 0]}>
        <sphereGeometry args={[0.012, 12, 8]} />
        <meshBasicMaterial color={[6, 3.6, 1.2]} />
      </mesh>
    </group>
  );
}

function CoffeeTable({ m, position }: { m: HallMaterials; position: Vec3 }) {
  const top = useMemo(() => rounded(1.3, 0.06, 0.72, 0.02), []);
  const shelf = useMemo(() => rounded(1.15, 0.03, 0.6, 0.01), []);
  const books = useMemo(() => {
    const rand = mulberry32(3);
    let y = 0.45;
    return Array.from({ length: 4 }, (_, i) => {
      const h = 0.035 + rand() * 0.025;
      const b = { y: y + h / 2, h, w: 0.24 + rand() * 0.06, d: 0.17 + rand() * 0.04, r: (rand() - 0.5) * 0.4, color: ['#6d2a2a', '#1f3550', '#2f4a3a', '#8a6a3a'][i] };
      y += h;
      return b;
    });
  }, []);
  return (
    <group position={position}>
      <mesh geometry={top} material={m.walnut} position={[0, 0.42, 0]} castShadow receiveShadow />
      <mesh geometry={shelf} material={m.darkWalnut} position={[0, 0.12, 0]} castShadow receiveShadow />
      <Legs m={m} w={1.18} d={0.6} h={0.4} />
      {books.map((b, i) => (
        <mesh key={i} position={[-0.3, b.y, 0]} rotation={[0, b.r, 0]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.color} roughness={0.7} />
        </mesh>
      ))}
      <Lantern m={m} position={[0.32, 0.45, 0.05]} scale={0.8} />
    </group>
  );
}

function Rug({ position, size }: { position: Vec3; size: [number, number] }) {
  const wool = useSurface('wool', [size[0] * 2, size[1] * 2]);
  const pattern = useMemo(persianRugTexture, []);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial map={pattern} normalMap={wool.normalMap} roughnessMap={wool.roughnessMap} roughness={1} />
    </mesh>
  );
}

/** The reading furniture of the hall, arranged like the reference: a sofa under the window, armchairs around a rug. */
export function Furniture({ m }: { m: HallMaterials }) {
  const g = useFurnitureGeometry();
  const face = (from: [number, number], to: [number, number]) => Math.atan2(to[0] - from[0], to[1] - from[1]);
  return (
    <group>
      <Rug position={[0, 0.006, -7.6]} size={[6, 4.2]} />
      <Rug position={[0, 0.006, 1.6]} size={[3.4, 5.5]} />
      <Sofa g={g} m={m} position={[0, 0, -9.6]} rotationY={0} />
      <CoffeeTable m={m} position={[0, 0, -8.05]} />
      <Armchair g={g} m={m} position={[-2.2, 0, -7.3]} rotationY={face([-2.2, -7.3], [0, -8.3])} pillow={1} />
      <Armchair g={g} m={m} position={[2.2, 0, -7.3]} rotationY={face([2.2, -7.3], [0, -8.3])} pillow={2} />
      <Armchair g={g} m={m} position={[-3.1, 0, 2.6]} rotationY={face([-3.1, 2.6], [0, 1.0])} />
      <Armchair g={g} m={m} position={[3.2, 0, 3.4]} rotationY={face([3.2, 3.4], [0, 1.6])} pillow={1} />

      <SideTable m={m} position={[-3.0, 0, -8.6]} />
      <TableLamp g={g} m={m} position={[-3.0, 0.62, -8.6]} />
      <SideTable m={m} position={[3.0, 0, -8.6]} />
      <TableLamp g={g} m={m} position={[3.0, 0.62, -8.6]} />
      <SideTable m={m} position={[-3.8, 0, 1.6]} />
      <TableLamp g={g} m={m} position={[-3.8, 0.62, 1.6]} />
      <SideTable m={m} position={[3.75, 0, 4.4]} />
      <TableLamp g={g} m={m} position={[3.75, 0.62, 4.4]} />

      <FloorLamp g={g} m={m} position={[-3.9, 0, -5.4]} />
      <FloorLamp g={g} m={m} position={[3.9, 0, -5.4]} />
      {/* reading lamp beside the visitor's shelf */}
      <FloorLamp g={g} m={m} position={[3.45, 0, -3.35]} dim />

      <Lantern m={m} position={[-1.3, 0, -10.6]} />
      <Lantern m={m} position={[1.4, 0, -10.6]} scale={1.2} />
      <Lantern m={m} position={[-1.6, 0, -6.0]} scale={0.9} />
    </group>
  );
}
