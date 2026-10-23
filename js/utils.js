// 共用工具：日期、跳脫、Modal、Toast

export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const pad = n => String(n).padStart(2, '0');

/** Date -> 'YYYY-MM-DD'（本地時間） */
export function ymd(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** 'YYYY-MM-DD' -> Date（本地午夜） */
export function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s, n) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
export function eachDay(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
/** 'YYYY-MM' -> { from, to } */
export function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${ym}-01`, to: `${ym}-${pad(last)}` };
}
export function shiftMonth(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export const WEEK = '日一二三四五六';
export const weekdayZh = s => WEEK[parseYmd(s).getDay()];
export function fmtMD(s) {
  const [, m, d] = s.split('-').map(Number);
  return `${m}/${d}`;
}
export function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}
export const toMin = hm => {
  const [h, m] = String(hm).split(':').map(Number);
  return h * 60 + m;
};
export const minToHM = n => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

export function timeAgo(ts) {
  if (!ts) return '';
  const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : +ts;
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return '剛剛';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function initials(name) {
  return esc((name || '?').trim().slice(0, 1).toUpperCase());
}

export function avatar(user, size = 32) {
  const name = user?.displayName || '?';
  if (user?.photoURL) {
    return `<img class="avatar" style="width:${size}px;height:${size}px" src="${esc(user.photoURL)}" alt="${esc(name)}" referrerpolicy="no-referrer">`;
  }
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) % 360;
  return `<span class="avatar avatar-fallback" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px;background:hsl(${h} 70% 90%);color:hsl(${h} 55% 32%)">${initials(name)}</span>`;
}

// ---------- Toast ----------
export function toast(msg, type = 'info') {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.classList.add('hide'), 2800);
  setTimeout(() => el.remove(), 3300);
}

// ---------- Modal ----------
let lastModalInstance = null;
export function closeModal() {
  lastModalInstance?.close?.();
}

export function openModal(optsOrHtml, stringOpts = {}) {
  if (typeof optsOrHtml === 'string') {
    const root = document.getElementById('modal-root');
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    const cls = ['modal', stringOpts.wide ? 'wide' : '', stringOpts.xl ? 'xl' : ''].filter(Boolean).join(' ');
    wrap.innerHTML = `<div class="${cls}" role="dialog" aria-modal="true"><div class="modal-body">${optsOrHtml}</div></div>`;
    root.appendChild(wrap);
    const modalEl = wrap.querySelector('.modal');
    const close = () => {
      wrap.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = e => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
    wrap.addEventListener('click', e => { if (e.target.closest('[data-close]')) { e.preventDefault(); close(); } });
    lastModalInstance = { el: modalEl, close, setClean: () => {} };
    return lastModalInstance;
  }
  const { title, body, footer = '', wide = false, onClose, isDirty = null, extraHead = '' } = optsOrHtml || {};
  const root = document.getElementById('modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div style="display:flex; align-items:center; gap:10px;">
          <h3>${esc(title)}</h3>
          ${extraHead ? `<div class="modal-head-extra">${extraHead}</div>` : ''}
        </div>
        <button type="button" class="icon-btn" data-close aria-label="關閉">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  root.appendChild(wrap);
  const modalEl = wrap.querySelector('.modal');
  let closed = false;

  // 自動偵測表單是否有更動，或者呼叫端傳入自訂 isDirty() 函式
  let autoDirty = false;
  wrap.addEventListener('input', () => { autoDirty = true; });
  wrap.addEventListener('change', () => { autoDirty = true; });

  const checkDirty = () => {
    if (typeof isDirty === 'function') {
      try { return isDirty(); } catch (e) { return autoDirty; }
    }
    return autoDirty;
  };

  function triggerShake() {
    modalEl.classList.remove('shake');
    void modalEl.offsetWidth; // 強制重繪觸發動畫
    modalEl.classList.add('shake');
    toast('有未儲存的變更，請儲存或點擊關閉按鈕', 'warn');
  }

  async function requestClose(source = 'btn') {
    if (closed) return;
    if (checkDirty()) {
      if (source === 'backdrop' || source === 'escape') {
        // 方案 A：點擊旁邊灰色背景或按 ESC 時，不直接關閉，震動提示防誤觸
        triggerShake();
        return;
      }
      // 方案 C：主動點擊 ✕ 或「關閉/取消」按鈕時，跳出防呆二次確認
      const ok = await confirmDialog('您有尚未儲存的變更，確定要直接關閉並捨棄修改嗎？', {
        title: '尚未儲存變更',
        okText: '捨棄並關閉',
        danger: true,
      });
      if (!ok) return;
    }
    close();
  }

  function close() {
    if (closed) return;
    closed = true;
    wrap.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  }

  const onKey = e => {
    if (e.key === 'Escape') requestClose('escape');
  };
  document.addEventListener('keydown', onKey);

  wrap.addEventListener('mousedown', e => {
    if (e.target === wrap) requestClose('backdrop');
  });

  wrap.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) {
      e.preventDefault();
      requestClose('btn');
    }
  });

  return { el: modalEl, close, setClean: () => { autoDirty = false; } };
}

/** message 為 HTML，呼叫端需自行 esc() 使用者輸入 */
export function confirmDialog(message, { okText = '確定', danger = false, title = '請確認' } = {}) {
  return new Promise(resolve => {
    const m = openModal({
      title,
      body: `<div class="confirm-msg">${message}</div>`,
      footer: `<button type="button" class="btn" data-close>取消</button><button type="button" class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(okText)}</button>`,
      onClose: () => resolve(false),
    });
    m.el.querySelector('[data-ok]').addEventListener('click', () => { resolve(true); m.close(); });
  });
}

export function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('無法載入 ' + src));
    document.head.appendChild(s);
  });
}
