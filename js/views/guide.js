// 承艺之声 · 旁白：在画面底部出现一行字，几秒后淡去。不常驻、不占位置。
// 详细对话在工坊里的「问问承艺之声」。

import { $ } from '../core/dom.js';
import { on } from '../core/bus.js';

let timer = 0;

function say(text) {
  const el = $('guide-message');
  clearTimeout(timer);
  el.classList.remove('show');
  if (!text) return;
  // 先淡出旧的一句，再换上新的
  requestAnimationFrame(() => {
    el.textContent = text;
    requestAnimationFrame(() => el.classList.add('show'));
  });
  timer = setTimeout(() => el.classList.remove('show'), Math.max(4200, text.length * 160));
}

export function initGuide() {
  on('say', say);
  on('view', ({ view }) => {
    if (view === 'explore') say('点一处地名，看看那里的手艺。');
    if (view === 'gallery') say('你的作品都在这里。可以继续修改、下载图片，或准备实物制作。');
  });
}
