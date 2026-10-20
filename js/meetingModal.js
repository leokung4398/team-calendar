// 月會彈窗：建立 / 編輯月會、單一議題報告資料編輯、會議紀錄填寫
import { state, activeUsers, myUid, isAdmin, suggestNextRecorder, saveMeeting, deleteMeeting, updateMeetingAgendaItem, saveMeetingMinutes, eventList, isFieldStaff, isExcludedFromRecorder } from './data.js';
import { APP } from './config.js';
import { esc, ymd, parseYmd, openModal, confirmDialog, toast, avatar, $ } from './utils.js';
import { eventsOfUserOn } from './schedule.js';
import { startInteractiveMinutesSpotlightTour } from './guideModal.js';

// 建立預設常態議程範本（根據經營Team真實月會報告領域與負責人）
export function getTeamDefaultAgenda(users = activeUsers(), hostUid = '') {
  const findUid = (namePart) => users.find(u => (u.displayName || '').includes(namePart))?.uid || '';
  const haoUid = findUid('葉爵豪') || findUid('豪') || '';
  const qunUid = findUid('陸逸群') || findUid('群') || '';
  return [
    { title: '一、營運狀況與後台管理平台推進', ownerUid: findUid('包于巧') || findUid('巧') || users[0]?.uid || '', duration: 25, links: [] },
    { title: '二、模擬體驗品質分數與各縣市營運改善', ownerUid: haoUid || qunUid || users[0]?.uid || '', altOwnerUid: qunUid, duration: 25, links: [] },
    { title: '三、倉管標準書、抽盤與現場物料管理', ownerUid: findUid('張必忠') || findUid('忠') || users[0]?.uid || '', duration: 20, links: [] },
    { title: '四、車隊安駕管理、超速稽核與合約進度', ownerUid: findUid('蕭琮瀚') || findUid('瀚') || users[0]?.uid || '', duration: 25, links: [] },
    { title: '五、採購預測、請款與關帳時程', ownerUid: findUid('丁美云') || findUid('云') || users[0]?.uid || '', duration: 20, links: [] },
    { title: '六、職安實地檢查、體檢與安全規範', ownerUid: findUid('賴宜平') || findUid('平') || users[0]?.uid || '', duration: 20, links: [] },
    { title: '七、庫存成本金額、週轉天數與物料去化', ownerUid: findUid('陳麒任') || findUid('任') || users[0]?.uid || '', duration: 20, links: [] },
    { title: '八、臨時動議與主管綜合宣達裁示', ownerUid: hostUid || myUid(), duration: 20, links: [] },
  ];
}

