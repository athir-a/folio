import { useLibrary } from '../../state/libraryStore';
import { useView } from '../../state/viewStore';
import { snapColour } from '../books';
import { archHalfWidth, glow, rect, tint, type Ctx } from '../draw';
import { drawTextCentred } from '../font';
import {
  archRib,
  castleView,
  ceilingSky,
  chesterfield,
  clubChair,
  coffeeTable,
  desk,
  galleryRun,
  grandWindowFrame,
  perspectiveFloor,
  persianRug,
  pier,
  postLamp,
  roundBalcony,
  spiralStair,
  twinkles,
} from '../hallProps';
import { P } from '../palette';
import { Particles } from '../particles';
import { bookcase, floorLamp, moonlightPool, sconce, sign, sleepingCat, tableLamp } from '../props';
import type { Hover, Scene } from './types';

/**
 * The great hall is composed on a 400×225 stage, centred in the canvas; the
 * vault, galleries and floor extend to fill whatever is left.
 */
const STAGE = { w: 400, h: 225, floor: 158 };
/** Where the vault ends and the walls begin. */
const SPRING = 30;
const UPPER = 58;
const LOWER = 100;
const WIN = { cx: 200, top: 12, bottom: 134, halfW: 60, rise: 52 };
const PIERS = [122, 268];
const MY_CASE = { x: 318, y: 108, w: 52, h: 50, rows: 4 };
const BALCONIES = [107, 293];

export class HallScene implements Scene {
  private w = 0;
  private h = 0;
  private ox = 0;
  private oy = 0;
  private staticLayer = document.createElement('canvas');
  private particles = new Particles();
  private hovering = false;
  private shootingStar: { x: number; y: number; age: number } | null = null;
  private nextShootingStar = 4;

  resize(width: number, height: number) {
    this.w = width;
    this.h = height;
    // centre the stage, but on narrow screens keep your shelf in view
    this.ox = Math.round(Math.min((width - STAGE.w) / 2, width - 378));
    // a little above centre, so tall screens get more vault and floor
    this.oy = Math.round((height - STAGE.h) * 0.45);
    this.paintStatic();
  }

