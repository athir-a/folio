import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mulberry32 } from '../../lib/random';
import { mergePieces, placedBox } from '../utils/geometry';
import { fillerSpineTexture } from '../utils/textures';
import { BAYS, HALL, USER_BAY, WINDOW } from './layout';
import type { HallMaterials } from './materials';

/** Antique bindings: oxblood, bottle green, navy, tan calf, plum, a little vellum. */
const BINDINGS = ['#5a1f1f', '#7a2e24', '#2f4a3a', '#1f3550', '#4a3524', '#6b4a2a', '#2a2622', '#8a6a3a', '#3c2a4a', '#6d2a3a', '#2d5560', '#9a7a4a', '#c9b48a', '#4a1c2c', '#38482a'];

interface Case {
  /** World transform of the case's bottom-centre; local +z faces the room. */
  position: [number, number, number];
  rotationY: number;
  width: number;
  height: number;
  rows: number;
}

const DEPTH = BAYS.depth;

function allCases(): Case[] {
  const cases: Case[] = [];
  for (const side of [-1, 1] as const) {
    BAYS.z.forEach((z, i) => {
      const position: [number, number, number] = [side * (HALL.halfWidth - DEPTH / 2), 0, z];
      const rotationY = (-side * Math.PI) / 2;
      if (!(side === USER_BAY.side && i === USER_BAY.index)) {
        cases.push({ position, rotationY, width: BAYS.width, height: BAYS.groundHeight, rows: 8 });
      }
      cases.push({ position: [position[0], BAYS.upperBottom, z], rotationY, width: BAYS.width, height: BAYS.upperHeight, rows: 9 });
    });
  }
  // either side of the great window, on both storeys
  const sideWidth = HALL.halfWidth - WINDOW.width / 2 - 0.55;
  for (const side of [-1, 1]) {
    const x = side * (WINDOW.width / 2 + 0.35 + sideWidth / 2);
    cases.push({ position: [x, 0, HALL.back + DEPTH / 2], rotationY: 0, width: sideWidth, height: BAYS.groundHeight, rows: 8 });
    cases.push({ position: [x, BAYS.upperBottom, HALL.back + DEPTH / 2], rotationY: 0, width: sideWidth, height: BAYS.upperHeight, rows: 9 });
  }
  return cases;
}

interface BookInstance {
  matrix: THREE.Matrix4;
  color: THREE.Color;
}

/** Fills one case with books: varied sizes, the odd gap, leaning book and lying stack. */
function fillCase(c: Case, rand: () => number, out: BookInstance[]) {
  const caseMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...c.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, c.rotationY, 0)),
    new THREE.Vector3(1, 1, 1),
  );
  const rowH = c.height / c.rows;
  const local = new THREE.Object3D();
  const color = () => {
    const col = new THREE.Color(BINDINGS[Math.floor(rand() * BINDINGS.length)]);
    return col.offsetHSL(0, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.06);
  };
  for (let r = 0; r < c.rows; r++) {
    const floorY = r * rowH + 0.03;
    let x = -c.width / 2 + 0.04;
    const right = c.width / 2 - 0.04;
    while (x < right - 0.03) {
      const roll = rand();
      if (roll < 0.03) {
        x += 0.08 + rand() * 0.15; // a gap
        continue;
      }
      if (roll < 0.06 && right - x > 0.3) {
        // a small stack lying flat
        const n = 2 + Math.floor(rand() * 4);
        const w = 0.2 + rand() * 0.06;
        let y = floorY;
        for (let k = 0; k < n; k++) {
          const t = 0.03 + rand() * 0.03;
          local.position.set(x + w / 2, y + t / 2, DEPTH / 2 - 0.13);
          local.rotation.set(0, (rand() - 0.5) * 0.2, 0);
          local.scale.set(w, t, 0.2 + rand() * 0.04);
          local.updateMatrix();
          out.push({ matrix: caseMatrix.clone().multiply(local.matrix), color: color() });
          y += t;
        }
        x += w + 0.02;
        continue;
      }
      const t = 0.022 + rand() * 0.05;
      const h = rowH * (0.55 + rand() * 0.33);
      const d = 0.15 + rand() * 0.1;
      const lean = roll > 0.985 ? 0.25 : 0;
      local.position.set(x + t / 2 + (lean ? h * 0.12 : 0), floorY + h / 2 - (lean ? h * 0.015 : 0), DEPTH / 2 - d / 2 - 0.03);
      local.rotation.set(0, 0, -lean);
      local.scale.set(t, h, d);
      local.updateMatrix();
      out.push({ matrix: caseMatrix.clone().multiply(local.matrix), color: color() });
      x += t + 0.002 + (lean ? h * 0.25 : 0);
    }
  }
}

/** Walnut carcasses (backs, shelves, tops) for every case, merged into one mesh. */
function carcass(cases: Case[]) {
  const pieces: THREE.BufferGeometry[] = [];
  for (const c of cases) {
    const rowH = c.height / c.rows;
    const parts: [number, number, number, number, number, number][] = [
      [c.width, c.height, 0.02, 0, c.height / 2, -DEPTH / 2 + 0.01],
      ...Array.from({ length: c.rows + 1 }, (_, r) => [c.width, 0.03, DEPTH, 0, r * rowH + 0.015, 0] as [number, number, number, number, number, number]),
      [c.width + 0.06, 0.08, DEPTH + 0.04, 0, c.height + 0.04, 0.02], // top moulding
    ];
    for (const [w, h, d, x, y, z] of parts) {
      const g = placedBox([w, h, d], [x, y, z], 0, 0.006);
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...c.position), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, c.rotationY, 0)), new THREE.Vector3(1, 1, 1)));
      pieces.push(g);
    }
  }
  return mergePieces(pieces, 1.2);
}

/** Every bookcase in the hall except the visitor's own, full of old books. */
export function Bookcases({ m }: { m: HallMaterials }) {
  const books = useRef<THREE.InstancedMesh>(null!);
  const { instances, carcassGeo } = useMemo(() => {
    const cases = allCases();
    const rand = mulberry32(2024);
    const instances: BookInstance[] = [];
    cases.forEach((c) => fillCase(c, rand, instances));
    return { instances, carcassGeo: carcass(cases) };
  }, []);

  const materials = useMemo(() => {
    const cover = new THREE.MeshStandardMaterial({ roughness: 0.75 });
    const spine = new THREE.MeshStandardMaterial({ map: fillerSpineTexture(), roughness: 0.6 });
    const pages = new THREE.MeshStandardMaterial({ color: '#d9c9a6', roughness: 0.95 });
    // page edges stay paper-coloured: skip the per-book colour on this material
    pages.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '');
    };
    // BoxGeometry faces: +x, -x, +y, -y, +z (spine, faces the room), -z
    return [cover, cover, pages, pages, spine, pages];
  }, []);

  useLayoutEffect(() => {
    instances.forEach((b, i) => {
      books.current.setMatrixAt(i, b.matrix);
      books.current.setColorAt(i, b.color);
    });
    books.current.instanceMatrix.needsUpdate = true;
    books.current.instanceColor!.needsUpdate = true;
    books.current.computeBoundingSphere();
  }, [instances]);

  return (
    <group>
      <mesh geometry={carcassGeo} material={m.walnut} castShadow receiveShadow />
      <instancedMesh ref={books} args={[undefined, materials, instances.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  );
}
