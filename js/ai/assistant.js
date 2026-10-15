// 承艺之声的规则部分。改作品、撤销、下一步、跑题这些由规则处理（kind 见 LOCAL_KINDS），
// 知识问答和其余的话交给大模型后台（backend.js）；后台不可用时，规则版的回答就是兜底。
// 规则：改作品先给建议、确认后才应用；知识问答只引用册页并附出处；册页没有的如实说明（PRD 7.2）。

import { CRAFTS, PATTERNS, STEP_COUNT, colorOf, shapeOf } from '../data/crafts.js';
import { ALBUM } from '../data/album.js';

const COLOR_RULES = {
  ceramic: [[/青绿|青色|绿色|粉青|青瓷/, 'jade'], [/靛蓝|蓝色|蓝釉|青花/, 'blue'], [/月白|白色|米白|白瓷/, 'white'], [/暖陶|土色|棕色|素胎|陶土/, 'clay']],
  paper: [[/红色|朱红|红纸|大红/, 'red'], [/靛蓝|蓝色/, 'blue'], [/白色|米白|象牙白/, 'ivory'], [/金色|暖金/, 'gold']],
};
const SHAPE_RULES = {
  ceramic: [[/花瓶|瓶子|瓶身|做个瓶|一只瓶/, 'vase'], [/碗/, 'bowl'], [/罐/, 'jar']],
  paper: [[/圆形|圆纸|圆的|团花/, 'round'], [/方形|方纸|方的/, 'square'], [/菱形/, 'diamond']],
};
const PATTERN_RULES = [
  [/素面|没有纹样|去掉花纹|不要花纹|去掉纹样/, 'plain'],
  [/花卉|花纹.*花|莲花|花朵|花瓣|缠枝|牡丹/, 'flower'],
  [/云纹|祥云|云/, 'cloud'],
  [/几何|菱格|回纹/, 'geometry'],
];

// 知识问答：关键词 → 册页段落
const KNOWLEDGE = {
  ceramic: [
    [/青花|为什么.*蓝|钴/, ['craft-blue']],
    [/景德镇|名字|由来|来历|历史|起源/, ['history-name', 'history-blue']],
    [/名录|非遗|遗产/, ['history-list']],
    [/拉坯|利坯|塑坯|成形|器型|器形/, ['craft-shape']],
    [/工序|七十二|多少道|几道/, ['craft-72']],
    [/施釉|上釉|釉怎么/, ['craft-glaze']],
    [/烧|窑|温度|火/, ['craft-fire']],
    [/高岭|瓷土|泥|材料/, ['material-kaolin', 'material-binary']],
    [/釉料|釉灰|釉果/, ['material-glaze']],
    [/缠枝|花卉.*寓意|花.*意思/, ['pattern-flower']],
    [/云纹.*寓意|云.*意思|祥云/, ['pattern-cloud']],
    [/回纹|几何.*寓意|不断头/, ['pattern-geometry']],
    [/寓意|纹样|花纹/, ['pattern-flower', 'pattern-cloud', 'pattern-geometry']],
  ],
  paper: [
    [/对折|折|对称/, ['craft-fold']],
    [/阳刻|阴刻|刻法|不断|怎么剪|剪刻/, ['craft-cut']],
    [/最早|起源|历史|来历|古/, ['history-early']],
    [/名录|非遗|遗产|联合国/, ['history-list']],
    [/安塞|蔚县|风格|地方|地域/, ['history-region']],
    [/窗花|喜花|用途|贴/, ['craft-unfold']],
    [/红纸|纸|颜色/, ['material-paper']],
    [/剪刀|刻刀|蜡盘|工具/, ['material-tools']],
    [/团花|花卉.*寓意|花.*意思/, ['pattern-flower']],
    [/云纹.*寓意|祥云/, ['pattern-cloud']],
    [/锯齿|月牙|回纹|几何/, ['pattern-geometry']],
    [/寓意|纹样|花纹/, ['pattern-flower', 'pattern-cloud', 'pattern-geometry']],
  ],
};

