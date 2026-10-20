// 月曆視圖（FullCalendar，透過 CDN 載入）
import { activeUsers, eventList, typeOf, userName, myUid, ensureEventsFrom, state, meetingList } from '../data.js';
import { periodShort } from '../schedule.js';
import { dayInfo, ensureRange } from '../holidays.js';
import { esc, ymd, addDays, WEEK } from '../utils.js';
import { openEventViewer, openEventEditor } from '../eventForm.js';
import { openExportDialog } from '../export.js';
import { getMemosOnDay, openDayMemoModal } from './stickyHub.js';

export function mountCalendar(el, ctx) {
  if (!window.FullCalendar) {
    el.innerHTML = '<div class="empty">月曆元件載入失敗，請確認網路連線後重新整理。</div>';
    return {};
  }
  let person = '';
  let typeFilter = '';
  let holidayKey = '';
  const cellClass = date => {
    const i = dayInfo(ymd(date));
    return [i.off ? 'is-off' : '', i.makeup ? 'is-makeup' : ''].filter(Boolean);
  };

  el.innerHTML = `
    <div class="toolbar">
      <div class="nav-group">
        <button class="btn icon" data-act="prev">‹</button>
        <button class="btn" data-act="today">本月</button>
        <button class="btn icon" data-act="next">›</button>
      </div>
      <h2 class="view-title" data-title></h2>
      <div class="filters">
        <button class="btn ghost" data-act="new-memo" style="border-color:#fcd34d;background:#fffbeb;color:#b45309;font-weight:700">📌 新增備忘錄</button>
        <select data-f="person"></select>
        <select data-f="type"></select>
        <button class="btn" data-act="export">⬇ 匯出 Excel</button>
      </div>
    </div>
    <div class="card cal-wrap"><div data-cal></div></div>
    <div class="legend" data-legend></div>`;
  const q = s => el.querySelector(s);

  const [y, m] = ctx.month.split('-').map(Number);
  const cal = new window.FullCalendar.Calendar(q('[data-cal]'), {
    initialView: 'dayGridMonth',
    initialDate: new Date(y, m - 1, 1),
    headerToolbar: false,
    height: 'auto',
    fixedWeekCount: false,
    firstDay: 0,
    dayMaxEventRows: 4,
    eventOrder: 'order,title',
    dayHeaderContent: a => WEEK[a.date.getDay()],
    dayCellContent: a => ({ html: dayCellHtml(a.date) }),
    moreLinkContent: a => `還有 ${a.num} 筆`,
    dayCellClassNames: a => cellClass(a.date),
    datesSet: info => {
      const from = ymd(info.start);
      const to = addDays(ymd(info.end), -1);
      const mid = cal.getDate();
      ctx.month = `${mid.getFullYear()}-${String(mid.getMonth() + 1).padStart(2, '0')}`;
      q('[data-title]').textContent = `${mid.getFullYear()} 年 ${mid.getMonth() + 1} 月`;
      ensureEventsFrom(from);
      const key = from + to;
      if (holidayKey !== key) {
        holidayKey = key;
        // 假日資料載入後，以新的函式重新設定讓日期格重繪（不會觸發 datesSet）
        ensureRange(from, to).then(() => {
          cal.setOption('dayCellClassNames', a => cellClass(a.date));
          cal.setOption('dayCellContent', a => ({ html: dayCellHtml(a.date) }));
        });
      }
      refresh();
    },
    dateClick: a => {
      if (a.jsEvent?.target?.closest('[data-cal-memo-pill]')) {
        openDayMemoModal(a.dateStr, refresh);
        return;
      }
      openEventEditor({ date: a.dateStr });
    },
    eventClick: a => {
      if (a.event.id.startsWith('m_')) {
        location.hash = '#/meeting';
        return;
      }
      const ev = state.events.get(a.event.id);
      if (ev) openEventViewer(ev);
    },
  });

  function dayCellHtml(date) {
    const dStr = ymd(date);
    const i = dayInfo(dStr);
    const label = i.name ? `<span class="hol-name">${esc(i.name)}</span>` : i.makeup ? '<span class="hol-name makeup">補班</span>' : '';
    const memos = getMemosOnDay(dStr);
    let memoBadge = '';
    if (memos.length > 0) {
      const pending = memos.filter(m => !m.done);
      const tipText = memos.map(m => `${m.done ? '✅' : '📌'} ${m.text}`).join('\n');
      if (pending.length > 0) {
        memoBadge = `<span class="cal-memo-pill" data-cal-memo-pill="${dStr}" title="${esc(tipText + '\n(點擊檢視或打勾消除)')}">📌 ${pending.length}</span>`;
      } else {
        memoBadge = `<span class="cal-memo-pill all-done" data-cal-memo-pill="${dStr}" title="${esc(tipText + '\n(全部已完成)')}">✅ ${memos.length}</span>`;
      }
    }
    return `<span class="dnum">${date.getDate()}</span><span style="display:inline-flex;align-items:center;gap:4px;margin-left:auto">${memoBadge}${label}</span>`;
  }

  function refresh() {
    cal.setOption('dayCellContent', a => ({ html: dayCellHtml(a.date) }));
    // 篩選器選項
    const users = activeUsers();
    const me = myUid();
    q('[data-f=person]').innerHTML = `<option value="">全部組員</option>` + users.map(u => `<option value="${esc(u.uid)}" ${u.uid === person ? 'selected' : ''}>${esc(u.displayName)}${u.uid === me ? '（我）' : ''}</option>`).join('');
    q('[data-f=type]').innerHTML = `<option value="">全部類型</option>` + state.types.map(t => `<option value="${esc(t.id)}" ${t.id === typeFilter ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
    q('[data-legend]').innerHTML = state.types.filter(t => t.active !== false).map(t => `<span><i style="background:${esc(t.color)}"></i>${esc(t.name)}</span>`).join('');

    const items = eventList()
      .filter(ev => (!person || ev.participantUids.includes(person)) && (!typeFilter || ev.typeId === typeFilter))
      .map(ev => {
        const t = typeOf(ev.typeId);
        const names = ev.participantUids.map(userName).join('、');
        return {
          id: ev.id,
          title: `${names}｜${t.name}${ev.period !== 'full' ? ' ' + periodShort(ev) : ''}${ev.location ? '・' + ev.location : ''}`,
          start: ev.startDate,
          end: addDays(ev.endDate, 1),
          allDay: true,
          backgroundColor: t.color,
          borderColor: t.color,
          textColor: '#fff',
          order: t.order ?? 99,
        };
      });

    // 加入月會標記（若未受人員或類型過濾）
    if (!person && !typeFilter) {
      meetingList().forEach(m => {
        items.push({
          id: `m_${m.id}`,
          title: `💼 月會 ${m.startTime || ''}–${m.endTime || ''}`,
          start: m.date,
          end: addDays(m.date, 1),
          allDay: true,
          backgroundColor: '#1e293b',
          borderColor: 'var(--yb)',
          textColor: '#fff',
          order: -1, // 置頂顯示
        });
      });
    }

    cal.batchRendering(() => {
      cal.getEventSources().forEach(s => s.remove());
      cal.addEventSource(items);
    });
  }

  q('[data-act=prev]').onclick = () => cal.prev();
  q('[data-act=next]').onclick = () => cal.next();
  q('[data-act=today]').onclick = () => cal.today();
  q('[data-act=new-memo]').onclick = () => openDayMemoModal(ymd(), refresh);
  q('[data-act=export]').onclick = () => openExportDialog(ctx.month);
  q('[data-f=person]').onchange = e => { person = e.target.value; refresh(); };
  q('[data-f=type]').onchange = e => { typeFilter = e.target.value; refresh(); };

  cal.render();
  return { update: refresh, destroy: () => cal.destroy() };
}
