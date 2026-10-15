import { rect, type Ctx } from './draw';
import { drawTextCentred } from './font';
import { P } from './palette';

type Kind = 'spark' | 'star' | 'dust' | 'mote' | 'text';

interface Particle {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  color: string;
  gravity: number;
  text?: string;
}

/** A tiny particle system: sparkles, dust puffs, drifting motes and floating text. */
export class Particles {
  private list: Particle[] = [];

  burst(x: number, y: number, colors: string[], count = 24) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 55;
      this.list.push({
        kind: i % 3 === 0 ? 'star' : 'spark',
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 35,
        life: 0.6 + Math.random() * 0.6,
        age: 0,
        color: colors[i % colors.length],
        gravity: 120,
      });
    }
  }

  dust(x: number, y: number, width: number) {
    for (let i = 0; i < 10; i++) {
      this.list.push({
        kind: 'dust',
        x: x + (Math.random() - 0.5) * width,
        y,
        vx: (Math.random() - 0.5) * 30,
        vy: -8 - Math.random() * 10,
        life: 0.5 + Math.random() * 0.3,
        age: 0,
        color: P.cream,
        gravity: 0,
      });
    }
  }

  /** Ambient sparkle that drifts slowly upward. */
  mote(x: number, y: number, color: string) {
    this.list.push({ kind: 'mote', x, y, vx: (Math.random() - 0.5) * 4, vy: -3 - Math.random() * 4, life: 2 + Math.random() * 2, age: 0, color, gravity: 0 });
  }

  text(x: number, y: number, text: string, color: string) {
    this.list.push({ kind: 'text', x, y, vx: 0, vy: -14, life: 1.1, age: 0, color, gravity: 0, text });
  }

  update(dt: number) {
    for (const p of this.list) {
      p.age += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'dust') {
        p.vx *= 0.92;
      }
    }
    this.list = this.list.filter((p) => p.age < p.life);
  }

  draw(ctx: Ctx) {
    for (const p of this.list) {
      const k = 1 - p.age / p.life;
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      ctx.globalAlpha = p.kind === 'mote' ? Math.sin(k * Math.PI) * 0.9 : Math.min(1, k * 1.5);
      if (p.kind === 'star' && k > 0.3) {
        rect(ctx, x - 1, y, 3, 1, p.color);
        rect(ctx, x, y - 1, 1, 3, p.color);
      } else if (p.kind === 'dust') {
        rect(ctx, x, y, k > 0.5 ? 2 : 1, k > 0.5 ? 2 : 1, p.color);
      } else if (p.kind === 'text' && p.text) {
        drawTextCentred(ctx, p.text, x, y, p.color, 1, P.ink);
      } else {
        rect(ctx, x, y, 1, 1, p.color);
      }
    }
    ctx.globalAlpha = 1;
  }
}
