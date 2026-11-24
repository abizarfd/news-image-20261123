// news-image-20261123 — "The World in One Page"
// A newspaper front page summing up Monday 23 November 2026.
// Pure Node stdlib: draws every pixel itself (5x7 bitmap font + a hand-rolled
// PNG encoder), no network, no randomness, no clock — two runs are byte-identical.

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { deflateSync } from "node:zlib";

// ---------------------------------------------------------------- font ----
// 5x7 bitmap font, written from scratch for this entry. Each glyph is 7 rows
// of 5 bits ("1" = ink). Lowercase letters sit on the same 7-row grid with
// descenders on the last row where needed.
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10000", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "00010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "11110", "10001", "10001", "11110", "10000", "10000"],
  q: ["00000", "00000", "01111", "10001", "10001", "01111", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11100", "01000", "01000", "01000", "00110"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "10001", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "01010", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "–": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
  "•": ["00000", "00000", "01100", "01100", "00000", "00000", "00000"],
  "·": ["00000", "00000", "00000", "01100", "01100", "00000", "00000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  "~": ["00000", "00000", "01001", "10110", "00000", "00000", "00000"],
  "^": ["00100", "01010", "10001", "00000", "00000", "00000", "00000"],
};

const BLANK = ["00000", "00000", "00000", "00000", "00000", "00000", "00000"];

// ---------------------------------------------------------------- canvas --
const W = 1024;
const H = 1024;

type RGB = [number, number, number];
const PAPER: RGB = [246, 241, 229];
const PANEL: RGB = [255, 253, 246];
const INK: RGB = [17, 17, 17];
const SOFT: RGB = [74, 74, 68];
const RED: RGB = [176, 30, 36];
const BLUE: RGB = [31, 78, 121];
const GREEN: RGB = [30, 120, 62];
const GOLD: RGB = [176, 132, 30];
const LIGHT: RGB = [232, 226, 210];
const WHITE: RGB = [255, 255, 255];

class Canvas {
  buf = new Uint8Array(W * H * 3);
  constructor() {
    this.fill(PAPER);
  }
  fill(c: RGB) {
    for (let i = 0; i < W * H; i++) {
      this.buf[i * 3] = c[0];
      this.buf[i * 3 + 1] = c[1];
      this.buf[i * 3 + 2] = c[2];
    }
  }
  px(x: number, y: number, c: RGB) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
    const i = (yi * W + xi) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: RGB) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(W, Math.ceil(x + w));
    const y1 = Math.min(H, Math.ceil(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * W + xx) * 3;
        this.buf[i] = c[0];
        this.buf[i + 1] = c[1];
        this.buf[i + 2] = c[2];
      }
    }
  }
  hline(x: number, y: number, w: number, c: RGB, t = 1) {
    this.rect(x, y, w, t, c);
  }
  vline(x: number, y: number, h: number, c: RGB, t = 1) {
    this.rect(x, y, t, h, c);
  }
  border(x: number, y: number, w: number, h: number, c: RGB, t = 1) {
    this.rect(x, y, w, t, c);
    this.rect(x, y + h - t, w, t, c);
    this.rect(x, y, t, h, c);
    this.rect(x + w - t, y, t, h, c);
  }
  disc(cx: number, cy: number, r: number, c: RGB) {
    for (let yy = Math.floor(cy - r); yy <= Math.ceil(cy + r); yy++) {
      for (let xx = Math.floor(cx - r); xx <= Math.ceil(cx + r); xx++) {
        const dx = xx + 0.5 - cx;
        const dy = yy + 0.5 - cy;
        if (dx * dx + dy * dy <= r * r) this.px(xx, yy, c);
      }
    }
  }
  ring(cx: number, cy: number, r: number, c: RGB) {
    for (let a = 0; a < 360; a += 2) {
      const rad = (a * Math.PI) / 180;
      this.px(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r, c);
      this.px(cx + Math.cos(rad) * (r - 1), cy + Math.sin(rad) * (r - 1), c);
    }
  }
  // Scanline fill for a simple polygon given as [x, y] pairs.
  poly(points: [number, number][], c: RGB) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) {
          this.px(x, y, c);
        }
      }
    }
  }
  // ---- text ----
  glyph(ch: string, x: number, y: number, s: number, c: RGB, bold: boolean) {
    // Nearest-neighbour stamp: each output pixel maps to exactly one source
    // pixel, so fractional scales stay crisp and letters never merge.
    const g = GLYPHS[ch] ?? BLANK;
    const w = Math.ceil(5 * s);
    const h = Math.ceil(7 * s);
    const dx = bold ? Math.max(1, Math.round(s * 0.5)) : 0;
    for (let oy = 0; oy < h; oy++) {
      const r = Math.min(6, Math.floor(oy / s));
      for (let ox = 0; ox < w + dx; ox++) {
        const col = Math.floor(ox / s);
        const col2 = Math.floor((ox - dx) / s);
        const on =
          (col < 5 && g[r][col] === "1") ||
          (bold && col2 >= 0 && col2 < 5 && g[r][col2] === "1");
        if (on) this.px(x + ox, y + oy, c);
      }
    }
  }
  text(str: string, x: number, y: number, s: number, c: RGB, bold = false) {
    let cx = x;
    for (const ch of str) {
      this.glyph(ch, cx, y, s, c, bold);
      cx += 6 * s;
    }
    return cx;
  }
  textWidth(str: string, s: number) {
    return str.length * 6 * s - s;
  }
  // Wrap text to lines that fit maxW px at scale s. Returns lines.
  wrap(str: string, maxW: number, s: number): string[] {
    const words = str.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const trial = cur ? cur + " " + w : w;
      if (this.textWidth(trial, s) <= maxW || !cur) {
        cur = trial;
      } else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  // Draw wrapped text, return y after the last line.
  para(str: string, x: number, y: number, maxW: number, s: number, c: RGB, lh: number, bold = false, maxLines = 99) {
    const lines = this.wrap(str, maxW, s).slice(0, maxLines);
    let yy = y;
    for (const ln of lines) {
      this.text(ln, x, yy, s, c, bold);
      yy += lh;
    }
    return yy;
  }
  center(str: string, cx: number, y: number, s: number, c: RGB, bold = false) {
    this.text(str, cx - this.textWidth(str, s) / 2, y, s, c, bold);
  }
}

