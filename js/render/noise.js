// 2D simplex 噪声与分形叠加，供地形生成使用。固定种子，保证每次打开山河一致。

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];

function buildPerm(seed) {
  const p = Array.from({ length: 256 }, (_, i) => i);
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

const perm = buildPerm(20261014);

export function simplex(xin, yin) {
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s), j = Math.floor(yin + s);
  const t = (i + j) * G2;
  const x0 = xin - (i - t), y0 = yin - (j - t);
  const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  const ii = i & 255, jj = j & 255;
  let n = 0;
  const corner = (x, y, g) => {
    let tt = 0.5 - x * x - y * y;
    if (tt < 0) return 0;
    tt *= tt;
    return tt * tt * (GRAD[g][0] * x + GRAD[g][1] * y);
  };
  n += corner(x0, y0, perm[ii + perm[jj]] & 7);
  n += corner(x1, y1, perm[ii + i1 + perm[jj + j1]] & 7);
  n += corner(x2, y2, perm[ii + 1 + perm[jj + 1]] & 7);
  return 70 * n; // 约 -1..1
}

export function fbm(x, y, octaves = 5) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * simplex(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

// 山脊型噪声：0..1，尖锐的峰线
export function ridged(x, y, octaves = 5) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0, prev = 1;
  for (let o = 0; o < octaves; o++) {
    let n = 1 - Math.abs(simplex(x * freq, y * freq));
    n *= n;
    sum += n * amp * prev;
    prev = n;
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum / norm;
}

export const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const mix = (a, b, t) => a + (b - a) * t;