  /** Everything that never moves, painted once into an offscreen layer. */
  private paintStatic() {
    const c = this.staticLayer;
    c.width = this.w;
    c.height = this.h;
    const ctx = c.getContext('2d')!;
    const { ox, oy, w, h } = this;
    const floorY = oy + STAGE.floor;

    // the starry vault
    ceilingSky(ctx, w, oy + SPRING + 4);

    // side walls: three tiers of bookcases between two galleries
    const leftEnd = ox + PIERS[0];
    const rightStart = ox + PIERS[1] + 10;
    const tiers: [number, number, number][] = [
      [oy + SPRING, oy + UPPER, 3],
      [oy + UPPER + 6, oy + LOWER, 3],
      [oy + LOWER + 6, floorY, 5],
    ];
    rect(ctx, 0, oy + SPRING, leftEnd, floorY - oy - SPRING, P.wood0);
    rect(ctx, rightStart, oy + SPRING, w - rightStart, floorY - oy - SPRING, P.wood0);
    tiers.forEach(([top, bottom, rows], tier) => {
      for (let x = leftEnd - 48, i = 0; x > -48; x -= 48, i++) {
        bookcase(ctx, x, top, 46, bottom - top, rows, { fill: true, seed: tier * 20 + i });
      }
      for (let x = rightStart + 2, i = 0; x < w; x += 48, i++) {
        bookcase(ctx, x, top, 46, bottom - top, rows, { fill: true, seed: tier * 20 + 10 + i });
      }
    });

    // spiral stairs, then the galleries and round balconies over them
    for (const bx of BALCONIES) {
      spiralStair(ctx, ox + bx, oy + UPPER + 10, oy + LOWER - 9, 12);
      spiralStair(ctx, ox + bx, oy + LOWER + 10, floorY, 12);
    }
    for (const level of [UPPER, LOWER]) {
      galleryRun(ctx, 0, leftEnd, oy + level);
      galleryRun(ctx, rightStart, w, oy + level);
      for (const bx of BALCONIES) roundBalcony(ctx, ox + bx, oy + level, 15);
    }

    // arches over the side bays, open to the stars
    for (let cx = ox + 89; cx > -40; cx -= 66) archRib(ctx, cx, oy + SPRING, 30, 26);
    for (let cx = ox + 311; cx < w + 40; cx += 66) archRib(ctx, cx, oy + SPRING, 30, 26);

    // the side walls sit in shadow, so the lamps make warm pools against them
    ctx.globalAlpha = 0.4;
    rect(ctx, 0, oy + SPRING - 30, leftEnd, floorY - oy - SPRING + 30, P.night0);
    rect(ctx, rightStart, oy + SPRING - 30, w - rightStart, floorY - oy - SPRING + 30, P.night0);
    ctx.globalAlpha = 1;

    // your shelf: lighter walnut, at the foot of the right-hand gallery
    bookcase(ctx, ox + MY_CASE.x, oy + MY_CASE.y, MY_CASE.w, MY_CASE.h, MY_CASE.rows, { light: true });

    // the central bay: panelled wall under one great arch, the window in it
    const archSpring = oy + SPRING + 6;
    const archHalf = 73;
    const archRise = 72;
    for (let y = archSpring - archRise; y < floorY; y++) {
      const hw = y < archSpring ? Math.floor(archHalfWidth(archHalf, archRise, archSpring - y)) : archHalf;
      rect(ctx, ox + WIN.cx - hw, y, hw * 2, 1, P.wood1);
    }
    for (let x = ox + 136; x < ox + 264; x += 12) rect(ctx, x, oy + WIN.bottom + 4, 1, STAGE.floor - WIN.bottom - 4, P.wood0);
    archRib(ctx, ox + WIN.cx, archSpring, archHalf, archRise, 4);
    for (const px of PIERS) pier(ctx, ox + px, oy + SPRING, floorY);

    // floor, moonlight, rugs and furniture
    perspectiveFloor(ctx, w, floorY, h, ox + WIN.cx, oy + 100);
    ctx.globalAlpha = 0.3;
    rect(ctx, 0, floorY, w, h - floorY, P.night0);
    ctx.globalAlpha = 1;
    moonlightPool(ctx, ox + WIN.cx, floorY, 120, 48);
    galleryRun(ctx, ox + 136, ox + 264, oy + 150);
    persianRug(ctx, ox + 86, oy + 172, 116, 28, 1);
    persianRug(ctx, ox + 300, oy + 174, 100, 26, 2);
    chesterfield(ctx, ox + 86, oy + 181, 42);
    coffeeTable(ctx, ox + 86, oy + 194, 26);
    clubChair(ctx, ox + 44, oy + 198);
    clubChair(ctx, ox + 128, oy + 198);
    chesterfield(ctx, ox + 292, oy + 183, 36);
    coffeeTable(ctx, ox + 292, oy + 196, 22);
    clubChair(ctx, ox + 254, oy + 200);
  }

  update(dt: number) {
    this.particles.update(dt);
    const { ox, oy } = this;
    // dust drifting in the moonlight, and a few gold motes by your shelf
    if (Math.random() < dt * 3) this.particles.mote(ox + WIN.cx + (Math.random() - 0.5) * 90, oy + 70 + Math.random() * 100, P.night6);
    if (Math.random() < dt * 2) this.particles.mote(ox + MY_CASE.x + Math.random() * MY_CASE.w, oy + MY_CASE.y + Math.random() * MY_CASE.h, P.lamp);
    // the occasional shooting star
    this.nextShootingStar -= dt;
    if (this.nextShootingStar <= 0 && !this.shootingStar) {
      this.shootingStar = { x: WIN.cx - WIN.halfW + Math.random() * 40, y: WIN.top + 16 + Math.random() * 20, age: 0 };
      this.nextShootingStar = 6 + Math.random() * 8;
    }
    if (this.shootingStar) {
      this.shootingStar.age += dt;
      if (this.shootingStar.age > 0.7) this.shootingStar = null;
    }
  }

