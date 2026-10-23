// 今日動態：一眼看到每位組員現在在哪、何時回來
import { activeUsers, eventList, typeOf, userName, userOf, myUid, ensureEventsFrom, meetingOn, isFieldStaff } from '../data.js';
import { statusNow, eventsOfUserOn, returnText, timeOnDayText } from '../schedule.js';
import { dayInfo, ensureRange } from '../holidays.js';
import { esc, ymd, addDays, fmtMD, weekdayZh, nowMinutes, avatar, minToHM } from '../utils.js';
import { openEventViewer, openEventEditor } from '../eventForm.js';
import { bike, dock, rideBar } from '../yb.js';
import { renderDailyVibeBar } from './vibeBar.js?v=20261023v59';
import { renderStickyHub } from './stickyHub.js?v=20261023v59';

export function mountToday(el) {
  let day = ymd();
  let filter = 'all';

  el.innerHTML = `
    <div class="toolbar">
      <div class="nav-group">
        <button class="btn icon" data-act="prev" title="前一天">‹</button>
        <button class="btn" data-act="today">今天</button>
        <button class="btn icon" data-act="next" title="後一天">›</button>
        <input type="date" class="date-input" data-act="pick">
      </div>
      <h2 class="view-title" data-title></h2>
      <div class="toolbar-end"></div>
    </div>
    <div data-vibe></div>
    <div data-banner></div>
    <div class="today-bento-layout">
      <div class="today-main-col">
        <div data-ride></div>
        <section class="station detail card" data-detail>
          <div class="st-head st-toggle" data-toggle role="button" tabindex="0" aria-expanded="false">
            <span class="st-title">${dock(16)} 經營 Team ・詳細資料</span>
            <span class="st-tools">
              <span class="st-sum" data-sum></span>
              <span class="seg small on-dark" data-filter>
                <label><input type="radio" name="tf" value="all" checked><span>全部</span></label>
                <label><input type="radio" name="tf" value="out"><span>不在辦公室</span></label>
              </span>
              <span class="st-chev"><span data-chev-text>展開</span>
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
            </span>
          </div>
          <div class="st-collapse"><div class="st-collapse-in">
            <div class="st-detail-body"><div class="member-grid" data-grid></div></div>
          </div></div>
        </section>
      </div>
      <aside class="today-side-col" data-sticky-hub></aside>
    </div>`;

  const q = s => el.querySelector(s);
  const go = d => { day = d; ensureEventsFrom(d); ensureRange(d, d).then(render); render(); };
  q('[data-act=prev]').onclick = () => go(addDays(day, -1));
  q('[data-act=next]').onclick = () => go(addDays(day, 1));
  q('[data-act=today]').onclick = () => go(ymd());
  q('[data-act=pick]').onchange = e => e.target.value && go(e.target.value);
  q('[data-filter]').onchange = e => { filter = e.target.value; render(); };

  // 詳細資料：預設收合
  const detail = q('[data-detail]');
  const setOpen = open => {
    detail.classList.toggle('open', open);
    q('[data-toggle]').setAttribute('aria-expanded', String(open));
    q('[data-chev-text]').textContent = open ? '收合' : '展開';
  };
  q('[data-toggle]').addEventListener('click', e => {
    if (e.target.closest('[data-filter]')) return;
    setOpen(!detail.classList.contains('open'));
  });
  q('[data-toggle]').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('[data-filter]')) { e.preventDefault(); setOpen(!detail.classList.contains('open')); }
  });

  q('[data-grid]').addEventListener('click', e => {
    const evEl = e.target.closest('[data-ev]');
    if (evEl) {
      const ev = eventList().find(x => x.id === evEl.dataset.ev);
      if (ev) openEventViewer(ev);
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add) openEventEditor({ date: day, ownerUid: add.dataset.add });
  });

  q('[data-ride]').addEventListener('click', e => {
    const go = e.target.closest('[data-goto]');
    if (go) {
      const target = q(`[data-grid] [data-uid="${CSS.escape(go.dataset.goto)}"]`);
      if (target) {
        const wasOpen = detail.classList.contains('open');
        setOpen(true);
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.remove('flash'); void target.offsetWidth; target.classList.add('flash');
        }, wasOpen ? 0 : 380);
      }
      return;
    }
    const evEl = e.target.closest('[data-ev]');
    if (evEl) {
      const ev = eventList().find(x => x.id === evEl.dataset.ev);
      if (ev) openEventViewer(ev);
    }
  });

  function render() {
    // 若使用者正聚焦在備忘錄或揪團輸入框打字中，避免背景快照或每分鐘計時器強制重繪覆蓋輸入狀態
    const activeEl = document.activeElement;
    const isTypingInHub = activeEl && q('[data-sticky-hub]')?.contains(activeEl) && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName);
    renderDailyVibeBar(q('[data-vibe]'), () => renderDailyVibeBar(q('[data-vibe]')));
    if (!isTypingInHub) {
      renderStickyHub(q('[data-sticky-hub]'), day, () => renderStickyHub(q('[data-sticky-hub]'), day));
    }
    const isToday = day === ymd();
    const now = nowMinutes();
    const events = eventList();
    const info = dayInfo(day);
    const mToday = meetingOn(day);
    let mBanner = '';
    if (mToday) {
      mBanner = `
        <div class="card banner-meeting">
          <div class="bm-left">
            <span class="bm-tag">經營 Team 月會</span>
            <span class="bm-time">${esc(mToday.startTime)} – ${esc(mToday.endTime)}</span>
            <span class="bm-loc">${esc(mToday.location || '總公司會議室')}</span>
            <span class="bm-rec muted small-text">（紀錄人：${esc(userName(mToday.recorderUid))}）</span>
          </div>
          <div class="bm-right">
            ${mToday.meetUrl ? `
              <a href="${esc(mToday.meetUrl)}" target="_blank" rel="noopener noreferrer" class="btn primary small meet-btn">
                加入 Google Meet
              </a>` : ''}
            <a href="#/meeting" class="btn small ghost">檢視議程</a>
          </div>
        </div>`;
    }

    q('[data-title]').textContent = `${fmtMD(day)}（${weekdayZh(day)}）${isToday ? '今天' : ''}`;
    q('[data-act=pick]').value = day;
    const holBanner = info.name || info.off
      ? `<div class="banner holiday">${info.name ? esc(info.name) : '週末'}・休假日</div>`
      : info.makeup ? `<div class="banner makeup">補班日</div>` : '';
    q('[data-banner]').innerHTML = mBanner + holBanner;

    const rows = activeUsers().map(u => {
      const st = isToday
        ? statusNow(u.uid, day, now, events)
        : (() => { const list = eventsOfUserOn(u.uid, day, events); return { kind: list.length ? 'sched' : 'office', current: null, upcoming: list, list }; })();
      return { u, st };
    });
    const workday = !(info.name || info.off);
    q('[data-ride]').innerHTML = board(rows, isToday, now, isToday && workday);
    q('[data-sum]').textContent = `${rows.length} 位組員的完整行程`;

    const order = r => (r.st.kind === 'out' ? 0 : r.st.list.length ? 1 : 2);
    const me = myUid();
    const shown = rows
      .filter(r => filter === 'all' || (isToday ? r.st.kind === 'out' : r.st.list.length))
      .sort((a, b) => (a.u.uid === me ? -1 : b.u.uid === me ? 1 : order(a) - order(b)));

    q('[data-grid]').innerHTML = shown.length
      ? shown.map(r => card(r.u, r.st, isToday)).join('')
      : `<div class="empty yb-empty"><div class="bike-badge-20">${bike(72)}</div><div>${filter === 'out' ? '大家都在站上，沒有人外出' : '目前沒有符合的組員'}</div></div>`;
  }

  // ---------- 速查面板（接電話時一眼看懂誰在、誰不在） ----------
  function board(rows, isToday, now, showRide) {
    const me = myUid();
    const outRows = rows.filter(r => (isToday ? r.st.kind === 'out' : r.st.list.length));
    const inRows = rows.filter(r => !outRows.includes(r));
    const nameOf = u => `${esc(u.displayName)}${u.uid === me ? '<span class="me-tag">我</span>' : ''}`;

    const outRow = ({ u, st }) => {
      const x = isToday ? st.current : st.list[0];
      const ev = x.ev, t = typeOf(ev.typeId);
      const more = !isToday && st.list.length > 1 ? `<small class="muted">＋${st.list.length - 1} 筆</small>` : '';
      return `
        <div class="sb-row" data-ev="${esc(ev.id)}" title="點擊查看行程細節">
          <span class="sb-who" data-goto="${esc(u.uid)}">${avatar(userOf(u.uid), 26)}<b>${nameOf(u)}</b></span>
          <span class="sb-what"><span class="sb-type" style="--c:${esc(t.color)}">${esc(t.name)}</span><span class="sb-loc">${esc(ev.reason || '')}</span>${more}</span>
          <span class="sb-back"><i>${isToday ? '回來' : '時間'}</i>${esc(isToday ? returnText(ev, day, x.iv) : timeOnDayText(ev, day))}</span>
        </div>`;
    };
    const inChip = ({ u, st }) => {
      const isField = isFieldStaff(u);
      const isOfficeDuty = st.list.some(x => x.ev.typeId === 'office');
      const next = isToday ? st.upcoming[0] : null;
      let hint = next ? `<small title="${esc(typeOf(next.ev.typeId).name)}">${esc(minToHM(next.iv[0]))} ${esc(typeOf(next.ev.typeId).name)}</small>` : '';
      if (isField) {
        hint = isOfficeDuty
          ? `<small style="background:#fef3c7; color:#b45309;" title="今日排定進辦公室">進辦</small>`
          : `<small style="background:#e0f2fe; color:#0369a1;" title="平日巡檢外勤">外勤</small>`;
      }
      const titleHint = u.title ? ` title="${esc(u.displayName)}（${esc(u.title)}）"` : '';
      const chipClass = isOfficeDuty ? 'sb-chip in-office' : isField ? 'sb-chip is-field' : 'sb-chip';
      return `<button class="${chipClass}" data-goto="${esc(u.uid)}"${titleHint}>${avatar(userOf(u.uid), 24)}<span>${nameOf(u)}</span>${hint}</button>`;
    };

    const L = isToday ? ['外出中', '在站 / 在勤'] : ['有行程', '無行程'];
    return `
      <section class="station card">
        <div class="st-head">
          <span class="st-title">${dock(16)} 經營 Team ・${isToday ? '即時動態' : esc(fmtMD(day)) + ' 行程'}</span>
          ${isToday ? `<span class="st-time">更新於 ${esc(minToHM(now))}</span>` : ''}
        </div>
        <div class="st-cols">
          <div class="st-col out">
            <div class="st-col-h"><b>${outRows.length}</b> ${L[0]}</div>
            ${outRows.length ? `<div class="sb-list">${outRows.map(outRow).join('')}</div>`
              : `<div class="sb-none">${bike(40)} ${isToday ? '全員在站，沒有人外出' : '當天沒有人登記行程'}</div>`}
          </div>
          <div class="st-col in">
            <div class="st-col-h"><b>${inRows.length}</b> ${L[1]}</div>
            ${inRows.length ? `<div class="sb-chips">${inRows.map(inChip).join('')}</div>` : '<div class="sb-none">—</div>'}
          </div>
        </div>
        ${showRide ? rideBar(now) : ''}
      </section>`;
  }

  function card(u, st, isToday) {
    const cur = st.current;
    const isField = isFieldStaff(u);
    const isOfficeDuty = st.list.some(x => x.ev.typeId === 'office');
    let pill;
    if (!isToday) {
      pill = st.list.length ? `<span class="pill sched">有行程</span>` : `<span class="pill office">無行程</span>`;
    } else if (cur) {
      if (cur.ev.typeId === 'office') {
        pill = `<span class="pill in-office">進辦公室中</span>`;
      } else {
        pill = `<span class="pill out" style="--c:${esc(typeOf(cur.ev.typeId).color)}">${esc(typeOf(cur.ev.typeId).name)}中</span>`;
      }
    } else if (isField) {
      pill = isOfficeDuty
        ? `<span class="pill in-office">在辦公室</span>`
        : `<span class="pill field">常態外勤</span>`;
    } else {
      pill = `<span class="pill office">${dock(11)} 在辦公室</span>`;
    }

    let main = '';
    if (cur) {
      const ev = cur.ev;
      main = `
        <div class="now" data-ev="${esc(ev.id)}">
          <div class="now-line"><b>${esc(timeOnDayText(ev, day))}</b></div>
          ${ev.reason ? `<div class="muted clamp">${esc(ev.reason)}</div>` : ''}
          <div class="now-meta">
            <span>預計回來：<b>${esc(returnText(ev, day, cur.iv))}</b></span>
          </div>
        </div>`;
    }
    const others = (isToday ? st.list.filter(x => x !== cur) : st.list);
    const list = others.length ? `
      <ul class="mini-list">${others.map(x => {
        const t = typeOf(x.ev.typeId);
        const past = isToday && x.iv[1] <= nowMinutes();
        return `<li data-ev="${esc(x.ev.id)}" class="${past ? 'past' : ''}"><i style="background:${esc(t.color)}"></i><span class="t">${esc(timeOnDayText(x.ev, day))}</span> ${esc(t.name)}${x.ev.location ? `・${esc(x.ev.location)}` : ''}${past ? ' <small>(已結束)</small>' : ''}</li>`;
      }).join('')}</ul>` : '';

    const isMe = u.uid === myUid();
    const fieldTag = isField ? `<span class="member-field-tag" title="常態巡檢外勤性質">外勤</span>` : '';
    return `
      <div class="card member ${cur && cur.ev.typeId !== 'office' ? 'is-out' : ''}" data-uid="${esc(u.uid)}">
        <div class="mhead">
          ${avatar(userOf(u.uid), 40)}
          <div class="mname">
            <div class="name">
              ${esc(u.displayName)}${isMe ? '<span class="me-tag">我</span>' : ''}
              ${fieldTag}
              ${u.title ? `<span class="member-title-tag">${esc(u.title)}</span>` : ''}
            </div>
            ${pill}
          </div>
          ${cur && cur.ev.typeId !== 'office' ? `<span class="m-ride" title="外出中">${bike(44, { spin: true })}</span>` : ''}
          ${isMe ? `<button class="btn small ghost" data-add="${esc(u.uid)}" title="登記行程">＋</button>` : ''}
        </div>
        ${main}${list}
        ${!cur && !others.length ? `<div class="muted small-text">${isToday ? (isField ? '平日巡檢外勤中，無其他登記行程' : '今日無外出行程') : '當天無行程'}</div>` : ''}
      </div>`;
  }

  ensureRange(day, day).then(render);
  const timer = setInterval(() => { if (day === ymd() || day === addDays(ymd(), -1)) render(); }, 60 * 1000);
  render();
  return { update: render, destroy: () => clearInterval(timer) };
}
