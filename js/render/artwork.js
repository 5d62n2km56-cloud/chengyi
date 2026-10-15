// 作品的 SVG 示意图：只在浏览器不支持 WebGL 时使用，并写进实物需求单。
// 正常情况下，工坊与照片都用写实三维（见 studio.js、photo.js）。

import { CRAFT_NAMES, colorOf, defaultState } from '../data/crafts.js';
import { esc } from '../core/dom.js';

let counter = 0;

const wrap = (craft, content, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 420" role="img" aria-label="${esc(CRAFT_NAMES[craft] || '作品')}示意"><defs>${defs}</defs>${content}</svg>`;

const CERAMIC_PATHS = {
  vase: 'M143 55 Q139 72 147 95 L147 131 C147 153 101 170 96 235 Q80 319 118 356 Q180 376 242 356 Q280 319 264 235 C259 170 213 153 213 131 L213 95 Q221 72 217 55 Z',
  bowl: 'M57 190 Q180 171 303 190 C296 260 266 316 215 335 L215 349 Q180 359 145 349 L145 335 C94 316 64 260 57 190Z',
  jar: 'M128 105 Q180 90 232 105 L238 133 Q271 156 281 215 Q298 310 241 352 Q180 369 119 352 Q62 310 79 215 Q89 156 122 133Z',
};

function ceramic(s, step, p) {
  const path = CERAMIC_PATHS[s.shape] || CERAMIC_PATHS.vase;
  const color = colorOf('ceramic', s.color)?.hex || '#9ab9a5';
  const base = step === 0 ? '#b79d7a' : color;
  const mouthRx = s.shape === 'bowl' ? 122 : s.shape === 'jar' ? 52 : s.width < 1 ? 29 : 37;
  const mouthY = s.shape === 'bowl' ? 190 : s.shape === 'jar' ? 105 : 55;
  let motif = '';
  if (s.pattern !== 'plain' && step > 0) {
    const ink = 'fill="none" stroke="#eef0d4" stroke-opacity=".65"';
    if (s.pattern === 'flower') {
      for (let i = 0; i < 5; i++) {
        const petals = Array.from({ length: 8 }, (_, j) => `<ellipse rx="6" ry="17" cy="-12" transform="rotate(${j * 45})"/>`).join('');
        motif += `<g transform="translate(${85 + i * 48} 252)"><g ${ink} stroke-width="2">${petals}<circle r="5"/></g></g>`;
      }
    }
    if (s.pattern === 'cloud') {
      for (let i = 0; i < 3; i++) motif += `<path d="M${85 + i * 78} 250q-12-15 2-23q7-21 23-9q24-7 28 15q14 18-2 23h-41" ${ink} stroke-width="3"/>`;
    }
    if (s.pattern === 'geometry') {
      for (let i = 0; i < 7; i++) motif += `<path d="M${70 + i * 35} 220l18 28-18 28-18-28z" ${ink} stroke-width="2"/>`;
    }
  }
  const clayLines = step === 0
    ? Array.from({ length: 13 }, (_, i) => `<path d="M65 ${168 + i * 14}q115 17 230 0" fill="none" stroke="#604d3c" stroke-opacity=".13"/>`).join('')
    : '';
  const defs = `<linearGradient id="${p}g"><stop stop-color="#0a1d1a"/><stop offset=".22" stop-color="${base}"/><stop offset=".42" stop-color="${base}"/><stop offset=".5" stop-color="#e2e5cf" stop-opacity=".85"/><stop offset=".65" stop-color="${base}"/><stop offset="1" stop-color="#142e29"/></linearGradient><linearGradient id="${p}shine"><stop stop-color="#eff4da" stop-opacity=".28"/><stop offset="1" stop-color="#eff4da" stop-opacity="0"/></linearGradient><clipPath id="${p}clip"><path d="${path}"/></clipPath>`;
  return wrap('ceramic', `<ellipse cx="180" cy="377" rx="100" ry="14" fill="#041611" opacity=".5"/><g transform="translate(${180 * (1 - s.width)} 0) scale(${s.width} 1)"><path d="${path}" fill="url(#${p}g)" stroke="#abc4aa" stroke-opacity=".4"/><g clip-path="url(#${p}clip)">${motif}${clayLines}<path d="M135 107q-39 112-9 213" fill="none" stroke="url(#${p}shine)" stroke-width="16"/></g><ellipse cx="180" cy="${mouthY}" rx="${mouthRx}" ry="${s.shape === 'bowl' ? 16 : 6}" fill="#172e28" stroke="${base}" stroke-width="3"/><path d="M127 351q53 17 106 0" fill="none" stroke="#e4e0c1" stroke-opacity=".2" stroke-width="2"/></g>`, defs);
}

function paper(s, step, p) {
  const color = colorOf('paper', s.color)?.hex || '#bf563f';
  if (step < 2) {
    // 折叠状态：一张对折后的三角纸，第二道工序显示剪口
    const holes = step === 1
      ? '<path d="M174 165l-16 45 30-23zM173 241l-8 24 28-20zM213 210l-8 22 15-8z" fill="#12251e"/><circle cx="173" cy="299" r="7" fill="#12251e"/>'
      : '';
    return wrap('paper', `<ellipse cx="180" cy="380" rx="103" ry="12" fill="#061811" opacity=".5"/><path d="M178 63L298 355H73Z" fill="${color}" stroke="#eed7b0" stroke-opacity=".35"/><path d="M178 63L195 355H73Z" fill="#000" opacity=".1"/><path d="M178 63L182 355" stroke="#fff" stroke-opacity=".18"/>${holes}<path d="M92 337L280 337" stroke="#d5c5a2" stroke-opacity=".3" stroke-dasharray="3 6"/>`);
  }
  const base = s.shape === 'square'
    ? '<rect x="60" y="83" width="240" height="240" rx="2"/>'
    : s.shape === 'diamond'
      ? '<path d="M180 49L326 202 180 355 34 202Z"/>'
      : '<circle cx="180" cy="205" r="139"/>';
  let cuts = '';
  if (s.pattern !== 'plain') {
    const n = s.complexity < 0.9 ? 6 : s.complexity > 1.1 ? 12 : 10;
    const petal = s.pattern === 'geometry'
      ? '<path d="M0-55L19-82 0-118-19-82Z"/>'
      : s.pattern === 'cloud'
        ? '<path d="M-9-66q-19-15-5-29q-7-18 7-21q21-3 14 15q20 14 6 26q-6 10-22 9Z"/>'
        : '<ellipse cx="0" cy="-84" rx="13" ry="27"/>';
    for (let i = 0; i < n; i++) {
      cuts += `<g transform="translate(180 205) rotate(${i * 360 / n})" fill="#000">${petal}<circle cx="0" cy="-125" r="4"/></g>`;
    }
    cuts += '<circle cx="180" cy="205" r="17" fill="#000"/>';
    for (let i = 0; i < 6; i++) cuts += `<ellipse cx="180" cy="166" rx="6" ry="12" fill="#000" transform="rotate(${i * 60} 180 205)"/>`;
  }
  const defs = `<mask id="${p}cut"><rect width="360" height="420" fill="#000"/><g fill="#fff">${base}</g>${cuts}</mask>`;
  return wrap('paper', `<ellipse cx="180" cy="373" rx="103" ry="12" fill="#061811" opacity=".35"/><rect width="360" height="420" fill="${color}" mask="url(#${p}cut)"/><g fill="none" stroke="#fff" stroke-opacity=".08">${s.shape === 'round' ? '<circle cx="180" cy="205" r="132"/>' : ''}<path d="M180 75V335M50 205H310"/></g>`, defs);
}

const PREVIEW_ART = {
  textile: () => wrap('textile', '<path d="M100 77q80 32 160 0l18 245q-98 51-196 0z" fill="#355e66" stroke="#9dad98" stroke-opacity=".5"/><path d="M100 110q80 35 164 0M94 179q90 36 178 0M88 252q96 42 185 0" fill="none" stroke="#b5c8ae" stroke-width="5" opacity=".4"/><g fill="#bccaa7" opacity=".4">' + Array.from({ length: 5 }, (_, i) => `<path d="M${111 + i * 29} 200l11 17-11 17-11-17z"/>`).join('') + '</g>'),
  wood: () => wrap('wood', '<path d="M92 95q88-32 176 0l-9 232q-79 36-158 0Z" fill="#946f43" stroke="#b69a6b"/><path d="M115 103v213m28-218v223m31-225v225m31-225v224m29-220v213" stroke="#c9ad72" stroke-opacity=".35"/><path d="M114 316q66 19 130 0" stroke="#463b2d" stroke-width="5" fill="none"/><ellipse cx="180" cy="95" rx="87" ry="16" fill="#4b4931" stroke="#b89d6c" stroke-width="3"/>'),
  metal: () => wrap('metal', '<path d="M134 75h92l8 78q66 38 56 103q-8 85-56 97H126q-48-12-56-97q-10-65 56-103Z" fill="#638a8b" stroke="#b6aa73" stroke-width="3"/><path d="M82 213q98-56 196 0M91 295q89-45 178 0" stroke="#b6aa73" stroke-width="3" fill="none"/><g stroke="#b6aa73" fill="none" stroke-width="2">' + Array.from({ length: 5 }, (_, i) => `<path d="M${99 + i * 40} 220l20 40-20 35-20-35z"/>`).join('') + '</g><ellipse cx="180" cy="75" rx="46" ry="7" fill="#273d36" stroke="#b6aa73" stroke-width="3"/>'),
  pending: () => wrap('pending', '<circle cx="180" cy="200" r="98" fill="none" stroke="#8fab91" stroke-opacity=".3" stroke-dasharray="3 10"/><path d="M140 200h80m-40-40v80" stroke="#8fab91" stroke-opacity=".5"/><text x="180" y="333" text-anchor="middle" fill="#9db3a4" font-size="16">地区样品待补充</text>'),
};

export function artwork(craft, state = {}, { finished = false } = {}) {
  const p = `art${++counter}`;
  if (craft === 'ceramic' || craft === 'paper') {
    const s = { ...defaultState(craft), ...state };
    const step = finished ? 2 : s.step;
    return craft === 'ceramic' ? ceramic(s, step, p) : paper(s, step, p);
  }
  return (PREVIEW_ART[craft] || PREVIEW_ART.pending)();
}

// 三维不可用时的 PNG 导出
export async function artworkToPng(record) {
  const svg = artwork(record.craft, record.state, { finished: record.status === 'done' });
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1400;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#142925';
    ctx.fillRect(0, 0, 1080, 1400);
    ctx.drawImage(img, 0, 20, 1080, 1260);
    ctx.fillStyle = '#ede9db';
    ctx.textAlign = 'center';
    ctx.font = '48px "Songti SC", "STSong", serif';
    ctx.fillText(record.name, 540, 1310);
    ctx.fillStyle = '#a0b2ad';
    ctx.font = '26px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`承艺 · ${CRAFT_NAMES[record.craft]}`, 540, 1360);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('export failed');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