const QUESTION = /为什么|什么|怎么|如何|哪|吗|？|\?|讲讲|介绍|来历|历史|寓意|意思/;
const COMMAND = /改成|换成|改为|换个|换一|做一|来一|帮我|我想要|我要|要一|变成|调成|加上|去掉/;
const OFF_TOPIC = /天气|股票|新闻|写代码|编程|游戏攻略|彩票|八卦/;

function paragraphs(craft, ids) {
  const album = ALBUM[craft];
  return ids.map(id => {
    for (const [section, paras] of Object.entries(album.sections)) {
      const para = paras.find(p => p.id === id);
      if (para) return { section, ...para };
    }
    return null;
  }).filter(Boolean);
}

function answerKnowledge(craft, text) {
  for (const [re, ids] of KNOWLEDGE[craft] || []) {
    if (re.test(text)) {
      const found = paragraphs(craft, ids);
      return {
        kind: 'knowledge',
        reply: found.map(p => p.text).join(' '),
        cite: found.map(p => ({ craft, id: p.id })),
      };
    }
  }
  return null;
}

function stepAnswer(craft, step) {
  const c = CRAFTS[craft];
  const ref = c.steps[step].album;
  const found = paragraphs(craft, [ref]);
  return {
    kind: 'step',
    reply: `${c.copy[step]} ${found[0]?.text || ''}`.trim(),
    cite: found.map(p => ({ craft, id: p.id })),
  };
}

// 这几类回答始终用规则，不问大模型：它们要么改作品（必须先建议、再确认），要么是固定说法
export const LOCAL_KINDS = new Set(['offtopic', 'step', 'undo', 'next', 'refuse', 'edit']);

// 创作台里的对话。返回 { kind, reply, proposal?, cite?, quick?, openAlbum? }
export function respond(text, craft, state) {
  const c = CRAFTS[craft];
  const clean = text.trim();

  if (OFF_TOPIC.test(clean)) {
    return { kind: 'offtopic', reply: `这个话题我帮不上忙。我们回到${c.title.replace('工坊', '')}上来：可以问我工艺来历，或者告诉我想怎么改作品。` };
  }
  if (/讲讲这道工序|这道工序|这一步|这步怎么/.test(clean)) return stepAnswer(craft, state.step);
  if (/撤销|退回|还原上一步/.test(clean)) {
    return { kind: 'undo', reply: '可以。确认后退回上一版，当前修改仍可重做。', proposal: { kind: 'undo', summary: '撤销最近一次作品修改。', patch: {} } };
  }
  if (/下一步|下一道|继续工序/.test(clean)) {
    return state.step < STEP_COUNT - 1
      ? { kind: 'next', reply: '这一步会保留你的设计，展示下一道工序。', proposal: { patch: { step: state.step + 1 }, summary: `进入「${c.steps[state.step + 1].name}」。` } }
      : { kind: 'next', reply: '已经是最后一道工序了，可以点「完成作品」为它命名。' };
  }

  // 改作品意图
  const patch = {};
  const changes = [];
  const colorRule = COLOR_RULES[craft].find(([re]) => re.test(clean));
  // 「为什么青花是蓝色」这类问句不当作改色
  const isQuestion = QUESTION.test(clean) && !COMMAND.test(clean);
  if (!isQuestion) {
    if (colorRule) {
      patch.color = colorRule[1];
      changes.push(`${c.colorLabel}改为${colorOf(craft, colorRule[1]).name}`);
    }
    const shapeRule = SHAPE_RULES[craft].find(([re]) => re.test(clean));
    if (shapeRule) {
      patch.shape = shapeRule[1];
      changes.push(`${c.shapeLabel}选择${shapeOf(craft, shapeRule[1]).name}`);
    }
    const patternRule = PATTERN_RULES.find(([re]) => re.test(clean));
    if (patternRule) {
      patch.pattern = patternRule[1];
      changes.push(`纹样改为${PATTERNS.find(p => p.id === patternRule[1]).name}`);
    }
    if (craft === 'ceramic' && /窄|纤细|瘦/.test(clean)) {
      patch.width = Math.max(0.75, state.width - 0.1);
      changes.push('器身收窄一档');
    } else if (craft === 'ceramic' && /宽|胖|饱满/.test(clean)) {
      patch.width = Math.min(1.2, state.width + 0.1);
      changes.push('器身加宽一档');
    }
    if (craft === 'paper' && /简单|简洁|少一点/.test(clean)) {
      patch.complexity = 0.8;
      changes.push('减少重复剪刻单元');
    } else if (craft === 'paper' && /复杂|丰富|多一点/.test(clean)) {
      patch.complexity = 1.2;
      changes.push('增加重复剪刻单元');
    }
    if (/画|手绘|自由生成|生成一个纹样|上传/.test(clean)) {
      return { kind: 'refuse', reply: '一期还不支持自由绘制或生成新纹样，纹样只从纹样库中选，保证每个纹样都有出处。可以试试「换成云纹」或「改成花卉」。' };
    }
  }

  if (changes.length) {
    if (patch.color || patch.pattern) patch.step = Math.max(1, state.step);
    const pattern = PATTERNS.find(p => p.id === patch.pattern);
    const meaning = pattern && pattern.id !== 'plain' ? ` ${pattern.name}的寓意：${pattern.meaning}` : '';
    return {
      kind: 'edit',
      reply: `我把你的想法整理成下面这组修改，确认后再应用，也可以继续手动调整。${meaning}`,
      proposal: { patch, summary: `${changes.join('；')}。` },
      cite: pattern?.album ? [{ craft, id: pattern.album }] : undefined,
    };
  }

  const knowledge = answerKnowledge(craft, clean);
  if (knowledge) return knowledge;

  if (QUESTION.test(clean)) return notInAlbum();

  return {
    kind: 'clarify',
    reply: '这句话我还没理解清楚。你是想改作品的形状、颜色或纹样，还是想了解这道工序？可以点下面的快捷选项。',
    quick: true,
  };
}

