// 山河寻艺：实时三维山河。三级视图：地域总览 → 产地聚焦（镜头飞往 + 产地卡）→ 工坊入口。
// 地名注记每帧从三维位置投影到屏幕；拖动不误触地点；点空白收起卡片；滚轮调远近。

import * as THREE from 'three';
import { $, esc } from '../core/dom.js';
import { emit, on } from '../core/bus.js';
import { currentView } from '../core/router.js';
import { reducedMotion } from '../core/settings.js';
import * as store from '../core/store.js';
import * as session from '../core/session.js';
import { CRAFTS, CRAFT_NAMES } from '../data/crafts.js';
import { ALL_REGIONS, SAMPLES, sampleOf, sampleState } from '../data/regions.js';
import { createLandscape } from '../render/landscape.js';
import { fillPhoto } from '../render/photo.js';
import { play } from '../fx/sound.js';

const HOLD_MS = 1200;
const LABEL_LIFT = new THREE.Vector3(0, 2, 0);

const DESCRIPTIONS = {
  ceramic: '看器物的形与色，与 AI 一起选择器型、釉色和纹样，体验一件瓷器从泥坯到出窑。',
  paper: '从一张纸开始。与 AI 一起选择纸形和纹样，经历折纸、剪刻与展开。',
  pending: '这个地区的入口已预留，样品和核验资料尚待补充。可先探索已点亮的地点。',
  preview: '先欣赏材料与形态。这个品类暂未开放在线创作，可以去瓷器或剪纸工坊。',
};

let level = 'overview';
let region = null;
let craft = 'ceramic';
let land = null;
let onEnter = () => {};
let onResume = () => {};
const labels = new Map();

export const getLandscape = () => land;

// —— 地点题签 ——
function buildPoints() {
  $('map-points').innerHTML = SAMPLES.map(s => {
    const open = !!CRAFTS[s.crafts[0]];
    const names = s.crafts.map(x => CRAFT_NAMES[x]).join(' · ');
    return `<button class="place offscreen ${open ? '' : 'preview'}" data-region="${s.region}" aria-label="${s.region} · ${names}${open ? ' · 可创作' : ' · 仅预览'}">
      <span class="place-tag">${names} · ${open ? '可创作' : '仅欣赏'}</span>
      <span class="place-name">${s.region}</span><span class="place-stem"></span><span class="place-dot"></span></button>`;
  }).join('');
  SAMPLES.forEach(s => labels.set(s.region, $('map-points').querySelector(`[data-region="${s.region}"]`)));
}

