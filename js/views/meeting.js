// 月會專屬視圖：下一場月會卡片、議程與資料連結檢視、開會當天置頂橫幅、會議紀錄
import { state, myUid, isAdmin, meetingList, updateMeetingAgendaItem, caseList } from '../data.js';
import { esc, fmtMD, weekdayZh, avatar, ymd, parseYmd, timeAgo, toast } from '../utils.js';
import { openMeetingEditor, openAgendaLinkEditor, openMinutesEditor, openMinutesViewer, openMinutesEmailHelper, copyMinutesToClipboard, getTeamDefaultAgenda } from '../meetingModal.js';
import { bike } from '../yb.js';

export function mountMeeting(el) {
  el.innerHTML = `
    <div class="toolbar">
      <div class="meeting-top-actions">
        ${isAdmin() ? '<button class="btn primary" data-new-meeting>＋ 排定新月會</button>' : ''}
      </div>
      <h2 class="view-title">經營組月會</h2>
      <div class="toolbar-end"></div>
    </div>
    <div class="meeting-content" data-content></div>`;

  const q = s => el.querySelector(s);

  if (isAdmin()) {
    q('[data-new-meeting]')?.addEventListener('click', () => openMeetingEditor());
  }

  q('[data-content]').addEventListener('click', async e => {
    const newMeetingBtn = e.target.closest('[data-new-meeting]');
    if (newMeetingBtn) {
      if (isAdmin()) openMeetingEditor();
      return;
    }
    const editBtn = e.target.closest('[data-edit-m]');
    if (editBtn) {
      const mid = editBtn.dataset.editM;
      const m = state.meetings.get(mid);
      if (m) openMeetingEditor(m);
      return;
    }

    // 點擊懸浮鉛筆按鈕就地編輯議題名稱
    const editTitleBtn = e.target.closest('[data-edit-agenda-title]');
    if (editTitleBtn) {
      const row = editTitleBtn.closest('[data-ai-title-row]');
      if (!row) return;
      const mid = row.dataset.mid;
      const idx = Number(row.dataset.idx);
      const originalTitle = row.dataset.title || '';

      // 若已在編輯中則忽略
      if (row.querySelector('.ai-inline-edit-form')) return;

      const prevHtml = row.innerHTML;
      row.innerHTML = `
        <form class="ai-inline-edit-form" data-inline-form style="display:flex; align-items:center; gap:6px; width:100%; max-width:520px;">
          <input type="text" class="ai-inline-input" value="${esc(originalTitle)}" style="flex:1; font-weight:700; font-size:14.5px; padding:4px 8px; border:1.5px solid var(--yb); border-radius:6px; outline:none; box-shadow:0 0 0 2px rgba(255,196,0,0.25); background:#fff;">
          <button type="submit" class="btn small primary" style="padding:3px 10px; font-size:12px; font-weight:600;">儲存</button>
          <button type="button" class="btn small ghost" data-cancel style="padding:3px 8px; font-size:12px;">取消</button>
        </form>
      `;

      const form = row.querySelector('form');
      const input = row.querySelector('input');
      input.focus();
      input.select();

      const cancelEdit = () => {
        row.innerHTML = prevHtml;
      };

      form.querySelector('[data-cancel]').onclick = cancelEdit;
      input.onkeydown = ev => {
        if (ev.key === 'Escape') cancelEdit();
      };

      form.onsubmit = async ev => {
        ev.preventDefault();
        const newTitle = input.value.trim();
        if (!newTitle) {
          toast('議題名稱不可為空', 'warn');
          input.focus();
          return;
        }
        if (newTitle === originalTitle) {
          cancelEdit();
          return;
        }

        const submitBtn = form.querySelector('button[type=submit]');
        submitBtn.disabled = true;
        submitBtn.textContent = '儲存中…';

        try {
          const currentMeeting = state.meetings.get(mid);
          const fallbackAgenda = (currentMeeting && Array.isArray(currentMeeting.agenda) && currentMeeting.agenda.length)
            ? currentMeeting.agenda
            : getTeamDefaultAgenda([...state.users.values()].filter(u => u.active), currentMeeting?.hostUid);

          await updateMeetingAgendaItem(mid, idx, { title: newTitle }, fallbackAgenda);
          toast('議題名稱已更新', 'ok');
        } catch (err) {
          console.error(err);
          toast('更新失敗：' + (err.code || err.message), 'error');
          cancelEdit();
        }
      };

      return;
    }

    const editLinkBtn = e.target.closest('[data-edit-agenda-links]');
    if (editLinkBtn) {
      const mid = editLinkBtn.dataset.mid;
      const idx = Number(editLinkBtn.dataset.idx);
      const m = state.meetings.get(mid);
      if (m) openAgendaLinkEditor(m, idx);
      return;
    }
    const copyMinBtn = e.target.closest('[data-copy-minutes]');
    if (copyMinBtn) {
      const mid = copyMinBtn.dataset.copyMinutes;
      const m = state.meetings.get(mid);
      if (m) copyMinutesToClipboard(m, 'rich');
      return;
    }
    const emailMinBtn = e.target.closest('[data-email-minutes]');
    if (emailMinBtn) {
      const mid = emailMinBtn.dataset.emailMinutes;
      const m = state.meetings.get(mid);
      if (m) openMinutesEmailHelper(m);
      return;
    }
    const viewMinutesBtn = e.target.closest('[data-view-minutes]');
    if (viewMinutesBtn) {
      const mid = viewMinutesBtn.dataset.viewMinutes;
      const m = state.meetings.get(mid);
      if (m) openMinutesViewer(m);
      return;
    }
    const openMinutesBtn = e.target.closest('[data-open-minutes]');
    if (openMinutesBtn) {
      const mid = openMinutesBtn.dataset.openMinutes;
      const m = state.meetings.get(mid);
      if (m) openMinutesEditor(m);
      return;
    }
  });

  function render() {
    const meetings = meetingList();
    const today = ymd();
    // 找出尚未結束或最近的下一場月會
    const upcoming = meetings.filter(m => m.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] || meetings[0];
    const past = meetings.filter(m => m !== upcoming);

    if (!upcoming) {
      q('[data-content]').innerHTML = `
        <div class="card pad empty yb-empty">
          <div class="bike-badge-20">${bike(72)}</div>
          <h3>目前尚未排定任何月會</h3>
          <p class="muted">管理員可點選上方按鈕排定下一次月會時間與紀錄人。</p>
          ${isAdmin() ? '<button class="btn primary" data-new-meeting style="margin-top:12px;">立即排定新月會</button>' : ''}
        </div>`;
      if (isAdmin()) {
        q('[data-new-meeting]')?.addEventListener('click', () => openMeetingEditor());
      }
      return;
    }

    const host = state.users.get(upcoming.hostUid);
    const rec = state.users.get(upcoming.recorderUid);
    const isToday = upcoming.date === today;
    const diffDays = Math.round((parseYmd(upcoming.date).getTime() - parseYmd(today).getTime()) / 86400000);

    let countdownTag = '';
    if (isToday) countdownTag = `<span class="badge-tag ok">今天舉行</span>`;
    else if (diffDays > 0) countdownTag = `<span class="badge-tag warn">還有 ${diffDays} 天</span>`;
    else countdownTag = `<span class="badge-tag muted">已結束</span>`;

    // 議程準備進度（若該場會議尚未設定特定議程，自動以經營Team常態報告領域呈現）
    const agenda = (Array.isArray(upcoming.agenda) && upcoming.agenda.length)
      ? upcoming.agenda
      : getTeamDefaultAgenda([...state.users.values()].filter(u => u.active), upcoming.hostUid);
    const withLinks = agenda.filter(a => a.links && a.links.length > 0).length;
    const totalAgenda = agenda.length;

    const allCases = caseList();
    const agendaListHtml = totalAgenda ? `
      <div class="agenda-items">
        ${agenda.map((item, idx) => {
          const owner = state.users.get(item.ownerUid);
          const isMyAgenda = item.ownerUid === myUid() || isAdmin();
          const links = item.links || [];
          const ownerCases = item.ownerUid ? allCases.filter(c => c.status !== 'done' && (c.ownerUids || []).includes(item.ownerUid)) : [];
          return `
            <div class="agenda-item card pad-sm">
              <div class="ai-head">
                <span class="ai-seq">${idx + 1}</span>
                <div class="ai-title-wrap">
                  <div class="ai-title-row" data-ai-title-row data-mid="${esc(upcoming.id)}" data-idx="${idx}" data-title="${esc(item.title)}">
                    <span class="ai-title-text" data-title-text><b>${esc(item.title)}</b></span>
                    <button type="button" class="ai-title-edit-btn" data-edit-agenda-title title="修改議題名稱" aria-label="修改議題名稱">✏️</button>
                  </div>
                  <div class="ai-meta muted small-text">
                    ${owner ? `<span class="person">${avatar(owner, 20)} ${esc(owner.displayName)}</span>` : '全體'}
                    ${item.duration ? `<span>約 ${item.duration} 分鐘</span>` : ''}
                  </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center">
                  ${isMyAgenda ? `
                    <button class="btn small ghost" data-edit-agenda-links data-mid="${esc(upcoming.id)}" data-idx="${idx}">
                      ${links.length ? '編輯連結' : '＋ 貼連結'}
                    </button>` : ''}
                </div>
              </div>
              ${links.length ? `
                <div class="ai-links">
                  ${links.map(l => `
                    <a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" class="link-chip" title="${esc(l.url)}">
                      📄 ${esc(l.title)}
                    </a>`).join('')}
                </div>` : ''}
              ${ownerCases.length > 0 ? `
                <details style="margin-top:6px;font-size:12px;background:#F8FAFC;border:1px solid var(--border);border-radius:8px;padding:4px 10px">
                  <summary style="cursor:pointer;color:var(--primary);font-weight:700;user-select:none">
                    📌 連動例案進度（${ownerCases.length} 案進行中）▸ 點擊展開
                  </summary>
                  <ul style="margin:6px 0 2px;padding-left:16px;color:var(--text);line-height:1.5">
                    ${ownerCases.map(c => {
                      const latest = c.timeline?.[0];
                      return `<li><b>${esc(c.title)}</b>（${c.progress || 0}%）${latest ? ` — <span class="muted">${esc(latest.note)}</span>` : ''}</li>`;
                    }).join('')}
                  </ul>
                </details>
              ` : ''}
            </div>`;
        }).join('')}
      </div>` : `
      <div class="muted small-text" style="padding:12px 0;">目前無特定議程項目，由紀錄人與主持人直接進行綜合討論。</div>`;

    const isRecorder = upcoming.recorderUid === myUid() || isAdmin();
    const minutes = upcoming.minutes;
    const hasMinutes = minutes && (minutes.resolutions || minutes.generalNotes || (minutes.actionItems && minutes.actionItems.length) || Object.keys(minutes.agendaNotes || {}).length);
    const minutesStatusTag = upcoming.status === 'published'
      ? '<span class="badge-tag ok">會議紀錄已發布</span>'
      : (minutes ? '<span class="badge-tag warn">會議紀錄草稿暫存中</span>' : '');

    q('[data-content]').innerHTML = `
      <div class="meeting-hero card pad" style="padding:14px 18px">
        <div class="mh-top">
          <div class="mh-header-left">
            <h1 class="mh-title" style="margin:0;font-size:19px">💼 ${fmtMD(upcoming.date)}（${weekdayZh(upcoming.date)}）經營組月會 ${countdownTag} ${minutesStatusTag}</h1>
            <div class="mh-info" style="margin-top:6px;display:flex;gap:12px;flex-wrap:wrap;align-items:center">
              <span>⏰ ${esc(upcoming.startTime)} – ${esc(upcoming.endTime)}</span>
              <span>📍 ${esc(upcoming.location || '總公司會議室')}</span>
              <span class="kpi-chip">主持人：<b>${host ? esc(host.displayName) : '未指定'}</b></span>
              <span class="kpi-chip ${rec?.uid === myUid() ? 'active' : ''}">紀錄人：<b>${rec ? esc(rec.displayName) : '未指定'}</b>${rec?.uid === myUid() ? ' (我)' : ''}</span>
              <span class="kpi-chip">簡報連結：<b>${withLinks}/${totalAgenda}</b></span>
            </div>
          </div>
          <div class="mh-actions">
            ${isRecorder ? `
              <button class="btn ok-btn" data-open-minutes="${esc(upcoming.id)}" title="本月紀錄人專屬">
                📝 會議紀錄
              </button>` : ''}
            ${upcoming.meetUrl ? `
              <a href="${esc(upcoming.meetUrl)}" target="_blank" rel="noopener noreferrer" class="btn primary meet-btn">
                🎥 加入 Google Meet
              </a>` : ''}
            ${isAdmin() ? `<button class="btn" data-edit-m="${esc(upcoming.id)}" title="編輯月會資訊">⚙️</button>` : ''}
          </div>
        </div>
      </div>

      <!-- 若已發布紀錄，或紀錄人正在編輯草稿，全組可檢視會議紀錄區塊 -->
      ${hasMinutes ? `
        <div class="meeting-section card pad min-display-card">
          <div class="section-head min-disp-head">
            <div>
              <h3>📝 本次月會會議紀錄</h3>
              <span class="muted small-text">
                ${upcoming.status === 'published' ? '正式公開發布' : '草稿暫存中'}・紀錄人：${esc(rec?.displayName || '未指定')}
              </span>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <button class="btn small ghost" data-copy-minutes="${esc(upcoming.id)}" title="複製會議紀錄內文（含藍色標題排版）">
                📋 一鍵複製紀錄
              </button>
              <button class="btn small ok-btn" data-email-minutes="${esc(upcoming.id)}" title="開啟 Outlook 寄信與收件者複製助手">
                ✉️ Outlook 寄信助手
              </button>
              ${isRecorder ? `
                <button class="btn small ghost" data-open-minutes="${esc(upcoming.id)}">
                  ✏️ 繼續編輯紀錄
                </button>` : ''}
            </div>
          </div>

          <!-- 出席名單 -->
          ${minutes.attendees ? `
            <div class="min-disp-row">
              <span class="min-disp-label">出席狀況：</span>
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
          ${minutes.agendaNotes && upcoming.agenda && upcoming.agenda.length ? `
            <div class="min-disp-block">
              <h4 class="min-block-title">📋 各議題討論紀錄與結論</h4>
              <div class="min-action-table">
                ${upcoming.agenda.map((ag, idx) => {
                  const notes = minutes.agendaNotes[idx];
                  if (!notes || (!notes.discussion && !notes.conclusion)) return '';
                  const owner = state.users.get(ag.ownerUid);
                  const defaultName = owner ? esc(owner.displayName) : '全體';
                  const presName = notes.presenter || defaultName;
                  return `
                    <div style="background:#f8fafc; border:1px solid var(--line); border-radius:8px; padding:10px 14px; margin-bottom:8px;">
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
            <div class="min-disp-block">
              <h4 class="min-block-title">⚖️ 重大決議事項</h4>
              <div class="min-block-content text-pre-wrap">${esc(minutes.resolutions)}</div>
            </div>` : ''}

          <!-- 臨時動議與裁示 -->
          ${minutes.generalNotes ? `
            <div class="min-disp-block">
              <h4 class="min-block-title">💬 綜合討論與主管裁示</h4>
              <div class="min-block-content text-pre-wrap">${esc(minutes.generalNotes)}</div>
            </div>` : ''}

          <!-- 待辦追蹤項目 -->
          ${Array.isArray(minutes.actionItems) && minutes.actionItems.length ? `
            <div class="min-disp-block">
              <h4 class="min-block-title">🎯 待辦事項追蹤 (Action Items)</h4>
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
            <div class="min-disp-block">
              <h4 class="min-block-title">📅 下次會議資訊預排</h4>
              <div class="next-meeting-preview-box" style="margin-top:6px;">
                <div class="next-m-left">
                  <span>預定下次月會：<b class="next-m-val">${esc(minutes.nextMeeting.date)}</b></span>
                  <span>時間：<b>${esc(minutes.nextMeeting.time || '09:00')}</b></span>
                  <span>地點：<b>${esc(minutes.nextMeeting.location || '10人會議室(1002)')}</b></span>
                  <span>輪值紀錄人：<b>${esc(state.users.get(minutes.nextMeeting.recorderUid)?.displayName || '未指定')}</b></span>
                </div>
              </div>
            </div>` : ''}
        </div>` : ''}

      <div class="meeting-section card pad">
        <div class="section-head">
          <h3>📋 會前議程與報告資料</h3>
          <span class="muted small-text">報告人請於會前將 Google 簡報或試算表連結貼於各項議題中，方便遠端與現場組員同步瀏覽</span>
        </div>
        ${agendaListHtml}
      </div>

      ${past.length ? `
        <div class="meeting-section card pad" style="margin-top:20px;">
          <h3>📁 歷次月會存檔</h3>
          <div class="past-list">
            ${past.map(p => {
              const pCanRec = p.recorderUid === myUid() || isAdmin();
              return `
                <div class="past-item">
                  <div>
                    <b>${esc(p.date)} 月會</b>
                    <span class="muted small-text">（紀錄人：${esc(state.users.get(p.recorderUid)?.displayName || '無')}）</span>
                    ${p.status === 'published' ? '<span class="badge-tag ok tiny">紀錄已發布</span>' : (p.minutes ? '<span class="badge-tag warn tiny">草稿</span>' : '')}
                  </div>
                  <div class="past-actions">
                    ${p.minutes ? `<button class="btn small ok-btn ghost" data-view-minutes="${esc(p.id)}">📖 查看紀錄</button>` : ''}
                    ${p.minutes ? `<button class="btn small ghost" data-email-minutes="${esc(p.id)}" title="Outlook 寄信與一鍵複製">✉️ 寄信/複製</button>` : ''}
                    ${pCanRec ? `<button class="btn small ghost" data-open-minutes="${esc(p.id)}">✏️ 編輯紀錄</button>` : ''}
                    ${p.meetUrl ? `<a href="${esc(p.meetUrl)}" target="_blank" rel="noopener noreferrer" class="btn small ghost">Meet</a>` : ''}
                    ${isAdmin() ? `<button class="btn small ghost" data-edit-m="${esc(p.id)}">管理</button>` : ''}
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>` : ''}`;
  }

  render();
  return { update: render };
}
