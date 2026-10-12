import { useMemo } from 'react';
import * as THREE from 'three';
import { MeshReflectorMaterial } from '@react-three/drei';
import { artTexture, curtainTexture, rugTexture, skyTexture, woodFloorTexture } from '../utils/textures';

const WALL_Z = -0.6;
const WINDOW = { x: -2.25, y: 1.65, w: 1.1, h: 1.55 };
const FRAME_YELLOW = '#f2c14e';

function Window() {
  const sky = useMemo(skyTexture, []);
  const bar = 0.05;
  const { x, y, w, h } = WINDOW;
  return (
    <group position={[x, y, WALL_Z]}>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={sky} toneMapped={false} />
      </mesh>
      {/* outer frame */}
      {[
        [0, h / 2, w + bar * 2, bar],
        [0, -h / 2, w + bar * 2, bar],
        [-w / 2, 0, bar, h],
        [w / 2, 0, bar, h],
        [0, 0, bar * 0.6, h],
        [0, h / 6, w, bar * 0.6],
        [0, -h / 6, w, bar * 0.6],
      ].map(([px, py, sx, sy], i) => (
        <mesh key={i} position={[px, py, 0.03]} castShadow>
          <boxGeometry args={[sx, sy, 0.05]} />
          <meshStandardMaterial color={FRAME_YELLOW} roughness={0.5} />
        </mesh>
      ))}
      {/* sill */}
      <mesh position={[0, -h / 2 - 0.05, 0.08]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.25, 0.04, 0.18]} />
        <meshStandardMaterial color={FRAME_YELLOW} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Curtain({ x, flip = false }: { x: number; flip?: boolean }) {
  const map = useMemo(curtainTexture, []);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.55, 2.55, 48, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      // folds that gather slightly towards the bottom
      pos.setZ(i, Math.sin(px * 38 + (flip ? 1 : 0)) * 0.035 * (1 + (1.27 - py) * 0.15));
    }
    g.computeVertexNormals();
    return g;
  }, [flip]);
  return (
    <mesh geometry={geometry} position={[x, 1.3, WALL_Z + 0.12]} castShadow receiveShadow>
      <meshStandardMaterial map={map} roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  );
}

function PictureFrame() {
  const art = useMemo(artTexture, []);
  return (
    <group position={[1.95, 2.0, WALL_Z + 0.02]}>
      <mesh castShadow>
        <boxGeometry args={[0.46, 0.56, 0.03]} />
        <meshStandardMaterial color="#b77b48" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.016]}>
        <planeGeometry args={[0.38, 0.48]} />
        <meshStandardMaterial map={art} roughness={0.9} />
      </mesh>
    </group>
  );
}

export function Room() {
  const wood = useMemo(woodFloorTexture, []);
  const rug = useMemo(rugTexture, []);

  return (
    <group>
      {/* warm cream wall */}
      <mesh position={[0, 3, WALL_Z]} receiveShadow>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial color="#f6e6cf" roughness={0.95} />
      </mesh>
      {/* baseboard */}
      <mesh position={[0, 0.06, WALL_Z + 0.01]} receiveShadow>
        <boxGeometry args={[14, 0.12, 0.02]} />
        <meshStandardMaterial color="#fffaf0" roughness={0.7} />
      </mesh>
      {/* glossy wooden floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 3]} receiveShadow>
        <planeGeometry args={[14, 7.2]} />
        <MeshReflectorMaterial
          map={wood}
          color="#ffffff"
          roughness={0.55}
          metalness={0}
          blur={[400, 120]}
          resolution={512}
          mixBlur={1}
          mixStrength={0.6}
          mirror={0.25}
          depthScale={0}
        />
      </mesh>
      {/* rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.15, 0.004, 0.75]} receiveShadow>
        <planeGeometry args={[2.3, 1.4]} />
        <meshStandardMaterial map={rug} roughness={1} />
      </mesh>
      <Window />
      <Curtain x={WINDOW.x - WINDOW.w / 2 - 0.12} />
      <Curtain x={WINDOW.x + WINDOW.w / 2 + 0.12} flip />
      {/* curtain rod */}
      <mesh position={[WINDOW.x, WINDOW.y + WINDOW.h / 2 + 0.22, WALL_Z + 0.14]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, WINDOW.w + 0.9, 12]} />
        <meshStandardMaterial color="#d9a441" metalness={0.6} roughness={0.35} />
      </mesh>
      <PictureFrame />
    </group>
  );
}
