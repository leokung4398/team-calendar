// 台灣國定假日（資料來源：行政院人事行政總處辦公日曆表，經 ruyut/TaiwanCalendar 整理）
// 每年資料會快取在瀏覽器 localStorage 7 天；載入失敗時只標示週末。
import { parseYmd } from './utils.js';

const SRC = y => `https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${y}.json`;
const TTL = 7 * 86400 * 1000;
const years = new Map(); // year -> Map('YYYY-MM-DD' -> { isHoliday, description })
const pending = new Map();

export function loadYear(y) {
  if (years.has(y)) return Promise.resolve();
  if (pending.has(y)) return pending.get(y);
  const p = (async () => {
    const key = `tw-holidays-${y}`;
    try {
      const cached = JSON.parse(localStorage.getItem(key) || 'null');
      if (cached && Date.now() - cached.t < TTL) { years.set(y, toMap(cached.d)); return; }
    } catch { /* ignore */ }
    try {
      const res = await fetch(SRC(y));
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      years.set(y, toMap(data));
      try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })); } catch { /* quota */ }
    } catch (e) {
      console.warn(`國定假日 ${y} 載入失敗，僅標示週末`, e);
      years.set(y, new Map());
    }
  })();
  pending.set(y, p);
  return p;
}

function toMap(list) {
  const m = new Map();
  for (const r of list) {
    const d = String(r.date);
    m.set(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, { isHoliday: !!r.isHoliday, description: r.description || '' });
  }
  return m;
}

export function ensureRange(from, to) {
  const ys = new Set([Number(from.slice(0, 4)), Number(to.slice(0, 4))]);
  return Promise.all([...ys].map(loadYear));
}

/**
 * @returns {{ off:boolean, weekend:boolean, name:string, makeup:boolean }}
 *  off: 是否放假；name: 國定假日名稱；makeup: 週末補班日
 */
export function dayInfo(s) {
  const dow = parseYmd(s).getDay();
  const weekend = dow === 0 || dow === 6;
  const rec = years.get(Number(s.slice(0, 4)))?.get(s);
  if (!rec) return { off: weekend, weekend, name: '', makeup: false };
  return { off: rec.isHoliday, weekend, name: rec.description, makeup: weekend && !rec.isHoliday };
}
