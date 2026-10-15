// 单屏场景切换：explore（山河寻艺）、workshop（AI 共创）、gallery（我的作品）

import { $, $$ } from './dom.js';
import { emit } from './bus.js';

const VIEWS = ['explore', 'workshop', 'gallery'];
let current = 'explore';

export const currentView = () => current;

export function showView(next) {
  if (!VIEWS.includes(next)) return;
  current = next;
  VIEWS.forEach(v => {
    const el = $(`${v}-view`);
    el.hidden = v !== next;
    el.classList.remove('entering');
  });
  $$('[data-view]').forEach(b => {
    if (b.dataset.view === next) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  const target = $(`${next}-view`);
  void target.offsetWidth;
  target.classList.add('entering');
  target.focus({ preventScroll: true });
  emit('view', { view: next });
}
