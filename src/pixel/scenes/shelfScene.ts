import type { BookRecord } from '../../db/libraryDb';
import { playPop } from '../../lib/sfx';
import { hashString, mulberry32 } from '../../lib/random';
import { useLibrary } from '../../state/libraryStore';
import { useSettings } from '../../state/settingsStore';
import { luminance } from '../../lib/color';
import { snapColour } from '../books';
import { glow, outline, rect, tint, type Ctx } from '../draw';
import { FONT, drawText, drawTextCentred, drawVertical, fitToLength, measure, textWidth, wrapToLength } from '../font';
import { P } from '../palette';
import { Particles } from '../particles';
import { armchair, bookcase, bookPile, floorboards, gallery, libraryLadder, moonbeam, pilaster, sconce, stainedWindow } from '../props';
import type { Hover, Scene } from './types';

/** Screen space (CSS px) kept clear for the HTML title and buttons. */
const CLEAR = { top: 76, topPortrait: 128, bottom: 92 };
/** Tall rows mean tall spines, so whole titles fit in the regular font. */
const TARGET_ROW_HEIGHT = 100;
/** Background bookcase bays and the carved pilasters between them. */
const BAY = 48;
const PIL = 6;
const STARDUST = [P.lamp, P.glow, P.gold, P.flame, P.night6];

/** Timeline of the "new book" moment, in seconds. */
const T = { pop: 0.35, hold: 1.6, fly: 2.15, land: 2.4, end: 2.85 };

interface Slot {
  x: number;
  bottom: number;
  w: number;
  h: number;
  spine: Spine;
}

/** How a book's spine is sized and lettered: one or two columns of title, at 1× or 2×. */
interface Spine {
  w: number;
  h: number;
  lines: string[];
  scale: number;
}

interface Arrival {
  id: string;
  t: number;
  landed: boolean;
  thumb: HTMLCanvasElement | null;
}

