// 承艺之声的「此刻在哪」：把场景换算成后台讲解条目、对话分隔标题、开场白和推荐问题。
// 条目编号须与后台 scripts/seed_chengyi.py 登记的一致。

import { CRAFTS, CRAFT_NAMES, PATTERNS, colorOf, shapeOf } from '../data/crafts.js';
import { sampleOf } from '../data/regions.js';

const NUMBER_WORDS = ['一', '二', '三'];

// where：{ view, mode, craft, region, state }，由 voice.js 汇总
export function describe(where) {
  const { view, mode, craft, region } = where;
  if (view === 'workshop') {
    const c = CRAFTS[craft];
    const create = mode === 'create';
    return {
      key: `${craft}:${mode}`,
      item: `chengyi-${craft}`,
      label: create ? `${CRAFT_NAMES[craft]} · 创作台` : c.title,
      craft,
      create,
      greeting: create ? c.greeting : `这是${c.title}。想知道这门手艺的来历、材料和工序，都可以问我；开始创作后，也可以让我帮你改作品。`,
      prompts: create ? c.prompts : craft === 'ceramic'
        ? ['瓷器是怎么烧成的？', '青花为什么是蓝色的？']
        : ['剪纸为什么要对折？', '剪纸要用哪些工具？'],
    };
  }
  if (view === 'explore' && region) {
    const sample = sampleOf(region);
    const name = sample?.items[craft];
    if (sample && name) {
      return {
        key: `${region}:${craft}`,
        item: `chengyi-${sample.key}-${craft}`,
        label: `${region} · ${name}`,
        craft: CRAFTS[craft] ? craft : null,
        greeting: `到${region}了。关于${name}，想知道什么都可以问我。`,
        prompts: [`讲讲${name}`, `${name}有什么讲究？`],
      };
    }
  }
  return {
    key: 'overview',
    item: 'chengyi-overview',
    label: view === 'gallery' ? '我的作品' : '山河总览',
    craft: null,
    greeting: '我是承艺之声。看山河、做手艺的时候，有什么想问的都可以问我。',
    prompts: ['这里有哪些手艺？', '景德镇的瓷器有什么特别？'],
  };
}

// 创作台上把作品状态带给模型，让它知道「这个」「它」指什么
export function workNote(craft, s) {
  const c = CRAFTS[craft];
  const pattern = PATTERNS.find(p => p.id === s.pattern)?.name;
  const size = craft === 'ceramic' ? `器身宽窄 ${Math.round(s.width * 100)}%` : `剪刻繁简 ${Math.round(s.complexity * 100)}%`;
  return `【参观者正在${c.title}创作：${shapeOf(craft, s.shape)?.name}，${c.colorLabel}${colorOf(craft, s.color)?.name}，纹样${pattern}，${size}，`
    + `当前第${NUMBER_WORDS[s.step]}道工序「${c.steps[s.step].name}」】`;
}
