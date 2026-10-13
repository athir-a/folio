import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { BookRecord } from '../../db/libraryDb';
import { shade } from '../../lib/color';
import { useSurface } from '../utils/assets';
import { pagesTextures, spineTextures } from '../utils/textures';
import type { BookSize } from './layout';

/** Spine curvature: the arc spans this many radians of a (squashed) cylinder. */
const SPINE_ARC = 2.0;

let sharedPages: ReturnType<typeof pagesTextures> | null = null;

// Spine titles use Cormorant Garamond; repaint once the web font has arrived.
const fontsReady = document.fonts?.load('700 20px "Cormorant Garamond"').then(() => true) ?? Promise.resolve(true);
function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void fontsReady.then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

/**
 * A hardback built like the real thing: two cloth-covered boards that overhang
 * the page block, a rounded spine with a foil-stamped title, and the cover
 * image (page 1 of the PDF) pasted on the front board.
 *
 * Local axes: x = thickness (front cover at +x), y = height, z = depth (spine at +z).
 */
export function BookModel({ book, size, coverUrl }: { book: BookRecord; size: BookSize; coverUrl?: string }) {
  const { thickness: t, height: h, depth: d } = size;
  const linen = useSurface('linen', [3, 3]);
  const fonts = useFontsReady();

  const geo = useMemo(() => {
    const board = Math.min(0.0035, t * 0.12);
    const overhang = 0.003;
    const bulge = Math.min(0.006, t * 0.16);
    const sx = t / 2 / Math.sin(SPINE_ARC / 2);
    const sz = bulge / (1 - Math.cos(SPINE_ARC / 2));
    return {
      board,
      boardGeo: new RoundedBoxGeometry(board, h, d - 0.002, 2, board * 0.45),
      boardZ: -0.001,
      pagesGeo: new THREE.BoxGeometry(t - board * 2 - 0.0006, h - overhang * 2, d - overhang - 0.006),
      pagesZ: (overhang - 0.006) / 2,
      spineGeo: new THREE.CylinderGeometry(1, 1, h, 24, 1, true, -SPINE_ARC / 2, SPINE_ARC),
      spineScale: [sx, 1, sz] as [number, number, number],
      spineZ: d / 2 - 0.002 - Math.cos(SPINE_ARC / 2) * sz,
    };
  }, [t, h, d]);

  useEffect(
    () => () => {
      geo.boardGeo.dispose();
      geo.pagesGeo.dispose();
      geo.spineGeo.dispose();
    },
    [geo],
  );

  const materials = useMemo(() => {
    sharedPages ??= pagesTextures();
    const cloth = new THREE.MeshPhysicalMaterial({
      color: book.color,
      roughness: 0.82,
      roughnessMap: linen.roughnessMap,
      normalMap: linen.normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      sheen: 0.35,
      sheenColor: new THREE.Color(shade(book.color, 0.25)),
      sheenRoughness: 0.6,
    });
    const coverFront = cloth.clone();
    const spine = spineTextures(book.title, book.color, t, h);
    const spineMat = new THREE.MeshPhysicalMaterial({
      map: spine.map,
      roughnessMap: spine.orm,
      metalnessMap: spine.orm,
      roughness: 1,
      metalness: 1,
      normalMap: linen.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      sheen: 0.25,
      sheenColor: new THREE.Color(shade(book.color, 0.25)),
    });
    const pages = new THREE.MeshStandardMaterial({
      map: sharedPages.map,
      bumpMap: sharedPages.bump,
      bumpScale: 0.6,
      roughness: 0.92,
    });
    return { cloth, coverFront, spineMat, pages, spine };
    // `fonts` is listed so the spine is re-painted once the web font has loaded
  }, [book.color, book.title, t, h, linen, fonts]);

  useEffect(
    () => () => {
      materials.spine.map.dispose();
      materials.spine.orm.dispose();
      [materials.cloth, materials.coverFront, materials.spineMat, materials.pages].forEach((m) => m.dispose());
    },
    [materials],
  );

  useEffect(() => {
    if (!coverUrl) return;
    let tex: THREE.Texture | null = null;
    new THREE.TextureLoader().load(coverUrl, (loaded) => {
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = 8;
      tex = loaded;
      const m = materials.coverFront;
      m.map = loaded;
      m.color.set('#ffffff');
      m.normalScale.set(0.25, 0.25); // printed paper over board: less weave
      m.roughness = 0.6;
      m.sheen = 0;
      m.needsUpdate = true;
    });
    return () => tex?.dispose();
  }, [coverUrl, materials]);

  // RoundedBoxGeometry keeps BoxGeometry's face groups: +x, -x, +y, -y, +z, -z
  const frontBoard = [materials.coverFront, ...Array(5).fill(materials.cloth)];
  const { board } = geo;

  return (
    <group>
      <mesh geometry={geo.boardGeo} material={frontBoard} position={[t / 2 - board / 2, 0, geo.boardZ]} castShadow receiveShadow />
      <mesh geometry={geo.boardGeo} material={materials.cloth} position={[-t / 2 + board / 2, 0, geo.boardZ]} castShadow receiveShadow />
      <mesh geometry={geo.pagesGeo} material={materials.pages} position={[0, 0, geo.pagesZ]} castShadow receiveShadow />
      <mesh geometry={geo.spineGeo} material={materials.spineMat} position={[0, 0, geo.spineZ]} scale={geo.spineScale} castShadow receiveShadow />
    </group>
  );
}