/** 開啟月會建立/編輯彈窗（管理員） */
export function openMeetingEditor(m = null) {
  if (!isAdmin()) return toast('只有管理員可以排定月會', 'warn');

  const settings = state.meetingSettings || {};
  const today = ymd();
  const date = m?.date || today;
  const startTime = m?.startTime || settings.defaultStartTime || '14:00';
  const endTime = m?.endTime || settings.defaultEndTime || '16:00';
  const location = m?.location || settings.defaultLocation || '總公司 5F 大會議室';
  const meetUrl = m?.meetUrl || settings.defaultMeetUrl || '';
  const hostUid = m?.hostUid || myUid();

  // 計算該日期有請假或出差的組員名單，推薦紀錄人時跳過
  const dayEvents = eventList();
  const busy = new Set();
  state.users.forEach(u => {
    const evs = eventsOfUserOn(u.uid, date, dayEvents);
    if (evs.some(x => ['leave', 'trip'].includes(x.ev.typeId))) busy.add(u.uid);
  });

  const suggestedRecorder = m?.recorderUid || suggestNextRecorder(date, busy);
  const users = activeUsers();

  function timeSelectOptions(selected, startH = 8, endH = 21, stepMin = 30) {
    const opts = [];
    for (let h = startH; h <= endH; h++) {
      for (let m = 0; m < 60; m += stepMin) {
        if (h === endH && m > 0) break;
        const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        opts.push(val);
      }
    }
    if (selected && !opts.includes(selected)) {
      opts.push(selected);
      opts.sort();
    }
    return opts.map(t => `<option value="${t}" ${t === selected ? 'selected' : ''}>${t}</option>`).join('');
  }

  const userOptions = (selectedUid, isRecorder = false) => users.map(u => {
    let tag = '';
    if (isRecorder) {
      if ((u.displayName || '').includes('徐嘉鴻')) tag = ' [主管免輪值]';
      else if (isFieldStaff(u)) tag = ' [外勤免輪值]';
    }
    if (!tag && busy.has(u.uid)) tag = ' [當天有假/出差]';
    return `
    <option value="${esc(u.uid)}" ${u.uid === selectedUid ? 'selected' : ''}>
      ${esc(u.displayName)}${u.uid === myUid() ? '（我）' : ''}${tag}
    </option>`;
  }).join('');


  // 若既有會議有 agenda 則使用既有的，若新會議則預設帶入範本
  let curAgenda = m ? (Array.isArray(m.agenda) ? JSON.parse(JSON.stringify(m.agenda)) : []) : getTeamDefaultAgenda(users, hostUid);

  const renderAgendaRows = () => curAgenda.map((ag, i) => `
    <div class="meeting-agenda-row" data-ag-idx="${i}">
      <span class="mar-num">${i + 1}</span>
      <input type="text" class="mar-title" placeholder="議題名稱（例：各區調度成效分析）" value="${esc(ag.title || '')}" required>
      <select class="mar-owner">
        <option value="">全體 / 主持人</option>
        ${users.map(u => `<option value="${esc(u.uid)}" ${u.uid === ag.ownerUid ? 'selected' : ''}>${esc(u.displayName)}</option>`).join('')}
      </select>
      <input type="number" class="mar-duration" placeholder="分鐘" value="${ag.duration || 20}" min="5" max="180" step="5" title="預計時間（分鐘）">
      <button type="button" class="btn icon small danger ghost" data-del-ag="true" title="刪除此議題">✕</button>
    </div>`).join('');

  const body = `
    <form id="meeting-form" class="form">
      <div class="row2">
        <label class="field">
          <span>開會日期 <em>*</em></span>
          <input type="date" name="date" value="${esc(date)}" required>
        </label>
        <div class="row2">
          <label class="field">
            <span>開始時間 <em>*</em></span>
            <select name="startTime" required>
              ${timeSelectOptions(startTime || '14:00')}
            </select>
          </label>
          <label class="field">
            <span>結束時間 <em>*</em></span>
            <select name="endTime" required>
              ${timeSelectOptions(endTime || '16:00')}
            </select>
          </label>
        </div>
      </div>

      <div class="row2">
        <label class="field">
          <span>會議地點 <em>*</em></span>
          <input type="text" name="location" value="${esc(location)}" placeholder="例：總公司 5F 大會議室" required>
        </label>
        <label class="field">
          <span>Google Meet 連結</span>
          <input type="url" name="meetUrl" value="${esc(meetUrl)}" placeholder="https://meet.google.com/xxx-xxxx-xxx">
        </label>
      </div>

      <div class="row2">
        <label class="field">
          <span>主持人</span>
          <select name="hostUid">${userOptions(hostUid)}</select>
        </label>
        <label class="field">
          <span>紀錄人 <em>*</em></span>
          <select name="recorderUid">${userOptions(suggestedRecorder, true)}</select>
          <small class="hint">系統依輪值順序建議（主管與外勤免輪值）；若當天有人公休/出差會自動跳過</small>
        </label>
      </div>

      <div class="field" style="margin-top: 8px; border-top: 1px solid var(--line); padding-top: 14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <b>📋 會議報告議題清單 (Agenda)</b>
            <div class="muted tiny">排定後會議紀錄系統將自動為每個議題建立討論重點與裁示輸入區塊</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn small ghost" data-reset-agenda>帶入預設範本</button>
            <button type="button" class="btn small" data-add-ag>＋ 新增議題</button>
          </div>
        </div>
        <div class="meeting-agenda-editor" data-ag-editor>
          ${renderAgendaRows()}
        </div>
      </div>
    </form>`;

  const foot = `
    ${m ? `<button class="btn danger ghost" data-del>取消此場月會</button>` : ''}
    <div class="spacer"></div>
    <button class="btn ghost" data-close>關閉</button>
    <button class="btn primary" data-save>${m ? '儲存變更' : '排定月會'}</button>`;

  const modal = openModal({
    title: m ? '編輯月會資訊' : '排定新月會',
    body,
    footer: foot,
    wide: true,
  });

  const q = s => modal.el.querySelector(s);
  const agEditorEl = q('[data-ag-editor]');

  // 議題增刪與重置互動
  const syncAgendaFromDOM = () => {
    const rows = [...agEditorEl.querySelectorAll('.meeting-agenda-row')];
    curAgenda = rows.map((r, i) => {
      const origLinks = curAgenda[i]?.links || [];
      return {
        title: r.querySelector('.mar-title').value.trim(),
        ownerUid: r.querySelector('.mar-owner').value,
        duration: Number(r.querySelector('.mar-duration').value) || 20,
        links: origLinks,
      };
    });
  };

  q('[data-add-ag]').onclick = () => {
    syncAgendaFromDOM();
    curAgenda.push({ title: '', ownerUid: '', duration: 20, links: [] });
    agEditorEl.innerHTML = renderAgendaRows();
    modal.el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  q('[data-reset-agenda]').onclick = () => {
    curAgenda = getTeamDefaultAgenda(users, q('[name=hostUid]')?.value || hostUid);
    agEditorEl.innerHTML = renderAgendaRows();
    modal.el.dispatchEvent(new Event('change', { bubbles: true }));
    toast('已帶入經營 Team 常態議程範本', 'info');
  };

  agEditorEl.addEventListener('click', e => {
    if (e.target.closest('[data-del-ag]')) {
      syncAgendaFromDOM();
      const row = e.target.closest('.meeting-agenda-row');
      const idx = Number(row.dataset.agIdx);
      curAgenda.splice(idx, 1);
      agEditorEl.innerHTML = renderAgendaRows();
      modal.el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // 監聽日期變動，重新建議紀錄人
  q('[name=date]').onchange = e => {
    const newDate = e.target.value;
    const newBusy = new Set();
    state.users.forEach(u => {
      const evs = eventsOfUserOn(u.uid, newDate, dayEvents);
      if (evs.some(x => ['leave', 'trip'].includes(x.ev.typeId))) newBusy.add(u.uid);
    });
    const nextRec = suggestNextRecorder(newDate, newBusy);
    q('[name=recorderUid]').innerHTML = userOptions(nextRec);
  };

  q('[data-save]').onclick = async () => {
    const f = q('#meeting-form');
    if (!f.reportValidity()) return;
    syncAgendaFromDOM();
    const finalAgenda = curAgenda.filter(a => a.title);

    const data = {
      date: f.date.value,
      startTime: f.startTime.value,
      endTime: f.endTime.value,
      location: f.location.value.trim(),
      meetUrl: f.meetUrl.value.trim(),
      hostUid: f.hostUid.value,
      recorderUid: f.recorderUid.value,
      agenda: finalAgenda,
    };
    q('[data-save]').disabled = true;
    try {
      await saveMeeting(data, m);
      toast(m ? '月會已更新' : '月會已排定', 'success');
      modal.close();
    } catch (err) {
      console.error(err);
      toast('儲存失敗：' + (err.code || err.message), 'error');
    } finally {
      q('[data-save]').disabled = false;
    }
  };

  if (m) {
    q('[data-del]').onclick = async () => {
      if (!(await confirmDialog(`確定要取消 <b>${esc(m.date)}</b> 的月會嗎？`, { danger: true, okText: '確認取消' }))) return;
      try {
        await deleteMeeting(m.id);
        toast('月會已取消', 'info');
        modal.close();
      } catch (err) {
        toast('取消失敗：' + (err.code || err.message), 'error');
      }
    };
  }
}

/** 開啟單一議題的資料連結編輯彈窗（報告人自己或管理員可編輯） */
export function openAgendaLinkEditor(meeting, agendaIndex) {
  const baseAgenda = (Array.isArray(meeting.agenda) && meeting.agenda.length)
    ? meeting.agenda
    : getTeamDefaultAgenda(activeUsers(), meeting.hostUid);
  const item = baseAgenda[agendaIndex];
  if (!item) return;

  const links = Array.isArray(item.links) ? [...item.links] : [];

  const renderLinkRows = () => links.map((l, i) => `
    <div class="agenda-link-row" data-i="${i}">
      <input type="text" placeholder="資料名稱（例：9月經營報表）" value="${esc(l.title)}" class="link-title" style="flex:1;">
      <input type="url" placeholder="連結網址 (Google Drive / 簡報 / 試算表)" value="${esc(l.url)}" class="link-url" style="flex:2;">
      <button type="button" class="btn icon small danger ghost" data-del-link="true" title="刪除">✕</button>
    </div>`).join('');

  const body = `
    <div class="agenda-link-editor">
      <div class="ale-header">
        <h4>${esc(item.title)}</h4>
        <div class="muted small-text">報告人：${esc(state.users.get(item.ownerUid)?.displayName || '無')}</div>
      </div>
      <div class="ale-links-list" data-links-list>${renderLinkRows()}</div>
      <button type="button" class="btn small" data-add-link style="margin-top:8px;">＋ 新增簡報/資料連結</button>
    </div>`;

  const foot = `
    <div class="spacer"></div>
    <button class="btn ghost" data-close>取消</button>
    <button class="btn primary" data-save-links>儲存連結</button>`;

  const modal = openModal({
    title: '編輯報告資料連結',
    body,
    footer: foot,
    wide: true,
  });

  const q = s => modal.el.querySelector(s);
  const listEl = q('[data-links-list]');

  q('[data-add-link]').onclick = () => {
    links.push({ title: '', url: '' });
    listEl.innerHTML = renderLinkRows();
    modal.el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  listEl.addEventListener('click', e => {
    if (e.target.closest('[data-del-link]')) {
      const row = e.target.closest('.agenda-link-row');
      const idx = Number(row.dataset.i);
      links.splice(idx, 1);
      listEl.innerHTML = renderLinkRows();
      modal.el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  q('[data-save-links]').onclick = async () => {
    // 收集輸入內容
    const rows = [...listEl.querySelectorAll('.agenda-link-row')];
    const newLinks = rows.map(r => ({
      title: r.querySelector('.link-title').value.trim() || '相關資料',
      url: r.querySelector('.link-url').value.trim(),
    })).filter(l => l.url);

    q('[data-save-links]').disabled = true;
    try {
      await updateMeetingAgendaItem(meeting.id, agendaIndex, { links: newLinks }, baseAgenda);
      toast('資料連結已更新', 'success');
      modal.close();
    } catch (err) {
      console.error(err);
      toast('更新失敗：' + (err.code || err.message), 'error');
    } finally {
      q('[data-save-links]').disabled = false;
    }
  };
}

/** 開啟會議紀錄鍵盤輸入與編輯介面（僅限本月紀錄人與管理員） */
export function openMinutesEditor(meeting) {
  const isRecorder = meeting.recorderUid === myUid();
  if (!isRecorder && !isAdmin()) {
    return toast('只有本月指定紀錄人或管理員可以編輯會議紀錄', 'warn');
  }

  const minutes = meeting.minutes || {};
  const users = activeUsers();
  const dayEvents = eventList();

  // 若尚未有出席名單，依當天假勤預設 (出席 / 遠端 / 請假)
  const defaultAttendees = {};
  users.forEach(u => {
    const evs = eventsOfUserOn(u.uid, meeting.date, dayEvents);
    const hasLeave = evs.some(x => ['leave', 'trip'].includes(x.ev.typeId));
    // 預設高雄組員 (u5) 為遠端，其餘為現場
    const isRemote = u.displayName.includes('高雄') || u.uid === 'u5';
    defaultAttendees[u.uid] = hasLeave ? 'leave' : (isRemote ? 'remote' : 'present');
  });

  const attendees = minutes.attendees || defaultAttendees;
  const generalNotes = minutes.generalNotes || '';
  const resolutions = minutes.resolutions || '';
  const agendaNotes = minutes.agendaNotes || {}; // { [index]: { discussion: '', conclusion: '' } }
  const actionItems = Array.isArray(minutes.actionItems) ? minutes.actionItems : [];
  // 若月會未個別設定議程，自動採用經營Team常態議程清單，確保速記卡片與導覽錨點立即可用
  const agenda = (Array.isArray(meeting.agenda) && meeting.agenda.length)
    ? meeting.agenda
    : getTeamDefaultAgenda(users, meeting.hostUid);

  const renderActionRows = (items) => items.map((it, idx) => `
    <div class="action-item-row" data-ai-idx="${idx}">
      <input type="text" class="ai-task" placeholder="待辦事項描述（如：完成新竹站驗收文件）" value="${esc(it.task || '')}" style="flex:2;">
      <select class="ai-owner" style="flex:1;">
        <option value="">指派組員</option>
        ${users.map(u => `<option value="${esc(u.uid)}" ${u.uid === it.ownerUid ? 'selected' : ''}>${esc(u.displayName)}</option>`).join('')}
      </select>
      <input type="date" class="ai-due" value="${esc(it.dueDate || '')}" style="width:140px;">
      <button type="button" class="btn icon small danger ghost" data-del-ai="true" title="刪除待辦">✕</button>
    </div>`).join('');

  // 計算下次月會預估資訊（預設往後推算下個月第一週週五，並推算下位紀錄人）
  const curDate = parseYmd(meeting.date);
  const nextMonthD = new Date(curDate.getFullYear(), curDate.getMonth() + 1, 1);
  // 找下個月的第一個週五 (5)
  while (nextMonthD.getDay() !== 5) {
    nextMonthD.setDate(nextMonthD.getDate() + 1);
  }
  const estNextDate = ymd(nextMonthD);
  const estNextRecorderUid = suggestNextRecorder(estNextDate);
  const estNextRecorder = state.users.get(estNextRecorderUid);

  const nextMeetingInfo = minutes.nextMeeting || {
    date: estNextDate,
    time: meeting.startTime || '09:00',
    location: meeting.location || '10人會議室(1002)',
    recorderUid: estNextRecorderUid,
  };

  const body = `
    <div class="minutes-editor-wrap">
      <div class="min-header-banner">
        <div>
          <span class="badge-tag ok">會議紀錄編輯</span>
          <b style="font-size:16px; margin-left:6px;">${esc(meeting.date)} 經營 Team 月會</b>
          <span class="muted small-text" style="margin-left:8px;">紀錄人：${esc(state.users.get(meeting.recorderUid)?.displayName || '我')}</span>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="min-autosave-tag" data-autosave-indicator>
            <span class="min-autosave-dot"></span>
            <span data-autosave-text>已自動同步</span>
          </span>
          <div class="min-status-hint">
            ${meeting.status === 'published' ? '<span class="badge-tag ok">已正式發布</span>' : '<span class="badge-tag warn">草稿暫存中</span>'}
          </div>
        </div>
      </div>

      <!-- 快速報告人導覽與速記錨點 -->
      ${agenda.length ? `
        <div style="background:#fff; border:1px solid var(--line); border-radius:8px; padding:8px 12px;">
          <div style="font-size:12px; font-weight:700; color:var(--muted); margin-bottom:6px;">⚡ 快速跳轉至正在報告的組員議題：</div>
          <div class="min-nav-anchors">
            ${agenda.map((ag, idx) => {
              const notes = agendaNotes[idx] || {};
              const owner = state.users.get(ag.ownerUid);
              const defaultName = owner ? owner.displayName : '全體';
              const presName = notes.presenter || defaultName;
              return `<button type="button" class="min-nav-btn" data-jump-agenda="${idx}">
                ${idx + 1}. ${esc(presName)}（${esc(ag.title.slice(0, 8))}…）
              </button>`;
            }).join('')}
            <button type="button" class="min-nav-btn" data-jump-general style="background:#fef3c7; color:#92400e; border-color:#fde68a;">
              📝 綜合與主管裁示
            </button>
          </div>
        </div>` : ''}

      <!-- 1. 出席狀況快速盤點（可收合，預設閉合） -->
      <div class="min-section is-collapsed" id="sec-attendees" data-collapsible-section>
        <div class="min-sec-title">
          <div class="collapsible-trigger" data-toggle-collapse title="點擊收合/展開出席名單">
            <span class="collapsible-chevron">▼</span>
            <span>👥 出席狀況盤點</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn small ok-btn ghost" data-set-all-present style="font-size:12px; padding:3px 8px;">
              ⚡ 全員現場 (一鍵到齊)
            </button>
            <button type="button" class="btn small ghost" data-reset-default-attendees style="font-size:12px; padding:3px 8px;">
              帶入預設出勤
            </button>
          </div>
        </div>
        <div class="collapsible-content attendee-check-grid">
          ${users.map(u => {
            const cur = attendees[u.uid] || 'present';
            return `
              <div class="attendee-check-card" data-uid="${esc(u.uid)}">
                <div class="att-who">
                  ${avatar(u, 24)}
                  <span class="att-name">${esc(u.displayName)}</span>
                </div>
                <div class="att-status-pills">
                  <label class="att-pill ${cur === 'present' ? 'active' : ''}">
                    <input type="radio" name="att_${esc(u.uid)}" value="present" ${cur === 'present' ? 'checked' : ''}>
                    <span>現場</span>
                  </label>
                  <label class="att-pill ${cur === 'remote' ? 'active' : ''}">
                    <input type="radio" name="att_${esc(u.uid)}" value="remote" ${cur === 'remote' ? 'checked' : ''}>
                    <span>遠端</span>
                  </label>
                  <label class="att-pill ${cur === 'leave' ? 'active' : ''}">
                    <input type="radio" name="att_${esc(u.uid)}" value="leave" ${cur === 'leave' ? 'checked' : ''}>
                    <span>公假/缺席</span>
                  </label>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <!-- 2. 各議題報告與討論要點（每個議題卡片可獨立收合，亦可點標題全收/全開） -->
      ${agenda.length ? `
        <div class="min-section">
          <div class="min-sec-title">
            <span>📋 各議題討論紀錄與結論</span>
            <div style="display:flex; gap:6px;">
              <button type="button" class="btn small ghost" data-toggle-all-agenda style="font-size:11px; padding:2px 8px;">
                🔄 全部收合/展開
              </button>
            </div>
          </div>
          <div class="min-agenda-records">
            ${agenda.map((ag, idx) => {
              const notes = agendaNotes[idx] || {};
              const owner = state.users.get(ag.ownerUid);
              const isSimulatedQuality = (ag.title || '').includes('模擬體驗') || (ag.title || '').includes('品質分數');
              const defaultPresenter = notes.presenter || (isSimulatedQuality ? (owner?.displayName || '葉爵豪') : (owner ? owner.displayName : '全體'));

              return `
                <div class="min-agenda-card is-collapsed" data-agenda-idx="${idx}" id="ag-card-${idx}">
                  <div class="mac-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div class="collapsible-trigger" data-toggle-card-collapse style="display:flex; align-items:center; gap:8px; flex:1; min-width:200px; cursor:pointer;" title="點擊收合/展開此議題">
                      <span class="collapsible-chevron">▼</span>
                      <span class="ai-seq">${idx + 1}</span>
                      <b class="mac-title">${esc(ag.title)}</b>
                    </div>
                    <div class="mac-presenter-box" style="display:flex; align-items:center; gap:6px; font-size:12px;">
                      ${isSimulatedQuality ? `
                        <span class="muted" style="font-weight:600;">報告人：</span>
                        <div class="mac-presenter-switch" style="display:inline-flex; background:#e2e8f0; border-radius:6px; padding:2px; gap:2px;">
                          <button type="button" class="mac-quick-pres-btn ${defaultPresenter === '葉爵豪' ? 'active' : ''}" data-set-presenter="葉爵豪" style="border:none; background:${defaultPresenter === '葉爵豪' ? '#fff' : 'transparent'}; font-weight:${defaultPresenter === '葉爵豪' ? '700' : 'normal'}; padding:2px 10px; border-radius:4px; font-size:12px; cursor:pointer;">葉爵豪</button>
                          <button type="button" class="mac-quick-pres-btn ${defaultPresenter === '陸逸群' ? 'active' : ''}" data-set-presenter="陸逸群" style="border:none; background:${defaultPresenter === '陸逸群' ? '#fff' : 'transparent'}; font-weight:${defaultPresenter === '陸逸群' ? '700' : 'normal'}; padding:2px 10px; border-radius:4px; font-size:12px; cursor:pointer;">陸逸群</button>
                        </div>
                        <input type="hidden" class="mac-presenter-input" value="${esc(defaultPresenter)}">
                      ` : `
                        <span class="muted small-text">（報告人：${owner ? esc(owner.displayName) : '全體'}）</span>
                        <input type="hidden" class="mac-presenter-input" value="${owner ? esc(owner.displayName) : '全體'}">
                      `}
                      <button type="button" class="btn small ghost mac-postpone-btn" data-postpone-agenda title="報告人請假時，一鍵標記本議題暫緩討論" style="font-size:11px; padding:2px 8px; color:var(--muted, #64748b); border:1px solid #cbd5e1; border-radius:4px; background:#fff; margin-left:4px;">
                        ⏸️ 請假暫緩
                      </button>
                    </div>
                  </div>
                  <div class="collapsible-content mac-body">
                    <label class="field">
                      <span class="tiny bold muted" style="margin-bottom:4px; display:block;">討論重點與回饋</span>
                      <textarea class="mac-disc" rows="3" placeholder="鍵盤直接輸入議題討論重點、各區現況回報與進度...">${esc(notes.discussion || '')}</textarea>
                    </label>
                    <label class="field" style="margin-top:6px;">
                      <span class="tiny bold muted">決議 / 結論</span>
                      <input type="text" class="mac-conc" placeholder="此議題之裁示或決定事項（例：通過、下月持續追蹤）..." value="${esc(notes.conclusion || '')}">
                    </label>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>` : ''}

      <!-- 3. 臨時動議與綜合紀錄（可收合，預設閉合） -->
      <div class="min-section is-collapsed" id="sec-general" data-collapsible-section>
        <div class="min-sec-title">
          <div class="collapsible-trigger" data-toggle-collapse title="點擊收合/展開綜合討論">
            <span class="collapsible-chevron">▼</span>
            <span>📝 臨時動議與主席/主管裁示</span>
          </div>
        </div>
        <div class="collapsible-content">
          <textarea name="generalNotes" rows="4" class="full-textarea" placeholder="鍵盤輸入本月月會各項綜合討論、主管宣達事項或臨時動議...">${esc(generalNotes)}</textarea>
        </div>
      </div>

      <!-- 4. 重點決議事項 -->
      <div class="min-section">
        <div class="min-sec-title">⚖️ 本次會議重大決議彙整</div>
        <textarea name="resolutions" rows="3" class="full-textarea" placeholder="例：1. 全員落實行事曆雙週預審。\n2. 庫存去化調撥案通過執行。">${esc(resolutions)}</textarea>
      </div>

      <!-- 5. 待辦事項追蹤 (Action Items) -->
      <div class="min-section">
        <div class="min-sec-title">
          <span>🎯 待辦追蹤項目 (Action Items)</span>
          <button type="button" class="btn small" data-add-ai>＋ 新增待辦</button>
        </div>
        <div class="action-items-list" data-ai-list>
          ${renderActionRows(actionItems)}
        </div>
      </div>

      <!-- 6. 下次會議時間與紀錄人預排 -->
      <div class="min-section">
        <div class="min-sec-title">📅 下次會議資訊預排</div>
        <div class="next-meeting-preview-box">
          <div class="next-m-left">
            <span>預估下次月會：<b class="next-m-val"><input type="date" name="next_date" value="${esc(nextMeetingInfo.date)}" style="padding:2px 6px; font-size:13px; font-weight:700;"></b></span>
            <span>時間：<input type="time" name="next_time" value="${esc(nextMeetingInfo.time)}" style="padding:2px 6px; font-size:13px;"></span>
            <span>地點：<input type="text" name="next_loc" value="${esc(nextMeetingInfo.location)}" style="padding:2px 6px; font-size:13px; width:130px;"></span>
            <span>輪值紀錄人：
              <select name="next_rec" style="padding:2px 6px; font-size:13px; font-weight:700;">
                ${users.map(u => `<option value="${esc(u.uid)}" ${u.uid === nextMeetingInfo.recorderUid ? 'selected' : ''}>${esc(u.displayName)}</option>`).join('')}
              </select>
            </span>
          </div>
          <button type="button" class="btn small ok-btn ghost" data-insert-next-to-general style="font-size:12px; padding:3px 8px;">
            📥 將下次資訊貼入紀錄文末
          </button>
        </div>
      </div>
    </div>`;

  const foot = `
    <div class="min-foot-left">
      <small class="muted">💡 系統每 12 秒自動暫存草稿。發布後將自動開啟 Outlook 寄信與複製助手</small>
    </div>
    <div class="spacer"></div>
    <button class="btn ghost" data-close>關閉</button>
    <button class="btn ghost" data-editor-email title="預覽並複製 Outlook 信件格式">✉️ 寄信/複製助手</button>
    <button class="btn ghost ok-btn" data-save-draft>💾 手動存草稿</button>
    <button class="btn primary" data-publish>🚀 正式發布會議紀錄</button>`;

  const modal = openModal({
    title: '月會會議紀錄輸入系統',
    extraHead: `
      <button type="button" class="btn small ghost guide-btn" data-open-minutes-tour style="font-size:12px; padding:2px 8px; border-radius:6px; font-weight:600;">
        📖 紀錄操作指引
      </button>
    `,
    body,
    footer: foot,
    wide: true,
  });

  const q = s => modal.el.querySelector(s);
  const aiListEl = q('[data-ai-list]');
  let curActionItems = [...actionItems];

  // 開啟會議紀錄專屬遊戲式實景導覽
  q('[data-open-minutes-tour]')?.addEventListener('click', () => {
    startInteractiveMinutesSpotlightTour();
  });

  // 在編輯器內隨時開啟寄信與複製助手（即時抓取最新填寫的內容）
  q('[data-editor-email]')?.addEventListener('click', () => {
    const curData = collectData();
    openMinutesEmailHelper({ ...meeting, minutes: curData });
  });

  // 狀態 radio pill 點擊外觀切換
  modal.el.querySelectorAll('.att-pill input').forEach(radio => {
    radio.addEventListener('change', e => {
      const container = e.target.closest('.att-status-pills');
      container.querySelectorAll('.att-pill').forEach(p => p.classList.remove('active'));
      e.target.closest('.att-pill').classList.add('active');
    });
  });

  // 全員到齊 (一鍵全選現場)
  q('[data-set-all-present]')?.addEventListener('click', () => {
    modal.el.querySelectorAll('.attendee-check-card').forEach(card => {
      const pRadio = card.querySelector('input[value="present"]');
      if (pRadio) {
        pRadio.checked = true;
        card.querySelectorAll('.att-pill').forEach(p => p.classList.remove('active'));
        pRadio.closest('.att-pill').classList.add('active');
      }
    });
    modal.el.dispatchEvent(new Event('change', { bubbles: true }));
    toast('已將全員設為現場出席', 'info');
  });

  // 帶入預設出勤 (依假勤預設)
  q('[data-reset-default-attendees]')?.addEventListener('click', () => {
    modal.el.querySelectorAll('.attendee-check-card').forEach(card => {
      const uid = card.dataset.uid;
      const def = defaultAttendees[uid] || 'present';
      const targetRadio = card.querySelector(`input[value="${def}"]`);
      if (targetRadio) {
        targetRadio.checked = true;
        card.querySelectorAll('.att-pill').forEach(p => p.classList.remove('active'));
        targetRadio.closest('.att-pill').classList.add('active');
      }
    });
    modal.el.dispatchEvent(new Event('change', { bubbles: true }));
    toast('已恢復系統預設出席狀態', 'info');
  });

  // 收合 / 展開區塊點擊處理
  modal.el.querySelectorAll('[data-toggle-collapse]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const section = trigger.closest('[data-collapsible-section]');
      if (section) {
        section.classList.toggle('is-collapsed');
      }
    });
  });

  // 單一議題卡片收合 / 展開
  modal.el.querySelectorAll('[data-toggle-card-collapse]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const card = trigger.closest('.min-agenda-card');
      if (card) {
        card.classList.toggle('is-collapsed');
      }
    });
  });

  // 全體議題卡片一鍵全部收合 / 全部展開（預設已為收合）
  let allAgendaCollapsed = true;
  q('[data-toggle-all-agenda]')?.addEventListener('click', () => {
    allAgendaCollapsed = !allAgendaCollapsed;
    modal.el.querySelectorAll('.min-agenda-card').forEach(c => {
      c.classList.toggle('is-collapsed', allAgendaCollapsed);
    });
    toast(allAgendaCollapsed ? '已全部收合議題' : '已全部展開議題', 'info');
  });

  // 快速錨點跳轉至指定報告人議題
  q('[data-jump-agenda]') && modal.el.querySelectorAll('[data-jump-agenda]').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.dataset.jumpAgenda;
      const target = modal.el.querySelector(`#ag-card-${idx}`);
      if (target) {
        // 若該卡片被收合，跳轉時自動展開
        target.classList.remove('is-collapsed');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.querySelector('textarea')?.focus();
        target.style.transition = 'outline .2s';
        target.style.outline = '2px solid var(--brand, #2563eb)';
        setTimeout(() => { target.style.outline = ''; }, 1200);
      }
    };
  });

  q('[data-jump-general]')?.addEventListener('click', () => {
    const sec = modal.el.querySelector('#sec-general');
    if (sec) {
      sec.classList.remove('is-collapsed');
      sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      sec.querySelector('textarea')?.focus();
    }
  });

  // 快速詞彙插入至討論重點
  modal.el.addEventListener('click', e => {
    const chipBtn = e.target.closest('[data-insert-txt]');
    if (chipBtn) {
      const txt = chipBtn.dataset.insertTxt;
      const card = chipBtn.closest('.min-agenda-card');
      const ta = card.querySelector('.mac-disc');
      if (ta) {
        const val = ta.value;
        ta.value = val ? (val.endsWith('\n') ? val + txt : val + '\n' + txt) : txt;
        ta.focus();
        modal.el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return;
    }

    const genChipBtn = e.target.closest('[data-add-to-general]');
    if (genChipBtn) {
      const txt = genChipBtn.dataset.addToGeneral;
      const ta = q('[name=generalNotes]');
      if (ta) {
        const val = ta.value;
        ta.value = val ? (val.endsWith('\n') ? val + txt : val + '\n' + txt) : txt;
        ta.focus();
        modal.el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return;
    }

    // 議題報告人快速切換按鈕 (葉爵豪 / 陸逸群)
    const presBtn = e.target.closest('.mac-quick-pres-btn');
    if (presBtn) {
      const targetPresenter = presBtn.dataset.setPresenter;
      const card = presBtn.closest('.min-agenda-card');
      const input = card.querySelector('.mac-presenter-input');
      if (input) {
        input.value = targetPresenter;
      }
      card.querySelectorAll('.mac-quick-pres-btn').forEach(b => {
        const isCur = b === presBtn;
        b.classList.toggle('active', isCur);
        b.style.background = isCur ? '#fff' : 'transparent';
        b.style.fontWeight = isCur ? '700' : 'normal';
      });
      // 亦同步更新導覽錨點上的文字
      const idx = card.dataset.agendaIdx;
      const navBtn = modal.el.querySelector(`[data-jump-agenda="${idx}"]`);
      if (navBtn) {
        const agTitle = card.querySelector('.mac-title')?.textContent || '';
        navBtn.textContent = `${Number(idx) + 1}. ${targetPresenter}（${agTitle.slice(0, 8)}…）`;
      }
      modal.el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    // 議題「請假暫緩」快速標記按鈕 (方案 C)
    const postponeBtn = e.target.closest('[data-postpone-agenda]');
    if (postponeBtn) {
      const card = postponeBtn.closest('.min-agenda-card');
      const disc = card.querySelector('.mac-disc');
      const conc = card.querySelector('.mac-conc');
      const presInput = card.querySelector('.mac-presenter-input');
      const presName = presInput?.value || '報告人';

      const postponeNote = `【因公請假】報告人（${presName}）本次請假，議題暫緩討論。`;
      const postponeConc = `本次暫緩，延至下月月會追蹤報告。`;

      if (disc && (!disc.value.trim() || confirm(`確定將此議題標記為「請假暫緩」嗎？`))) {
        disc.value = postponeNote;
        if (conc) conc.value = postponeConc;

        // 外觀醒目提示已暫緩
        postponeBtn.style.background = '#fef2f2';
        postponeBtn.style.color = '#dc2626';
        postponeBtn.style.borderColor = '#fca5a5';
        postponeBtn.textContent = '⏸️ 已標記暫緩';

        // 隨後合閉該卡片，節省垂直版面
        setTimeout(() => {
          card.classList.add('is-collapsed');
        }, 300);

        modal.el.dispatchEvent(new Event('input', { bubbles: true }));
        modal.el.dispatchEvent(new Event('change', { bubbles: true }));
        toast(`已標記「${presName}」議題為請假暫緩，並自動收合`, 'info');
      }
      return;
    }
  });

  // 帶入主管常態宣達事項
  q('[data-insert-general-template]')?.addEventListener('click', () => {
    const ta = q('[name=generalNotes]');
    const template = `1. 提醒上下班務必確實執行打卡系統，若有漏打請依規定提出補簽。
2. 全員確實落實行事曆雙週預審與外出報備機制。
3. 部門年度考核表與個人改善提案請同仁掌握時程儘速提交。
4. 個人特休假請同仁依年度規劃儘早安排休畢。`;
    if (ta.value.trim() && !confirm('綜合紀錄已有內容，確定要帶入範本嗎？')) return;
    ta.value = template;
    ta.focus();
    modal.el.dispatchEvent(new Event('input', { bubbles: true }));
    toast('已帶入主管常態宣達範本', 'info');
  });

  // 將下次會議資訊貼入綜合紀錄文末
  q('[data-insert-next-to-general]')?.addEventListener('click', () => {
    const nd = q('[name=next_date]').value;
    const nt = q('[name=next_time]').value;
    const nl = q('[name=next_loc]').value;
    const nrUid = q('[name=next_rec]').value;
    const nrName = state.users.get(nrUid)?.displayName || '未指定';
    const text = `\n\n【下次會議預定】\n・日期：${nd}\n・時間：${nt}\n・地點：${nl}\n・輪值記錄人：${nrName}`;
    const ta = q('[name=generalNotes]');
    ta.value = (ta.value.trim() + text).trim();
    ta.focus();
    modal.el.dispatchEvent(new Event('input', { bubbles: true }));
    toast('已將下次會議資訊加入至紀錄末尾', 'success');
  });

  // 待辦項目增刪
  q('[data-add-ai]').onclick = () => {
    curActionItems.push({ task: '', ownerUid: '', dueDate: '' });
    aiListEl.innerHTML = renderActionRows(curActionItems);
    modal.el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  aiListEl.addEventListener('click', e => {
    if (e.target.closest('[data-del-ai]')) {
      const row = e.target.closest('.action-item-row');
      const idx = Number(row.dataset.aiIdx);
      curActionItems.splice(idx, 1);
      aiListEl.innerHTML = renderActionRows(curActionItems);
      modal.el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // 收集資料
  function collectData() {
    // 出席
    const updatedAttendees = {};
    modal.el.querySelectorAll('.attendee-check-card').forEach(card => {
      const uid = card.dataset.uid;
      const val = card.querySelector(`input[name="att_${uid}"]:checked`)?.value || 'present';
      updatedAttendees[uid] = val;
    });

    // 議程紀錄
    const updatedAgendaNotes = {};
    modal.el.querySelectorAll('.min-agenda-card').forEach(card => {
      const idx = card.dataset.agendaIdx;
      const presenterVal = card.querySelector('.mac-presenter-input')?.value || '';
      updatedAgendaNotes[idx] = {
        presenter: presenterVal,
        discussion: card.querySelector('.mac-disc').value.trim(),
        conclusion: card.querySelector('.mac-conc').value.trim(),
      };
    });

    // 待辦項目
    const actionRows = [...aiListEl.querySelectorAll('.action-item-row')];
    const updatedActionItems = actionRows.map(r => ({
      task: r.querySelector('.ai-task').value.trim(),
      ownerUid: r.querySelector('.ai-owner').value,
      dueDate: r.querySelector('.ai-due').value,
    })).filter(a => a.task);

    return {
      attendees: updatedAttendees,
      agendaNotes: updatedAgendaNotes,
      generalNotes: q('[name=generalNotes]').value.trim(),
      resolutions: q('[name=resolutions]').value.trim(),
      actionItems: updatedActionItems,
      nextMeeting: {
        date: q('[name=next_date]').value,
        time: q('[name=next_time]').value,
        location: q('[name=next_loc]').value.trim(),
        recorderUid: q('[name=next_rec]').value,
      },
    };
  }

  // 自動定時暫存（每 12 秒執行一次）
  const autoSaveIndicator = q('[data-autosave-indicator]');
  const autoSaveText = q('[data-autosave-text]');
  let lastSavedJson = JSON.stringify(collectData());
  let isSavingAuto = false;

  const autoSaveTimer = setInterval(async () => {
    if (!document.body.contains(modal.el)) {
      clearInterval(autoSaveTimer);
      return;
    }
    const curData = collectData();
    const curJson = JSON.stringify(curData);
    if (curJson === lastSavedJson || isSavingAuto) return;

    isSavingAuto = true;
    if (autoSaveIndicator) {
      autoSaveIndicator.className = 'min-autosave-tag saving';
      autoSaveText.textContent = '自動暫存中…';
    }
    try {
      await saveMeetingMinutes(meeting.id, curData, false);
      lastSavedJson = curJson;
      modal.setClean?.(); // 避免關閉時誤跳出提示
      if (autoSaveIndicator) {
        autoSaveIndicator.className = 'min-autosave-tag saved';
        autoSaveText.textContent = '已自動儲存';
      }
    } catch (e) {
      console.warn('Auto save minutes error', e);
      if (autoSaveIndicator) {
        autoSaveIndicator.className = 'min-autosave-tag';
        autoSaveText.textContent = '暫存離線';
      }
    } finally {
      isSavingAuto = false;
    }
  }, 12000);

  // 儲存草稿
  q('[data-save-draft]').onclick = async () => {
    const data = collectData();
    q('[data-save-draft]').disabled = true;
    try {
      await saveMeetingMinutes(meeting.id, data, false);
      toast('會議紀錄草稿已儲存', 'success');
      modal.close();
    } catch (err) {
      console.error(err);
      toast('儲存失敗：' + (err.code || err.message), 'error');
    } finally {
      q('[data-save-draft]').disabled = false;
    }
  };

  // 正式發布
  q('[data-publish]').onclick = async () => {
    const data = collectData();
    const ok = await confirmDialog(
      '發布後會議紀錄將標記為正式版並向全組員公開瀏覽，確定要發布嗎？<br><small class="muted">（發布後若有微調仍可再次點進去編輯儲存）</small>',
      { title: '確定發布會議紀錄？', okText: '確認發布', danger: false }
    );
    if (!ok) return;

    q('[data-publish]').disabled = true;
    try {
      await saveMeetingMinutes(meeting.id, data, true);
      toast('會議紀錄已成功發布！', 'success');
      modal.close();
      const updatedMeeting = state.meetings.get(meeting.id) || { ...meeting, minutes: data, status: 'published' };
      openMinutesEmailHelper(updatedMeeting);
    } catch (err) {
      console.error(err);
      toast('發布失敗：' + (err.code || err.message), 'error');
    } finally {
      q('[data-publish]').disabled = false;
    }
  };
}

/** 產生會議紀錄之純文字與 Outlook Rich HTML 格式，完全對齊組內歷史寄信習慣 */
export function buildMinutesEmailPayload(meeting) {
  const minutes = meeting.minutes || {};
  const users = activeUsers();
  const agenda = (Array.isArray(meeting.agenda) && meeting.agenda.length)
    ? meeting.agenda
    : getTeamDefaultAgenda(users, meeting.hostUid);

  const dObj = parseYmd(meeting.date);
  const slashDate = dObj
    ? `${dObj.getFullYear()}/${dObj.getMonth() + 1}/${dObj.getDate()}`
    : (meeting.date || '');

  const subject = `[會議紀錄]${slashDate} 經營Team例會`;
  const docTitle = `${slashDate} 經營 Team 例會會議紀錄（請勿外流）`;

  const zhNums = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五'];
  const stripPrefix = (str) => String(str || '').replace(/^[一二三四五六七八九十]+、\s*/, '').trim();

  // 將多行文字整理成自動編號清單 1. 2. 3.
  const toNumberedLines = (rawText) => {
    const lines = String(rawText || '')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    return lines.map((line, i) => {
      const cleaned = line.replace(/^(\d+[\.\、\)]|[・•\-→])\s*/, '').trim();
      return { num: i + 1, text: cleaned || line };
    });
  };

  const sections = [];

  // 1. 各議題報告與結論
  if (minutes.agendaNotes && agenda.length) {
    agenda.forEach((ag, idx) => {
      const notes = minutes.agendaNotes[idx];
      if (!notes || (!notes.discussion && !notes.conclusion)) return;
      const items = [];
      if (notes.discussion) {
        toNumberedLines(notes.discussion).forEach(it => items.push(it.text));
      }
      if (notes.conclusion) {
        items.push(`決議/裁示：${notes.conclusion.trim()}`);
      }
      if (items.length) {
        sections.push({
          title: stripPrefix(ag.title),
          items,
        });
      }
    });
  }

  // 2. 重大決議事項
  if (minutes.resolutions && minutes.resolutions.trim()) {
    sections.push({
      title: '重大決議事項',
      items: toNumberedLines(minutes.resolutions).map(x => x.text),
    });
  }

  // 3. 臨時動議與綜合討論
  if (minutes.generalNotes && minutes.generalNotes.trim()) {
    sections.push({
      title: '臨時動議',
      items: toNumberedLines(minutes.generalNotes).map(x => x.text),
    });
  }

  // 4. 待辦追蹤事項 (Action Items)
  if (Array.isArray(minutes.actionItems) && minutes.actionItems.length) {
    const aiItems = minutes.actionItems
      .filter(ai => ai && ai.task)
      .map(ai => {
        const assignee = state.users.get(ai.ownerUid)?.displayName || '全體';
        const due = ai.dueDate ? `（期限：${ai.dueDate}）` : '';
        return `${ai.task} — 負責：${assignee}${due}`;
      });
    if (aiItems.length) {
      sections.push({
        title: '待辦事項追蹤',
        items: aiItems,
      });
    }
  }

  // 5. 下次會議時間
  if (minutes.nextMeeting && minutes.nextMeeting.date) {
    const nm = minutes.nextMeeting;
    const nmDateObj = parseYmd(nm.date);
    const wNames = ['日', '一', '二', '三', '四', '五', '六'];
    const nmDateFormatted = nmDateObj
      ? `${nmDateObj.getFullYear()}年${nmDateObj.getMonth() + 1}月${nmDateObj.getDate()}日 (${wNames[nmDateObj.getDay()]})`
      : nm.date;
    const nmTime = nm.time || '09:00';
    const [hh] = nmTime.split(':').map(Number);
    const timePrefix = !isNaN(hh) ? (hh < 12 ? '早上 ' : '下午 ') : '';
    const nmRecUser = state.users.get(nm.recorderUid);
    const nmRecRaw = nmRecUser?.displayName || '未指定';
    // 習慣用法：若為三個字中文姓名可保留全名或末兩字（如：丁美云 -> 美云 / 丁美云）
    const nmRecShort = nmRecRaw.length === 3 ? nmRecRaw.slice(1) : nmRecRaw;

    sections.push({
      title: '下次會議時間',
      items: [
        `日期：${nmDateFormatted}`,
        `時間：${timePrefix}${nmTime}`,
        `地點：${nm.location || '10人會議室(1002)'}`,
        `記錄：${nmRecShort}`,
      ],
    });
  }

  // 組裝純文字版本
  const textLines = [docTitle, ''];
  sections.forEach((sec, idx) => {
    const zh = zhNums[idx] || String(idx + 1);
    textLines.push(`${zh}、${sec.title}`);
    sec.items.forEach((item, i) => {
      textLines.push(`${i + 1}.\t${item}`);
    });
    textLines.push('');
  });
  const plainText = textLines.join('\r\n').trim();

  // 組裝 Outlook 富文本 HTML 版本（採用組內習慣的深藍標題與清晰層級，深淺色背景皆高對比易讀）
  const htmlBlocks = [
    `<div style="font-family:'Microsoft JhengHei','PingFang TC',sans-serif; font-size:11pt; line-height:1.65;">`,
    `<p style="margin:0 0 12px 0; font-size:13.5pt; font-weight:bold; color:#2b579a;">${esc(docTitle)}</p>`,
  ];

  sections.forEach((sec, idx) => {
    const zh = zhNums[idx] || String(idx + 1);
    htmlBlocks.push(
      `<p style="margin:14px 0 4px 0; font-size:12pt; font-weight:bold; color:#2b579a;">${zh}、${esc(sec.title)}</p>`
    );
    htmlBlocks.push(`<ol style="margin:0 0 10px 24px; padding:0;">`);
    sec.items.forEach(item => {
      htmlBlocks.push(`<li style="margin-bottom:3px; padding-left:4px;">${esc(item)}</li>`);
    });
    htmlBlocks.push(`</ol>`);
  });

  htmlBlocks.push(`</div>`);
  const htmlContent = htmlBlocks.join('');

  return {
    subject,
    docTitle,
    plainText,
    htmlContent,
  };
}

/** 取得收件者信箱清單（支援排除寄件人自己，並用 Outlook 專用分號 `; ` 串接） */
function getTeamRecipientEmails(excludeSelf = true) {
  const myUser = state.users.get(myUid());
  const myEmail = (myUser?.email || '').toLowerCase().trim();
  const rawList = Array.isArray(APP.whitelistEmails) ? APP.whitelistEmails : [];
  const filtered = rawList.filter(em => {
    if (!excludeSelf || !myEmail) return true;
    return em.toLowerCase().trim() !== myEmail;
  });
  return filtered.join('; ');
}

/** 寫入剪貼簿（支援同時寫入 HTML 富文本與純文字，或純文字單獨複製） */
export async function copyMinutesToClipboard(meeting, mode = 'rich') {
  const { plainText, htmlContent } = buildMinutesEmailPayload(meeting);
  try {
    if (mode === 'rich' && window.ClipboardItem && navigator.clipboard?.write) {
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ]);
      toast('已複製會議紀錄（含 Outlook 標題排版格式）！可直接於信件按 Ctrl+V 貼上', 'success');
      return true;
    }
    await navigator.clipboard.writeText(plainText);
    toast('已複製會議紀錄純文字內容！', 'success');
    return true;
  } catch (err) {
    console.warn('Clipboard API fallback', err);
    const ta = document.createElement('textarea');
    ta.value = plainText;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast('已複製會議紀錄內容！', 'success');
    return true;
  }
}

/** 開啟「✉️ Outlook 寄信與一鍵複製助手」彈窗 */
export function openMinutesEmailHelper(meeting) {
  const { subject, plainText, htmlContent } = buildMinutesEmailPayload(meeting);
  const recipientsExcludeSelf = getTeamRecipientEmails(true);
  const recipientsAll = getTeamRecipientEmails(false);

  const body = `
    <div class="email-helper-wrap" style="display:flex; flex-direction:column; gap:14px;">
      <!-- 頂部快速懶人區：一鍵複製內文 + 喚起 Outlook -->
      <div style="background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border:1.5px solid #93c5fd; border-radius:12px; padding:14px 16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="flex:1; min-width:240px;">
          <div style="display:flex; align-items:center; gap:8px; font-weight:800; font-size:15px; color:#1e3a8a; margin-bottom:4px;">
            <span>🚀 最快寄信方式（一鍵喚起 Outlook）</span>
            <span class="badge-tag ok tiny">推薦</span>
          </div>
          <div style="font-size:12.5px; color:#1e40af; line-height:1.5;">
            點擊右側按鈕會<b>自動複製排版好的會議紀錄內文</b>，並同時喚起電腦的 <b>Outlook 寫信視窗（已自動帶入全組收件者與主旨）</b>，您只需在信件內文區按 <kbd style="background:#fff; padding:1px 5px; border-radius:4px; border:1px solid #93c5fd; font-weight:700;">Ctrl + V</kbd> 貼上即可！
          </div>
        </div>
        <button type="button" class="btn primary" data-launch-outlook style="padding:10px 18px; font-size:14px; font-weight:700; box-shadow:0 4px 12px rgba(37,99,235,0.25); white-space:nowrap;">
          ✉️ 複製內文並開啟 Outlook
        </button>
      </div>

      <!-- 提醒高重要性標記 -->
      <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:8px 12px; font-size:12.5px; color:#92400e; display:flex; align-items:center; gap:8px;">
        <span>❗</span>
        <span><b>小提醒：</b>貼上內文後，可於 Outlook 上方工具列點選「<b>高重要性 (!)</b>」標記後再傳送，符合組內例會信件慣例。</span>
      </div>

      <!-- 三段式手動複製區（收件者 / 主旨 / 內文） -->
      <div style="background:#f8fafc; border:1px solid var(--line); border-radius:10px; padding:12px 14px; display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <b style="font-size:13.5px; color:#334155;">📋 分項一鍵複製（若您使用網頁版 Outlook 或想手動貼上）</b>
          <label style="font-size:12px; color:#475569; display:inline-flex; align-items:center; gap:5px; cursor:pointer;">
            <input type="checkbox" data-exclude-self checked>
            <span>收件者自動排除自己（其餘 9 位組員）</span>
          </label>
        </div>

        <!-- 1. 收件者 -->
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="width:76px; font-size:12.5px; font-weight:700; color:#475569; flex-shrink:0;">👥 收件者：</span>
          <input type="text" data-recipients-input readonly value="${esc(recipientsExcludeSelf)}" style="flex:1; font-size:12px; padding:6px 10px; background:#fff; border:1px solid #cbd5e1; border-radius:6px; color:#334155;">
          <button type="button" class="btn small ghost" data-copy-recipients style="white-space:nowrap; font-weight:600;">📋 複製收件者</button>
        </div>

        <!-- 2. 信件主旨 -->
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="width:76px; font-size:12.5px; font-weight:700; color:#475569; flex-shrink:0;">📌 主　旨：</span>
          <input type="text" data-subject-input value="${esc(subject)}" style="flex:1; font-size:13px; font-weight:700; padding:6px 10px; background:#fff; border:1px solid #cbd5e1; border-radius:6px; color:#0f172a;">
          <button type="button" class="btn small ghost" data-copy-subject style="white-space:nowrap; font-weight:600;">📋 複製主旨</button>
        </div>
      </div>

      <!-- 3. 信件內文預覽與複製 -->
      <div style="display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <span style="font-size:13px; font-weight:700; color:#334155;">📄 會議紀錄信件內文預覽（已自動依大綱與編號排版）：</span>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn small ok-btn" data-copy-rich style="font-weight:700;">
              📋 複製內文（含藍色標題排版）
            </button>
            <button type="button" class="btn small ghost" data-copy-plain>
              📄 僅複製純文字
            </button>
          </div>
        </div>
        <div style="background:#0f172a; color:#f8fafc; border-radius:10px; padding:16px 20px; max-height:300px; overflow-y:auto; border:1px solid #334155; box-shadow:inset 0 2px 6px rgba(0,0,0,0.25);">
          ${htmlContent.replace(/color:#2b579a/g, 'color:#7dd3fc')}
        </div>
      </div>
    </div>
  `;

  const foot = `
    <div class="spacer"></div>
    <button class="btn ghost" data-close>關閉視窗</button>
  `;

  const modal = openModal({
    title: '✉️ Outlook 會議紀錄寄信與複製助手',
    body,
    footer: foot,
    wide: true,
  });

  const q = s => modal.el.querySelector(s);
  const recInput = q('[data-recipients-input]');
  const subInput = q('[data-subject-input]');
  const excludeChk = q('[data-exclude-self]');

  excludeChk?.addEventListener('change', () => {
    recInput.value = excludeChk.checked ? recipientsExcludeSelf : recipientsAll;
  });

  q('[data-copy-recipients]')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(recInput.value);
    toast('已複製收件者名單（分號分隔，可直接貼入 Outlook 收件者欄位）', 'success');
  });

  q('[data-copy-subject]')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(subInput.value);
    toast('已複製信件主旨！', 'success');
  });

  q('[data-copy-rich]')?.addEventListener('click', () => {
    copyMinutesToClipboard(meeting, 'rich');
  });

  q('[data-copy-plain]')?.addEventListener('click', () => {
    copyMinutesToClipboard(meeting, 'plain');
  });

  q('[data-launch-outlook]')?.addEventListener('click', async () => {
    await copyMinutesToClipboard(meeting, 'rich');
    // mailto 標準使用逗號連接多個地址以確保各版本 Outlook 與郵件程式相容
    const mailtoRecipients = recInput.value.split(';').map(s => s.trim()).filter(Boolean).join(',');
    const mailtoUrl = `mailto:${mailtoRecipients}?subject=${encodeURIComponent(subInput.value)}`;
    window.location.href = mailtoUrl;
  });
}

