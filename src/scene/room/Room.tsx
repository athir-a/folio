import { useLayoutEffect, useMemo, useRef } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useSettings } from '../../state/settingsStore';
import { MODELS, useModel, useSurface } from '../utils/assets';
import { curtainPrintTexture, outdoorTexture, rugTexture } from '../utils/textures';

export const WALL_Z = -0.6;
export const WINDOW = { x: -2.25, y: 1.6, w: 1.1, h: 1.55, depth: 0.2 };
const WALL = { left: -7, right: 7, height: 6 };
const PLASTER_TILE = 2; // metres covered by one tile of the plaster texture

const BRASS = new THREE.MeshPhysicalMaterial({ color: '#c9a052', metalness: 1, roughness: 0.28 });

/** Plaster wall with a real opening for the window. */
function Wall() {
  const plaster = useSurface('plaster', [1 / PLASTER_TILE, 1 / PLASTER_TILE]);
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(WALL.left, 0);
    s.lineTo(WALL.right, 0);
    s.lineTo(WALL.right, WALL.height);
    s.lineTo(WALL.left, WALL.height);
    s.closePath();
    const { x, y, w, h } = WINDOW;
    const hole = new THREE.Path();
    hole.moveTo(x - w / 2, y - h / 2);
    hole.lineTo(x - w / 2, y + h / 2);
    hole.lineTo(x + w / 2, y + h / 2);
    hole.lineTo(x + w / 2, y - h / 2);
    hole.closePath();
    s.holes.push(hole);
    return new THREE.ShapeGeometry(s); // UVs are in metres
  }, []);

  const { x, y, w, h, depth } = WINDOW;
  const revealZ = WALL_Z - depth / 2;
  return (
    <group>
      <mesh geometry={geometry} position={[0, 0, WALL_Z]} receiveShadow>
        <meshStandardMaterial {...plaster} color="#f3e4cc" roughness={1} />
      </mesh>
      {/* window reveal: the thickness of the wall around the opening */}
      {(
        [
          [x, y + h / 2 + 0.01, w + 0.04, 0.02],
          [x, y - h / 2 - 0.01, w + 0.04, 0.02],
          [x - w / 2 - 0.01, y, 0.02, h],
          [x + w / 2 + 0.01, y, 0.02, h],
        ] as const
      ).map(([px, py, sx, sy], i) => (
        <mesh key={i} position={[px, py, revealZ]} receiveShadow castShadow>
          <boxGeometry args={[sx, sy, depth]} />
          <meshStandardMaterial {...plaster} color="#f3e4cc" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

const BAR = 0.055;
/** Frame members as [x, y, width, height], relative to the window centre. */
const FRAME_PIECES: [number, number, number, number][] = [
  [0, WINDOW.h / 2 - BAR / 2, WINDOW.w, BAR],
  [0, -WINDOW.h / 2 + BAR / 2, WINDOW.w, BAR],
  [-WINDOW.w / 2 + BAR / 2, 0, BAR, WINDOW.h],
  [WINDOW.w / 2 - BAR / 2, 0, BAR, WINDOW.h],
  [0, 0, BAR * 0.7, WINDOW.h], // centre mullion
  [0, WINDOW.h / 6, WINDOW.w, BAR * 0.55], // glazing bars
  [0, -WINDOW.h / 6, WINDOW.w, BAR * 0.55],
];

/** Painted timber window with glazing bars, real glass and the garden beyond. */
function Window() {
  const grain = useSurface('oakGrain', [1, 1]);
  const outdoor = useMemo(outdoorTexture, []);
  const paint = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#f0bd45',
        roughness: 0.5,
        normalMap: grain.normalMap,
        normalScale: new THREE.Vector2(0.15, 0.15),
        clearcoat: 0.4,
        clearcoatRoughness: 0.3,
      }),
    [grain],
  );
  const { x, y, w, h } = WINDOW;
  const frameZ = WALL_Z - 0.12;
  const geometries = useMemo(
    () => ({
      pieces: FRAME_PIECES.map(([px, py, sx, sy]) => ({ position: [px, py, frameZ] as [number, number, number], geometry: new RoundedBoxGeometry(sx, sy, 0.06, 2, 0.008) })),
      sill: new RoundedBoxGeometry(w + 0.22, 0.036, 0.28, 3, 0.01),
    }),
    [frameZ, w],
  );
  return (
    <group position={[x, y, 0]}>
      {/* the view outside, a little way behind the glass for parallax */}
      <mesh position={[0, 0.1, WALL_Z - 2.2]}>
        <planeGeometry args={[5.5, 4]} />
        <meshBasicMaterial map={outdoor} color={[1.25, 1.22, 1.15]} />
      </mesh>
      {geometries.pieces.map((p, i) => (
        <mesh key={i} geometry={p.geometry} position={p.position} material={paint} castShadow receiveShadow />
      ))}
      <mesh position={[0, 0, frameZ - 0.005]}>
        <planeGeometry args={[w - 0.02, h - 0.02]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.08} roughness={0.02} metalness={0} envMapIntensity={1.4} depthWrite={false} />
      </mesh>
      {/* deep interior sill */}
      <mesh geometry={geometries.sill} position={[0, -h / 2 - 0.018, WALL_Z + 0.02]} material={paint} castShadow receiveShadow />
    </group>
  );
}

/** Moulded skirting board: a flat face with a rounded ogee top. */
function Skirting() {
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.018, 0);
    s.lineTo(0.018, 0.095);
    s.bezierCurveTo(0.018, 0.11, 0.006, 0.105, 0.006, 0.12);
    s.lineTo(0, 0.13);
    s.closePath();
    const length = WALL.right - WALL.left;
    const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false, curveSegments: 10 });
    g.rotateY(-Math.PI / 2); // profile faces +z, runs along -x
    g.translate(length / 2, 0, 0);
    return g;
  }, []);
  return (
    <mesh geometry={geometry} position={[0, 0, WALL_Z]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#fbf4e8" roughness={0.45} clearcoat={0.3} clearcoatRoughness={0.4} />
    </mesh>
  );
}

