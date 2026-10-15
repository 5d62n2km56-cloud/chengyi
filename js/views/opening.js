// 电影感开场：叠在实时山河之上。约 2 秒从墨色中显影，指针带动镜头轻微视差；
// 「启程」后遮幅退开，镜头拔高掠过群山，落到山河总览。每个浏览器会话自动播放一次，可跳过，可重播。

import { $ } from '../core/dom.js';
import { emit } from '../core/bus.js';
import { get, set, reducedMotion } from '../core/settings.js';
import { play } from '../fx/sound.js';

const SEEN = 'chengyi-opening-seen';

let land = null;
let onDone = () => {};
let busy = false;

function syncSoundButton() {
  const on = get('sound') === 'on';
  $('opening-sound').textContent = `声音：${on ? '开' : '关'}`;
  $('opening-sound').setAttribute('aria-pressed', String(on));
}

function finish() {
  const el = $('opening');
  el.classList.add('leaving');
  document.body.classList.remove('in-opening');
  try { sessionStorage.setItem(SEEN, '1'); } catch (e) { /* 无法记录时下次仍播放 */ }
  setTimeout(() => {
    el.hidden = true;
    el.classList.remove('ready', 'launch', 'leaving');
    $('opening-start').disabled = false;
    busy = false;
    emit('opening', { open: false });
    onDone();
  }, reducedMotion() ? 0 : 900);
}

export function showOpening() {
  const el = $('opening');
  el.hidden = false;
  el.classList.remove('ready', 'launch', 'leaving');
  document.body.classList.add('in-opening');
  land?.jump('opening');
  emit('opening', { open: true });
  syncSoundButton();
  $('opening-start').focus({ preventScroll: true });
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('ready')));
}

export function initOpening({ landscape, done }) {
  land = landscape;
  onDone = done;
  $('opening').addEventListener('pointermove', e => {
    if (reducedMotion() || !land) return;
    land.setParallax(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
  });
  $('opening-start').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    $('opening-start').disabled = true;
    play('reveal');
    $('opening').classList.add('launch');
    land?.setParallax(0, 0);
    if (land && !reducedMotion()) {
      await Promise.race([land.flyTo('overview', { duration: 3600 }), new Promise(r => setTimeout(r, 3800))]);
      land.jump('overview');
    } else land?.jump('overview');
    finish();
  });
  $('opening-skip').addEventListener('click', () => {
    if (busy) return;
    busy = true;
    land?.jump('overview');
    finish();
  });
  $('opening-sound').addEventListener('click', () => {
    set('sound', get('sound') === 'on' ? 'off' : 'on');
    syncSoundButton();
    play('tap');
  });
  $('replay-opening').addEventListener('click', () => {
    $('settings-pop').hidden = true;
    showOpening();
  });
}

export const shouldAutoPlay = () => {
  try { return !sessionStorage.getItem(SEEN); } catch (e) { return false; }
};
