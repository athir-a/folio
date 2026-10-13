import type { BookRecord } from '../../db/libraryDb';
import { hashString, mulberry32 } from '../../lib/random';
import { BAYS, HALL, USER_BAY } from '../hall/layout';

const DEPTH = 0.42;

/**
 * The visitor's bookcase (metres). Its group's origin is its floor-centre and
 * its local +z faces into the hall; it stands in the user's bay on the side wall.
 */
export const SHELF = {
  width: 2.2,
  height: 2.3,
  depth: DEPTH,
  side: 0.05,
  board: 0.035,
  base: 0.1,
  rows: 5,
  /** World position of the shelf group. */
  position: [USER_BAY.side * (HALL.halfWidth - DEPTH / 2 - 0.02), 0, BAYS.z[USER_BAY.index]] as [number, number, number],
  /** Turns the shelf so its front faces the middle of the hall. */
  rotationY: (-USER_BAY.side * Math.PI) / 2,
};

export const COMPARTMENT_HEIGHT =
  (SHELF.height - SHELF.base - SHELF.board * 2 - SHELF.board * (SHELF.rows - 1)) / SHELF.rows;

/** y of the top surface of the board a row of books stands on (row 0 = bottom). */
export function rowFloorY(row: number) {
  return SHELF.base + SHELF.board + row * (COMPARTMENT_HEIGHT + SHELF.board);
}

export interface BookSize {
  thickness: number; // x: spine width
  height: number; // y
  depth: number; // z: cover width
}

export interface Slot {
  position: [number, number, number];
  rotation: [number, number, number];
  size: BookSize;
}

export function bookSize(book: BookRecord): BookSize {
  const rand = mulberry32(hashString(book.id));
  return {
    thickness: Math.min(0.1, Math.max(0.03, 0.026 + Math.sqrt(book.pageCount) * 0.004)),
    height: 0.29 + rand() * 0.08,
    depth: 0.2 + rand() * 0.04,
  };
}

/**
 * Places books left-to-right, top shelf first. Once the shelf is full, the
 * extra books are stacked in a pile on the floor beside it.
 */
export function computeLayout(books: BookRecord[]): Map<string, Slot> {
  const slots = new Map<string, Slot>();
  const left = -SHELF.width / 2 + SHELF.side + 0.03;
  const right = SHELF.width / 2 - SHELF.side - 0.03;
  let row = SHELF.rows - 1;
  let x = left;
  let pileY = 0;

  for (const book of books) {
    const size = bookSize(book);
    const rand = mulberry32(hashString(book.id) ^ 0x9e3779b9);
    if (row >= 0 && x + size.thickness > right) {
      row--;
      x = left;
    }
    if (row >= 0) {
      slots.set(book.id, {
        position: [x + size.thickness / 2, rowFloorY(row) + size.height / 2, SHELF.depth / 2 - size.depth / 2 - 0.025],
        rotation: [0, 0, 0],
        size,
      });
      x += size.thickness + 0.002 + rand() * 0.004;
    } else {
      // Floor pile: books lie flat with their spines still facing the room.
      slots.set(book.id, {
        position: [SHELF.width / 2 + 0.38, pileY + size.thickness / 2, 0.05],
        rotation: [0, (rand() - 0.5) * 0.35, Math.PI / 2],
        size,
      });
      pileY += size.thickness;
    }
  }
  return slots;
}