function Floor() {
  const quality = useSettings((s) => s.quality);
  const size: [number, number] = [14, 7.2];
  const oak = useSurface('oakFloor', [size[0] / 2.2, size[1] / 2.2]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, WALL_Z + size[1] / 2]} receiveShadow>
      <planeGeometry args={size} />
      {quality === 'high' ? (
        <MeshReflectorMaterial
          {...oak}
          color="#ffe9d0"
          roughness={0.85}
          metalness={0}
          blur={[512, 160]}
          resolution={1024}
          mixBlur={1.2}
          mixStrength={0.35}
          mixContrast={1}
          mirror={0}
          depthScale={0}
        />
      ) : (
        <meshStandardMaterial {...oak} color="#ffe9d0" roughness={0.8} />
      )}
    </mesh>
  );
}

/** Flat-weave wool rug with a little thickness and fringed ends. */
function Rug() {
  const wool = useSurface('wool', [4, 2.5]);
  const pattern = useMemo(rugTexture, []);
  const size = { w: 2.3, d: 1.4, t: 0.01 };
  const materials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: '#e7d6b8', roughness: 1, normalMap: wool.normalMap });
    const top = new THREE.MeshStandardMaterial({ map: pattern, normalMap: wool.normalMap, roughnessMap: wool.roughnessMap, roughness: 1 });
    return [side, side, top, side, side, side];
  }, [wool, pattern]);
  const geometry = useMemo(() => new RoundedBoxGeometry(size.w, size.t, size.d, 2, 0.004), [size.w, size.t, size.d]);

  const fringe = useRef<THREE.InstancedMesh>(null!);
  const strands = 46;
  useLayoutEffect(() => {
    const m = new THREE.Object3D();
    let i = 0;
    for (const side of [-1, 1]) {
      for (let k = 0; k < strands; k++) {
        m.position.set(side * (size.w / 2 + 0.028), 0.003, -size.d / 2 + 0.03 + (k / (strands - 1)) * (size.d - 0.06));
        m.rotation.set(0, (Math.sin(k * 7.1) * 0.25), Math.PI / 2);
        m.updateMatrix();
        fringe.current.setMatrixAt(i++, m.matrix);
      }
    }
    fringe.current.instanceMatrix.needsUpdate = true;
  }, [size.w, size.d]);

  return (
    <group position={[0.15, size.t / 2, 0.75]}>
      <mesh geometry={geometry} material={materials} receiveShadow castShadow />
      <instancedMesh ref={fringe} args={[undefined, undefined, strands * 2]} receiveShadow>
        <cylinderGeometry args={[0.0025, 0.0025, 0.06, 5]} />
        <meshStandardMaterial color="#efe2c8" roughness={1} />
      </instancedMesh>
    </group>
  );
}