const notInAlbum = () => ({
  kind: 'unknown',
  reply: '这个问题册页里还没收录，我不想随口编一个答案给你。可以先翻翻册页，或者换个问法问我工艺、材料和纹样。',
  openAlbum: true,
});

// 创作台以外（山河、工坊入口、我的作品）的对话：只答不改。craft 为 null 表示没有对应的册页
export function guideRespond(text, craft) {
  const clean = text.trim();
  if (OFF_TOPIC.test(clean)) {
    return { kind: 'offtopic', reply: '这个话题我帮不上忙。我们回到手艺上来：可以问我瓷器、剪纸的来历、材料和工序。' };
  }
  const knowledge = craft && answerKnowledge(craft, clean);
  if (knowledge) return knowledge;
  if (QUESTION.test(clean)) return notInAlbum();
  return { kind: 'clarify', reply: '可以问我这门手艺的来历、材料和工序，或者去瓷器、剪纸工坊亲手做一件。' };
}

// AI 不可用时的快捷选项（PRD 7.3）：直接作用于作品，不经过对话
export function quickOptions(craft, state) {
  const c = CRAFTS[craft];
  const options = [];
  const nextColor = c.colors[(c.colors.findIndex(x => x.id === state.color) + 1) % c.colors.length];
  options.push({ label: `换成${nextColor.name}`, patch: { color: nextColor.id, step: Math.max(1, state.step) } });
  const nextPattern = PATTERNS[(PATTERNS.findIndex(p => p.id === state.pattern) + 1) % PATTERNS.length];
  options.push({ label: `纹样换成${nextPattern.name}`, patch: { pattern: nextPattern.id, step: Math.max(1, state.step) } });
  if (state.step < STEP_COUNT - 1) options.push({ label: '下一道工序', patch: { step: state.step + 1 } });
  return options;
}
