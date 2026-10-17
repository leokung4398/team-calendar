// 人員 × 日期 總表（類似排班表）
import { activeUsers, eventList, typeOf, myUid, isAdmin, ensureEventsFrom, state, meetingOn, isFieldStaff } from '../data.js';
import { eventsOfUserOn, timeOnDayText } from '../schedule.js';
import { dayInfo, ensureRange } from '../holidays.js';
import { esc, ymd, eachDay, monthRange, shiftMonth, weekdayZh, avatar } from '../utils.js';
import { openEventViewer, openEventEditor } from '../eventForm.js';
import { openExportDialog } from '../export.js';

export function mountGrid(el, ctx) {
  el.innerHTML = `
    <div class="toolbar">
      <div class="nav-group">
        <button class="btn icon" data-act="prev">‹</button>
        <button class="btn" data-act="today">本月</button>
        <button class="btn icon" data-act="next">›</button>
      </div>
      <h2 class="view-title" data-title></h2>
      <div class="filters"><button class="btn" data-act="export">⬇ 匯出 Excel</button></div>
    </div>
    <div class="card grid-wrap"><div class="grid-scroll" data-grid></div></div>
    <div class="legend" data-legend></div>
    <p class="hint">點選空白格可新增自己的行程（管理員可替任何組員新增）；點選色塊可查看細節。</p>`;
  const q = s => el.querySelector(s);

  const go = ym => {
    ctx.month = ym;
    const { from, to } = monthRange(ym);
    ensureEventsFrom(from);
    ensureRange(from, to).then(render);
    render();
  };
  q('[data-act=prev]').onclick = () => go(shiftMonth(ctx.month, -1));
  q('[data-act=next]').onclick = () => go(shiftMonth(ctx.month, 1));
  q('[data-act=today]').onclick = () => go(ymd().slice(0, 7));
  q('[data-act=export]').onclick = () => openExportDialog(ctx.month);

  q('[data-grid]').addEventListener('click', e => {
    const chip = e.target.closest('[data-ev]');
    if (chip) {
      const ev = state.events.get(chip.dataset.ev);
      if (ev) openEventViewer(ev);
      return;
    }
    const cell = e.target.closest('td[data-day]');
    if (cell && (cell.dataset.uid === myUid() || isAdmin())) {
      openEventEditor({ date: cell.dataset.day, ownerUid: cell.dataset.uid });
    }
  });

  function render() {
    const [y, m] = ctx.month.split('-').map(Number);
    q('[data-title]').textContent = `${y} 年 ${m} 月`;
    const { from, to } = monthRange(ctx.month);
    const days = eachDay(from, to);
    const today = ymd();
    const events = eventList().filter(ev => ev.endDate >= from && ev.startDate <= to);
    const users = activeUsers();
    const me = myUid();
    const admin = isAdmin();

    const head = days.map(d => {
      const i = dayInfo(d);
      const mItem = meetingOn(d);
      const cls = [i.off ? 'off' : '', i.makeup ? 'makeup' : '', d === today ? 'today' : '', mItem ? 'has-meeting' : ''].join(' ');
      const tipParts = [i.name, i.makeup ? '補班' : '', mItem ? `💼 月會 ${mItem.startTime || ''}–${mItem.endTime || ''}` : ''].filter(Boolean);
      const tip = tipParts.join(' / ');
      const mIcon = mItem ? `<div class="meeting-dot" title="${esc(tip)}">💼</div>` : '';
      return `<th class="${cls}" ${tip ? `title="${esc(tip)}"` : ''}><div class="dn">${Number(d.slice(8))}</div><div class="wd">${weekdayZh(d)}</div>${mIcon}${i.name ? '<div class="hol-dot"></div>' : ''}</th>`;
    }).join('');

    const body = users.map(u => {
      const editable = u.uid === me || admin;
      const cells = days.map(d => {
        const i = dayInfo(d);
        const list = eventsOfUserOn(u.uid, d, events);
        const chips = list.map(({ ev }) => {
          const t = typeOf(ev.typeId);
          const tip = `${t.name}｜${timeOnDayText(ev, d)}${ev.location ? '｜' + ev.location : ''}`;
          return `<span class="gchip" data-ev="${esc(ev.id)}" style="--c:${esc(t.color)}" title="${esc(tip)}"><b>${esc(t.name.slice(0, 2))}</b><small>${esc(shortTime(ev, d))}</small></span>`;
        }).join('');
        const cls = [i.off ? 'off' : '', d === today ? 'today' : '', editable ? 'editable' : ''].join(' ');
        return `<td class="${cls}" data-day="${d}" data-uid="${esc(u.uid)}">${chips}</td>`;
      }).join('');
      const isField = isFieldStaff(u);
      const fieldBadge = isField ? `<span style="font-size:10px; font-weight:700; color:#0369a1; background:#e0f2fe; border:1px solid #bae6fd; padding:0 4px; border-radius:3px; margin-left:4px; vertical-align:middle;">外勤</span>` : '';
      const titleHtml = u.title ? `<small class="who-title muted tiny" style="display:block; font-weight:normal; line-height:1.2;">${esc(u.title)}</small>` : '';
      return `<tr><th class="who"><div class="who-in">${avatar(u, 24)}<div><span>${esc(u.displayName)}${fieldBadge}</span>${titleHtml}</div></div></th>${cells}</tr>`;
    }).join('');

    q('[data-grid]').innerHTML = `<table class="sched"><thead><tr><th class="who corner">組員</th>${head}</tr></thead><tbody>${body}</tbody></table>`;
    q('[data-legend]').innerHTML = state.types.filter(t => t.active !== false).map(t => `<span><i style="background:${esc(t.color)}"></i>${esc(t.name)}</span>`).join('');

    // 首次進入時把今天捲到可見範圍
    if (ctx.month === today.slice(0, 7) && !render.scrolled) {
      render.scrolled = true;
      const th = q('thead th.today');
      const sc = q('[data-grid]');
      if (th) sc.scrollLeft = Math.max(0, th.offsetLeft - 200);
    }
  }

  function shortTime(ev, d) {
    const s = timeOnDayText(ev, d);
    return s === '整天' ? '' : s.replace(/–$/, '起');
  }

  go(ctx.month);
  return { update: render };
}
