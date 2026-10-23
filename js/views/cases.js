// 例案追蹤（長期專案進度管理模組）
// 支援「極簡列表（預設收合，點開看時間軸）」與「看板模式（Kanban）」切換，以及時間軸更新紀錄（Timeline Log）
import { state, myUid, isAdmin, activeUsers, userOf, caseList, saveCaseItem, appendCaseTimeline, deleteCaseItem } from '../data.js';
import { esc, avatar, ymd, toast, openModal, closeModal, confirmDialog } from '../utils.js';

export const CASE_STATUSES = [
  { id: 'planning', label: '規劃中', color: '#64748B', bg: '#F1F5F9' },
  { id: 'active',   label: '進行中', color: '#2563EB', bg: '#EFF6FF' },
  { id: 'blocked',  label: '卡關待協商', color: '#DC2626', bg: '#FEF2F2' },
  { id: 'done',     label: '已結案', color: '#16A34A', bg: '#F0FDF4' },
];

export const CASE_PRIORITIES = [
  { id: 'high',   label: '高優先', color: '#DC2626' },
  { id: 'medium', label: '一般',   color: '#D97706' },
  { id: 'low',    label: '常規',   color: '#64748B' },
];

export function mountCases(el) {
  let viewMode = 'list'; // 'list' | 'kanban'
  let filterStatus = 'all';
  let filterOwner = 'all';
  const expandedIds = new Set();

  function render() {
    const allCases = caseList();
    const users = activeUsers();
    const filtered = allCases.filter(c => {
      if (filterStatus !== 'all' && (c.status || 'active') !== filterStatus) return false;
      if (filterOwner !== 'all' && !(c.ownerUids || []).includes(filterOwner)) return false;
      return true;
    });

    const counts = {
      all: allCases.length,
      active: allCases.filter(c => (c.status || 'active') === 'active').length,
      blocked: allCases.filter(c => c.status === 'blocked').length,
      planning: allCases.filter(c => c.status === 'planning').length,
      done: allCases.filter(c => c.status === 'done').length,
    };

    el.innerHTML = `
      <div class="toolbar">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <h2 class="view-title" style="margin:0">例案追蹤</h2>
          <span class="info-pill-tip" data-tip="針對部門長期專案設立進度與時間軸軌跡；在『月會』頁面亦可一鍵引用個人負責的例案進度">ⓘ 說明</span>
          <div class="compact-kpi-strip">
            <span class="kpi-chip ${filterStatus === 'all' ? 'active' : ''}" data-filter-status="all">全部 <b>${counts.all}</b></span>
            <span class="kpi-chip ${filterStatus === 'active' ? 'active' : ''}" data-filter-status="active">進行中 <b>${counts.active}</b></span>
            ${counts.blocked > 0 ? `<span class="kpi-chip danger ${filterStatus === 'blocked' ? 'active' : ''}" data-filter-status="blocked">卡關 <b>${counts.blocked}</b></span>` : ''}
            <span class="kpi-chip ${filterStatus === 'planning' ? 'active' : ''}" data-filter-status="planning">規劃 <b>${counts.planning}</b></span>
            <span class="kpi-chip ${filterStatus === 'done' ? 'active' : ''}" data-filter-status="done">結案 <b>${counts.done}</b></span>
          </div>
        </div>
        <div class="toolbar-end" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select class="btn sm" data-filter-owner style="padding:5px 10px">
            <option value="all">所有負責人</option>
            <option value="${esc(myUid())}" ${filterOwner === myUid() ? 'selected' : ''}>我負責的例案</option>
            ${users.map(u => `<option value="${esc(u.uid)}" ${filterOwner === u.uid ? 'selected' : ''}>${esc(u.displayName)}</option>`).join('')}
          </select>
          <div class="seg">
            <button class="${viewMode === 'list' ? 'active' : ''}" data-mode="list">☰ 極簡列表</button>
            <button class="${viewMode === 'kanban' ? 'active' : ''}" data-mode="kanban">▦ 看板模式</button>
          </div>
          <button class="btn primary sm" data-new-case>＋ 新增例案</button>
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="card pad empty" style="padding:48px 20px;text-align:center">
          <h3 style="margin:0 0 6px">目前尚無符合條件的例案</h3>
          <p class="muted" style="margin:0 0 16px">點擊右上角「＋ 新增例案」建立長期追蹤專案，隨時記錄每次推進時間軸。</p>
          <button class="btn primary" data-new-case>＋ 立即建立第一個例案</button>
        </div>
      ` : viewMode === 'list' ? renderCompactList(filtered, expandedIds) : renderKanbanBoard(filtered)}
    `;

    // 綁定事件
    el.querySelectorAll('[data-filter-status]').forEach(chip => {
      chip.onclick = () => {
        filterStatus = chip.dataset.filterStatus;
        render();
      };
    });
    const ownerSel = el.querySelector('[data-filter-owner]');
    if (ownerSel) {
      ownerSel.onchange = () => {
        filterOwner = ownerSel.value;
        render();
      };
    }
    el.querySelectorAll('[data-mode]').forEach(btn => {
      btn.onclick = () => {
        viewMode = btn.dataset.mode;
        render();
      };
    });
    el.querySelectorAll('[data-new-case]').forEach(btn => {
      btn.onclick = () => openCaseFormModal(null, render);
    });

    // 展開/收合單一列
    el.querySelectorAll('[data-toggle-case]').forEach(row => {
      row.onclick = e => {
        if (e.target.closest('button, a')) return;
        const cid = row.dataset.toggleCase;
        if (expandedIds.has(cid)) expandedIds.delete(cid);
        else expandedIds.add(cid);
        render();
      };
    });

    // 新增進度時間軸
    el.querySelectorAll('[data-log-case]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const c = state.cases.get(btn.dataset.logCase);
        if (c) openTimelineLogModal(c, render);
      };
    });

    // 編輯例案
    el.querySelectorAll('[data-edit-case]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const c = state.cases.get(btn.dataset.editCase);
        if (c) openCaseFormModal(c, render);
      };
    });

    // 刪除例案
    el.querySelectorAll('[data-del-case]').forEach(btn => {
      btn.onclick = async e => {
        e.stopPropagation();
        const c = state.cases.get(btn.dataset.delCase);
        if (!c) return;
        if (!(await confirmDialog(`確定要刪除例案「${c.title}」嗎？`, { danger: true, okText: '刪除' }))) return;
        await deleteCaseItem(c.id);
        toast('例案已刪除');
        render();
      };
    });
  }

  render();
  return { onData: render };
}

function renderCompactList(cases, expandedIds) {
  return `
    <div class="card" style="overflow:hidden">
      <div class="case-compact-list">
        ${cases.map(c => {
          const st = CASE_STATUSES.find(s => s.id === (c.status || 'active')) || CASE_STATUSES[1];
          const pr = CASE_PRIORITIES.find(p => p.id === (c.priority || 'medium')) || CASE_PRIORITIES[1];
          const owners = (c.ownerUids || []).map(uid => userOf(uid)).filter(Boolean);
          const pct = Math.min(100, Math.max(0, Number(c.progress || 0)));
          const latestLog = Array.isArray(c.timeline) && c.timeline[0] ? c.timeline[0] : null;
          const isOpen = expandedIds.has(c.id);
          const canDel = c.createdBy === myUid() || isAdmin();

          return `
            <div class="case-row-item ${isOpen ? 'expanded' : ''}">
              <div class="case-row-summary" data-toggle-case="${esc(c.id)}">
                <span class="case-caret">${isOpen ? '▾' : '▸'}</span>
                <span class="case-status-badge" style="background:${st.bg};color:${st.color}">${st.label}</span>
                <span class="case-prio-dot" style="color:${pr.color}" title="${pr.label}">${pr.label}</span>
                <strong class="case-row-title">${esc(c.title)}</strong>
                ${latestLog ? `<span class="case-latest-snippet">最新：${esc(latestLog.note)} (${esc((latestLog.at || '').slice(5, 10))})</span>` : `<span class="case-latest-snippet muted">${esc(c.summary || '點擊展開詳情與時間軸')}</span>`}
                <div class="case-row-right">
                  <div class="case-owners-avatars">
                    ${owners.map(u => avatar(u, 24)).join('')}
                  </div>
                  <div class="case-prog-mini" title="完成度 ${pct}%">
                    <div class="case-prog-bar"><span style="width:${pct}%;background:${st.color}"></span></div>
                    <span class="case-prog-num">${pct}%</span>
                  </div>
                  ${c.dueDate ? `<span class="case-due-chip">${esc(c.dueDate.slice(5))}</span>` : ''}
                  <button class="btn sm primary" data-log-case="${esc(c.id)}" title="新增一筆進度紀錄">＋ 記進度</button>
                  <button class="btn sm ghost" data-edit-case="${esc(c.id)}" title="編輯例案設定"></button>
                </div>
              </div>

              ${isOpen ? `
                <div class="case-row-detail">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:10px">
                    <div>
                      <div style="font-size:13px;color:var(--text)"><strong>專案目標／說明：</strong>${esc(c.summary || '（未填寫說明）')}</div>
                      <div class="muted" style="font-size:12px;margin-top:4px">
                        負責人：${owners.map(u => esc(u.displayName)).join('、') || '未指派'}
                        ${c.dueDate ? ` ｜ 預計完成日：${esc(c.dueDate)}` : ''}
                      </div>
                    </div>
                    <div style="display:flex;gap:6px">
                      <button class="btn sm primary" data-log-case="${esc(c.id)}">＋ 推進進度／寫時間軸</button>
                      <button class="btn sm" data-edit-case="${esc(c.id)}">編輯基本資料</button>
                      ${canDel ? `<button class="btn sm danger" data-del-case="${esc(c.id)}">刪除</button>` : ''}
                    </div>
                  </div>

                  <div class="case-timeline-box">
                    <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px">歷史進度時間軸（共 ${(c.timeline || []).length} 筆）</div>
                    ${!(c.timeline || []).length ? `<div class="muted" style="font-size:12.5px">尚無時間軸紀錄，點擊「＋ 記進度」留下第一筆推進軌跡。</div>` : `
                      <ul class="case-tl-list">
                        ${(c.timeline || []).map(tl => `
                          <li>
                            <span class="case-tl-date">${esc((tl.at || '').slice(0, 16).replace('T', ' '))}</span>
                            <span class="case-tl-author">${esc(tl.authorName || '')}</span>
                            <span class="case-tl-pct">${tl.progress ?? pct}%</span>
                            <span class="case-tl-note">${esc(tl.note)}</span>
                          </li>
                        `).join('')}
                      </ul>
                    `}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderKanbanBoard(cases) {
  return `
    <div class="case-kanban-grid">
      ${CASE_STATUSES.map(st => {
        const colCases = cases.filter(c => (c.status || 'active') === st.id);
        return `
          <div class="case-kanban-col">
            <div class="case-kanban-head" style="border-top:3px solid ${st.color}">
              <span>${st.label}</span>
              <span class="badge">${colCases.length}</span>
            </div>
            <div class="case-kanban-body">
              ${colCases.length === 0 ? `<div class="muted" style="font-size:12px;text-align:center;padding:20px 0">無案件</div>` : colCases.map(c => {
                const owners = (c.ownerUids || []).map(uid => userOf(uid)).filter(Boolean);
                const pct = Math.min(100, Math.max(0, Number(c.progress || 0)));
                const latestLog = Array.isArray(c.timeline) && c.timeline[0] ? c.timeline[0] : null;
                return `
                  <div class="case-kanban-card">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
                      <strong style="font-size:13.5px;line-height:1.35">${esc(c.title)}</strong>
                      <button class="icon-btn" data-edit-case="${esc(c.id)}" title="編輯"></button>
                    </div>
                    ${latestLog ? `<div class="muted" style="font-size:12px;margin-top:6px;background:#F8FAFC;padding:6px 8px;border-radius:6px">${esc(latestLog.note)}</div>` : (c.summary ? `<div class="muted" style="font-size:12px;margin-top:4px">${esc(c.summary)}</div>` : '')}
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;gap:8px">
                      <div class="case-owners-avatars">${owners.map(u => avatar(u, 22)).join('')}</div>
                      <div class="case-prog-mini">
                        <div class="case-prog-bar"><span style="width:${pct}%;background:${st.color}"></span></div>
                        <span class="case-prog-num">${pct}%</span>
                      </div>
                      <button class="btn sm primary" data-log-case="${esc(c.id)}" style="padding:2px 8px;font-size:11.5px">＋進度</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function openCaseFormModal(existing, onDone) {
  const users = activeUsers();
  const c = existing || {
    title: '',
    summary: '',
    status: 'active',
    priority: 'medium',
    progress: 10,
    dueDate: '',
    ownerUids: [myUid()],
  };
  const ownerSet = new Set(c.ownerUids || [myUid()]);

  openModal(`
    <div class="modal-head">
      <h3>${existing ? '編輯例案' : '新增例案追蹤'}</h3>
      <button class="icon-btn" data-close>✕</button>
    </div>
    <form class="form" id="case-form">
      <label>案件名稱 <span class="req">*</span>
        <input type="text" name="title" required value="${esc(c.title)}" placeholder="例如：雙北站點 2.0E 電輔車配置優化專案">
      </label>
      <div class="grid2">
        <label>目前狀態
          <select name="status">
            ${CASE_STATUSES.map(s => `<option value="${s.id}" ${c.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </label>
        <label>優先級
          <select name="priority">
            ${CASE_PRIORITIES.map(p => `<option value="${p.id}" ${c.priority === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="grid2">
        <label>目前完成度（<span id="case-pct-val">${c.progress ?? 0}</span>%）
          <input type="range" name="progress" min="0" max="100" step="5" value="${c.progress ?? 0}" oninput="document.getElementById('case-pct-val').textContent=this.value">
        </label>
        <label>預計完成日（選填）
          <input type="date" name="dueDate" value="${esc(c.dueDate || '')}">
        </label>
      </div>
      <label>負責組員（可複選）
        <div class="chips" style="padding:6px 0">
          ${users.map(u => `
            <label class="chip-check">
              <input type="checkbox" name="owner" value="${esc(u.uid)}" ${ownerSet.has(u.uid) ? 'checked' : ''}>
              <span>${esc(u.displayName)}</span>
            </label>
          `).join('')}
        </div>
      </label>
      <label>專案目標／摘要說明
        <textarea name="summary" rows="2" placeholder="簡述此例案的核心目標或背景…">${esc(c.summary || '')}</textarea>
      </label>
      ${!existing ? `
        <label>初始進度紀錄（選填，將寫入時間軸第一筆）
          <input type="text" name="initNote" placeholder="例如：已完成初步需求盤點與跨部門排程">
        </label>
      ` : ''}
      <div class="modal-foot">
        <button type="button" class="btn" data-close>取消</button>
        <button type="submit" class="btn primary">儲存例案</button>
      </div>
    </form>
  `);

  document.getElementById('case-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const ownerUids = [...f.querySelectorAll('input[name="owner"]:checked')].map(i => i.value);
    const payload = {
      title: f.title.value.trim(),
      status: f.status.value,
      priority: f.priority.value,
      progress: Number(f.progress.value || 0),
      dueDate: f.dueDate.value || '',
      ownerUids: ownerUids.length ? ownerUids : [myUid()],
      summary: f.summary.value.trim(),
    };
    if (!existing) {
      const initNote = f.initNote?.value?.trim() || '建立例案';
      payload.timeline = [{
        id: 'tl_' + Date.now().toString(36),
        uid: myUid(),
        authorName: state.me?.displayName || '組員',
        note: initNote,
        progress: payload.progress,
        status: payload.status,
        at: new Date().toISOString(),
      }];
    }
    await saveCaseItem(payload, existing);
    closeModal();
    toast(existing ? '例案已更新' : '已新增例案追蹤');
    onDone?.();
  };
}

function openTimelineLogModal(c, onDone) {
  openModal(`
    <div class="modal-head">
      <h3>推進例案進度：${esc(c.title)}</h3>
      <button class="icon-btn" data-close>✕</button>
    </div>
    <form class="form" id="tl-form">
      <div class="grid2">
        <label>更新狀態
          <select name="status">
            ${CASE_STATUSES.map(s => `<option value="${s.id}" ${c.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </label>
        <label>最新完成度（<span id="tl-pct-val">${c.progress ?? 0}</span>%）
          <input type="range" name="progress" min="0" max="100" step="5" value="${c.progress ?? 0}" oninput="document.getElementById('tl-pct-val').textContent=this.value">
        </label>
      </div>
      <label>最新進展說明 <span class="req">*</span>
        <textarea name="note" rows="3" required placeholder="例如：10/20 已完成第二波場站會勘，預計下週提報審查…"></textarea>
      </label>
      <div class="modal-foot">
        <button type="button" class="btn" data-close>取消</button>
        <button type="submit" class="btn primary">寫入時間軸</button>
      </div>
    </form>
  `);
  document.getElementById('tl-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    await appendCaseTimeline(c.id, {
      status: f.status.value,
      progress: Number(f.progress.value),
      note: f.note.value.trim(),
    });
    closeModal();
    toast('已寫入最新進度時間軸！');
    onDone?.();
  };
}
