import { useMemo } from 'react';
import * as THREE from 'three';
import { mulberry32 } from '../../lib/random';
import { SHELF } from '../shelf/layout';

const LEAF_GREENS = ['#3f8f4a', '#4fa356', '#5cb85c', '#2f7a3c', '#6cc16a'];

/** Teardrop leaf lying in the XY plane, tip pointing +Y, gently cupped. */
function leafGeometry(length: number, width: number, heart = false) {
  const s = new THREE.Shape();
  if (heart) {
    s.moveTo(0, length * 0.12);
    s.bezierCurveTo(-width * 0.35, -length * 0.06, -width, 0, -width * 0.9, length * 0.38);
    s.bezierCurveTo(-width * 0.75, length * 0.72, -width * 0.2, length * 0.88, 0, length);
    s.bezierCurveTo(width * 0.2, length * 0.88, width * 0.75, length * 0.72, width * 0.9, length * 0.38);
    s.bezierCurveTo(width, 0, width * 0.35, -length * 0.06, 0, length * 0.12);
  } else {
    s.moveTo(0, 0);
    s.bezierCurveTo(width, length * 0.2, width * 0.95, length * 0.75, 0, length);
    s.bezierCurveTo(-width * 0.95, length * 0.75, -width, length * 0.2, 0, 0);
  }
  const g = new THREE.ShapeGeometry(s, 10);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i) / length;
    pos.setZ(i, -Math.abs(x) * 0.35 + y * y * length * 0.18);
  }
  g.computeVertexNormals();
  return g;
}

/** Orients a leaf so its tip points along `tip` and its face looks towards `face`. */
function leafQuaternion(tip: THREE.Vector3, face: THREE.Vector3) {
  const y = tip.clone().normalize();
  const z = face.clone().sub(y.clone().multiplyScalar(face.dot(y))).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

interface LeafSpec {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  geometry: THREE.BufferGeometry;
  color: string;
}

function Leaves({ leaves }: { leaves: LeafSpec[] }) {
  return (
    <>
      {leaves.map((l, i) => (
        <mesh key={i} geometry={l.geometry} position={l.position} quaternion={l.quaternion} castShadow receiveShadow>
          <meshStandardMaterial color={l.color} roughness={0.55} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function Pot({ radius, height, color }: { radius: number; height: number; color: string }) {
  const geometry = useMemo(() => {
    const pts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(radius * 0.72, 0),
      new THREE.Vector2(radius * 0.92, height * 0.85),
      new THREE.Vector2(radius, height * 0.86),
      new THREE.Vector2(radius, height),
      new THREE.Vector2(radius * 0.9, height),
      new THREE.Vector2(radius * 0.88, height * 0.92),
    ];
    return new THREE.LatheGeometry(pts, 32);
  }, [radius, height]);
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, height * 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.88, 24]} />
        <meshStandardMaterial color="#4a3020" roughness={1} />
      </mesh>
    </group>
  );
}

/** Tall fiddle-leaf fig in a terracotta pot, next to the shelf. */
function FiddleLeafFig({ position }: { position: [number, number, number] }) {
  const { trunk, leaves } = useMemo(() => {
    const rand = mulberry32(42);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0.04, 0.8, 0.02),
      new THREE.Vector3(-0.03, 1.3, 0),
      new THREE.Vector3(0.05, 1.85, 0.03),
    ]);
    const trunk = new THREE.TubeGeometry(curve, 32, 0.016, 8);
    const leaves: LeafSpec[] = [];
    const count = 26;
    for (let i = 0; i < count; i++) {
      const t = 0.32 + (i / count) * 0.68;
      const p = curve.getPoint(t);
      const angle = i * 2.4 + rand() * 0.4;
      const out = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const tip = out.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, 0.45 + t * 0.5 + rand() * 0.2, 0));
      const size = 0.17 + rand() * 0.1 - (t > 0.9 ? 0.05 : 0);
      leaves.push({
        position: p,
        quaternion: leafQuaternion(tip, new THREE.Vector3(0, 1, 0.35).add(out.clone().multiplyScalar(0.3))),
        geometry: leafGeometry(size, size * 0.62),
        color: LEAF_GREENS[Math.floor(rand() * LEAF_GREENS.length)],
      });
    }
    return { trunk, leaves };
  }, []);

  return (
    <group position={position}>
      <Pot radius={0.2} height={0.4} color="#c86b3c" />
      <mesh geometry={trunk} castShadow>
        <meshStandardMaterial color="#6b4a2b" roughness={0.9} />
      </mesh>
      <Leaves leaves={leaves} />
    </group>
  );
}

