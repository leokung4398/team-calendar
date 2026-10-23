// 行事曆整合模組：月曆 (Calendar) 與 總表 (Grid) 雙重視圖切換
import { activeUsers, eventList, typeOf, userName, myUid, isAdmin, ensureEventsFrom, state, meetingList, meetingOn, isFieldStaff } from '../data.js';
import { periodShort, eventsOfUserOn, timeOnDayText } from '../schedule.js';
import { dayInfo, ensureRange } from '../holidays.js';
import { esc, ymd, addDays, eachDay, monthRange, shiftMonth, weekdayZh, avatar, WEEK } from '../utils.js';
import { openEventViewer, openEventEditor } from '../eventForm.js';
import { openExportDialog } from '../export.js';
import { getMemosOnDay, openDayMemoModal } from './stickyHub.js?v=20261023v59';

export function mountSchedule(el, ctx) {
  // 偏好視圖：'calendar' (月曆) 或 'grid' (總表)
  let currentView = localStorage.getItem('preferred_sched_view') || 'calendar';

  let person = '';
  let typeFilter = '';
  let holidayKey = '';
  let cal = null;
  let gridScrolled = false;

  el.innerHTML = `
    <div class="toolbar">
      <div class="nav-group">
        <button class="btn icon" data-act="prev" title="上個月">‹</button>
        <button class="btn" data-act="today">本月</button>
        <button class="btn icon" data-act="next" title="下個月">›</button>
      </div>
      <h2 class="view-title" data-title></h2>
      <div class="filters">
        <div class="seg" data-switcher title="切換檢視視圖">
          <label><input type="radio" name="schedViewMode" value="calendar" ${currentView === 'calendar' ? 'checked' : ''}><span>月曆</span></label>
          <label><input type="radio" name="schedViewMode" value="grid" ${currentView === 'grid' ? 'checked' : ''}><span>總表</span></label>
        </div>
        <select data-f="person" title="組員篩選" ${currentView === 'grid' ? 'style="display:none;"' : ''}></select>
        <select data-f="type" title="行程類型篩選" ${currentView === 'grid' ? 'style="display:none;"' : ''}></select>
        <button class="btn" data-act="export">⬇ <span class="hide-sm">匯出 Excel</span></button>
      </div>
    </div>

    <!-- 月曆視圖面板 -->
    <div class="sched-panel" data-panel="calendar" ${currentView === 'calendar' ? '' : 'hidden'}>
      <div class="card cal-wrap"><div data-cal></div></div>
    </div>

    <!-- 總表面板 -->
    <div class="sched-panel" data-panel="grid" ${currentView === 'grid' ? '' : 'hidden'}>
      <div class="card grid-wrap"><div class="grid-scroll" data-grid></div></div>
      <p class="hint" style="margin-top: 8px;">點選空白格可新增自己的行程（管理員可替任何組員新增）；點選色塊可查看細節。</p>
    </div>

    <!-- 圖例說明 (兩視圖共用) -->
    <div class="legend" data-legend></div>
  `;

  const q = s => el.querySelector(s);

  // 假日 Cell 樣式判定
  const cellClass = date => {
    const i = dayInfo(ymd(date));
    return [i.off ? 'is-off' : '', i.makeup ? 'is-makeup' : ''].filter(Boolean);
  };

  function dayCellHtml(date) {
    const i = dayInfo(ymd(date));
    const label = i.name ? `<span class="hol-name">${esc(i.name)}</span>` : i.makeup ? '<span class="hol-name makeup">補班</span>' : '';
    return `<span class="dnum">${date.getDate()}</span>${label}`;
  }

  // ---- 1. FullCalendar 月曆初始化 ----
  function initCalendar() {
    if (!window.FullCalendar) {
      q('[data-panel=calendar]').innerHTML = '<div class="empty">月曆元件載入失敗，請確認網路連線後重新整理。</div>';
      return;
    }
    const [y, m] = (ctx.month || ymd().slice(0, 7)).split('-').map(Number);
    cal = new window.FullCalendar.Calendar(q('[data-cal]'), {
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
        updateTitle();
        ensureEventsFrom(from);
        const key = from + to;
        if (holidayKey !== key) {
          holidayKey = key;
          ensureRange(from, to).then(() => {
            cal.setOption('dayCellClassNames', a => cellClass(a.date));
            cal.setOption('dayCellContent', a => ({ html: dayCellHtml(a.date) }));
          });
        }
        refreshCalendar();
      },
      dateClick: a => openEventEditor({ date: a.dateStr }),
      eventClick: a => {
        if (a.event.id.startsWith('m_')) {
          location.hash = '#/meeting';
          return;
        }
        if (a.event.id.startsWith('memo_')) {
          const dayStr = a.event.extendedProps?.memoDate || ymd(a.event.start);
          openDayMemoModal(dayStr, () => refreshCalendar());
          return;
        }
        const ev = state.events.get(a.event.id);
        if (ev) openEventViewer(ev);
      },
    });

    cal.render();
  }

  function updateTitle() {
    const [y, m] = ctx.month.split('-').map(Number);
    q('[data-title]').textContent = `${y} 年 ${m} 月`;
  }

  function refreshCalendar() {
    if (!cal) return;
    // 篩選器選項
    const users = activeUsers();
    const me = myUid();
    q('[data-f=person]').innerHTML = `<option value="">全部組員</option>` + users.map(u => `<option value="${esc(u.uid)}" ${u.uid === person ? 'selected' : ''}>${esc(u.displayName)}${u.uid === me ? '（我）' : ''}</option>`).join('');
    q('[data-f=type]').innerHTML = `<option value="">全部類型</option>` + state.types.map(t => `<option value="${esc(t.id)}" ${t.id === typeFilter ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
    updateLegend();

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
          title: `月會 ${m.startTime || ''}–${m.endTime || ''}`,
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

    // 加入備忘錄提醒標記（點擊即可查看或勾選消除）
    if (!typeFilter) {
      const memosDoc = state.toolsData.get('memos') || { list: [] };
      const allMemos = Array.isArray(memosDoc.list) ? memosDoc.list : [];
      const visibleMemos = allMemos.filter(m => (m.scope === 'team' || m.uid === me) && (!person || m.uid === person || m.scope === 'team'));
      visibleMemos.forEach(m => {
        items.push({
          id: `memo_${m.id}`,
          title: `${m.done ? '[完成] ' : '[備忘] '}${m.scope === 'team' ? '[全組] ' : ''}${m.text}`,
          start: m.date,
          end: addDays(m.date, 1),
          allDay: true,
          backgroundColor: m.done ? '#e2e8f0' : '#fef3c7',
          borderColor: m.done ? '#cbd5e1' : '#f59e0b',
          textColor: m.done ? '#64748b' : '#92400e',
          order: 0,
          extendedProps: { memoDate: m.date },
        });
      });
    }

    cal.batchRendering(() => {
      cal.getEventSources().forEach(s => s.remove());
      cal.addEventSource(items);
    });
  }

  // ---- 2. 總表 (Grid) 渲染 ----
  function renderGrid() {
    updateTitle();
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
      const dayMemos = getMemosOnDay(d);
      const pendingMemos = dayMemos.filter(x => !x.done);
      const cls = [i.off ? 'off' : '', i.makeup ? 'makeup' : '', d === today ? 'today' : '', mItem ? 'has-meeting' : ''].join(' ');
      const tipParts = [i.name, i.makeup ? '補班' : '', mItem ? `月會 ${mItem.startTime || ''}–${mItem.endTime || ''}` : '', dayMemos.length ? `備忘 ${dayMemos.length} 筆` : ''].filter(Boolean);
      const tip = tipParts.join(' / ');
      const mIcon = mItem ? `<div class="meeting-dot" title="${esc(tip)}" style="font-size:10px;font-weight:800;color:#1e293b">月會</div>` : '';
      const memoPin = dayMemos.length
        ? `<div class="memo-dot" data-open-memo="${d}" title="${esc(dayMemos.map(x => `${x.done ? '[完成]' : '[待辦]'} ${x.text}`).join('\n'))}" style="cursor:pointer;font-size:10px;line-height:1.1;margin-top:2px;color:${pendingMemos.length ? '#d97706' : '#94a3b8'};font-weight:800">備忘${pendingMemos.length || ''}</div>`
        : '';
      return `<th class="${cls}" data-head-day="${d}" ${tip ? `title="${esc(tip)}"` : ''} style="cursor:pointer"><div class="dn">${Number(d.slice(8))}</div><div class="wd">${weekdayZh(d)}</div>${mIcon}${memoPin}${i.name ? '<div class="hol-dot"></div>' : ''}</th>`;
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
    updateLegend();

    // 首次進入時把今天捲到可見範圍
    if (ctx.month === today.slice(0, 7) && !gridScrolled) {
      gridScrolled = true;
      const th = q('thead th.today');
      const sc = q('[data-grid]');
      if (th && sc) sc.scrollLeft = Math.max(0, th.offsetLeft - 200);
    }
  }

  function shortTime(ev, d) {
    const s = timeOnDayText(ev, d);
    return s === '整天' ? '' : s.replace(/–$/, '起');
  }

  function updateLegend() {
    q('[data-legend]').innerHTML = state.types.filter(t => t.active !== false).map(t => `<span><i style="background:${esc(t.color)}"></i>${esc(t.name)}</span>`).join('');
  }

  // 總表互動事件
  q('[data-grid]').addEventListener('click', e => {
    const memoBtn = e.target.closest('[data-open-memo], th[data-head-day]');
    if (memoBtn) {
      const d = memoBtn.dataset.openMemo || memoBtn.dataset.headDay;
      if (d) openDayMemoModal(d, () => renderGrid());
      return;
    }
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

  // ---- 3. 視圖切換器邏輯 ----
  function switchView(mode) {
    currentView = mode;
    localStorage.setItem('preferred_sched_view', mode);

    const isCal = mode === 'calendar';
    q('[data-panel=calendar]').hidden = !isCal;
    q('[data-panel=grid]').hidden = isCal;

    // 月曆專屬篩選器顯示/隱藏
    q('[data-f=person]').style.display = isCal ? '' : 'none';
    q('[data-f=type]').style.display = isCal ? '' : 'none';

    if (isCal) {
      if (cal) {
        cal.updateSize();
        // 同步月份至 Calendar
        const [y, m] = ctx.month.split('-').map(Number);
        const curCalDate = cal.getDate();
        if (curCalDate.getFullYear() !== y || curCalDate.getMonth() !== (m - 1)) {
          cal.gotoDate(new Date(y, m - 1, 1));
        } else {
          refreshCalendar();
        }
      }
    } else {
      const { from, to } = monthRange(ctx.month);
      ensureEventsFrom(from);
      ensureRange(from, to).then(renderGrid);
      renderGrid();
    }
  }

  q('[data-switcher]').addEventListener('change', e => {
    if (e.target.name === 'schedViewMode') {
      switchView(e.target.value);
    }
  });

  // ---- 4. 工具列月份跳轉 ----
  function navigateMonth(delta) {
    if (delta === 0) {
      ctx.month = ymd().slice(0, 7);
    } else {
      ctx.month = shiftMonth(ctx.month, delta);
    }

    if (currentView === 'calendar' && cal) {
      if (delta === 0) cal.today();
      else if (delta === -1) cal.prev();
      else if (delta === 1) cal.next();
    } else {
      const { from, to } = monthRange(ctx.month);
      ensureEventsFrom(from);
      ensureRange(from, to).then(renderGrid);
      renderGrid();
    }
  }

  q('[data-act=prev]').onclick = () => navigateMonth(-1);
  q('[data-act=next]').onclick = () => navigateMonth(1);
  q('[data-act=today]').onclick = () => navigateMonth(0);
  q('[data-act=export]').onclick = () => openExportDialog(ctx.month);

  q('[data-f=person]').onchange = e => { person = e.target.value; refreshCalendar(); };
  q('[data-f=type]').onchange = e => { typeFilter = e.target.value; refreshCalendar(); };

  // 初始化執行
  updateTitle();
  initCalendar();
  if (currentView === 'grid') {
    switchView('grid');
  } else {
    refreshCalendar();
  }

  return {
    update: () => {
      if (currentView === 'calendar') refreshCalendar();
      else renderGrid();
    },
    destroy: () => {
      cal?.destroy?.();
    }
  };
}