/** Heavy teal velvet curtain hanging in soft folds from brass rings. */
function Curtain({ x, seed }: { x: number; seed: number }) {
  const velvet = useSurface('velvet', [2, 4]);
  const print = useMemo(curtainPrintTexture, []);
  const width = 0.62;
  const height = 2.62;
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, height, 120, 30);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const down = (height / 2 - pos.getY(i)) / height; // 0 at the rod, 1 at the floor
      // deep pleats from the rings, relaxing into wider folds towards the hem
      const pleat = Math.sin(px * 42 + seed) * 0.03 * (1 - down * 0.4);
      const fold = Math.sin(px * 13 + seed * 2) * 0.03 * down;
      pos.setZ(i, pleat + fold);
      pos.setX(i, px * (0.92 + down * 0.1)); // slight flare at the bottom
    }
    g.computeVertexNormals();
    return g;
  }, [seed]);
  const material = useMemo(() => {
    const map = print.clone();
    map.repeat.set(1, 2.4);
    map.needsUpdate = true;
    return new THREE.MeshPhysicalMaterial({
      map,
      normalMap: velvet.normalMap,
      roughnessMap: velvet.roughnessMap,
      roughness: 0.95,
      sheen: 1,
      sheenColor: new THREE.Color('#62d0c4'),
      sheenRoughness: 0.35,
      side: THREE.DoubleSide,
    });
  }, [print, velvet]);

  const top = 1.3 + height / 2;
  return (
    <group position={[x, 0, WALL_Z + 0.2]}>
      <mesh geometry={geometry} material={material} position={[0, 1.3, 0]} castShadow receiveShadow />
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} material={BRASS} position={[-width / 2 + 0.03 + i * ((width - 0.06) / 6), top + 0.015, 0]} castShadow>
          <torusGeometry args={[0.022, 0.004, 8, 20]} />
        </mesh>
      ))}
    </group>
  );
}

function CurtainRod() {
  const { x, y, w, h } = WINDOW;
  const length = w + 1.6;
  const rodY = y + h / 2 + 0.3;
  return (
    <group position={[x, rodY, WALL_Z + 0.2]}>
      <mesh material={BRASS} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, length, 20]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[(side * length) / 2, 0, 0]}>
          <mesh material={BRASS} castShadow>
            <sphereGeometry args={[0.032, 24, 16]} />
          </mesh>
          {/* wall bracket */}
          <mesh material={BRASS} position={[-side * 0.12, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.2, 10]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PictureFrame() {
  const frame = useModel(MODELS.pictureFrame);
  return <primitive object={frame} position={[1.95, 2.0, WALL_Z + 0.003]} />;
}

export function Room() {
  const { x, w } = WINDOW;
  return (
    <group>
      <Wall />
      <Skirting />
      <Floor />
      <Rug />
      <Window />
      <CurtainRod />
      {/* the rod is at y + h/2 + 0.3; curtains hang from just below it */}
      <group position={[0, WINDOW.y + WINDOW.h / 2 + 0.3 - (1.3 + 2.62 / 2) - 0.03, 0]}>
        <Curtain x={x - w / 2 - 0.2} seed={0} />
        <Curtain x={x + w / 2 + 0.2} seed={1.7} />
      </group>
      <PictureFrame />
    </group>
  );
}
