// 地区与样品仅用于原型布局。上线前需替换为经核验的项目记录与素材。

export const ALL_REGIONS = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽',
  '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
  '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆', '香港', '澳门', '台湾',
];

// key 用来拼承艺之声的后台讲解条目编号（chengyi-<key>-<品类>，见 js/ai/context.js）
// x / y 为山河意境图（1600 × 1000）上的百分比位置，只表示大致方位，不是地理坐标
export const SAMPLES = [
  { region: '江西', key: 'jiangxi', crafts: ['ceramic'], items: { ceramic: '景德镇手工制瓷技艺' }, x: 68, y: 68 },
  { region: '陕西', key: 'shaanxi', crafts: ['paper'], items: { paper: '安塞剪纸' }, x: 53, y: 50 },
  { region: '浙江', key: 'zhejiang', crafts: ['ceramic', 'wood'], items: { ceramic: '龙泉青瓷烧制技艺', wood: '东阳木雕' }, x: 79, y: 61 },
  { region: '河北', key: 'hebei', crafts: ['paper'], items: { paper: '蔚县剪纸' }, x: 63, y: 37 },
  { region: '贵州', key: 'guizhou', crafts: ['textile'], items: { textile: '苗族蜡染技艺' }, x: 52, y: 74 },
  { region: '云南', key: 'yunnan', crafts: ['wood'], items: { wood: '剑川木雕' }, x: 40, y: 82 },
  { region: '北京', key: 'beijing', crafts: ['metal'], items: { metal: '景泰蓝制作技艺' }, x: 71, y: 25 },
  { region: '新疆', key: 'xinjiang', crafts: ['textile'], items: { textile: '艾德莱斯绸织染技艺' }, x: 20, y: 32 },
];

export const sampleOf = region => SAMPLES.find(s => s.region === region);

// 产地样品照片的作品参数：按产地挑最有代表性的样子（景德镇青花、龙泉青瓷、安塞红纸团花、蔚县方形窗花）
const SAMPLE_STATES = {
  江西: { ceramic: { shape: 'vase', color: 'white', pattern: 'flower' } },
  浙江: { ceramic: { shape: 'jar', color: 'jade', pattern: 'plain' } },
  陕西: { paper: { shape: 'round', color: 'red', pattern: 'flower', complexity: 1.2 } },
  河北: { paper: { shape: 'square', color: 'red', pattern: 'cloud' } },
};
const BASE = { shape: 'vase', color: 'white', pattern: 'flower', width: 1, complexity: 1, step: 2 };

export const sampleState = (craft, region) => {
  const s = { ...BASE, ...(craft === 'paper' ? { shape: 'round', color: 'red' } : {}), ...(SAMPLE_STATES[region]?.[craft] || {}) };
  return s;
};
