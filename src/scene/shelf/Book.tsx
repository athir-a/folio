import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { BookRecord } from '../../db/libraryDb';
import { useLibrary } from '../../state/libraryStore';
import { easeInOutCubic, easeInQuad, easeOutBack, easeOutCubic, phase } from '../utils/easing';
import { raysTexture } from '../utils/textures';
import { BookModel } from './BookModel';
import type { Slot } from './layout';

/** Total length of the "new book" entrance animation, in seconds. */
const ENTER_DURATION = 2.4;
const LAND_AT = 0.86; // fraction of the animation when the book hits the shelf

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const sharedRays = { tex: null as THREE.Texture | null };

interface EnterState {
  /** Seconds of animation played so far (frame time is capped so hitches don't skip it). */
  elapsed: number;
  spawn: THREE.Vector3;
  front: THREE.Vector3;
  control: THREE.Vector3;
  qCover: THREE.Quaternion;
  landed: boolean;
}

// scratch objects reused every frame
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const spinQ = new THREE.Quaternion();
const parentQ = new THREE.Quaternion();

/** World point in front of the camera, expressed in the book's parent space. */
function pointInFrontOfCamera(camera: THREE.Camera, parent: THREE.Object3D, distance: number, out: THREE.Vector3) {
  camera.getWorldDirection(out).multiplyScalar(distance).add(camera.position);
  return parent.worldToLocal(out);
}

/** Rotation (in parent space) that shows the front cover to the camera. */
function coverFacingCamera(camera: THREE.Camera, parent: THREE.Object3D, out: THREE.Quaternion) {
  parent.getWorldQuaternion(parentQ).invert();
  return out.copy(parentQ).multiply(camera.quaternion).multiply(spinQ.setFromAxisAngle(Y_AXIS, -Math.PI / 2));
}

