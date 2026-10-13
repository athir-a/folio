import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Paths to the CC0 assets in public/assets (see public/assets/CREDITS.md), and
 * a hook that loads them with the right colour space, tiling and filtering.
 */

const BASE = `${import.meta.env.BASE_URL}assets`;

/** Texture sets; `colour: false` means we only use the surface detail (normal + roughness). */
const SURFACES = {
  walnut: { id: 'american_walnut_veneer', colour: true },
  oakFloor: { id: 'wood_floor', colour: true },
  plaster: { id: 'beige_wall_001', colour: false }, // the scan is taupe; we pick the colour ourselves
  velvet: { id: 'velour_velvet', colour: false },
  linen: { id: 'rough_linen', colour: false },
  wool: { id: 'wool_boucle', colour: false },
} as const;

export type SurfaceName = keyof typeof SURFACES;

export interface SurfaceMaps {
  map?: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}

const url = (id: string, map: string) => `${BASE}/textures/${id}/${map}.jpg`;

/**
 * Loads a PBR texture set. `repeat` is how many times the texture tiles across
 * the surface's UV space. Each call gets its own clones so tiling stays independent.
 */
export function useSurface(name: SurfaceName, repeat: [number, number] = [1, 1]): SurfaceMaps {
  const { id, colour } = SURFACES[name];
  const urls = colour ? [url(id, 'diff'), url(id, 'nor'), url(id, 'rough')] : [url(id, 'nor'), url(id, 'rough')];
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
  Object.values(SURFACES).forEach(({ id, colour }) => {
    if (colour) useTexture.preload(url(id, 'diff'));
    useTexture.preload(url(id, 'nor'));
    useTexture.preload(url(id, 'rough'));
  });
}
