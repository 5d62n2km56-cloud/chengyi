// 工坊会话：每个品类一件进行中的作品。
// 对话与手动操作都通过 commit() 修改作品，共享同一个撤销栈和自动保存（PRD E-01）。

import { CRAFTS, CRAFT_NAMES, clampState, defaultState, validState } from '../data/crafts.js';
import { clone, makeId } from './dom.js';
import { emit } from './bus.js';
import * as store from './store.js';

const MAX_HISTORY = 50;
const sessions = {};
let activeCraft = 'ceramic';

export const getActiveCraft = () => activeCraft;
export function setActiveCraft(craft) {
  if (CRAFTS[craft]) activeCraft = craft;
}

function blankSession(craft, record) {
  return {
    state: record ? clone(record.state) : defaultState(craft),
    id: record?.id || null,
    history: [],
    future: [],
    messages: [],
  };
}

export function getSession(craft = activeCraft) {
  if (!sessions[craft]) {
    const record = store.findRecord(store.lastIdFor(craft));
    sessions[craft] = blankSession(craft, record?.craft === craft ? record : null);
  }
  return sessions[craft];
}

export function newWork(craft) {
  sessions[craft] = blankSession(craft, null);
  activeCraft = craft;
  return sessions[craft];
}

export function loadRecord(record) {
  sessions[record.craft] = blankSession(record.craft, record);
  activeCraft = record.craft;
  return sessions[record.craft];
}

// 保存当前作品到本机；status 为 draft 或 done
export function saveCurrent(status, name) {
  const ss = getSession();
  let record = store.findRecord(ss.id);
  if (!record) {
    record = {
      id: makeId(),
      craft: activeCraft,
      name: name || `${CRAFT_NAMES[activeCraft]} · 未命名`,
      state: clone(ss.state),
      status: status || 'draft',
      created: Date.now(),
      updated: Date.now(),
    };
    ss.id = record.id;
  } else {
    record = { ...record, state: clone(ss.state), updated: Date.now() };
    if (status) record.status = status;
    if (name) record.name = name;
  }
  const ok = store.upsertRecord(record);
  emit('saved', { ok, status: record.status });
  return record;
}

// 修改作品。返回 false 表示无变化或不合法。
export function commit(patch, { remember = true } = {}) {
  const ss = getSession();
  const next = clampState({ ...ss.state, ...patch });
  if (!validState(activeCraft, next)) return false;
  if (JSON.stringify(next) === JSON.stringify(ss.state)) return false;
  if (remember) {
    ss.history.push(clone(ss.state));
    if (ss.history.length > MAX_HISTORY) ss.history.shift();
    ss.future = [];
  }
  ss.state = next;
  saveCurrent();
  emit('work', { animate: true });
  return true;
}

export function undo() {
  const ss = getSession();
  if (!ss.history.length) return false;
  ss.future.push(clone(ss.state));
  ss.state = ss.history.pop();
  saveCurrent();
  emit('work', {});
  return true;
}

export function redo() {
  const ss = getSession();
  if (!ss.future.length) return false;
  ss.history.push(clone(ss.state));
  ss.state = ss.future.pop();
  saveCurrent();
  emit('work', {});
  return true;
}

// 拖动滑杆时的临时预览，不入撤销栈
export function preview(patch) {
  emit('preview', clampState({ ...getSession().state, ...patch }));
}

export function addMessage(role, text, extra = {}) {
  const ss = getSession();
  const msg = { role, text, ...extra };
  ss.messages.push(msg);
  if (ss.messages.length > 40) ss.messages.shift();
  return msg;
}
