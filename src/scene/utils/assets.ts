import { useMemo } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Paths to the CC0 assets in public/assets (see public/assets/CREDITS.md), and
 * hooks that load them with the right colour space, tiling and filtering.
 */

const BASE = `${import.meta.env.BASE_URL}assets`;

export const HDRI = `${BASE}/hdri/reading_room_1k.hdr`;

export const MODELS = {
  pottedPlant: `${BASE}/models/potted_plant_01/potted_plant_01.gltf`,
  clayPlanter: `${BASE}/models/planter_pot_clay/planter_pot_clay.gltf`,
  pictureFrame: `${BASE}/models/fancy_picture_frame_01/fancy_picture_frame_01.gltf`,
  vase: `${BASE}/models/ceramic_vase_02/ceramic_vase_02.gltf`,
};

/** Texture sets; `colour: false` means we only use the surface detail (normal + roughness). */
const SURFACES = {
  oakFloor: { id: 'wood_floor', colour: true },
  plaster: { id: 'beige_wall_001', colour: false }, // the scan is taupe; we paint it cream ourselves
  velvet: { id: 'velour_velvet', colour: false },
  linen: { id: 'rough_linen', colour: false },
  wool: { id: 'wool_boucle', colour: false },
  oakGrain: { id: 'oak_veneer_01', colour: false },
} as const;

export type SurfaceName = keyof typeof SURFACES;

export interface SurfaceMaps {
  map?: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}

/**
 * Loads a PBR texture set. `repeat` is how many times the texture tiles across
 * the surface's UV space. Each call gets its own clones so tiling stays independent.
 */
export function useSurface(name: SurfaceName, repeat: [number, number] = [1, 1]): SurfaceMaps {
  const { id, colour } = SURFACES[name];
  const urls = colour
    ? [`${BASE}/textures/${id}/diff.jpg`, `${BASE}/textures/${id}/nor.jpg`, `${BASE}/textures/${id}/rough.jpg`]
    : [`${BASE}/textures/${id}/nor.jpg`, `${BASE}/textures/${id}/rough.jpg`];
  const loaded = useTexture(urls);

  return useMemo(() => {
    const textures = loaded.map((t) => {
      const c = t.clone();
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.repeat.set(...repeat);
      c.anisotropy = 8;
      c.needsUpdate = true;
      return c;
    });
    if (colour) {
      textures[0].colorSpace = THREE.SRGBColorSpace;
      return { map: textures[0], normalMap: textures[1], roughnessMap: textures[2] };
    }
    return { normalMap: textures[0], roughnessMap: textures[1] };
  }, [loaded, colour, repeat[0], repeat[1]]); // repeat compared by value
}

export function preloadAssets() {
  Object.values(MODELS).forEach((url) => useGLTF.preload(url));
  Object.values(SURFACES).forEach(({ id, colour }) => {
    if (colour) useTexture.preload(`${BASE}/textures/${id}/diff.jpg`);
    useTexture.preload(`${BASE}/textures/${id}/nor.jpg`);
    useTexture.preload(`${BASE}/textures/${id}/rough.jpg`);
  });
}

/** Clones a loaded glTF scene and makes every mesh cast and receive shadows. */
export function useModel(url: string) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
}
