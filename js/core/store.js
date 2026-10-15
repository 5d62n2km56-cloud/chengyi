// 作品存储：当前版本只存在浏览器本地（免登录）。接入账号与云端时替换本模块即可。

import { validState } from '../data/crafts.js';
import { toast } from './dom.js';
import { emit } from './bus.js';

const KEY = 'chengyi-app-v1';
const MAX_RECORDS = 120;

const store = { version: 1, records: [], last: {} };
export let storageAvailable = true;

try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed.version === 1 && Array.isArray(parsed.records)) {
      store.records = parsed.records
        .filter(r => r && typeof r.id === 'string' && typeof r.name === 'string'
          && ['draft', 'done'].includes(r.status) && validState(r.craft, r.state))
        .slice(0, MAX_RECORDS);
      if (parsed.last && typeof parsed.last === 'object') store.last = parsed.last;
    }
  }
} catch (e) {
  storageAvailable = false;
}

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
    storageAvailable = true;
  } catch (e) {
    storageAvailable = false;
    toast('当前浏览器无法保存，请下载作品留存。');
  }
  emit('records');
  return storageAvailable;
}

export const records = () => store.records;
export const findRecord = id => store.records.find(r => r.id === id);
export const latestRecord = () => [...store.records].sort((a, b) => b.updated - a.updated)[0];
export const lastIdFor = craft => store.last[craft];

export function upsertRecord(record) {
  const i = store.records.findIndex(r => r.id === record.id);
  if (i === -1) store.records.unshift(record);
  else store.records[i] = record;
  store.last[record.craft] = record.id;
  return persist();
}

export function removeRecord(id) {
  const record = findRecord(id);
  store.records = store.records.filter(r => r.id !== id);
  if (record && store.last[record.craft] === id) delete store.last[record.craft];
  return persist();
}