  draw(ctx: Ctx, t: number) {
    const { ox, oy } = this;
    ctx.drawImage(this.staticLayer, 0, 0);
    twinkles(ctx, this.w, oy + SPRING, t);

    castleView(ctx, ox + WIN.cx, oy + WIN.top, oy + WIN.bottom, WIN.halfW, WIN.rise, t);
    if (this.shootingStar) {
      const s = this.shootingStar;
      const k = s.age / 0.7;
      const x = ox + Math.round(s.x + k * 40);
      const y = oy + Math.round(s.y + k * 16);
      for (let i = 0; i < 6; i++) {
        ctx.globalAlpha = (1 - i / 6) * (1 - k);
        rect(ctx, x - i * 2, y - i, 1, 1, P.star);
      }
      ctx.globalAlpha = 1;
    }
    grandWindowFrame(ctx, ox + WIN.cx, oy + WIN.top, oy + WIN.bottom, WIN.halfW, WIN.rise);
    glow(ctx, ox + WIN.cx, oy + 80, 70, P.night5, 0.025, 4);

    // lamps along the galleries and on the window balustrade
    let seed = 0;
    for (const [y, xs] of [
      [UPPER - 10, [20, 70, 330, 380]],
      [LOWER - 10, [30, 76, 296]],
    ] as const) {
      for (const x of xs) postLamp(ctx, ox + x, oy + y, t, seed++);
    }
    postLamp(ctx, ox + 136, oy + 140, t, 7);
    postLamp(ctx, ox + 264, oy + 140, t, 8);
    sconce(ctx, ox + PIERS[0] + 5, oy + 74, t, 2);
    sconce(ctx, ox + PIERS[1] + 5, oy + 74, t, 3);

    // your shelf and its plaque on the gallery above
    this.drawMyBooks(ctx);
    const cx = ox + MY_CASE.x + MY_CASE.w / 2;
    sign(ctx, cx, oy + LOWER - 11, 54, this.hovering);
    drawTextCentred(ctx, 'MY SHELF', cx, oy + LOWER - 9, this.hovering ? P.glow : P.cream, 1, P.wood1);
    glow(ctx, cx, oy + MY_CASE.y + MY_CASE.h / 2, this.hovering ? 50 : 36, P.lamp, this.hovering ? 0.07 : 0.035, 3);

    // reading lamps, the desk, and the cat asleep in the moonlight
    tableLamp(ctx, ox + 94, oy + 186, t, 4);
    tableLamp(ctx, ox + 298, oy + 188, t, 5);
    floorLamp(ctx, ox + 18, oy + 186, t, 6);
    floorLamp(ctx, ox + 152, oy + 194, t, 10);
    desk(ctx, ox + 348, oy + 190, t);
    sleepingCat(ctx, ox + 194, oy + 178, t);
    this.particles.draw(ctx);
  }

  /** Your real books, in miniature, on your shelf in the hall. */
  private drawMyBooks(ctx: Ctx) {
    const { books } = useLibrary.getState();
    const left = this.ox + MY_CASE.x + 4;
    const right = this.ox + MY_CASE.x + MY_CASE.w - 4;
    const rowH = (MY_CASE.h - 8) / MY_CASE.rows;
    let row = 0;
    let x = left;
    for (const book of books) {
      if (x + 2 > right) {
        row++;
        x = left;
      }
      if (row >= MY_CASE.rows) break;
      const floor = Math.round(this.oy + MY_CASE.y + 4 + rowH * (row + 1)) - 2;
      const h = Math.round(rowH) - 3 - (book.id.charCodeAt(0) % 3);
      const c = snapColour(book.color);
      rect(ctx, x, floor - h, 2, h, c);
      rect(ctx, x, floor - h, 1, h, tint(c, 0.2));
      x += 3;
    }
  }

  pointer(x: number, y: number) {
    const { ox, oy } = this;
    const inCase = x >= ox + MY_CASE.x - 2 && x < ox + MY_CASE.x + MY_CASE.w + 2 && y >= oy + LOWER - 18 && y < oy + MY_CASE.y + MY_CASE.h;
    this.hovering = inCase;
    return inCase;
  }

  click(x: number, y: number) {
    if (this.pointer(x, y)) useView.getState().goTo('shelf');
  }

  hover(): Hover | null {
    if (!this.hovering) return null;
    const n = useLibrary.getState().books.length;
    return {
      key: 'my-shelf',
      title: 'Your shelf',
      subtitle: n === 0 ? 'empty, waiting for its first book' : `${n} ${n === 1 ? 'book' : 'books'}`,
      x: this.ox + MY_CASE.x + MY_CASE.w / 2,
      y: this.oy + LOWER - 18,
    };
  }

  focus() {
    return { x: this.ox + MY_CASE.x + MY_CASE.w / 2, y: this.oy + MY_CASE.y + MY_CASE.h / 2 };
  }
}