export function Book({ book, slot, coverUrl }: { book: BookRecord; slot: Slot; coverUrl?: string }) {
  const group = useRef<THREE.Group>(null!);
  const halo = useRef<THREE.Mesh>(null!);
  const camera = useThree((s) => s.camera);
  const entering = useLibrary((s) => !!s.entering[book.id]);
  const selected = useLibrary((s) => s.selectedId === book.id);
  const [hovered, setHovered] = useState(false);
  const enter = useRef<EnterState | null>(null);
  const { thickness, height, depth } = slot.size;

  const slotPos = useMemo(() => new THREE.Vector3(...slot.position), [slot.position]);
  const slotQ = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(...slot.rotation)), [slot.rotation]);

  const rays = useMemo(() => (sharedRays.tex ??= raysTexture()), []);

  // Initial placement: new books start invisible, others sit in their slot.
  useEffect(() => {
    const g = group.current;
    if (entering) g.scale.setScalar(0);
    else {
      g.position.copy(slotPos);
      g.quaternion.copy(slotQ);
    }
  }, []); // placement only on mount; useFrame takes over afterwards

  useFrame((state, dt) => {
    const g = group.current;
    const parent = g.parent;
    if (!parent) return;
    const now = state.clock.elapsedTime;

    if (entering) {
      if (!enter.current) {
        const spawn = pointInFrontOfCamera(camera, parent, 1.6, new THREE.Vector3());
        const front = slotPos.clone().add(new THREE.Vector3(0, 0.02, 0.5));
        const control = spawn.clone().lerp(front, 0.5).add(new THREE.Vector3(0, 0.55, 0.2));
        enter.current = { elapsed: 0, spawn, front, control, qCover: coverFacingCamera(camera, parent, new THREE.Quaternion()), landed: false };
      }
      const e = enter.current;
      e.elapsed += Math.min(dt, 1 / 30);
      const t = e.elapsed / ENTER_DURATION;

      // 1. Pop into existence, spinning, in front of the camera.
      // 2. Hover proudly: "new item acquired!".
      // 3. Arc over to the shelf, doing a flip on the way.
      // 4. Slide into the slot and squash on impact.
      let scale = 1;
      let haloAmount = 0;
      if (t < 0.18) {
        const p = phase(t, 0, 0.18);
        scale = 1.3 * easeOutBack(p, 2.6);
        g.position.copy(e.spawn);
        g.quaternion.copy(e.qCover).multiply(spinQ.setFromAxisAngle(Y_AXIS, (1 - easeOutCubic(p)) * Math.PI * 4));
        haloAmount = p;
      } else if (t < 0.45) {
        const p = phase(t, 0.18, 0.45);
        scale = 1.3 + Math.sin(p * Math.PI * 2) * 0.03;
        g.position.copy(e.spawn).y += Math.sin(p * Math.PI) * 0.05;
        g.quaternion.copy(e.qCover).multiply(spinQ.setFromAxisAngle(Y_AXIS, Math.sin(p * Math.PI * 2) * 0.15));
        haloAmount = 1;
      } else if (t < 0.78) {
        const p = easeInOutCubic(phase(t, 0.45, 0.78));
        scale = THREE.MathUtils.lerp(1.3, 1, p);
        // quadratic bezier arc
        const a = (1 - p) * (1 - p);
        const b = 2 * (1 - p) * p;
        const c = p * p;
        g.position.set(0, 0, 0).addScaledVector(e.spawn, a).addScaledVector(e.control, b).addScaledVector(e.front, c);
        g.quaternion.slerpQuaternions(e.qCover, slotQ, p).multiply(spinQ.setFromAxisAngle(X_AXIS, p * Math.PI * 2));
        haloAmount = 1 - phase(t, 0.45, 0.55);
      } else if (t < LAND_AT) {
        const p = easeInQuad(phase(t, 0.78, LAND_AT));
        g.position.lerpVectors(e.front, slotPos, p);
        g.quaternion.copy(slotQ);
      } else {
        g.position.copy(slotPos);
        g.quaternion.copy(slotQ);
        if (!e.landed) {
          e.landed = true;
          const world = g.getWorldPosition(tmpV);
          useLibrary.getState().land(book.id, [world.x, world.y, world.z + 0.15], book.color);
        }
        const p = phase(t, LAND_AT, 1);
        const squash = Math.sin(p * Math.PI * 3) * (1 - p) * 0.14;
        g.scale.set(1 + squash * 0.6, 1 - squash, 1 + squash * 0.6);
        if (t >= 1) {
          g.scale.setScalar(1);
          enter.current = null;
          useLibrary.getState().finishEnter(book.id);
        }
      }
      if (t < LAND_AT) g.scale.setScalar(scale);

      // the glowing "item get" rays behind the book
      const h = halo.current;
      h.visible = haloAmount > 0.01;
      if (h.visible) {
        pointInFrontOfCamera(camera, parent, 1.75, h.position);
        h.quaternion.copy(parent.getWorldQuaternion(parentQ).invert().multiply(camera.quaternion));
        h.rotateZ(now * 0.8);
        h.scale.setScalar(0.4 + haloAmount * 0.75);
        (h.material as THREE.MeshBasicMaterial).opacity = haloAmount * 0.9;
      }
      return;
    }

    halo.current.visible = false;
    const k = 1 - Math.exp(-9 * dt);
    if (selected) {
      pointInFrontOfCamera(camera, parent, 0.95, tmpV);
      g.position.lerp(tmpV, k);
      g.quaternion.slerp(coverFacingCamera(camera, parent, tmpQ), k);
    } else {
      tmpV.copy(slotPos);
      if (hovered && slot.rotation[2] === 0) tmpV.z += 0.08;
      g.position.lerp(tmpV, k);
      g.quaternion.slerp(slotQ, k);
    }
    g.scale.lerp(tmpV.setScalar(1), k);
  });

  const canInteract = !entering && !selected;
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!canInteract) return;
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };
  const onOut = () => {
    setHovered(false);
    document.body.style.cursor = '';
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!canInteract) return;
    onOut();
    useLibrary.getState().openBook(book.id);
  };

  return (
    <>
      <group ref={group}>
        <BookModel book={book} size={slot.size} coverUrl={coverUrl} />
        {/* one invisible box for pointer events, so hovering doesn't flicker between the book's parts */}
        <mesh onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
          <boxGeometry args={[thickness, height, depth]} />
          <meshBasicMaterial colorWrite={false} depthWrite={false} />
        </mesh>
        {hovered && canInteract && (
          <Html position={[0, height / 2 + 0.06, depth / 2]} center style={{ pointerEvents: 'none' }}>
            <div className="book-label">
              <strong>{book.title}</strong>
              <span>{book.pageCount} pages{book.lastPage > 1 ? ` · on p. ${book.lastPage}` : ''}</span>
            </div>
          </Html>
        )}
      </group>
      <mesh ref={halo} visible={false} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={rays} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </>
  );
}
