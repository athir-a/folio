/**
 * Dimensions of the library hall (metres). The nave runs along -z towards the
 * great arched window; bookcase bays line both side walls on two storeys.
 *
 *            z = BACK (window wall)
 *        ┌──────────╱╲──────────┐
 *        │ bays     window  bays│   x = -HALF_WIDTH … +HALF_WIDTH
 *        │ ▯                  ▯ │
 *        │ ▯   rug, sofa,     ▯ │ ← user's shelf: right wall, bay USER_BAY
 *        │ ▯   armchairs      ▯ │
 *        └──────────────────────┘
 *            z = FRONT (behind the camera)
 */
export const HALL = {
  halfWidth: 5,
  front: 9,
  back: -12,
  /** Top of the side walls, where the vault ribs spring from. */
  wallTop: 9.2,
  /** Radius of the pointed barrel vault over the nave (must exceed halfWidth). */
  vaultRadius: 6,
  balconyY: 4.4,
  balconyDepth: 1.15,
};

/** Bookcase bays along each side wall, on both storeys. */
export const BAYS = {
  width: 2.4,
  pilaster: 0.4,
  /** z-centres of the bays, front to back. */
  z: [7.4, 4.6, 1.8, -1.0, -3.8, -6.6, -9.4],
  depth: 0.45,
  groundHeight: 3.55,
  upperBottom: 4.55,
  upperHeight: 3.9,
};

/** Which bay holds the visitor's own shelf (right wall, ground floor). */
export const USER_BAY = { side: 1 as 1 | -1, index: 3 };

export const WINDOW = {
  width: 4.6,
  bottom: 0.45,
  /** Where the straight sides end and the pointed arch begins. */
  spring: 6.4,
  /** Radius of the two arcs that form the pointed arch. */
  archRadius: 3.6,
};

export function bayFrontX(side: 1 | -1) {
  return side * (HALL.halfWidth - BAYS.depth);
}
