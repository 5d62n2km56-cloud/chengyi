// 作品照片：用离屏摄影棚把作品「拍」成一张图，供作品卡片、产地样品、命名与分享浮层、导出图片使用。
// 与创作台同一套造型和灯光，所以照片里看到的就是工坊里做出来的那件。三维不可用时退回 SVG 示意图。

import { createStudio } from './studio.js';
import { artwork } from './artwork.js';

let studio = null;
let failed = false;
const cache = new Map();
let queue = Promise.resolve();

function ensure() {
  if (studio || failed) return studio;
  const canvas = document.createElement('canvas');
  studio = createStudio(canvas, { interactive: false, preserve: true, pixelRatio: 1 });
  if (!studio) failed = true;
  return studio;
}

const svgUrl = (craft, state, finished) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(artwork(craft, state, { finished }))}`;

// 返回 Promise<url>。同一件作品、同一尺寸只拍一次
export function photo(craft, state, { finished = false, width = 720, height = 900, variant } = {}) {
  const s = finished && state ? { ...state, step: 2 } : state;
  const key = `${craft}|${variant || ''}|${JSON.stringify(s)}|${width}x${height}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  const job = queue.then(() => new Promise(resolve => {
    // 让出主线程，避免一次生成多张时卡住界面
    setTimeout(() => {
      let url;
      try {
        const st = ensure();
        if (!st) url = svgUrl(craft, s, finished);
        else {
          st.show(craft, s, { variant });
          url = st.snapshot(width, height);
        }
      } catch (e) {
        url = svgUrl(craft, s, finished);
      }
      cache.set(key, url);
      if (cache.size > 60) cache.delete(cache.keys().next().value);
      resolve(url);
    }, 0);
  }));
  queue = job;
  return job;
}

// 把照片填进页面里带 data-photo 的 <img>
export function fillPhoto(img, craft, state, opts) {
  const token = `${craft}|${JSON.stringify(state)}|${opts?.finished}|${opts?.variant || ''}`;
  img.dataset.token = token;
  img.classList.remove('ready');
  return photo(craft, state, opts).then(url => {
    if (img.dataset.token !== token) return;
    img.src = url;
    img.decode?.().catch(() => {}).finally(() => img.classList.add('ready'));
    if (!img.decode) img.classList.add('ready');
  });
}

// 导出：照片 + 题名
export async function photoPng(record) {
  const url = await photo(record.craft, record.state, { finished: record.status === 'done', width: 1080, height: 1200 });
  const img = new Image();
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f3eee5';
  ctx.fillRect(0, 0, 1080, 1440);
  ctx.drawImage(img, 0, 0, 1080, 1200);
  ctx.fillStyle = '#1d1b18';
  ctx.textAlign = 'left';
  ctx.font = '52px "Songti SC", "STSong", serif';
  ctx.fillText(record.name, 72, 1300);
  ctx.fillStyle = '#857d70';
  ctx.font = '26px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(`承艺 · ${record.craftName || ''}`, 72, 1354);
  ctx.fillStyle = '#9f2e1d';
  ctx.fillRect(1080 - 72 - 56, 1262, 56, 56);
  ctx.fillStyle = '#f3eee5';
  ctx.font = '34px "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText('承', 1080 - 72 - 28, 1302);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('export failed');
  return blob;
}