/** 供任何組員開啟檢視會議紀錄彈窗（唯讀瀏覽） */
export function openMinutesViewer(meeting) {
  const minutes = meeting.minutes || {};
  const rec = state.users.get(meeting.recorderUid);
  const host = state.users.get(meeting.hostUid);
  const isRecorder = meeting.recorderUid === myUid() || isAdmin();

  const body = `
    <div class="minutes-editor-wrap">
      <div class="min-header-banner">
        <div>
          <span class="badge-tag ok">會議紀錄存檔</span>
          <b style="font-size:16px; margin-left:6px;">${esc(meeting.date)} 經營 Team 月會</b>
          <span class="muted small-text" style="margin-left:8px;">紀錄人：${esc(rec?.displayName || '未指定')}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" class="btn small ghost" data-viewer-copy title="複製會議紀錄內文">📋 一鍵複製紀錄</button>
          <button type="button" class="btn small ok-btn" data-viewer-email title="開啟 Outlook 寄信助手">✉️ Outlook 寄信助手</button>
          ${meeting.status === 'published' ? '<span class="badge-tag ok">狀態：已正式發布</span>' : '<span class="badge-tag warn">狀態：草稿暫存中</span>'}
        </div>
      </div>

      <!-- 出席 -->
      ${minutes.attendees ? `
        <div class="min-section">
          <div class="min-sec-title">👥 出席狀況</div>
          <div class="min-disp-chips">
            ${Object.entries(minutes.attendees).map(([uid, st]) => {
              const u = state.users.get(uid);
              if (!u) return '';
              const tagCls = st === 'present' ? 'ok' : (st === 'remote' ? 'warn' : 'muted');
              const tagText = st === 'present' ? '現場' : (st === 'remote' ? '高雄遠端' : '公假/缺席');
              return `<span class="badge-tag ${tagCls}">${esc(u.displayName)}（${tagText}）</span>`;
            }).join('')}
          </div>
        </div>` : ''}

      <!-- 各議題討論與裁示 -->
      ${minutes.agendaNotes && meeting.agenda && meeting.agenda.length ? `
        <div class="min-section">
          <div class="min-sec-title">📋 各議題討論紀錄與結論</div>
          <div class="min-agenda-records">
            ${meeting.agenda.map((ag, idx) => {
              const notes = minutes.agendaNotes[idx];
              if (!notes || (!notes.discussion && !notes.conclusion)) return '';
              const owner = state.users.get(ag.ownerUid);
              const defaultName = owner ? esc(owner.displayName) : '全體';
              const presName = notes.presenter || defaultName;
              return `
                <div style="background:#f8fafc; border:1px solid var(--line); border-radius:8px; padding:10px 14px;">
                  <div style="font-weight:700; font-size:14px; margin-bottom:6px; display:flex; align-items:center; gap:8px;">
                    <span class="ai-seq">${idx + 1}</span>
                    <span>${esc(ag.title)}</span>
                    <span class="muted small-text">（報告人：${esc(presName)}）</span>
                  </div>
                  ${notes.discussion ? `<div style="font-size:13px; color:#475569; margin-bottom:4px; line-height:1.5;"><b>討論重點：</b>${esc(notes.discussion)}</div>` : ''}
                  ${notes.conclusion ? `<div style="font-size:13px; color:#166534; line-height:1.5;"><b>決議/裁示：</b>${esc(notes.conclusion)}</div>` : ''}
                </div>`;
            }).join('')}
          </div>
        </div>` : ''}

      <!-- 重大決議 -->
      ${minutes.resolutions ? `
        <div class="min-section">
          <div class="min-sec-title">⚖️ 重大決議事項</div>
          <div class="min-block-content text-pre-wrap">${esc(minutes.resolutions)}</div>
        </div>` : ''}

      <!-- 臨時動議與裁示 -->
      ${minutes.generalNotes ? `
        <div class="min-section">
          <div class="min-sec-title">💬 綜合討論與主管裁示</div>
          <div class="min-block-content text-pre-wrap">${esc(minutes.generalNotes)}</div>
        </div>` : ''}

      <!-- 待辦追蹤項目 -->
      ${Array.isArray(minutes.actionItems) && minutes.actionItems.length ? `
        <div class="min-section">
          <div class="min-sec-title">🎯 待辦事項追蹤 (Action Items)</div>
          <div class="min-action-table">
            ${minutes.actionItems.map((ai, i) => {
              const assignee = state.users.get(ai.ownerUid);
              return `
                <div class="min-action-row">
                  <span class="ai-seq">${i + 1}</span>
                  <b class="min-action-task">${esc(ai.task)}</b>
                  <span class="person small-text">${assignee ? avatar(assignee, 20) + ' ' + esc(assignee.displayName) : '全體'}</span>
                  ${ai.dueDate ? `<span class="badge-tag warn tiny">期限：${esc(ai.dueDate)}</span>` : ''}
                </div>`;
            }).join('')}
          </div>
        </div>` : ''}

      <!-- 下次會議預排資訊 -->
      ${minutes.nextMeeting && minutes.nextMeeting.date ? `
        <div class="min-section">
          <div class="min-sec-title">📅 下次會議資訊預排</div>
          <div class="next-meeting-preview-box">
            <div class="next-m-left">
              <span>預定下次月會：<b class="next-m-val">${esc(minutes.nextMeeting.date)}</b></span>
              <span>時間：<b>${esc(minutes.nextMeeting.time || '09:00')}</b></span>
              <span>地點：<b>${esc(minutes.nextMeeting.location || '10人會議室(1002)')}</b></span>
              <span>輪值紀錄人：<b>${esc(state.users.get(minutes.nextMeeting.recorderUid)?.displayName || '未指定')}</b></span>
            </div>
          </div>
        </div>` : ''}
    </div>`;

  const foot = `
    <button class="btn ghost" data-viewer-copy-foot>📋 一鍵複製內文</button>
    <button class="btn ok-btn" data-viewer-email-foot>✉️ Outlook 寄信助手</button>
    <div class="spacer"></div>
    ${isRecorder ? `<button class="btn ok-btn ghost" data-open-edit>✏️ 編輯紀錄</button>` : ''}
    <button class="btn primary" data-close>關閉</button>`;

  const modal = openModal({
    title: `${meeting.date} 月會會議紀錄`,
    body,
    footer: foot,
    wide: true,
  });

  const handleCopy = () => copyMinutesToClipboard(meeting, 'rich');
  const handleEmail = () => {
    modal.close();
    openMinutesEmailHelper(meeting);
  };

  modal.el.querySelector('[data-viewer-copy]')?.addEventListener('click', handleCopy);
  modal.el.querySelector('[data-viewer-copy-foot]')?.addEventListener('click', handleCopy);
  modal.el.querySelector('[data-viewer-email]')?.addEventListener('click', handleEmail);
  modal.el.querySelector('[data-viewer-email-foot]')?.addEventListener('click', handleEmail);

  if (isRecorder) {
    modal.el.querySelector('[data-open-edit]')?.addEventListener('click', () => {
      modal.close();
      openMinutesEditor(meeting);
    });
  }
}
