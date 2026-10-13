import { useMemo } from 'react';
import * as THREE from 'three';
import { useSurface } from '../utils/assets';

/** One set of shared materials for the whole hall, so nothing is created twice. */
export function useHallMaterials() {
  const walnut = useSurface('walnut', [1, 1]);
  const velvet = useSurface('velvet', [3, 3]);
  const plaster = useSurface('plaster', [1, 1]);

  return useMemo(() => {
    // the scan is unfinished grey walnut with horizontal grain: turn the grain
    // upright and stain it warm through the material colour
    for (const t of [walnut.map!, walnut.normalMap, walnut.roughnessMap]) {
      t.center.set(0.5, 0.5);
      t.rotation = Math.PI / 2;
    }
    const polishedWalnut = new THREE.MeshPhysicalMaterial({
      ...walnut,
      color: '#c98a5c',
      roughness: 0.9,
      clearcoat: 0.35,
      clearcoatRoughness: 0.35,
    });
    return {
      walnut: polishedWalnut,
      /** Darker stain for structural pieces (pilasters, ribs, balcony). */
      darkWalnut: new THREE.MeshPhysicalMaterial({
        ...walnut,
        color: '#9a6240',
        roughness: 0.9,
        clearcoat: 0.25,
        clearcoatRoughness: 0.4,
      }),
      brass: new THREE.MeshPhysicalMaterial({ color: '#c9a052', metalness: 1, roughness: 0.32 }),
      iron: new THREE.MeshStandardMaterial({ color: '#2a2018', metalness: 0.85, roughness: 0.45 }),
      /** Slate-blue velvet for the armchairs and sofa. */
      velvet: new THREE.MeshPhysicalMaterial({
        color: '#4b5770',
        roughness: 0.95,
        normalMap: velvet.normalMap,
        roughnessMap: velvet.roughnessMap,
        sheen: 1,
        sheenColor: new THREE.Color('#9fb0d4'),
        sheenRoughness: 0.4,
      }),
      /** Deep plaster for the vault and upper walls. */
      plaster: new THREE.MeshStandardMaterial({
        normalMap: plaster.normalMap,
        roughnessMap: plaster.roughnessMap,
        color: '#3a3040',
        roughness: 1,
      }),
    };
  }, [walnut, velvet, plaster]);
}

export type HallMaterials = ReturnType<typeof useHallMaterials>;
