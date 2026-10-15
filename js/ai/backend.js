// 承艺之声的大模型后台（仓库里的 server/，FastAPI + Dify 非遗知识库）。
// 只在本机打开原型时尝试连接；连不上、出错或被关掉时，承艺之声退回 assistant.js 的规则版。
// 地址参数：?ai=off 关闭后台（冒烟测试用），?ai-origin=http://host:port 换后台地址。

const params = new URLSearchParams(location.search);
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const SESSION_KEY = 'chengyi-ai-session';
const TIMEOUT_MS = 60000;

const config = {
  origin: params.get('ai-origin') || 'http://127.0.0.1:8000',
  enabled: LOCAL && params.get('ai') !== 'off',
};
let health = { ok: null, at: 0 };
let session = null;
try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { /* 重新创建 */ }

const api = path => `${config.origin}/api/v1${path}`;

export class AIError extends Error {
  constructor(code) { super(code); this.code = code; }
}

// 测试与调试用：改地址或开关后重新探测
export function configure(next) {
  Object.assign(config, next);
  health = { ok: null, at: 0 };
  session = null;
}

// 'off' 未启用 · 'unknown' 尚未探测 · 'up' 可用 · 'down' 连不上
export function status() {
  if (!config.enabled) return 'off';
  if (health.ok === null) return 'unknown';
  return health.ok ? 'up' : 'down';
}

// 后台是否可用；结果缓存，可用时 60 秒、不可用时 10 秒后重新探测
export async function ready() {
  if (!config.enabled) return false;
  const age = Date.now() - health.at;
  if (health.ok !== null && age < (health.ok ? 60000 : 10000)) return health.ok;
  try {
    const res = await fetch(`${config.origin}/health`, { signal: AbortSignal.timeout(2500) });
    health = { ok: res.ok, at: Date.now() };
  } catch (e) {
    health = { ok: false, at: Date.now() };
  }
  return health.ok;
}

async function ensureSession() {
  if (session) return session;
  const res = await fetch(api('/sessions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audience: 'general' }),
  });
  if (!res.ok) throw new AIError(`session_${res.status}`);
  const { data } = await res.json();
  session = { id: data.session.id, token: data.session_token };
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) { /* 仅本页有效 */ }
  return session;
}

function post(s, body, signal) {
  return fetch(api(`/sessions/${s.id}/interact/stream`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Token': s.token },
    body: JSON.stringify(body),
    signal,
  });
}

// 读取 SSE：start、delta、reset、result、error。流结束却没有 result 视为失败
async function readStream(res, { onDelta, onReset }) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done }).replace(/\r\n/g, '\n');
    let cut;
    while ((cut = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      let event = 'message';
      const lines = [];
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) lines.push(line.slice(5).trimStart());
      }
      if (!lines.length) continue;
      const data = JSON.parse(lines.join('\n'));
      if (event === 'delta') onDelta?.(data.text || '');
      else if (event === 'reset') onReset?.();
      else if (event === 'result') { reader.cancel().catch(() => {}); return data; }
      else if (event === 'error') throw new AIError(data.code || 'stream_error');
    }
    if (done) throw new AIError('stream_incomplete');
  }
}

// 向 Agent 提问。item 是后台登记的讲解条目编号（见 context.js），question 已带上作品状态。
// 返回后台的 result：{ text, mode, sources, ... }；mode 为 fallback 时由调用方决定是否采用。
export async function ask({ item, question, onDelta, onReset }) {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const body = { event: 'ask', item_id: item, question };
  try {
    let s = await ensureSession();
    let res = await post(s, body, signal);
    if (res.status === 404 || res.status === 410) {
      // 会话过期或后台换了数据库：重新开一个，只重试这一次
      session = null;
      s = await ensureSession();
      res = await post(s, body, signal);
    }
    if (!res.ok) throw new AIError(`http_${res.status}`);
    return await readStream(res, { onDelta, onReset });
  } catch (e) {
    if (!(e instanceof AIError)) health = { ok: false, at: Date.now() };
    throw e instanceof AIError ? e : new AIError(e.name === 'TimeoutError' ? 'timeout' : 'network');
  }
}

// Dify 知识库实际检索到的文档名（去掉扩展名）。本地登记的场景说明不算出处
export const knowledgeTitles = sources => [...new Set((sources || [])
  .filter(s => String(s.id).startsWith('dify:'))
  .map(s => s.title.replace(/\.(docx?|pdf|txt|md)$/i, '')))];
