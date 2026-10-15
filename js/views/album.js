// 册页抽屉：任何场景可打开，不离开当前上下文；可定位并高亮到具体段落。

import { $, esc } from '../core/dom.js';
import { on } from '../core/bus.js';
import { CRAFT_NAMES } from '../data/crafts.js';
import { ALBUM, SECTION_NAMES, SOURCES, findParagraph } from '../data/album.js';

let craft = 'ceramic';
let section = 'history';
let highlight = null;
let lastFocus = null;

function sourceHtml(key) {
  const src = SOURCES[key];
  if (!src) return '<span>待补充</span>';
  return src.url
    ? `<a href="${src.url}" target="_blank" rel="noopener noreferrer">${esc(src.title)} ↗</a>`
    : `<span>${esc(src.title)}</span>`;
}

function render() {
  const album = ALBUM[craft];
  $('album-title').textContent = CRAFT_NAMES[craft];
  $('album-lede').textContent = album.lede;
  $('album-crafts').innerHTML = Object.keys(ALBUM).map(c =>
    `<button data-album-craft="${c}" aria-pressed="${c === craft}">${CRAFT_NAMES[c]}</button>`).join('');
  const sections = Object.keys(album.sections);
  if (!sections.includes(section)) section = sections[0];
  $('album-tabs').innerHTML = sections.map(s =>
    `<button role="tab" data-album-section="${s}" aria-selected="${s === section}">${SECTION_NAMES[s]}</button>`).join('');
  const paras = album.sections[section] || [];
  $('album-body').innerHTML = paras.length
    ? paras.map(p => `<div class="album-para ${p.id === highlight ? 'highlight' : ''}" id="album-${p.id}">
        <p>${esc(p.text)}</p><div class="album-src">${sourceHtml(p.src)}</div></div>`).join('')
    : '<p class="album-empty">这一栏还没有收录内容。</p>';
  if (Object.keys(album.sections).length === 1) {
    $('album-body').insertAdjacentHTML('beforeend', '<p class="album-empty">该品类在线工坊尚未开放，册页内容待补充。</p>');
  }
  if (highlight) $(`album-${highlight}`)?.scrollIntoView({ block: 'center' });
}

export function openAlbum({ craft: c, id } = {}) {
  if (c && ALBUM[c]) craft = c;
  highlight = null;
  if (id) {
    const found = findParagraph(craft, id);
    if (found) { section = found.section; highlight = id; }
  }
  if ($('album').hidden) lastFocus = document.activeElement;
  $('album').hidden = false;
  render();
  $('album-close').focus({ preventScroll: true });
}

export function closeAlbum() {
  $('album').hidden = true;
  lastFocus?.focus?.({ preventScroll: true });
}

export function initAlbum({ currentCraft }) {
  $('album-button').addEventListener('click', () => ($('album').hidden ? openAlbum({ craft: currentCraft() }) : closeAlbum()));
  $('album-close').addEventListener('click', closeAlbum);
  $('album-crafts').addEventListener('click', e => {
    const b = e.target.closest('[data-album-craft]');
    if (b) { craft = b.dataset.albumCraft; highlight = null; render(); }
  });
  $('album-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-album-section]');
    if (b) { section = b.dataset.albumSection; highlight = null; render(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('album').hidden && !document.querySelector('dialog[open]')) closeAlbum(); });
  on('album', detail => openAlbum(detail));
}
