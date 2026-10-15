// 体验设置：声音（默认关）、动态效果、模拟 AI 不可用。按浏览器记住。

import { $, $$ } from './dom.js';
import { emit } from './bus.js';

const KEY = 'chengyi-settings-v1';
const DEFAULTS = { sound: 'off', motion: 'full', aiDown: 'off' };

const settings = { ...DEFAULTS };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  for (const k of Object.keys(DEFAULTS)) if (typeof saved[k] === 'string') settings[k] = saved[k];
} catch (e) { /* 使用默认值 */ }

const systemReduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const get = key => settings[key];
export const reducedMotion = () => settings.motion === 'reduced' || systemReduced();

export function set(key, value) {
  settings[key] = value;
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* 仅本次生效 */ }
  apply();
  emit('settings', { key, value });
}

function apply() {
  $('shell').classList.toggle('reduced', settings.motion === 'reduced');
  document.body.classList.toggle('reduced', settings.motion === 'reduced');
  $$('[data-setting]').forEach(group => {
    group.querySelectorAll('[data-value]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.value === settings[group.dataset.setting])));
  });
}

export function initSettings() {
  const pop = $('settings-pop');
  const button = $('settings-button');
  const close = () => { pop.hidden = true; button.setAttribute('aria-expanded', 'false'); };
  button.addEventListener('click', e => {
    e.stopPropagation();
    pop.hidden = !pop.hidden;
    button.setAttribute('aria-expanded', String(!pop.hidden));
  });
  pop.addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('[data-value]');
    if (b) set(b.closest('[data-setting]').dataset.setting, b.dataset.value);
  });
  document.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  apply();
}