/** Pothos on top of the shelf with vines trailing down the side and front. */
const POTHOS_POT = new THREE.Vector3(SHELF.width / 2 - 0.22, SHELF.height, 0.02);

function TrailingPothos() {
  const { vines, leaves } = useMemo(() => {
    const rand = mulberry32(9);
    const sideX = SHELF.width / 2 + 0.03 - POTHOS_POT.x;
    const frontZ = SHELF.depth / 2 + 0.03;
    const paths = [
      // over the right side, all the way down
      [[0, 0.14, 0.05], [0.12, 0.12, 0.08], [sideX, 0.0, 0.15], [sideX + 0.02, -0.5, 0.17], [sideX, -1.0, 0.19], [sideX + 0.03, -1.35, 0.16]],
      // over the front edge, a short drape
      [[-0.02, 0.14, 0.05], [-0.1, 0.05, frontZ], [-0.2, -0.18, frontZ + 0.02], [-0.32, -0.32, frontZ + 0.03]],
      // along the top towards the back left
      [[0, 0.12, 0], [-0.25, 0.04, -0.05], [-0.5, 0.03, -0.08], [-0.65, 0.01, 0.02]],
    ];
    const vines: THREE.TubeGeometry[] = [];
    const leaves: LeafSpec[] = [];
    paths.forEach((pts) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      vines.push(new THREE.TubeGeometry(curve, 64, 0.005, 6));
      const n = Math.round(curve.getLength() / 0.07);
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const p = curve.getPoint(t);
        const tangent = curve.getTangent(t);
        const side = i % 2 ? 1 : -1;
        const sideways = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(side);
        const tip = sideways.clone().add(new THREE.Vector3(0, -0.6, 0.2)).add(tangent.clone().multiplyScalar(0.3));
        const size = 0.06 + rand() * 0.035;
        leaves.push({
          position: p,
          quaternion: leafQuaternion(tip, new THREE.Vector3(0.2 * side, 0.3, 1)),
          geometry: leafGeometry(size, size * 0.62, true),
          color: rand() > 0.3 ? LEAF_GREENS[Math.floor(rand() * 3) + 1] : '#9bd36a',
        });
      }
    });
    // a bushy crown in the pot
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const size = 0.07 + rand() * 0.03;
      leaves.push({
        position: new THREE.Vector3(0, 0.13, 0).add(out.clone().multiplyScalar(0.03)),
        quaternion: leafQuaternion(out.clone().add(new THREE.Vector3(0, 0.7, 0)), new THREE.Vector3(0, 1, 0.3)),
        geometry: leafGeometry(size, size * 0.62, true),
        color: LEAF_GREENS[i % LEAF_GREENS.length],
      });
    }
    return { vines, leaves };
  }, []);

  return (
    <group position={[SHELF.position[0] + POTHOS_POT.x, POTHOS_POT.y, SHELF.position[2] + POTHOS_POT.z]}>
      <Pot radius={0.09} height={0.14} color="#ff8a3d" />
      {vines.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#4f8f3a" roughness={0.8} />
        </mesh>
      ))}
      <Leaves leaves={leaves} />
    </group>
  );
}

export function Plants() {
  return (
    <>
      <FiddleLeafFig position={[-1.15, 0, -0.3]} />
      <TrailingPothos />
    </>
  );
}
