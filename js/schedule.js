// 行程時間邏輯：時段、重疊判斷、今日狀態
import { APP } from './config.js';
import { toMin, minToHM, fmtMD, weekdayZh, addDays } from './utils.js';

export const PERIODS = [
  { id: 'full', label: '整天' },
  { id: 'am', label: '上午' },
  { id: 'pm', label: '下午' },
  { id: 'custom', label: '自訂時段' },
];

export function periodText(ev) {
  switch (ev.period) {
    case 'am': return `上午 (${APP.periods.am.join('–')})`;
    case 'pm': return `下午 (${APP.periods.pm.join('–')})`;
    case 'custom': return ev.startDate === ev.endDate
      ? `${ev.startTime}–${ev.endTime}`
      : `${fmtMD(ev.startDate)} ${ev.startTime} – ${fmtMD(ev.endDate)} ${ev.endTime}`;
    default: return '整天';
  }
}

export function periodShort(ev) {
  return { full: '全天', am: '上午', pm: '下午' }[ev.period] || ev.startTime || '';
}

export function dateRangeText(ev) {
  if (ev.startDate === ev.endDate) return `${fmtMD(ev.startDate)}(${weekdayZh(ev.startDate)})`;
  return `${fmtMD(ev.startDate)}(${weekdayZh(ev.startDate)}) – ${fmtMD(ev.endDate)}(${weekdayZh(ev.endDate)})`;
}

/**
 * 行程在某一天佔用的時間區間（分鐘）[start, end)，不在當天則回傳 null。
 * 自訂時段跨多天：首日從開始時間起、末日到結束時間止，中間日為整天。
 */
export function intervalOn(ev, day) {
  if (day < ev.startDate || day > ev.endDate) return null;
  switch (ev.period) {
    case 'am': return [toMin(APP.periods.am[0]), toMin(APP.periods.am[1])];
    case 'pm': return [toMin(APP.periods.pm[0]), toMin(APP.periods.pm[1])];
    case 'custom': return [
      day === ev.startDate ? toMin(ev.startTime) : 0,
      day === ev.endDate ? toMin(ev.endTime) : 1440,
    ];
    default: return [0, 1440];
  }
}

/** 找出與候選行程時間重疊、且有共同參與者的其他行程 */
export function findOverlaps(cand, events) {
  const people = new Set(cand.participantUids);
  const out = [];
  for (const ev of events) {
    if (ev.id === cand.id) continue;
    if (!ev.participantUids?.some(u => people.has(u))) continue;
    const from = cand.startDate > ev.startDate ? cand.startDate : ev.startDate;
    const to = cand.endDate < ev.endDate ? cand.endDate : ev.endDate;
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const a = intervalOn(cand, d), b = intervalOn(ev, d);
      if (a && b && a[0] < b[1] && b[0] < a[1]) { out.push(ev); break; }
    }
  }
  return out;
}

/** 某組員在某一天的行程（依開始時間排序） */
export function eventsOfUserOn(uid, day, events) {
  return events
    .filter(ev => ev.participantUids?.includes(uid))
    .map(ev => ({ ev, iv: intervalOn(ev, day) }))
    .filter(x => x.iv)
    .sort((a, b) => a.iv[0] - b.iv[0] || a.iv[1] - b.iv[1]);
}

/**
 * 今日狀態
 * @returns {{ kind:'out'|'office', current:object|null, upcoming:object[], list:object[] }}
 */
export function statusNow(uid, day, nowMin, events) {
  const list = eventsOfUserOn(uid, day, events);
  const current = list.find(x => x.iv[0] <= nowMin && nowMin < x.iv[1]) || null;
  const upcoming = list.filter(x => x.iv[0] > nowMin);
  return { kind: current ? 'out' : 'office', current, upcoming, list };
}

/** 預計回辦公室文字 */
export function returnText(ev, day, iv) {
  if (ev.returnAt) {
    const [d, t] = ev.returnAt.split('T');
    return d === day ? `今天 ${t}` : `${fmtMD(d)}(${weekdayZh(d)}) ${t}`;
  }
  if (ev.endDate > day) {
    return `${fmtMD(ev.endDate)}(${weekdayZh(ev.endDate)}) 行程結束`;
  }
  if (iv && iv[1] < 1440 && ev.period !== 'full') return `約 ${minToHM(iv[1])}`;
  return '今日不進辦公室';
}

export function timeOnDayText(ev, day) {
  const iv = intervalOn(ev, day);
  if (!iv) return '';
  if (iv[0] === 0 && iv[1] === 1440) return '整天';
  if (ev.period === 'am') return '上午';
  if (ev.period === 'pm') return '下午';
  return `${minToHM(iv[0])}–${iv[1] === 1440 ? '' : minToHM(iv[1])}`;
}