const tmp = new THREE.Vector3();
function updateLabels() {
  if (!land) return;
  const hide = land.getMode() === 'opening';
  labels.forEach((el, id) => {
    const pos = land.placePosition(id);
    if (!pos) return;
    const p = land.project(tmp.copy(pos).add(LABEL_LIFT));
    const off = hide || !p.visible;
    el.classList.toggle('offscreen', off);
    if (!off) el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, calc(-100% + 3.5px))`;
  });
}

function renderPointStates() {
  labels.forEach((el, id) => {
    el.classList.toggle('active', id === region);
    el.classList.toggle('dimmed', level === 'focus' && id !== region);
  });
}

function renderTrail() {
  const items = level === 'overview'
    ? ['<li aria-current="step">全国总览</li>']
    : ['<li><button data-trail="overview">全国总览</button></li>', `<li aria-current="step">${esc(region)}</li>`];
  $('map-trail').innerHTML = items.join('');
  $('explore-view').classList.toggle('level-focus', level === 'focus');
}

function renderCard() {
  const card = $('place-card');
  if (level !== 'focus') { card.hidden = true; return; }
  const sample = sampleOf(region);
  const open = !!CRAFTS[craft];
  card.hidden = false;
  $('place-region').textContent = region;
  $('place-title').textContent = CRAFT_NAMES[craft];
  $('place-item').textContent = sample?.items[craft] || '地区内容待收录';
  $('place-desc').textContent = open ? DESCRIPTIONS[craft] : craft === 'pending' ? DESCRIPTIONS.pending : DESCRIPTIONS.preview;
  $('sample-tabs').innerHTML = (sample?.crafts || []).length > 1
    ? sample.crafts.map(c => `<button data-sample-craft="${c}" aria-pressed="${c === craft}">${CRAFT_NAMES[c]}</button>`).join('')
    : '';
  const img = $('reveal-img');
  $('reveal-empty').hidden = craft !== 'pending';
  img.hidden = craft === 'pending';
  img.alt = sample?.items[craft] ? `${sample.items[craft]}样品` : '';
  if (craft !== 'pending') fillPhoto(img, craft, sampleState(craft, region), { finished: true, width: 720, height: 760, variant: region === '新疆' ? 'ikat' : undefined });
  $('place-album').hidden = craft === 'pending';
  resetReveal();
}

function renderBottom() {
  $('region-select').value = level === 'focus' ? region : '';
  const latest = store.latestRecord();
  $('resume-work').hidden = !latest;
  if (latest) $('resume-work').textContent = `继续「${latest.name}」`;
}

function render() {
  renderPointStates();
  renderTrail();
  renderCard();
  renderBottom();
}

// —— 长按显现 ——
let reveal = 0, holdRaf = 0, holding = false, lastT = 0;
function setReveal(r) {
  reveal = Math.max(0, Math.min(100, r));
  $('reveal').style.setProperty('--r', reveal.toFixed(1));
}
function resetReveal() {
  cancelAnimationFrame(holdRaf);
  holding = false;
  setReveal(0);
  $('reveal').classList.remove('done');
  $('enter-atelier').hidden = true;
  $('reveal-skip').hidden = craft === 'pending';
  $('reveal-hold').hidden = craft === 'pending';
}
function completeReveal() {
  cancelAnimationFrame(holdRaf);
  holding = false;
  setReveal(100);
  $('reveal').classList.add('done');
  $('reveal-skip').hidden = true;
  const open = !!CRAFTS[craft];
  const button = $('enter-atelier');
  button.hidden = false;
  button.disabled = !open;
  button.textContent = open ? '进入工坊' : '在线工坊暂未开放';
  play('reveal');
  emit('say', open
    ? `这是${sampleOf(region)?.items[craft] || CRAFT_NAMES[craft]}的样子。进入工坊，从第一道工序开始。`
    : `这件${CRAFT_NAMES[craft]}先供欣赏，在线工坊还在准备。可以去看看瓷器或剪纸。`);
}
function tick(t) {
  const dt = lastT ? t - lastT : 16;
  lastT = t;
  setReveal(reveal + (holding ? 1 : -1.6) * (dt / HOLD_MS) * 100);
  if (reveal >= 100) { completeReveal(); return; }
  if (!holding && reveal <= 0) return;
  holdRaf = requestAnimationFrame(tick);
}
function startHold(e) {
  if ($('reveal').classList.contains('done')) return;
  e.preventDefault();
  holding = true;
  if (reducedMotion()) { completeReveal(); return; }
  cancelAnimationFrame(holdRaf);
  lastT = 0;
  holdRaf = requestAnimationFrame(tick);
}
function endHold() {
  if (!holding) return;
  holding = false;
  cancelAnimationFrame(holdRaf);
  lastT = 0;
  holdRaf = requestAnimationFrame(tick);
}

// —— 状态切换 ——
export function selectRegion(name, craftId) {
  const sample = sampleOf(name);
  region = name;
  craft = craftId || sample?.crafts[0] || 'pending';
  level = 'focus';
  if (sample) land?.flyTo('focus', { id: name, duration: 1900 });
  render();
  play('tap');
  emit('say', sample
    ? `${name}到了。按住右边的照片，看看这里的${CRAFT_NAMES[craft]}。`
    : `${name}的内容还在收录中，可以先看看已点亮的地点。`);
}

export function overview(animate = true) {
  level = 'overview';
  region = null;
  land?.flyTo('overview', { duration: animate ? 1700 : 0 });
  render();
}

function syncActive() {
  const visible = currentView() === 'explore' || !$('opening').hidden;
  $('world-canvas').classList.toggle('off', !visible);
  land?.setActive(visible);
}

export function initExplore({ enterAtelier, resume }) {
  onEnter = enterAtelier;
  onResume = resume;
  land = createLandscape($('world-canvas'), {
    places: SAMPLES.map(s => ({ id: s.region, x: s.x, y: s.y, open: !!CRAFTS[s.crafts[0]] })),
  });
  if (land) {
    land.setReduced(reducedMotion());
    land.onFrame(updateLabels);
  } else {
    $('explore-view').classList.add('no-webgl');
  }
  buildPoints();
  $('region-select').innerHTML = '<option value="">按地区查找</option>' + ALL_REGIONS.map(r => `<option value="${r}">${r}</option>`).join('');

  // 拖动平移；位移超过阈值视为拖动，不触发地点点击
  const vp = $('map-viewport');
  let drag = null;
  vp.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, id: e.pointerId };
  });
  vp.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
      drag.moved = true;
      vp.classList.add('dragging');
      try { vp.setPointerCapture(drag.id); } catch (err) { /* 合成事件无指针可捕获 */ }
    }
    if (drag.moved) land?.pan(e.clientX - drag.lx, e.clientY - drag.ly);
    drag.lx = e.clientX;
    drag.ly = e.clientY;
  });
  const endDrag = e => {
    if (!drag) return;
    const wasDrag = drag.moved;
    drag = null;
    vp.classList.remove('dragging');
    if (wasDrag) return;
    const place = e.target.closest?.('[data-region]');
    if (place) selectRegion(place.dataset.region);
    else if (level === 'focus') overview();
  };
  vp.addEventListener('pointerup', endDrag);
  vp.addEventListener('pointercancel', () => { drag = null; vp.classList.remove('dragging'); });
  $('map-points').addEventListener('keydown', e => {
    const place = e.target.closest('[data-region]');
    if (place && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectRegion(place.dataset.region); }
  });
  vp.addEventListener('wheel', e => {
    e.preventDefault();
    land?.zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1);
  }, { passive: false });

  $('map-trail').addEventListener('click', e => { if (e.target.closest('[data-trail]')) overview(); });
  $('place-close').addEventListener('click', () => overview());
  $('sample-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-sample-craft]');
    if (b) { craft = b.dataset.sampleCraft; render(); }
  });
  $('resume-work').addEventListener('click', () => {
    const r = store.latestRecord();
    if (!r) return;
    session.loadRecord(r);
    onResume(r);
  });
  on('records', renderBottom);
  $('region-select').addEventListener('change', e => (e.target.value ? selectRegion(e.target.value) : overview()));

  const hold = $('reveal-hold');
  hold.addEventListener('pointerdown', startHold);
  hold.addEventListener('pointerup', endHold);
  hold.addEventListener('pointerleave', endHold);
  hold.addEventListener('pointercancel', endHold);
  hold.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) startHold(e); });
  hold.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') endHold(); });
  $('reveal-skip').addEventListener('click', completeReveal);
  $('enter-atelier').addEventListener('click', () => { if (CRAFTS[craft]) onEnter(craft, region); });
  $('place-album').addEventListener('click', () => emit('album', { craft }));

  on('view', syncActive);
  on('opening', syncActive);
  on('settings', ({ key }) => { if (key === 'motion') land?.setReduced(reducedMotion()); });

  render();
}