const easeOutBack = (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export class ShelfScene implements Scene {
  private w = 0;
  private h = 0;
  private c = { x: 0, y: 0, w: 0, h: 0, rows: 4 };
  private room = { galleryY: 0, floorY: 0, winX: 0, winTop: 0, sill: 0, beamLeft: 0 };
  private shelfY: number[] = [];
  private spines = new Map<string, Spine>();
  private staticLayer = document.createElement('canvas');
  private particles = new Particles();
  private slots = new Map<string, Slot>();
  private overflow = 0;
  private hovered: string | null = null;
  private arrival: Arrival | null = null;
  private shake = 0;
  private time = 0;
  private covers = new Map<string, HTMLImageElement>();

  resize(width: number, height: number, scale: number) {
    this.w = width;
    this.h = height;
    const portrait = width < height;
    const top = Math.ceil((portrait ? CLEAR.topPortrait : CLEAR.top) / scale);
    const bottom = Math.ceil(CLEAR.bottom / scale);
    // room on the left for the ladder, and on the right for the window and armchair
    const leftGap = portrait ? 12 : Math.min(80, Math.max(14, Math.round(width * 0.13)));
    const rightGap = portrait ? 16 : Math.min(110, Math.max(20, Math.round(width * 0.18)));
    const cw = Math.max(140, Math.min(width - leftGap - rightGap, 440));
    const ch = height - top - bottom;
    const rows = Math.max(2, Math.min(5, Math.round((ch - 10) / TARGET_ROW_HEIGHT)));
    this.c = { x: leftGap + Math.round((width - leftGap - rightGap - cw) / 2), y: top, w: cw, h: ch, rows };

    const galleryY = top - 10;
    const floorY = top + ch - 2;
    const winVisible = portrait ? 8 : Math.min(44, Math.max(16, Math.round(width * 0.075)));
    this.room = {
      galleryY,
      floorY,
      winX: width - winVisible,
      winTop: galleryY - 40,
      sill: floorY - Math.round((floorY - galleryY) * 0.3),
      beamLeft: this.c.x + Math.round(cw * (portrait ? 0.4 : 0.28)),
    };
    this.spines.clear();
    this.paintStatic();
  }

  /** The room around your shelf, painted once: a two-storey library lit by the moon. */
  private paintStatic() {
    const layer = this.staticLayer;
    layer.width = this.w;
    layer.height = this.h;
    const ctx = layer.getContext('2d')!;
    const { c, w, h } = this;
    const { galleryY, floorY, winX, winTop, sill } = this.room;

    rect(ctx, 0, 0, w, h, P.wood0);
    // upper storey: packed bookcases behind the gallery railing
    const upperH = galleryY + 20;
    for (let x = -10, i = 0; x < w; x += BAY + PIL, i++) {
      bookcase(ctx, x, -20, BAY, upperH, Math.max(1, Math.round(upperH / 18)), { fill: true, seed: 40 + i });
    }
    // lower storey: bays either side of your shelf, divided by pilasters
    const lowerY = galleryY + 8;
    const lowerH = floorY - lowerY;
    const lowerRows = Math.max(2, Math.round(lowerH / 19));
    for (let x = c.x - 2 - PIL - BAY, i = 0; x + BAY > 0; x -= BAY + PIL, i++) {
      bookcase(ctx, x, lowerY, BAY, lowerH, lowerRows, { fill: true, seed: 60 + i });
      pilaster(ctx, x - PIL, lowerY, PIL, lowerH);
    }
    for (let x = c.x + c.w + 2 + PIL, i = 0; x < w; x += BAY + PIL, i++) {
      bookcase(ctx, x, lowerY, BAY, lowerH, lowerRows, { fill: true, seed: 80 + i });
      pilaster(ctx, x + BAY, lowerY, PIL, lowerH);
    }
    pilaster(ctx, c.x - 2 - PIL, lowerY, PIL, lowerH);
    pilaster(ctx, c.x + c.w + 2, lowerY, PIL, lowerH);
    gallery(ctx, 0, galleryY, winX - 6);
    floorboards(ctx, 0, floorY, w, h - floorY);

    // night: everything so far sinks into a cool gloom
    ctx.globalAlpha = 0.5;
    rect(ctx, 0, 0, w, h, P.night0);
    ctx.globalAlpha = 1;

    // the window at the end of the room, and its halo
    stainedWindow(ctx, winX, winTop, sill, Math.max(48, (w - winX) * 2 + 8));
    glow(ctx, w, (winTop + sill) / 2, Math.round((sill - winTop) * 0.55), P.night5, 0.05, 4);

    // your shelf, lit warm against the dark
    this.shelfY = bookcase(ctx, c.x, c.y, c.w, c.h, c.rows, { light: true });
    for (const y of this.shelfY) rect(ctx, c.x + 3, y + 2, c.w - 6, 1, P.goldDark);

    // the ladder leans on the bay to the left, hooked over the gallery's brass rail
    const ladderTop = c.x - 2 - PIL - 18;
    const ladderFoot = ladderTop - Math.round((floorY - galleryY) * 0.09);
    if (ladderFoot > 2) {
      libraryLadder(ctx, ladderTop, galleryY + 7, ladderFoot, floorY + 3);
      if (ladderFoot > 24) bookPile(ctx, ladderFoot - 20, floorY + 4, 1);
    }
    // a reading chair under the window, turned towards the shelf
    const chairX = w - 27;
    if (chairX > c.x + c.w + 2 + PIL + 2) {
      ctx.save();
      ctx.translate(chairX * 2 + 21, 0);
      ctx.scale(-1, 1);
      armchair(ctx, chairX, floorY + 6);
      ctx.restore();
    }
  }

  /** Spine size and lettering for a book, so the title is as big as the shelf allows. */
  private spineFor(book: BookRecord, rowH: number): Spine {
    const key = `${book.id}:${rowH}`;
    const cached = this.spines.get(key);
    if (cached) return cached;
    const rand = mulberry32(hashString(book.id));
    const h = Math.round(rowH * (0.84 + rand() * 0.12));
    const room = h - 12;
    // thicker books get a slightly wider spine
    const extra = Math.min(3, Math.round(Math.sqrt(book.pageCount) / 6));
    const one = fitToLength(book.title, room, FONT);
    let spine: Spine;
    if (measure(one.text, FONT) * 2 <= room) spine = { w: FONT.height * 2 + 6 + extra, h, lines: [one.text], scale: 2 };
    else if (one.complete) spine = { w: FONT.height + 6 + extra, h, lines: [one.text], scale: 1 };
    else spine = { w: FONT.height * 2 + 8 + extra, h, lines: wrapToLength(book.title, room, FONT, 2).lines, scale: 1 };
    this.spines.set(key, spine);
    return spine;
  }

  /** Places books left to right, row by row; anything that doesn't fit is counted as overflow. */
  private layout(books: BookRecord[]) {
    this.slots.clear();
    this.overflow = 0;
    const left = this.c.x + 5;
    const right = this.c.x + this.c.w - 5;
    const rowH = (this.shelfY.length > 1 ? this.shelfY[1] - this.shelfY[0] : this.c.h - 8) - 4;
    let row = 0;
    let x = left;
    for (const book of books) {
      const spine = this.spineFor(book, rowH);
      if (x + spine.w > right) {
        row++;
        x = left;
      }
      if (row >= this.shelfY.length) {
        this.overflow++;
        continue;
      }
      this.slots.set(book.id, { x, bottom: this.shelfY[row], w: spine.w, h: spine.h, spine });
      x += spine.w + 1;
    }
  }

  update(dt: number, time: number) {
    this.time = time;
    this.particles.update(dt);
    this.shake = Math.max(0, this.shake - dt);
    const { books, entering, coverUrls } = useLibrary.getState();
    this.layout(books);

    // play one arrival at a time, in the order books were added
    if (!this.arrival) {
      const next = books.find((b) => entering[b.id]);
      if (next) {
        this.arrival = { id: next.id, t: 0, landed: false, thumb: this.thumbnail(next.id, coverUrls[next.id]) };
        if (!useSettings.getState().muted) playPop();
      }
    }
    const a = this.arrival;
    if (a) {
      if (!a.thumb) a.thumb = this.thumbnail(a.id, coverUrls[a.id]);
      a.t += Math.min(dt, 1 / 20); // hitches can't skip the moment
      const slot = this.slots.get(a.id);
      if (!a.landed && a.t >= T.land && slot) {
        a.landed = true;
        const cx = slot.x + slot.w / 2;
        this.particles.burst(cx, slot.bottom - slot.h / 2, STARDUST, 28);
        this.particles.dust(cx, slot.bottom - 1, slot.w + 6);
        this.particles.text(cx, slot.bottom - slot.h - 8, '+1', P.glow);
        this.shake = 0.3;
        useLibrary.getState().land(a.id);
      }
      if (a.t >= T.end) {
        useLibrary.getState().finishEnter(a.id);
        this.arrival = null;
      }
    }

    if (Math.random() < dt * 1.5) {
      this.particles.mote(this.c.x + Math.random() * this.c.w, this.c.y + Math.random() * this.c.h, P.lamp);
    }
    // dust turning in the moonbeam
    if (Math.random() < dt * 4) {
      const { winX, winTop, floorY, beamLeft } = this.room;
      const k = 0.25 + Math.random() * 0.75;
      const left = winX + (beamLeft - winX) * k;
      this.particles.mote(left + Math.random() * (this.w - left) * 0.6, winTop + (floorY - winTop) * k, P.night6);
    }
  }

  /** The PDF's first page, shrunk to a little pixelated cover. */
  private thumbnail(id: string, url: string | undefined): HTMLCanvasElement | null {
    if (!url) return null;
    let img = this.covers.get(id);
    if (!img) {
      img = new Image();
      img.src = url;
      this.covers.set(id, img);
    }
    if (!img.complete || img.naturalWidth === 0) return null;
    const c = document.createElement('canvas');
    c.width = 30;
    c.height = 42;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  draw(ctx: Ctx, t: number) {
    const shakeX = this.shake > 0 ? Math.round(Math.sin(t * 70) * this.shake * 5) : 0;
    ctx.save();
    ctx.translate(shakeX, 0);
    ctx.drawImage(this.staticLayer, 0, 0);
    const { books, selectedId } = useLibrary.getState();
    const a = this.arrival;
    for (const book of books) {
      const slot = this.slots.get(book.id);
      if (!slot) continue;
      if (useLibrary.getState().entering[book.id] && (!a || a.id !== book.id || a.t < T.fly)) continue;
      let lift = 0;
      let squash = 0;
      if (a && a.id === book.id && a.t < T.end) {
        // drop into the slot, then a little squash on impact
        const drop = clamp01((a.t - T.fly) / (T.land - T.fly));
        lift = a.t < T.land ? Math.round((1 - drop * drop) * 14) : 0;
        squash = a.t >= T.land && a.t < T.land + 0.12 ? 2 : a.t >= T.land + 0.12 && a.t < T.land + 0.22 ? -1 : 0;
      } else if (book.id === selectedId) lift = 8;
      else if (book.id === this.hovered) lift = 3;
      this.drawSpine(ctx, book, slot, lift, squash, book.id === this.hovered || book.id === selectedId);
    }
    if (this.overflow > 0) {
      const label = `+${this.overflow} MORE`;
      drawText(ctx, label, this.c.x + this.c.w - 6 - textWidth(label), this.shelfY[this.shelfY.length - 1] + 5, P.lamp);
    }
    ctx.restore();

    // moonlight slanting in from the window, across the shelf and onto the floor
    const { winX, winTop, sill, floorY, beamLeft } = this.room;
    moonbeam(ctx, { x: winX, top: winTop, bottom: sill }, { y: floorY + 1, bottom: this.h, left: beamLeft }, this.w, t);
    // sconces on the pilasters either side, when there's room
    if (this.c.x > 22) {
      sconce(ctx, this.c.x - 2 - PIL / 2, this.c.y + 34, t, 1);
      sconce(ctx, this.c.x + this.c.w + 2 + PIL / 2, this.c.y + 34, t, 2);
    }
    glow(ctx, this.c.x + this.c.w / 2, this.c.y - 6, this.c.w * 0.55, P.lamp, 0.04, 4);
    this.particles.draw(ctx);
    if (a && a.t < T.fly) this.drawArrival(ctx, a);
  }

  private drawSpine(ctx: Ctx, book: BookRecord, s: Slot, lift: number, squash: number, highlight: boolean) {
    const c = snapColour(book.color);
    const h = s.h - squash;
    const x = s.x;
    const y = s.bottom - h - lift;
    rect(ctx, x, y, s.w, h, c);
    rect(ctx, x, y, 1, h, tint(c, 0.28)); // rounded spine catching the light
    rect(ctx, x + s.w - 1, y, 1, h, tint(c, -0.4));
    rect(ctx, x + 1, y, s.w - 2, 1, tint(c, 0.15));
    const dark = luminance(c) > 0.42;
    const ink = dark ? P.ink : P.lamp;
    // head and tail bands
    rect(ctx, x + 1, y + 2, s.w - 2, 1, ink);
    rect(ctx, x + 1, y + h - 3, s.w - 2, 1, ink);
    // title down the spine, centred; a second line sits to the left of the first,
    // as it would when you tilt your head to read it
    const { lines, scale } = s.spine;
    const col = FONT.height * scale;
    const blockW = lines.length * col + (lines.length - 1) * 2;
    const blockH = Math.max(...lines.map((l) => measure(l, FONT))) * scale;
    const tx = x + Math.floor((s.w - blockW) / 2);
    const ty = y + 6 + Math.max(0, Math.floor((h - 12 - blockH) / 2));
    lines.forEach((line, i) => drawVertical(ctx, line, tx + (lines.length - 1 - i) * (col + 2), ty, ink, FONT, scale));
    if (highlight) outline(ctx, x - 1, y - 1, s.w + 2, h + 2, P.glow);
  }

  /** The big "NEW BOOK!" moment: cover pops up with rays, then flies onto the shelf. */
  private drawArrival(ctx: Ctx, a: Arrival) {
    const book = useLibrary.getState().books.find((b) => b.id === a.id);
    const slot = this.slots.get(a.id);
    if (!book) return;
    const fade = a.t < T.hold ? clamp01(a.t / 0.3) : 1 - clamp01((a.t - T.hold) / (T.fly - T.hold));
    // darken the room
    ctx.globalAlpha = 0.55 * fade;
    rect(ctx, 0, 0, this.w, this.h, P.shadow);
    ctx.globalAlpha = 1;

    // the title is the star: as big as the screen allows, on up to three lines
    const titleScale = this.w >= 240 ? 2 : 1;
    const lineH = (FONT.height + 3) * titleScale;
    const title = wrapToLength(book.title, Math.floor((this.w - 24) / titleScale), FONT, 3).lines;
    const cardW = Math.min(72, Math.round(this.w * 0.2), Math.round((this.h - 60 - title.length * lineH) / 1.4)) & ~1;
    const cardH = Math.round(cardW * 1.4);
    // centre the whole label + card + title block on screen
    const home = { x: this.w / 2, y: Math.round(this.h / 2 - (title.length * lineH) / 2 + 6) };
    let scale = 1;
    let cx = home.x;
    let cy = home.y;
    if (a.t < T.pop) scale = Math.max(0.05, easeOutBack(a.t / T.pop));
    if (a.t >= T.hold && slot) {
      const k = easeInOut(clamp01((a.t - T.hold) / (T.fly - T.hold)));
      const tx = slot.x + slot.w / 2;
      const ty = slot.bottom - slot.h / 2 - 14;
      cx = home.x + (tx - home.x) * k;
      cy = home.y + (ty - home.y) * k - Math.sin(k * Math.PI) * 24;
      scale = 1 - k * 0.8;
    }

    // rotating rays behind the card
    if (a.t < T.hold + 0.2) {
      ctx.globalAlpha = 0.22 * fade;
      ctx.fillStyle = P.lamp;
      const r = cardH;
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + this.time * 0.8;
        for (let d = 8; d < r; d += 2) {
          const spread = Math.ceil(d / 14);
          ctx.fillRect(Math.round(home.x + Math.cos(ang) * d), Math.round(home.y + Math.sin(ang) * d), spread, spread);
        }
      }
      ctx.globalAlpha = 1;
      glow(ctx, home.x, home.y, cardH * 0.8, P.lamp, 0.07 * fade, 4);
    }

    const w = Math.max(2, Math.round(cardW * scale));
    const h = Math.max(2, Math.round(cardH * scale));
    const x = Math.round(cx - w / 2);
    const y = Math.round(cy - h / 2);
    rect(ctx, x - 2, y - 2, w + 4, h + 4, P.ink);
    rect(ctx, x - 1, y - 1, w + 2, h + 2, P.gold);
    if (a.thumb) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(a.thumb, x, y, w, h);
    } else {
      const c = snapColour(book.color);
      rect(ctx, x, y, w, h, c);
      rect(ctx, x, y, 2, h, tint(c, -0.3));
    }

    // "NEW BOOK!" with bouncing letters, and the title underneath
    if (a.t > 0.15 && a.t < T.hold + 0.1) {
      ctx.globalAlpha = fade;
      const label = 'NEW BOOK!';
      const big = this.w > 260 ? 2 : 1;
      let lx = Math.round(home.x - textWidth(label, big) / 2);
      for (let i = 0; i < label.length; i++) {
        const ch = label[i];
        const bounce = Math.round(Math.abs(Math.sin(this.time * 7 + i * 0.6)) * -3);
        drawText(ctx, ch, lx + big, home.y - cardH / 2 - 16 * big + bounce + big, P.ink, big);
        drawText(ctx, ch, lx, home.y - cardH / 2 - 16 * big + bounce, i % 2 ? P.lamp : P.glow, big);
        lx += textWidth(ch, big) + big;
      }
      title.forEach((line, i) => {
        drawTextCentred(ctx, line, home.x, home.y + cardH / 2 + 8 + i * lineH, P.parchment, titleScale, P.ink);
      });
      ctx.globalAlpha = 1;
      // sparkles circling the card
      for (let i = 0; i < 6; i++) {
        const ang = this.time * 2 + (i / 6) * Math.PI * 2;
        const sx = Math.round(home.x + Math.cos(ang) * (cardW * 0.85));
        const sy = Math.round(home.y + Math.sin(ang) * (cardH * 0.62));
        rect(ctx, sx - 1, sy, 3, 1, P.glow);
        rect(ctx, sx, sy - 1, 1, 3, P.glow);
      }
    }
  }

  pointer(x: number, y: number) {
    this.hovered = null;
    if (this.arrival || useLibrary.getState().selectedId) return false;
    for (const [id, s] of this.slots) {
      if (useLibrary.getState().entering[id]) continue;
      if (x >= s.x && x < s.x + s.w && y >= s.bottom - s.h - 3 && y < s.bottom) {
        this.hovered = id;
        return true;
      }
    }
    return false;
  }

  click(x: number, y: number) {
    if (this.pointer(x, y) && this.hovered) useLibrary.getState().openBook(this.hovered);
  }

  hover(): Hover | null {
    if (!this.hovered) return null;
    const book = useLibrary.getState().books.find((b) => b.id === this.hovered);
    const s = this.slots.get(this.hovered);
    if (!book || !s) return null;
    return {
      key: book.id,
      title: book.title,
      subtitle: `${book.pageCount} pages${book.lastPage > 1 ? ` · on page ${book.lastPage}` : ''}`,
      x: s.x + s.w / 2,
      y: s.bottom - s.h - 6,
      below: s.bottom + 4,
    };
  }

  focus() {
    return { x: this.c.x + this.c.w / 2, y: this.c.y + this.c.h / 2 };
  }
}
