// 克制的提示音，用 WebAudio 合成，不依赖音频文件。默认关闭，只在用户操作后发声。

import { get } from '../core/settings.js';

let ctx;

function tone(freq, start, duration, gain = 0.05, type = 'sine') {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.05);
}

const SOUNDS = {
  tap: () => tone(880, 0, 0.12, 0.03, 'triangle'),
  confirm: () => { tone(660, 0, 0.18, 0.04); tone(990, 0.09, 0.26, 0.035); },
  reveal: () => { tone(523, 0, 0.5, 0.03); tone(784, 0.12, 0.6, 0.03); tone(1046, 0.24, 0.8, 0.025); },
  error: () => tone(220, 0, 0.25, 0.04, 'triangle'),
};

export function play(name) {
  if (get('sound') !== 'on') return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    SOUNDS[name]?.();
  } catch (e) { /* 浏览器不支持时静默 */ }
}