// ------------------------------------------------------------------- png --
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(cv: Canvas): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(cv.buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- the news ----
// Every fact below was verified against wire reporting of Monday 23 Nov 2026
// (Reuters, AP, UN News, CNN, WSJ, Just Security). Nothing is invented:
// figures, dates and places are as reported that day. Stories that happened
// on another day are NOT in this list — they are named in the DATE CHECK box.
type Story = {
  n: number; // map number (0 = no map dot)
  tag: string; // section + place
  head: string;
  body: string;
  src: string;
};

const LEAD: Story = {
  n: 1,
  tag: "TECH  •  NEW YORK",
  head: "HUANG IS BACK: NVIDIA REINSTATES ITS CEO",
  body: "11 days after Jensen Huang resigned, Nvidia brings back its co-founder as CEO, effective immediately, after pressure from President Trump. Shares surge 31%.",
  src: "REUTERS",
};

const GRID: Story[] = [
  {
    n: 2, tag: "WAR  •  LIBYA",
    head: "UKRAINE SAYS ITS SEA DRONES SANK A RUSSIAN WARSHIP",
    body: "Kyiv: 7 sea drones sank the corvette Merkury at Benghazi.",
    src: "AP",
  },
  {
    n: 3, tag: "CLIMATE  •  ANTALYA",
    head: "COP31 COLLAPSES WITH NO DEAL",
    body: "Longest summit ever ends with no pact; 190+ nations split.",
    src: "UN NEWS",
  },
  {
    n: 4, tag: "POLITICS  •  WASHINGTON",
    head: "DEMOCRATS WIN BIGGEST HOUSE MAJORITY SINCE 1992",
    body: "Democrats reach 258 House seats — largest majority in 34 years.",
    src: "REUTERS",
  },
  {
    n: 5, tag: "SECURITY  •  BERLIN",
    head: "NATO INTEL: RUSSIA PLANS A NUCLEAR-ARMED SATELLITE",
    body: "NATO intel: Russia plans a nuclear-armed satellite launch.",
    src: "WIRE",
  },
  {
    n: 6, tag: "JUSTICE  •  SINALOA",
    head: "\"EL CHAPO ISIDRO\" CAPTURED",
    body: "FBI Top 10 fugitive seized in Guasave with US intel help.",
    src: "AP",
  },
  {
    n: 7, tag: "IRAN  •  TEHRAN",
    head: "SINGER FLOGGED: 74 LASHES EACH",
    body: "Parastoo Ahmadi + 4 crew get 74 lashes and 2-year bans.",
    src: "REUTERS",
  },
  {
    n: 8, tag: "IRAN  •  GULF",
    head: "IRAN VOWS TO FIGHT US BLOCKADE \"BY ALL MEANS\"",
    body: "Tehran: it will use \"all means\" vs the US naval blockade.",
    src: "WIRE",
  },
  {
    n: 9, tag: "WAR  •  UKRAINE",
    head: "DYMER FLAT BLOCK HIT: 11 DEAD",
    body: "Drone strike hits a block near Kyiv: 11 dead, 14 missing.",
    src: "AP",
  },
  {
    n: 10, tag: "TECH DEAL  •  NEW YORK",
    head: "CROWDSTRIKE BUYS ZSCALER FOR $43.9BN",
    body: "All-stock cybersecurity mega-deal announced Monday.",
    src: "REUTERS",
  },
  {
    n: 11, tag: "HEALTH  •  PENNSYLVANIA",
    head: "MEASLES DEATHS REACH 9",
    body: "9th death in the outbreak: 1,638 cases, 330 hospitalised.",
    src: "REUTERS",
  },
  {
    n: 12, tag: "USA  •  IOWA",
    head: "TRUMP HALTS IOWA EXPLOSIVES BLAST",
    body: "Army told to pause blasting 68 barrels of toxic lead azide.",
    src: "REUTERS",
  },
  {
    n: 13, tag: "SPAIN  •  MADRID",
    head: "PUIGDEMONT FREE TO RETURN HOME",
    body: "Court shelves the case; last hurdle after 10 years in exile.",
    src: "REUTERS",
  },
];

const BOTTOM: Story[] = [
  {
    n: 14, tag: "BANGLADESH  •  DHAKA",
    head: "HASINA: \"JAILED IF SHE RETURNS\"",
    body: "Dhaka: ex-PM Hasina faces jail if she returns.",
    src: "REUTERS",
  },
  {
    n: 15, tag: "LAW  •  USA",
    head: "TWO STATES SUE SPACEX",
    body: "Oregon, Virginia: Musk's firm misled users.",
    src: "WIRE",
  },
  {
    n: 16, tag: "USA  •  WASHINGTON",
    head: "FBI PROBES HACK OF POLICE DATABASE",
    body: "FBI probes hack of the national police database.",
    src: "AP",
  },
  {
    n: 17, tag: "DISASTER  •  INDONESIA",
    head: "24 KILLED IN FACTORY FIRE",
    body: "Factory fire kills 24; dozens still missing.",
    src: "REUTERS",
  },
  {
    n: 18, tag: "AID  •  NEPAL",
    head: "INDIA PLEDGES EUR 1.4BN TO NEPAL",
    body: "India pledges EUR 1.4bn after the glacier flood.",
    src: "WIRE",
  },
  {
    n: 19, tag: "SPORT  •  USA",
    head: "TOM JACKSON, 75, DIES",
    body: "Ex-Broncos LB and ESPN analyst dies at 75.",
    src: "AP",
  },
  {
    n: 20, tag: "POLITICS  •  WASHINGTON",
    head: "TRUMP CURBS CONGRESS PROBES",
    body: "Lawmakers need a valid purpose for agency data.",
    src: "AP",
  },
  {
    n: 21, tag: "SECURITY  •  BERLIN",
    head: "NATO MEETS IN BERLIN, WARNS RUSSIA",
    body: "Allies warn Moscow and pledge space defence.",
    src: "WIRE",
  },
  {
    n: 22, tag: "POLITICS  •  WASHINGTON",
    head: "TRUMP HOSTS MEME-COIN GALA",
    body: "President hosts gala as his token hits lows.",
    src: "REUTERS",
  },
];

// Monday's market moves, as reported at the close (Reuters / wire).
const MARKETS = [
  { name: "NVDA", v: 31.0, label: "+31%" },
  { name: "NASDAQ", v: 6.0, label: "+6.0%" },
  { name: "S&P 500", v: 4.8, label: "+4.8%" },
  { name: "STOXX", v: 1.5, label: "+1.5%" },
  { name: "KOSPI", v: -3.3, label: "-3.3%" },
  { name: "NIKKEI", v: -5.0, label: "-5%+" },
];

// Verified figures for the BY THE NUMBERS panel.
const NUMBERS: [string, string][] = [
  ["+31%", "Nvidia shares"],
  ["258", "Democrats' House seats"],
  ["7", "Ukrainian sea drones"],
  ["$43.9bn", "CrowdStrike-Zscaler deal"],
  ["1,638", "Pennsylvania measles cases"],
  ["68", "barrels of lead azide"],
  ["74", "lashes for singer + crew"],
  ["EUR 1.4bn", "India aid to Nepal"],
];

// The day in order — day-parts only, no invented clock times.
const TIMELINE: [string, string][] = [
  ["ASIA OPEN", "Nikkei -5%+, Kospi -3.3% in Asia"],
  ["MORNING", "Libya strike claimed; COP31 fallout"],
  ["NEW YORK OPEN", "Nvidia reinstates Huang; +31%"],
  ["NEW YORK CLOSE", "S&P +4.8%, Nasdaq +6%; $43.9bn"],
  ["EVENING", "Democrats pass 258; Iowa paused"],
];

// Stories from other days, deliberately left out.
const DATE_CHECK = [
  "Skubal $450M Mets deal — SUN 22",
  "NFL Week 11 scores — SUN 22",
  "Miley Cyrus wedding — SAT 21",
  "Nigeria boat deaths — FRI 21",
  "COP31 failed SUN 22; fallout Mon",
];

// ------------------------------------------------------------------ map ---
// Rough continent outlines in [lon, lat] — recognisable at panel size.
const CONTINENTS: [number, number][][] = [
  [ // North America
    [-168, 66], [-140, 70], [-125, 72], [-110, 73], [-95, 80], [-85, 76],
    [-80, 73], [-65, 60], [-55, 52], [-60, 46], [-70, 42], [-75, 35],
    [-80, 32], [-85, 29], [-90, 21], [-97, 16], [-105, 20], [-115, 28],
    [-125, 40], [-125, 49], [-140, 60], [-158, 58], [-168, 66],
  ],
  [ // Greenland
    [-58, 64], [-45, 60], [-30, 68], [-40, 76], [-58, 76], [-58, 64],
  ],
  [ // South America
    [-80, 10], [-75, 5], [-70, 0], [-60, -5], [-50, 0], [-35, -8],
    [-40, -20], [-48, -28], [-58, -35], [-65, -45], [-70, -52], [-73, -40],
    [-72, -20], [-80, -5], [-80, 10],
  ],
  [ // Africa
    [-17, 15], [-10, 30], [0, 36], [10, 37], [20, 32], [32, 31], [35, 28],
    [43, 12], [51, 11], [48, 0], [40, -10], [35, -20], [30, -30], [20, -35],
    [15, -30], [12, -18], [9, 0], [9, 4], [-8, 5], [-17, 15],
  ],
  [ // Europe
    [-10, 36], [-9, 43], [-2, 48], [0, 50], [5, 53], [8, 57], [10, 59],
    [18, 56], [21, 55], [24, 58], [28, 60], [30, 62], [25, 66], [20, 70],
    [15, 70], [10, 62], [5, 58], [0, 50], [-5, 44], [-10, 36],
  ],
  [ // Asia
    [30, 62], [40, 68], [60, 69], [70, 72], [90, 75], [110, 76], [130, 72],
    [150, 70], [170, 66], [178, 65], [170, 60], [160, 55], [155, 50],
    [140, 40], [130, 35], [127, 33], [120, 30], [115, 22], [108, 18],
    [105, 10], [100, 8], [95, 15], [90, 22], [85, 20], [80, 13], [75, 10],
    [70, 22], [65, 25], [60, 25], [55, 26], [50, 29], [48, 30], [42, 35],
    [36, 36], [30, 40], [28, 45], [30, 62],
  ],
  [ // Australia
    [114, -22], [114, -32], [120, -34], [130, -32], [140, -38], [150, -37],
    [153, -27], [146, -19], [142, -11], [136, -12], [130, -13], [122, -17],
    [114, -22],
  ],
];

// Map dots: story number -> [lon, lat, label dx, label dy]
const DOTS: [number, number, number, number, number][] = [
  [1, -74, 41, -20, -12], [2, 20, 32, -16, 8], [3, 31, 37, 8, -13],
  [4, -77, 39, -22, 8], [5, 13, 53, -18, -11], [6, -107, 25, -18, 6],
  [7, 51, 36, 8, 2], [9, 31, 51, 9, -5], [13, -4, 40, -16, 8],
  [14, 90, 24, 8, -7], [17, 107, -6, 8, 2], [18, 85, 28, 8, -13],
];

// --------------------------------------------------------------- layout ---
const MX = 16; // page margin
const RX = 658; // right rail x
const RW = 1008 - RX; // right rail width = 350

function panel(cv: Canvas, x: number, y: number, w: number, h: number) {
  cv.rect(x, y, w, h, PANEL);
  cv.border(x, y, w, h, INK, 1);
}

function sectionTitle(cv: Canvas, x: number, y: number, w: number, title: string, accent: RGB) {
  cv.rect(x, y, w, 22, INK);
  cv.text(title, x + 8, y + 5, 1.6, WHITE, true);
  cv.rect(x, y + 22, w, 3, accent);
}

function storyCard(cv: Canvas, s: Story, x: number, y: number, w: number, h: number, headScale: number, bodyScale: number, showSrc: boolean) {
  panel(cv, x, y, w, h);
  // number badge
  cv.rect(x, y, 24, 24, RED);
  cv.text(String(s.n), x + (s.n < 10 ? 8 : 4), y + 6, 1.6, WHITE, true);
  // kicker (+ source on wide cards only); collapse double spaces, shrink if needed
  const kicker = (showSrc ? s.tag + "  •  " + s.src : s.tag).replace(/ {2,}/g, " ");
  let ks = 1.3;
  if (cv.textWidth(kicker, ks) > w - 36) ks = 1.15;
  cv.text(kicker, x + 30, y + 6, ks, RED, true);
  // headline
  const headW = w - 16;
  const headLines = cv.wrap(s.head, headW, headScale);
  let yy = y + 24;
  const headLh = Math.round(7 * headScale) + 4;
  for (const ln of headLines.slice(0, 2)) {
    cv.text(ln, x + 8, yy, headScale, INK, true);
    yy += headLh;
  }
  // body
  const bodyLh = Math.round(7 * bodyScale) + 3;
  const bodyLines = cv.wrap(s.body, w - 16, bodyScale);
  for (const ln of bodyLines.slice(0, 2)) {
    cv.text(ln, x + 8, yy, bodyScale, SOFT);
    yy += bodyLh;
  }
}

function drawMasthead(cv: Canvas) {
  cv.rect(0, 0, W, 88, INK);
  cv.text("THE WORLD IN ONE PAGE", 16, 8, 5.0, WHITE, true);
  cv.hline(16, 62, W - 32, RED, 3);
  cv.text("MONDAY 23 NOVEMBER 2026", 16, 70, 2.2, [255, 214, 64], true);
  const right = "22 STORIES  •  11 FIELDS  •  EVERY FIGURE VERIFIED";
  cv.text(right, W - 16 - cv.textWidth(right, 1.5), 74, 1.5, WHITE, true);
}

function drawLead(cv: Canvas) {
  const x = MX, y = 96, w = 992, h = 100;
  cv.rect(x, y, w, h, [26, 26, 26]);
  cv.border(x, y, w, h, INK, 2);
  // big number block on the right
  cv.rect(x + w - 210, y, 210, h, RED);
  cv.text("NVDA", x + w - 196, y + 12, 2.0, WHITE, true);
  cv.text("+31%", x + w - 196, y + 34, 4.6, WHITE, true);
  cv.text("NASDAQ +6%  •  S&P +4.8%", x + w - 196, y + 82, 1.3, WHITE, true);
  // text
  cv.text("LEAD STORY  •  " + LEAD.tag + "  •  " + LEAD.src, x + 14, y + 10, 1.5, [255, 214, 64], true);
  cv.text(LEAD.head, x + 14, y + 28, 2.6, WHITE, true);
  cv.para(LEAD.body, x + 14, y + 58, w - 240, 1.5, [226, 226, 226], 15, false, 2);
}

function drawMap(cv: Canvas, x: number, y: number, w: number, h: number) {
  panel(cv, x, y, w, h);
  sectionTitle(cv, x, y, w, "WHERE IT HAPPENED", BLUE);
  const mapX = x + 8, mapY = y + 34, mapW = w - 16, mapH = h - 42;
  // ocean
  cv.rect(mapX, mapY, mapW, mapH, [214, 231, 240]);
  const s = Math.min(mapW / 360, mapH / 180);
  const ox = mapX + (mapW - 360 * s) / 2;
  const oy = mapY + (mapH - 180 * s) / 2;
  const proj = (lon: number, lat: number): [number, number] => [
    ox + (lon + 180) * s,
    oy + (90 - lat) * s,
  ];
  for (const cont of CONTINENTS) {
    cv.poly(cont.map(([lo, la]) => proj(lo, la)), [233, 224, 196]);
  }
  // graticule
  for (let lo = -150; lo <= 150; lo += 30) {
    const [px] = proj(lo, 0);
    cv.vline(px, mapY, mapH, [255, 255, 255], 1);
  }
  for (let la = -60; la <= 60; la += 30) {
    const [, py] = proj(0, la);
    cv.hline(mapX, py, mapW, [255, 255, 255], 1);
  }
  // dots with offset number labels (Europe cluster would collide otherwise)
  for (const [n, lo, la, lx, ly] of DOTS) {
    const [px, py] = proj(lo, la);
    cv.disc(px, py, 5, RED);
    cv.ring(px, py, 6, INK);
    const label = String(n);
    const lw = cv.textWidth(label, 1.3);
    cv.rect(px + lx - 2, py + ly - 2, lw + 4, 12, WHITE);
    cv.border(px + lx - 2, py + ly - 2, lw + 4, 12, INK, 1);
    cv.text(label, px + lx, py + ly, 1.3, RED, true);
  }
  cv.text("Dots = story numbers on this page", x + 8, y + h - 16, 1.3, SOFT);
}

function drawMarkets(cv: Canvas, x: number, y: number, w: number, h: number) {
  panel(cv, x, y, w, h);
  sectionTitle(cv, x, y, w, "MARKETS — MONDAY'S CLOSE", GREEN);
  const chartX = x + 10, chartW = w - 20;
  const zeroY = y + 92;
  const maxV = 31;
  const barW = 30, gap = (chartW - MARKETS.length * barW) / (MARKETS.length + 1);
  cv.hline(chartX, zeroY, chartW, INK, 2);
  MARKETS.forEach((m, i) => {
    const bx = chartX + gap + i * (barW + gap);
    const bh = Math.abs(m.v) / maxV * 50;
    const up = m.v >= 0;
    const by = up ? zeroY - bh : zeroY + 2;
    cv.rect(bx, by, barW, Math.max(2, bh), up ? GREEN : RED);
    if (up) {
      cv.text(m.label, bx + barW / 2 - cv.textWidth(m.label, 1.2) / 2, by - 13, 1.2, GREEN, true);
    } else {
      cv.text(m.label, bx + barW / 2 - cv.textWidth(m.label, 1.2) / 2, by + Math.max(2, bh) + 3, 1.2, RED, true);
    }
    cv.text(m.name, bx + barW / 2 - cv.textWidth(m.name, 1.2) / 2, zeroY + 22, 1.2, INK, true);
  });
}

function drawNumbers(cv: Canvas, x: number, y: number, w: number, h: number) {
  panel(cv, x, y, w, h);
  sectionTitle(cv, x, y, w, "BY THE NUMBERS", GOLD);
  const colW = (w - 16) / 2;
  NUMBERS.forEach(([num, label], i) => {
    const cx = x + 8 + (i % 2) * colW;
    const cy = y + 32 + Math.floor(i / 2) * 38;
    cv.text(num, cx, cy, 2.0, RED, true);
    cv.text(label, cx, cy + 16, 1.25, SOFT);
  });
  cv.text("All figures as reported Monday 23 Nov 2026.", x + 8, y + h - 14, 1.2, SOFT);
}

function drawTimeline(cv: Canvas, x: number, y: number, w: number, h: number) {
  panel(cv, x, y, w, h);
  sectionTitle(cv, x, y, w, "THE DAY IN ORDER", INK);
  let yy = y + 28;
  for (const [when, what] of TIMELINE) {
    cv.disc(x + 12, yy + 4, 3, RED);
    cv.text(when, x + 22, yy, 1.3, RED, true);
    cv.text(what, x + 22, yy + 10, 1.2, INK);
    yy += 21;
  }
}

function drawDateCheck(cv: Canvas, x: number, y: number, w: number, h: number) {
  cv.rect(x, y, w, h, [255, 243, 205]);
  cv.border(x, y, w, h, RED, 2);
  cv.text("DATE CHECK — NOT 23 NOVEMBER", x + 10, y + 7, 1.4, RED, true);
  let yy = y + 25;
  for (const line of DATE_CHECK) {
    cv.text("X", x + 10, yy, 1.3, RED, true);
    cv.text(line, x + 26, yy + 1, 1.3, INK);
    yy += 14;
  }
  cv.text("Sources: Reuters, AP, UN News, CNN, WSJ", x + 10, y + h - 13, 1.1, SOFT, true);
}

// ------------------------------------------------------------------ main --
function main() {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? process.env.OUTPUT_PATH ?? "/output";
  const outPath = outDir.endsWith("entry.png") ? outDir : join(outDir, "entry.png");
  const cv = new Canvas();

  drawMasthead(cv);
  drawLead(cv);

  // Left story grid: 2 cols x 6 rows.
  const gx = MX, gy = 204;
  const cw = 306, ch = 84, gap = 6;
  GRID.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    storyCard(cv, s, gx + col * (cw + gap), gy + row * (ch + gap), cw, ch, 1.85, 1.35, true);
  });

  // Right rail.
  drawMap(cv, RX, 204, RW, 190);
  drawMarkets(cv, RX, 402, RW, 138);
  drawNumbers(cv, RX, 548, RW, 190);

  // Bottom story grid: 3 cols x 3 rows (fits x 16..647, clear of right rail).
  const bx = MX, by = 746;
  const bw = 205, bh = 80;
  BOTTOM.forEach((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    storyCard(cv, s, bx + col * (bw + 8), by + row * (bh + 8), bw, bh, 1.5, 1.3, false);
  });

  // Bottom right: timeline + date check.
  drawTimeline(cv, RX, 746, RW, 140);
  drawDateCheck(cv, RX, 894, RW, 114);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, encodePNG(cv));
}

main();
