import type { Ctx } from '../draw';

/** What the pointer is over, for the HTML tooltip drawn on top of the canvas. */
export interface Hover {
  key: string;
  title: string;
  subtitle?: string;
  /** Anchor in art pixels (the tooltip sits just above it). */
  x: number;
  y: number;
  /** Optional anchor below the thing, used when there is no room above. */
  below?: number;
}

/** A pixel scene: sized to the canvas, ticked and drawn every frame. */
export interface Scene {
  /** Canvas size in art pixels, and how many screen pixels each art pixel covers. */
  resize(width: number, height: number, scale: number): void;
  update(dt: number, time: number): void;
  draw(ctx: Ctx, time: number): void;
  /** Pointer moved (art pixels). Returns whether something clickable is under it. */
  pointer(x: number, y: number): boolean;
  click(x: number, y: number): void;
  hover(): Hover | null;
  /** Where the iris transition should close on, when leaving/entering this scene. */
  focus(): { x: number; y: number };
}
