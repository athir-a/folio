import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COZY_PALETTE } from '../../lib/color';
import { useLibrary, type Burst } from '../../state/libraryStore';

const COUNT = 42;
const LIFE = 1.4;
const GRAVITY = 3.2;

function starGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.45 : 1;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ShapeGeometry(shape);
}

const dummy = new THREE.Object3D();

/** Confetti stars plus a shockwave ring where a new book lands. */
function LandingBurst({ burst }: { burst: Burst }) {
  const stars = useRef<THREE.InstancedMesh>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const start = useRef<number | null>(null);
  const geometry = useMemo(starGeometry, []);
  const particles = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        velocity: new THREE.Vector3((Math.random() - 0.5) * 2.4, 0.8 + Math.random() * 1.8, 0.3 + Math.random() * 1.1),
        spin: (Math.random() - 0.5) * 12,
        size: 0.014 + Math.random() * 0.02,
      })),
    [],
  );

  useLayoutEffect(() => {
    const color = new THREE.Color();
    particles.forEach((_, i) => {
      color.set(i % 4 === 0 ? burst.color : COZY_PALETTE[i % COZY_PALETTE.length]);
      stars.current.setColorAt(i, color.multiplyScalar(1.6)); // > 1 so it blooms
    });
    stars.current.instanceColor!.needsUpdate = true;
  }, [burst.color, particles]);

  useFrame((state) => {
    start.current ??= state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current;
    if (t > LIFE) {
      useLibrary.getState().removeBurst(burst.id);
      return;
    }
    const [ox, oy, oz] = burst.position;
    const fade = 1 - t / LIFE;
    particles.forEach((p, i) => {
      dummy.position.set(ox + p.velocity.x * t, oy + p.velocity.y * t - 0.5 * GRAVITY * t * t, oz + p.velocity.z * t);
      dummy.rotation.set(0, 0, p.spin * t);
      dummy.scale.setScalar(p.size * Math.min(1, fade * 2));
      dummy.lookAt(state.camera.position);
      dummy.rotateZ(p.spin * t);
      dummy.updateMatrix();
      stars.current.setMatrixAt(i, dummy.matrix);
    });
    stars.current.instanceMatrix.needsUpdate = true;

    const r = ring.current;
    r.position.set(ox, oy, oz);
    r.quaternion.copy(state.camera.quaternion);
    r.scale.setScalar(0.05 + (1 - (1 - Math.min(1, t / 0.5)) ** 3) * 0.55);
    (r.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t / 0.5) * 0.9;
  });

  return (
    <>
      <instancedMesh ref={stars} args={[geometry, undefined, COUNT]} frustumCulled={false}>
        <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <mesh ref={ring}>
        <ringGeometry args={[0.8, 1, 48]} />
        <meshBasicMaterial color="#fff2c4" transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </>
  );
}

export function LandingBursts() {
  const bursts = useLibrary((s) => s.bursts);
  return (
    <>
      {bursts.map((b) => (
        <LandingBurst key={b.id} burst={b} />
      ))}
    </>
  );
}
