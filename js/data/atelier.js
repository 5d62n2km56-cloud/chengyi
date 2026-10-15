// 工坊入口「认识工具」卡片内容，cite 指向册页段落。

export const ATELIER_TOOLS = {
  ceramic: [
    { name: '陶车', text: '转动的圆盘，泥料放在中心，随旋转用手拉坯成形。', cite: 'craft-shape' },
    { name: '利坯刀', text: '坯体半干后修整厚薄与轮廓的刀具。', cite: 'craft-shape' },
    { name: '釉桶', text: '盛放调好的釉浆，蘸釉、荡釉都从这里开始。', cite: 'craft-glaze' },
    { name: '瓷土与釉料', text: '瓷石与高岭土配成坯料，釉果与釉灰调成釉。', cite: 'material-binary' },
  ],
  paper: [
    { name: '剪刀', text: '剪纸的主要工具，适合折叠后一次剪出对称图案。', cite: 'material-tools' },
    { name: '刻刀与蜡盘', text: '刻纸时把多层纸叠在蜡盘上，用刻刀一次刻成。', cite: 'material-tools' },
    { name: '红纸', text: '最常用的剪纸用纸，取喜庆之意。', cite: 'material-paper' },
    { name: '底稿', text: '先在纸上起稿或折出定位，再沿线剪刻。', cite: 'craft-fold' },
  ],
};
