import { useMemo } from 'react';
import * as THREE from 'three';
import { mulberry32 } from '../../lib/random';
import { SHELF } from '../shelf/layout';
import { MODELS, useModel } from '../utils/assets';
import { leafTextures } from '../utils/textures';

/** Heart-shaped pothos leaf in the XY plane, tip pointing +Y, gently cupped, with UVs over the leaf. */
function heartLeafGeometry(length: number, width: number) {
  const s = new THREE.Shape();
  s.moveTo(0, length * 0.12);
  s.bezierCurveTo(-width * 0.35, -length * 0.06, -width, 0, -width * 0.9, length * 0.38);
  s.bezierCurveTo(-width * 0.75, length * 0.72, -width * 0.2, length * 0.88, 0, length);
  s.bezierCurveTo(width * 0.2, length * 0.88, width * 0.75, length * 0.72, width * 0.9, length * 0.38);
  s.bezierCurveTo(width, 0, width * 0.35, -length * 0.06, 0, length * 0.12);
  const g = new THREE.ShapeGeometry(s, 12);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uv.setXY(i, x / (width * 2) + 0.5, y / length);
    // cup along the midrib and curl the tip back a little
    pos.setZ(i, -Math.abs(x) * 0.3 + (y / length) ** 2 * length * 0.15);
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

/** Tall potted plant (scanned model) beside the shelf. */
function FloorPlant({ position }: { position: [number, number, number] }) {
  const plant = useModel(MODELS.pottedPlant);
  return <primitive object={plant} position={position} scale={1.2} rotation={[0, 0.6, 0]} />;
}

const POT_SCALE = 0.75;
const POT_TOP = 0.2 * POT_SCALE; // soil height of the clay planter
const POTHOS_POT = new THREE.Vector3(SHELF.width / 2 - 0.2, SHELF.height, 0.02);

/** Pothos in a clay pot on top of the shelf, its vines trailing down the side and front. */
function TrailingPothos() {
  const pot = useModel(MODELS.clayPlanter);
  const { vines, leaves, material } = useMemo(() => {
    const rand = mulberry32(9);
    const tex = leafTextures();
    const material = new THREE.MeshPhysicalMaterial({
      map: tex.map,
      bumpMap: tex.bump,
      bumpScale: 1.2,
      roughness: 0.42,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
      sheen: 0.2,
      side: THREE.DoubleSide,
    });
    const sideX = SHELF.width / 2 + 0.04 - POTHOS_POT.x;
    const frontZ = SHELF.depth / 2 + 0.05;
    const t = POT_TOP;
    const paths = [
      // over the right side, all the way down
      [[0.02, t, 0.03], [0.12, t - 0.02, 0.08], [sideX, t - 0.12, 0.15], [sideX + 0.02, -0.5, 0.17], [sideX, -1.0, 0.19], [sideX + 0.03, -1.35, 0.16]],
      // over the front edge, a short drape
      [[-0.02, t, 0.04], [-0.1, t - 0.08, frontZ], [-0.2, -0.16, frontZ + 0.02], [-0.32, -0.3, frontZ + 0.03]],
      // along the top towards the back left
      [[0, t - 0.02, 0], [-0.25, 0.04, -0.05], [-0.5, 0.03, -0.08], [-0.66, 0.015, 0.02]],
    ];
    const vines: THREE.TubeGeometry[] = [];
    const leaves: { position: THREE.Vector3; quaternion: THREE.Quaternion; geometry: THREE.BufferGeometry }[] = [];
    paths.forEach((pts) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      vines.push(new THREE.TubeGeometry(curve, 96, 0.0035, 6));
      const n = Math.round(curve.getLength() / 0.06);
      for (let i = 1; i <= n; i++) {
        const p = curve.getPoint(i / n);
        const tangent = curve.getTangent(i / n);
        const side = i % 2 ? 1 : -1;
        const sideways = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(side);
        const tip = sideways.clone().add(new THREE.Vector3(0, -0.6, 0.25)).add(tangent.clone().multiplyScalar(0.3));
        const size = 0.055 + rand() * 0.04;
        leaves.push({
          position: p,
          quaternion: leafQuaternion(tip, new THREE.Vector3(0.2 * side, 0.35, 1)),
          geometry: heartLeafGeometry(size, size * 0.62),
        });
      }
    });
    // bushy crown growing out of the pot
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rand() * 0.3;
      const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const size = 0.07 + rand() * 0.035;
      leaves.push({
        position: new THREE.Vector3(0, t + rand() * 0.05, 0).add(out.clone().multiplyScalar(0.03 + rand() * 0.03)),
        quaternion: leafQuaternion(out.clone().add(new THREE.Vector3(0, 0.6 + rand() * 0.4, 0)), new THREE.Vector3(0, 1, 0.3)),
        geometry: heartLeafGeometry(size, size * 0.62),
      });
    }
    return { vines, leaves, material };
  }, []);

  return (
    <group position={[SHELF.position[0] + POTHOS_POT.x, POTHOS_POT.y, SHELF.position[2] + POTHOS_POT.z]}>
      <primitive object={pot} scale={POT_SCALE} />
      {vines.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          <meshStandardMaterial color="#557f34" roughness={0.7} />
        </mesh>
      ))}
      {leaves.map((l, i) => (
        <mesh key={i} geometry={l.geometry} material={material} position={l.position} quaternion={l.quaternion} castShadow receiveShadow />
      ))}
    </group>
  );
}

export function Plants() {
  return (
    <>
      <FloorPlant position={[-1.15, 0, -0.3]} />
      <TrailingPothos />
    </>
  );
}
