// 承艺 · 山河入坊 交互原型入口

import { $, $$ } from './core/dom.js';
import { showView } from './core/router.js';
import { initSettings } from './core/settings.js';
import * as session from './core/session.js';
import { initDialogs, confirmAction } from './views/dialogs.js';
import { initAlbum } from './views/album.js';
import { initExplore, getLandscape } from './views/explore.js';
import { initWorkshop, openAtelier, openCreate } from './views/workshop.js';
import { initGallery } from './views/gallery.js';
import { initGuide } from './views/guide.js';
import { initVoice } from './views/voice.js';
import { initOpening, showOpening, shouldAutoPlay } from './views/opening.js';

initSettings();
initDialogs();
initAlbum({ currentCraft: () => session.getActiveCraft() });
initWorkshop();
initExplore({ enterAtelier: (craft, region) => openAtelier(craft, region), resume: r => openCreate(r.craft) });
initGallery({ openCreate });
initGuide();
initVoice();
initOpening({ landscape: getLandscape(), done: () => showView('explore') });

$$('[data-view]').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
$('brand-home').addEventListener('click', () => showView('explore'));

$('reset-demo').addEventListener('click', async () => {
  $('settings-pop').hidden = true;
  const ok = await confirmAction('重置演示数据？', '将清除本机保存的全部作品与设置，并重新播放开场。', '重置');
  if (!ok) return;
  try {
    Object.keys(localStorage).filter(k => k.startsWith('chengyi-')).forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch (e) { /* 存储不可用时直接刷新 */ }
  location.reload();
});

// 地址锚点直达场景（评审用）：#explore #atelier #atelier-paper #create #create-paper #gallery，带锚点时跳过开场
const ROUTES = {
  explore: () => showView('explore'),
  atelier: () => openAtelier('ceramic'),
  'atelier-paper': () => openAtelier('paper'),
  create: () => openCreate('ceramic'),
  'create-paper': () => openCreate('paper'),
  gallery: () => showView('gallery'),
};
const route = location.hash.slice(1);
showView('explore');
if (ROUTES[route]) { getLandscape()?.jump('overview'); ROUTES[route](); }
else if (shouldAutoPlay()) showOpening();
else getLandscape()?.jump('overview');
