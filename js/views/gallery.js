// 我的作品：全部 / 制作中 / 已完成。每件作品是一张摄影棚照片；继续创作、分享、实物制作、删除。

import { $, $$, esc, setPressed, toast } from '../core/dom.js';
import { emit, on } from '../core/bus.js';
import { currentView } from '../core/router.js';
import * as store from '../core/store.js';
import * as session from '../core/session.js';
import { CRAFTS, CRAFT_NAMES } from '../data/crafts.js';
import { fillPhoto } from '../render/photo.js';
import { confirmAction, openOrder, openShare } from './dialogs.js';

let filter = 'all';

const STARTERS = [
  { craft: 'ceramic', title: '从一只瓷瓶开始', note: '拉坯 · 施釉 · 入窑', state: { shape: 'vase', color: 'jade', pattern: 'flower', width: 1, complexity: 1, step: 2 } },
  { craft: 'paper', title: '从一张红纸开始', note: '折纸 · 剪刻 · 展开', state: { shape: 'round', color: 'red', pattern: 'flower', width: 1, complexity: 1, step: 2 } },
];

function render() {
  const items = store.records()
    .filter(r => filter === 'all' || r.status === filter)
    .sort((a, b) => b.updated - a.updated);
  const grid = $('gallery-grid');
  if (!items.length) {
    grid.innerHTML = `<div class="gallery-empty">
        <p>${filter === 'all' ? '还没有作品。挑一个起点吧。' : '这里暂时没有这类作品。'}</p>
        <div class="start-tiles">${STARTERS.map((s, i) => `<button class="start-tile" data-start="${s.craft}">
          <span class="card-photo"><img data-starter="${i}" alt=""></span>
          <b>${s.title}</b><small>${CRAFTS[s.craft].title} · ${s.note}</small></button>`).join('')}</div>
      </div>`;
    $$('[data-starter]', grid).forEach(img => {
      const s = STARTERS[Number(img.dataset.starter)];
      fillPhoto(img, s.craft, s.state, { finished: true });
    });
    return;
  }
  grid.innerHTML = items.map((r, i) => `<article class="work-card" style="animation-delay:${Math.min(i, 8) * 60}ms">
      <div class="card-photo"><img data-photo="${esc(r.id)}" alt="${esc(r.name)}"><span class="card-status ${r.status === 'done' ? 'done' : ''}">${r.status === 'done' ? '已完成' : '制作中'}</span></div>
      <h3 class="card-name">${esc(r.name)}</h3>
      <p class="card-meta">${CRAFT_NAMES[r.craft]} · ${new Date(r.updated).toLocaleDateString('zh-CN')}</p>
      <div class="card-actions">
        <button data-edit="${esc(r.id)}">继续创作</button>
        <button data-share="${esc(r.id)}">分享</button>
        ${r.status === 'done' ? `<button data-order="${esc(r.id)}">实物制作</button>` : ''}
        <button class="delete" data-delete="${esc(r.id)}" aria-label="删除「${esc(r.name)}」">删除</button>
      </div>
    </article>`).join('');
  $$('[data-photo]', grid).forEach(img => {
    const r = store.findRecord(img.dataset.photo);
    if (r) fillPhoto(img, r.craft, r.state, { finished: r.status === 'done' });
  });
}

export function initGallery({ openCreate }) {
  $$('[data-filter]').forEach(b => b.addEventListener('click', () => {
    filter = b.dataset.filter;
    setPressed('[data-filter]', x => x === b);
    render();
  }));
  $('gallery-grid').addEventListener('click', async e => {
    const start = e.target.closest('[data-start]');
    if (start) { session.newWork(start.dataset.start); openCreate(start.dataset.start); return; }
    const b = e.target.closest('[data-edit],[data-share],[data-order],[data-delete]');
    if (!b) return;
    const record = store.findRecord(b.dataset.edit || b.dataset.share || b.dataset.order || b.dataset.delete);
    if (!record) return;
    if (b.dataset.edit) {
      session.loadRecord(record);
      openCreate(record.craft);
      emit('say', `接着「${record.name}」继续。器形、颜色与纹样都还在。`);
    } else if (b.dataset.share) openShare(record);
    else if (b.dataset.order) openOrder(record);
    else if (b.dataset.delete) {
      const ok = await confirmAction(`删除「${record.name}」？`, '本原型没有回收站，删除后无法恢复。', '删除');
      if (ok) { store.removeRecord(record.id); toast('作品已删除'); }
    }
  });
  on('view', ({ view }) => { if (view === 'gallery') render(); });
  on('records', () => { if (currentView() === 'gallery') render(); });
}
