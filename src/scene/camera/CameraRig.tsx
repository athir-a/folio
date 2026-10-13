import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useLibrary } from '../../state/libraryStore';
import { useView, type View } from '../../state/viewStore';
import { BAYS, HALL } from '../hall/layout';
import { SHELF } from '../shelf/layout';
import { easeInOutCubic, phase } from '../utils/easing';

interface Shot {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

const WALK_SECONDS = 3.2;
const tmpPos = new THREE.Vector3();
const right = new THREE.Vector3();

/** How much of the screen the shelf may use; the rest is kept clear for the title and buttons. */
const SHELF_SCREEN_HEIGHT = 0.76;
const SHELF_SCREEN_WIDTH = 0.94;
/** A longer lens than the hall's, so spines near the edges aren't skewed. */
const SHELF_FOV = 34;

/**
 * Camera placements for each view. At the shelf, the distance is worked out
 * from the screen's shape so the whole bookcase just fills the view, whatever
 * the window size, which keeps the spines as large (and readable) as possible.
 */
function shots(aspect: number): Record<View, Shot> {
  const portrait = aspect < 1;
  // the shelf's front, and the direction it faces (into the hall)
  const facing = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), SHELF.rotationY);
  const front = new THREE.Vector3(...SHELF.position).addScaledVector(facing, SHELF.depth / 2);
  const shelfHeight = SHELF.height + 0.05; // including the crown moulding
  const shelfWidth = SHELF.width + 0.07;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(SHELF_FOV / 2));
  const fitHeight = shelfHeight / SHELF_SCREEN_HEIGHT / 2 / tanHalf;
  const fitWidth = shelfWidth / SHELF_SCREEN_WIDTH / 2 / (tanHalf * aspect);
  // never back into the bookcases on the far side of the hall; on very narrow
  // screens, widen the lens instead
  const maxBack = HALL.halfWidth * 2 - BAYS.depth * 2 - 0.5;
  let standBack = Math.max(fitHeight, fitWidth);
  let fov = SHELF_FOV;
  if (standBack > maxBack) {
    standBack = maxBack;
    fov = THREE.MathUtils.radToDeg(2 * Math.atan(shelfWidth / SHELF_SCREEN_WIDTH / 2 / (maxBack * aspect)));
  }
  const eyeLevel = shelfHeight / 2; // look straight at the middle: no keystoning
  return {
    hall: {
      position: new THREE.Vector3(0, 1.8, portrait ? 8.6 : 7.4),
      target: new THREE.Vector3(0, 4.3, -10),
      fov: portrait ? 62 : 52,
    },
    shelf: {
      position: front.clone().addScaledVector(facing, standBack).setY(eyeLevel),
      target: front.clone().setY(eyeLevel),
      fov,
    },
  };
}

/**
 * Moves the camera between the hall and the shelf like someone walking: along
 * a curve, turning their head partway, with a slight bob. When standing still
 * it drifts gently with the mouse so the room feels alive.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / s.size.height);
  const view = useView((s) => s.view);
  const all = useMemo(() => shots(aspect), [aspect]);

  const state = useRef({
    walking: false,
    t: 0,
    fromPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    fromFov: 50,
    control: new THREE.Vector3(),
    target: all[view].target.clone(),
    sway: new THREE.Vector2(),
  });

  // start wherever the URL says (the hall, or #shelf)
  useEffect(() => {
    const start = all[useView.getState().view];
    camera.position.copy(start.position);
    camera.fov = start.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(start.target);
  }, []); // only on mount; the walk effect below handles later changes

  // a new destination starts a walk from wherever we are now
  useEffect(() => {
    const s = state.current;
    s.walking = true;
    s.t = 0;
    s.fromPos.copy(camera.position);
    s.fromTarget.copy(s.target);
    s.fromFov = camera.fov;
    const to = all[view].position;
    if (s.fromPos.distanceTo(to) < 0.05) {
      s.walking = false; // already standing here (e.g. first render)
      return;
    }
    // bow the path out into the room so we walk around the furniture
    s.control.copy(s.fromPos).lerp(to, 0.5).add(new THREE.Vector3(-0.6, 0.15, 0));
  }, [view, all, camera]);

  useFrame((frame, dt) => {
    const s = state.current;
    const shot = all[view];
    if (s.walking) {
      s.t = Math.min(1, s.t + Math.min(dt, 1 / 30) / WALK_SECONDS);
      const e = easeInOutCubic(s.t);
      const a = (1 - e) * (1 - e);
      const b = 2 * (1 - e) * e;
      const c = e * e;
      tmpPos.set(0, 0, 0).addScaledVector(s.fromPos, a).addScaledVector(s.control, b).addScaledVector(shot.position, c);
      tmpPos.y += Math.sin(e * Math.PI * 6) * 0.018 * Math.sin(e * Math.PI); // footsteps
      camera.position.copy(tmpPos);
      // the head turns towards the new view in the middle of the walk
      s.target.lerpVectors(s.fromTarget, shot.target, easeInOutCubic(phase(s.t, 0.12, 0.85)));
      camera.fov = THREE.MathUtils.lerp(s.fromFov, shot.fov, e);
      camera.updateProjectionMatrix();
      if (s.t >= 1) {
        s.walking = false;
        useView.getState().markArrived();
      }
    } else {
      // idle: drift a little with the pointer (not while a book is open)
      const reading = useLibrary.getState().selectedId !== null;
      // at the shelf, only a whisper of drift so the framing stays put
      const amount = reading ? 0 : view === 'hall' ? 0.3 : 0.04;
      s.sway.lerp(frame.pointer, 1 - Math.exp(-2.5 * dt));
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      tmpPos.copy(shot.position).addScaledVector(right, s.sway.x * amount).add(new THREE.Vector3(0, s.sway.y * amount * 0.4, 0));
      camera.position.lerp(tmpPos, 1 - Math.exp(-4 * dt));
      s.target.lerp(shot.target, 1 - Math.exp(-4 * dt));
      if (Math.abs(camera.fov - shot.fov) > 0.01) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, shot.fov, 1 - Math.exp(-4 * dt));
        camera.updateProjectionMatrix();
      }
    }
    camera.lookAt(s.target);
  });

  return null;
}
