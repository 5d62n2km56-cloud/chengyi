// 模块之间的事件总线。
// 事件：view（切换场景）、work（作品变化）、chat（对话更新）、say（引导栏旁白）、records（作品列表变化）

const target = new EventTarget();

export const on = (type, fn) => target.addEventListener(type, e => fn(e.detail));
export const emit = (type, detail) => target.dispatchEvent(new CustomEvent(type, { detail }));
