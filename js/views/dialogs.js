// 浮层：说明、分享导出、实物定制需求单、二次确认。

import { $, $$, clone, download, toast } from '../core/dom.js';
import { CRAFTS, CRAFT_NAMES, colorOf, patternOf, shapeOf } from '../data/crafts.js';
import { findRecord } from '../core/store.js';
import { artwork, artworkToPng } from '../render/artwork.js';
import { fillPhoto, photoPng } from '../render/photo.js';
import { play } from '../fx/sound.js';

let selectedId = null;
const selected = () => findRecord(selectedId);

export function showInfo(title, html) {
  $('info-title').textContent = title;
  $('info-body').innerHTML = html;
  $('info-dialog').showModal();
}

// 页面内确认，返回 Promise<boolean>
export function confirmAction(title, body, okLabel = '确认') {
  return new Promise(resolve => {
    const dialog = $('confirm-dialog');
    $('confirm-title').textContent = title;
    $('confirm-body').textContent = body;
    $('confirm-ok').textContent = okLabel;
    const done = value => {
      dialog.removeEventListener('close', onClose);
      $('confirm-ok').removeEventListener('click', onOk);
      resolve(value);
    };
    const onOk = () => { done(true); dialog.close(); };
    const onClose = () => done(false);
    $('confirm-ok').addEventListener('click', onOk);
    dialog.addEventListener('close', onClose, { once: true });
    dialog.showModal();
  });
}

export function openShare(record) {
  selectedId = record.id;
  fillPhoto($('share-art'), record.craft, record.state, { finished: record.status === 'done' });
  const s = record.state;
  $('share-copy').value = `我在承艺创作了「${record.name}」。\n${CRAFT_NAMES[record.craft]} · ${shapeOf(record.craft, s.shape).name} · ${colorOf(record.craft, s.color).name} · ${patternOf(s.pattern).name}。\n${patternOf(s.pattern).meaning}\n从第一道工序开始，与 AI 一起完成了这件数字作品。`;
  $('share-dialog').showModal();
}

export function openOrder(record) {
  selectedId = record.id;
  const c = CRAFTS[record.craft];
  $('order-size').value = c.orderSize;
  $('order-material').innerHTML = c.orderMaterials.map(x => `<option>${x}</option>`).join('');
  $('order-note').value = '';
  $('order-dialog').showModal();
}

export const PROTOTYPE_INFO = `
  <p>承艺 · 山河入坊交互原型。三个场景通过顶部导航切换；册页、命名、分享与定制需求用浮层查看。</p>
  <h3>可以实际操作</h3>
  <ul>
    <li>开场：云海之上题名，启程后镜头落到山河总览；可跳过、可重播。</li>
    <li>山河寻艺：总览 → 产地聚焦 → 工坊入口；拖动、滚轮远近、点空白收起；按住样品照片显现，或直接看。</li>
    <li>工坊入口：写实摄影棚里的作品，加「开始创作」「看工序」「认识工具」三个选择。</li>
    <li>创作台：三道工序，每道只露出当前要用的工具；瓷器从施釉进入烧成时有入窑过程；承艺之声给建议、确认后才改作品；撤销、重做、重置。</li>
    <li>册页：任何场景可开，AI 的知识回答附册页出处，册页里没有的如实说明。</li>
    <li>我的作品：每件作品自动拍成照片；继续编辑、删除、下载图片、导出定制需求单。</li>
  </ul>
  <h3>原型边界</h3>
  <p>未接真实大语言模型、生成式纹样、云端登录、公开分享、商家审核或付款。器物、纸张、陶车与摄影棚全部由程序实时生成，用于验证写实方向与交互；后续可替换为扫描模型与实拍材质。地区、项目与册页文案均为示例，上线前需内容组核验。</p>
  <h3>体验设置</h3>
  <p>右上角「设置」可开关声音（默认关）、减少动态，并可模拟 AI 不可用，查看快捷选项 + 手动的兜底流程。</p>`;

export function initDialogs() {
  $$('[data-close]').forEach(b => b.addEventListener('click', () => $(b.dataset.close).close()));
  // 点击浮层外部关闭
  $$('dialog').forEach(d => d.addEventListener('click', e => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
  }));

  $('about-button').addEventListener('click', () => showInfo('承艺 · 交互原型说明', PROTOTYPE_INFO));

  $('export-png').addEventListener('click', async () => {
    const r = selected();
    if (!r) return;
    const button = $('export-png');
    button.disabled = true;
    button.textContent = '正在导出…';
    try {
      let blob;
      try { blob = await photoPng({ ...r, craftName: CRAFT_NAMES[r.craft] }); } catch (e) { blob = await artworkToPng(r); }
      download(blob, `${r.name}.png`);
      toast('作品图片已准备下载');
      play('confirm');
    } catch (e) {
      toast('图片导出失败，请重试。');
    } finally {
      button.disabled = false;
      button.textContent = '下载图片';
    }
  });
  $('copy-share').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('share-copy').value);
      toast('创作介绍已复制');
    } catch (e) {
      $('share-copy').focus();
      $('share-copy').select();
      toast('请按系统复制快捷键，复制选中的介绍');
    }
  });

  $('order-form').addEventListener('submit', e => {
    e.preventDefault();
    const r = selected();
    if (!r) return;
    const request = {
      type: '承艺实物制作需求示意',
      status: '未提交商家',
      createdAt: new Date().toISOString(),
      work: { name: r.name, craft: CRAFT_NAMES[r.craft], parameters: clone(r.state), previewSVG: artwork(r.craft, r.state, { finished: true }) },
      size: $('order-size').value.trim(),
      material: $('order-material').value,
      notes: $('order-note').value.trim(),
      nextStep: '由匠人确认可行性、方案修改、报价与制作周期；用户确认后再付款制作。',
    };
    download(new Blob([JSON.stringify(request, null, 2)], { type: 'application/json;charset=utf-8' }), `${r.name}-制作需求单.json`);
    toast('需求单已准备下载，尚未提交商家');
    $('order-dialog').close();
  });
}
