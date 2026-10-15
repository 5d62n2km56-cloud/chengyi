// 册页：每品类的科普内容，每段附出处。
// 原型示例文案，上线前需内容组逐条核验出处与素材授权（见 PRD 6.3）。

export const SOURCES = {
  ihchina: { title: '中国非物质文化遗产网 · 国家级非物质文化遗产代表性项目名录', url: 'https://www.ihchina.cn/project.html' },
  unesco: { title: '联合国教科文组织 · 人类非物质文化遗产代表作名录', url: 'https://ich.unesco.org/en/lists' },
  tiangong: { title: '宋应星《天工开物 · 陶埏》，明崇祯十年刊' },
  taolu: { title: '蓝浦、郑廷桂《景德镇陶录》，清嘉庆年间刊' },
  taocishi: { title: '中国硅酸盐学会编《中国陶瓷史》，文物出版社' },
  wenyang: { title: '田自秉、吴淑生、田青《中国纹样史》，高等教育出版社' },
};

export const SECTION_NAMES = { history: '历史', craft: '工艺', material: '材料', pattern: '纹样' };

export const ALBUM = {
  ceramic: {
    lede: '一抔瓷土，经拉坯、施釉、入窑，成为可以传世的器物。',
    sections: {
      history: [
        { id: 'history-name', text: '景德镇古称昌南镇。北宋景德年间（1004—1007），当地为宫廷烧制瓷器，器底书「景德年制」，镇名由此而来。', src: 'taolu' },
        { id: 'history-list', text: '景德镇手工制瓷技艺于 2006 年列入第一批国家级非物质文化遗产代表性项目名录。', src: 'ihchina' },
        { id: 'history-blue', text: '元代景德镇烧成成熟的青花瓷，明清两代青花成为官窑与民窑的主流品种，并大量外销。', src: 'taocishi' },
      ],
      craft: [
        { id: 'craft-shape', text: '拉坯是把揉好的泥料放在转动的陶车上，以双手提拉成形；坯体晾至半干后再「利坯」，修整厚薄与轮廓。', src: 'tiangong' },
        { id: 'craft-72', text: '《天工开物 · 陶埏》记载：「共计一坯工力，过手七十二，方克成器。」一件瓷器要经过众多工序与工匠之手。', src: 'tiangong' },
        { id: 'craft-glaze', text: '施釉有蘸釉、荡釉、浇釉、吹釉等方法，依器形大小和部位选用，使釉层厚薄均匀。', src: 'taolu' },
        { id: 'craft-blue', text: '青花以含钴的青料在素坯上绘画，罩上透明釉，经高温一次烧成。钴料在高温下发色，因此呈现蓝色。', src: 'taocishi' },
        { id: 'craft-fire', text: '景德镇传统柴窑俗称「镇窑」，窑身形似半个蛋壳，烧成温度约在 1300℃ 上下，窑位不同，火候也不同。', src: 'taocishi' },
      ],
      material: [
        { id: 'material-kaolin', text: '高岭土因景德镇东北的高岭村而得名，西文中的 kaolin 即由此音译而来。', src: 'taocishi' },
        { id: 'material-binary', text: '景德镇制瓷采用瓷石与高岭土相配的「二元配方」，提高了坯体耐火度，减少烧成变形。', src: 'taocishi' },
        { id: 'material-glaze', text: '传统釉料由釉果（釉石）与釉灰调配，釉灰的比例影响釉面的光泽与色调。', src: 'taolu' },
      ],
      pattern: [
        { id: 'pattern-flower', text: '缠枝纹以卷曲的藤蔓缠绕花朵，连绵不断，寓意生生不息。元明青花中常见缠枝莲、缠枝牡丹。', src: 'wenyang' },
        { id: 'pattern-cloud', text: '云纹以回旋的曲线表现流云，寓意吉祥如意，常作为主纹之外的辅助纹饰。', src: 'wenyang' },
        { id: 'pattern-geometry', text: '回纹由横竖短线折绕成「回」字形，多用作器物口沿与底足的边饰，民间称「富贵不断头」。', src: 'wenyang' },
      ],
    },
  },
  paper: {
    lede: '一张纸、一把剪刀，留与去之间，见出一方水土的性情。',
    sections: {
      history: [
        { id: 'history-early', text: '新疆吐鲁番阿斯塔那古墓群出土过北朝时期的团花剪纸，是目前发现较早的剪纸实物。', src: 'ihchina' },
        { id: 'history-list', text: '剪纸于 2006 年列入第一批国家级非物质文化遗产代表性项目名录；2009 年「中国剪纸」列入联合国教科文组织人类非物质文化遗产代表作名录。', src: 'unesco' },
        { id: 'history-region', text: '剪纸各地风格不同：陕北安塞剪纸造型粗犷浑厚，河北蔚县剪纸以刻代剪、点染色彩。', src: 'ihchina' },
      ],
      craft: [
        { id: 'craft-fold', text: '折剪是把纸对折或多次折叠后剪刻，展开即得对称或重复的图案，团花、窗花多用此法。', src: 'ihchina' },
        { id: 'craft-cut', text: '阳刻保留轮廓线条、去掉其余部分，阴刻则剪去线条本身。行话「千刻不落，万剪不断」，讲的是线条要彼此相连。', src: 'ihchina' },
        { id: 'craft-unfold', text: '剪刻完成后展开、托裱或直接张贴。窗花贴在窗上，喜花用于婚俗，礼花用来装点礼品。', src: 'ihchina' },
      ],
      material: [
        { id: 'material-paper', text: '剪纸最常用红纸，取喜庆之意；蔚县剪纸多用薄宣纸刻成后再点染颜色。', src: 'ihchina' },
        { id: 'material-tools', text: '剪纸用剪刀；刻纸用刻刀配蜡盘，可将多层纸叠在一起一次刻成。', src: 'ihchina' },
      ],
      pattern: [
        { id: 'pattern-flower', text: '团花以花卉为中心向四周对称展开，构图圆满，寓意团圆美满。', src: 'wenyang' },
        { id: 'pattern-cloud', text: '云纹在剪纸中常作为画面边饰或填充，寓意吉祥如意。', src: 'wenyang' },
        { id: 'pattern-geometry', text: '锯齿纹、月牙纹与回纹是剪纸的基本刀法纹样，反复排列即成几何图案。', src: 'wenyang' },
      ],
    },
  },
  textile: {
    lede: '以蜡防染、以经纬织花，布上留住山野与节令。',
    sections: {
      history: [
        { id: 'history-list', text: '苗族蜡染技艺、维吾尔族艾德莱斯绸织染技艺均列入国家级非物质文化遗产代表性项目名录。', src: 'ihchina' },
      ],
    },
  },
  wood: {
    lede: '刀随木纹走，梁枋门窗间，雕出人间故事。',
    sections: {
      history: [
        { id: 'history-list', text: '浙江东阳木雕、云南剑川木雕均列入国家级非物质文化遗产代表性项目名录。', src: 'ihchina' },
      ],
    },
  },
  metal: {
    lede: '铜胎掐丝，填釉烧蓝，金与色相映。',
    sections: {
      history: [
        { id: 'history-list', text: '景泰蓝制作技艺列入国家级非物质文化遗产代表性项目名录，北京是其主要传承地。', src: 'ihchina' },
      ],
    },
  },
};

export function findParagraph(craft, paraId) {
  const album = ALBUM[craft];
  if (!album) return null;
  for (const [section, paras] of Object.entries(album.sections)) {
    const para = paras.find(p => p.id === paraId);
    if (para) return { section, para };
  }
  return null;
}
