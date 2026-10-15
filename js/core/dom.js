export const $ = id => document.getElementById(id);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = x => String(x).replace(/[&<>"']/g, c => ESC[c]);

export const clone = x => JSON.parse(JSON.stringify(x));

export const makeId = () =>
  globalThis.crypto?.randomUUID?.() || `work-${Date.now()}-${Math.random().toString(16).slice(2)}`;

let toastTimer;
export function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3300);
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name.replace(/[\\/:*?"<>|]/g, '_');
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function setPressed(selector, predicate) {
  $$(selector).forEach(b => b.setAttribute('aria-pressed', String(predicate(b))));
}
