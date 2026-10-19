// 管理後台：組員名單、行程類型、業務模組權限
import {
  state, myUid, isAdmin, updateUserAdmin, saveType, purgeDueAt,
  saveMeetingSettings, activeUsers, isFieldStaff, isExcludedFromRecorder,
  getEffectiveLastRecorderUid, hasModulePermission, saveUserModulePermission,
  batchUpdateModulePermission
} from '../data.js';
import { APP } from '../config.js';
import { esc, avatar, toast, confirmDialog, timeAgo } from '../utils.js';
import { openAchievementsModal } from '../achievementsModal.js';
import { ACHIEVEMENTS } from '../achievementsData.js';

export function mountAdmin(el) {
  if (!isAdmin()) {
    el.innerHTML = '<div class="empty">只有管理員可以使用此頁面</div>';
    return {};
  }

  let currentTab = 'system'; // 'system' | 'permissions'

  el.innerHTML = `
    <div class="toolbar">
      <div style="display:flex; align-items:center;">
        <h2 class="view-title" style="text-align:left;">管理</h2>
      </div>
      <div class="seg" data-admin-switcher title="切換管理檢視">
        <label><input type="radio" name="adminViewTab" value="system" checked><span>👥 系統組員設定</span></label>
        <label><input type="radio" name="adminViewTab" value="permissions"><span>🛡️ 業務模組權限</span></label>
      </div>
      <div class="toolbar-end" style="display:flex; justify-content:flex-end;">
        <button class="btn primary achieve-trigger-btn" data-open-achievements title="查看專案開發成果與里程碑">
          <span style="font-size:16px;">🏆</span>
          <span>專案成果與里程碑</span>
          <span class="achieve-trigger-badge">${ACHIEVEMENTS.length} 項</span>
        </button>
      </div>
    </div>

    <!-- 系統組員與基本設定面板 -->
    <div class="admin-panel" data-panel="system">
      <section class="card pad">
        <div class="section-head">
          <h3>組員名單</h3>
          <label class="field check small-text"><input type="checkbox" data-show-inactive> 顯示已停用 <span data-inactive-count></span></label>
        </div>
        <p class="hint">公司網域帳號第一次登入後會自動加入。停用後該組員無法登入、從名單隱藏，<b>停用滿 ${APP.purgeAfterDays} 天未重新啟用將自動刪除</b>（過去的行程保留，顯示為「已離職組員」）。</p>
        <div class="table-scroll"><table class="table" data-users></table></div>
      </section>
      <section class="card pad">
        <h3>行程類型</h3>
        <p class="hint">停用的類型不會出現在新增行程的選項中，既有行程不受影響。</p>
        <div class="table-scroll"><table class="table" data-types></table></div>
        <button class="btn" data-add-type>＋ 新增類型</button>
      </section>
      <section class="card pad">
        <h3>💼 月會與紀錄人輪值設定</h3>
        <p class="hint">設定預設開會地點、Google Meet 連結，以及紀錄人輪值順序。排定月會時系統會自動依此順序建議下一位紀錄人。</p>
        <form class="form" data-meeting-settings-form style="margin-top:14px;">
          <div class="row2">
            <label class="field">
              <span>預設 Google Meet 連結</span>
              <input type="url" name="defaultMeetUrl" placeholder="https://meet.google.com/xxx-xxxx-xxx">
            </label>
            <label class="field">
              <span>預設開會地點</span>
              <input type="text" name="defaultLocation" placeholder="例：總公司 5F 大會議室">
            </label>
          </div>
          <div class="row2">
            <label class="field">
              <span>預設開始時間</span>
              <input type="time" name="defaultStartTime" value="14:00">
            </label>
            <label class="field">
              <span>預設結束時間</span>
              <input type="time" name="defaultEndTime" value="16:00">
            </label>
          </div>
          <div class="field">
            <span>紀錄人輪值順序（點擊上下箭頭調整優先順序）</span>
            <div class="rotation-order-list" data-rotation-list style="margin-top:6px;"></div>
          </div>
          <div>
            <button type="submit" class="btn primary">儲存月會設定</button>
          </div>
        </form>
      </section>
    </div>

    <!-- 業務模組權限矩陣面板 -->
    <div class="admin-panel" data-panel="permissions" hidden>
      <section class="card pad">
        <div class="section-head" style="align-items:flex-start; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
            <h3>🛡️ 業務模組存取權限矩陣</h3>
          </div>
          <p class="hint" style="margin-top:2px;">
            精準控管各組員可見與操作的業務模組。未勾選之組員，頂部導航欄將自動隱藏該功能頁籤並限制進入。<b>系統管理員</b>預設享有全模組完整存取權。
          </p>
        </div>

        <div class="perm-legend-box" style="margin: 14px 0; display:flex; gap:16px; flex-wrap:wrap; font-size:12.5px; padding:10px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:14px;">🚲</span>
            <b>模擬體驗</b>：<span class="muted">YouBike 2.0 車機借還車、調度、電輔車模擬測試功能</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:14px;">📝</span>
            <b>每日回報</b>：<span class="muted">內勤下班工作進度回報、一鍵複製 LINE 格式、颱風假切換與主管審閱</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:14px;">📢</span>
            <b>採購佈告欄</b>：<span class="muted">採購 Team 專案管理、公告資訊、文件清單與業務後台</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:14px;">⚙️</span>
            <b>管理員 (全通)</b>：<span class="muted">擁有所有業務模組最高控管與修改權限</span>
          </div>
        </div>

        <div class="table-scroll">
          <table class="table perm-matrix-table" data-perm-table>
            <!-- 動態渲染矩陣內容 -->
          </table>
        </div>
      </section>
    </div>`;

  const q = s => el.querySelector(s);
  let showInactive = false;
  q('[data-show-inactive]').onchange = e => { showInactive = e.target.checked; render(); };

  // 視圖切換監聽
  const switcherInputs = el.querySelectorAll('input[name="adminViewTab"]');
  switcherInputs.forEach(input => {
    input.addEventListener('change', e => {
      currentTab = e.target.value;
      const systemPanel = q('[data-panel="system"]');
      const permPanel = q('[data-panel="permissions"]');
      if (currentTab === 'system') {
        systemPanel.hidden = false;
        permPanel.hidden = true;
      } else {
        systemPanel.hidden = true;
        permPanel.hidden = false;
        renderPermMatrix();
      }
    });
  });

  const achieveBtn = q('[data-open-achievements]');
  if (achieveBtn) {
    achieveBtn.onclick = () => openAchievementsModal();
  }

  q('[data-users]').addEventListener('change', async e => {
    const tr = e.target.closest('tr[data-uid]');
    if (!tr) return;
    const uid = tr.dataset.uid;
    const u = state.users.get(uid);
    let patch = {};
    if (e.target.name === 'role') patch.role = e.target.value;
    else if (e.target.name === 'title') patch.title = e.target.value.trim();
    else if (e.target.name === 'active') patch.active = e.target.checked;
    else return;

    if (patch.active === false && !(await confirmDialog(`確定要停用 <b>${esc(u.displayName)}</b> 嗎？<br><small class="muted">停用後將從名單隱藏；${APP.purgeAfterDays} 天內未重新啟用，資料會自動刪除。</small>`, { danger: true, okText: '停用' }))) {
      e.target.checked = true;
      return;
    }
    try {
      await updateUserAdmin(uid, patch);
      toast('已更新', 'success');
    } catch (err) {
      console.error(err);
      toast('更新失敗：' + (err.code || err.message), 'error');
      render();
    }
  });

  q('[data-users]').addEventListener('click', async e => {
    const upBtn = e.target.closest('[data-user-up]');
    const downBtn = e.target.closest('[data-user-down]');
    if (!upBtn && !downBtn) return;

    const all = [...state.users.values()];
    const customUserOrder = state.meetingSettings?.userOrder || [];
    const userOrderMap = new Map(customUserOrder.map((uid, idx) => [uid, idx]));
    const activeList = all.filter(u => u.active).sort((a, b) => {
      const idxA = userOrderMap.has(a.uid) ? userOrderMap.get(a.uid) : 999;
      const idxB = userOrderMap.has(b.uid) ? userOrderMap.get(b.uid) : 999;
      if (idxA !== idxB) return idxA - idxB;
      return (a.displayName || '').localeCompare(b.displayName || '', 'zh-Hant');
    });

    const currentOrder = activeList.map(u => u.uid);
    if (upBtn) {
      const idx = Number(upBtn.dataset.userUp);
      if (idx > 0) {
        const tmp = currentOrder[idx];
        currentOrder[idx] = currentOrder[idx - 1];
        currentOrder[idx - 1] = tmp;
        try {
          await saveMeetingSettings({ userOrder: currentOrder });
          toast('組員排序已更新', 'info');
        } catch (err) {
          toast('排序更新失敗：' + (err.code || err.message), 'error');
        }
      }
    } else if (downBtn) {
      const idx = Number(downBtn.dataset.userDown);
      if (idx < currentOrder.length - 1) {
        const tmp = currentOrder[idx];
        currentOrder[idx] = currentOrder[idx + 1];
        currentOrder[idx + 1] = tmp;
        try {
          await saveMeetingSettings({ userOrder: currentOrder });
          toast('組員排序已更新', 'info');
        } catch (err) {
          toast('排序更新失敗：' + (err.code || err.message), 'error');
        }
      }
    }
  });

  q('[data-types]').addEventListener('click', async e => {
    const btn = e.target.closest('[data-save]');
    if (!btn) return;
    const tr = btn.closest('tr');
    const t = {
      id: tr.dataset.id || null,
      name: tr.querySelector('[name=name]').value.trim(),
      color: tr.querySelector('[name=color]').value,
      order: tr.querySelector('[name=order]').value,
      active: tr.querySelector('[name=active]').checked,
    };
    if (!t.name) return toast('請輸入類型名稱', 'warn');
    btn.disabled = true;
    try {
      await saveType(t);
      toast('已儲存類型', 'success');
      if (!t.id) tr.remove();
    } catch (err) {
      console.error(err);
      toast('儲存失敗：' + (err.code || err.message), 'error');
    } finally {
      btn.disabled = false;
    }
  });

  q('[data-add-type]').onclick = () => {
    const tbody = q('[data-types] tbody');
    tbody.insertAdjacentHTML('beforeend', typeRow({ name: '', color: '#0ea5e9', order: state.types.length, active: true }, true));
    tbody.lastElementChild.querySelector('[name=name]').focus();
  };

  function typeRow(t, isNew = false) {
    return `<tr ${isNew ? '' : `data-id="${esc(t.id)}"`}>
      <td><input type="color" name="color" value="${esc(t.color)}"></td>
      <td><input name="name" maxlength="20" value="${esc(t.name)}" placeholder="類型名稱"></td>
      <td><input name="order" type="number" min="0" style="width:64px" value="${esc(t.order ?? 0)}"></td>
      <td><label class="switch"><input type="checkbox" name="active" ${t.active !== false ? 'checked' : ''}><span></span></label></td>
      <td><button class="btn small primary" data-save>${isNew ? '新增' : '儲存'}</button></td>
    </tr>`;
  }

  function render() {
    // 若正在編輯類型或組員職位，不要強制重繪該表格導致焦點跳失
    const editingType = el.contains(document.activeElement) && document.activeElement.closest('[data-types]');
    const editingUser = el.contains(document.activeElement) && document.activeElement.closest('[data-users]') && document.activeElement.name === 'title';
    const me = myUid();
    const all = [...state.users.values()];
    const inactiveCount = all.filter(u => !u.active).length;
    q('[data-inactive-count]').textContent = inactiveCount ? `（${inactiveCount}）` : '';
    const customUserOrder = state.meetingSettings?.userOrder || [];
    const userOrderMap = new Map(customUserOrder.map((uid, idx) => [uid, idx]));
    const activeList = all.filter(u => u.active).sort((a, b) => {
      const idxA = userOrderMap.has(a.uid) ? userOrderMap.get(a.uid) : 999;
      const idxB = userOrderMap.has(b.uid) ? userOrderMap.get(b.uid) : 999;
      if (idxA !== idxB) return idxA - idxB;
      return (a.displayName || '').localeCompare(b.displayName || '', 'zh-Hant');
    });
    const inactiveList = all.filter(u => !u.active).sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'zh-Hant'));
    const users = showInactive ? [...activeList, ...inactiveList] : activeList;

    const md = ms => { const d = new Date(ms); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };
    const statusCell = u => {
      if (u.active) return u.createdAt ? `加入 ${timeAgo(u.createdAt)}` : '';
      const due = purgeDueAt(u);
      if (!due) return '已停用';
      const left = Math.max(0, Math.ceil((due - Date.now()) / 86400000));
      return `停用於 ${md(u.deactivatedAt.toMillis())}<br><span class="purge-note">將於 ${md(due)} 刪除（剩 ${left} 天）</span>`;
    };
    if (!editingUser) {
      q('[data-users]').innerHTML = `
        <thead><tr><th style="width:72px; text-align:center;">順序</th><th>組員</th><th>職位</th><th>Email</th><th>系統權限</th><th>啟用</th><th>狀態</th></tr></thead>
        <tbody>${users.map((u, i) => {
          const canReorder = u.active;
          const activeIdx = activeList.findIndex(x => x.uid === u.uid);
          return `
          <tr data-uid="${esc(u.uid)}" class="${u.active ? '' : 'inactive'}">
            <td style="text-align:center; white-space:nowrap;">
              ${canReorder ? `
                <button type="button" class="btn icon small ghost" data-user-up="${activeIdx}" ${activeIdx === 0 ? 'disabled' : ''} title="往前移" style="padding:2px 4px; font-size:11px;">▲</button>
                <button type="button" class="btn icon small ghost" data-user-down="${activeIdx}" ${activeIdx === activeList.length - 1 ? 'disabled' : ''} title="往後移" style="padding:2px 4px; font-size:11px;">▼</button>
              ` : '<span class="muted small-text">-</span>'}
            </td>
            <td><span class="person">${avatar(u, 28)}${esc(u.displayName)}${u.uid === me ? '<span class="me-tag">我</span>' : ''}${isFieldStaff(u) ? '<span class="member-field-tag">外勤</span>' : ''}</span></td>
            <td><input type="text" name="title" value="${esc(u.title || '')}" placeholder="例：經營企劃專員" style="width:160px; font-size:13px; padding:4px 8px;"></td>
            <td class="muted">${esc(u.email)}</td>
            <td><select name="role" ${u.uid === me ? 'disabled title="無法變更自己的權限"' : ''}>
              <option value="member" ${u.role === 'member' ? 'selected' : ''}>組員</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>管理員</option>
            </select></td>
            <td><label class="switch"><input type="checkbox" name="active" ${u.active ? 'checked' : ''} ${u.uid === me ? 'disabled' : ''}><span></span></label></td>
            <td class="muted small-text">${statusCell(u)}</td>
          </tr>`;
        }).join('')}
        </tbody>`;
    }
    if (!editingType) {
      q('[data-types]').innerHTML = `
        <thead><tr><th>顏色</th><th>名稱</th><th>排序</th><th>啟用</th><th></th></tr></thead>
        <tbody>${state.types.map(t => typeRow(t)).join('')}</tbody>`;
    }

    // 渲染月會預設設定
    const ms = state.meetingSettings || {};
    const f = q('[data-meeting-settings-form]');
    if (f && !f.dataset.loaded) {
      f.dataset.loaded = 'true';
      f.defaultMeetUrl.value = ms.defaultMeetUrl || '';
      f.defaultLocation.value = ms.defaultLocation || '總公司 5F 大會議室';
      f.defaultStartTime.value = ms.defaultStartTime || '14:00';
      f.defaultEndTime.value = ms.defaultEndTime || '16:00';
    }
    renderRotationList();
  }

  let currentRotation = [];
  function renderRotationList() {
    const ms = state.meetingSettings || {};
    // 輪值名單自動排除主管（徐嘉鴻）與常態外勤組員（孔令淳、葉爵豪、陸逸群）
    const active = activeUsers().filter(u => !isExcludedFromRecorder(u));
    let order = Array.isArray(ms.rotationOrder) ? [...ms.rotationOrder] : [];
    const set = new Set(order);
    active.forEach(u => { if (!set.has(u.uid)) order.push(u.uid); });
    order = order.filter(uid => {
      const u = state.users.get(uid);
      return u?.active && !isExcludedFromRecorder(u);
    });
    currentRotation = order;

    // 動態判斷上次紀錄人：優先取已結束會議之紀錄人，若無則取設定
    const effectiveLastUid = getEffectiveLastRecorderUid();

    const listEl = q('[data-rotation-list]');
    if (!listEl) return;
    listEl.innerHTML = order.map((uid, idx) => {
      const u = state.users.get(uid);
      const isLast = effectiveLastUid === uid;
      return `
        <div class="rotation-item" data-uid="${esc(uid)}">
          <span class="rot-num">${idx + 1}</span>
          <span class="person">${avatar(u, 24)} <b>${esc(u?.displayName || uid)}</b></span>
          ${isLast ? '<span class="badge-tag ok" title="系統判斷此為最近一次會議之紀錄人">上次紀錄人</span>' : ''}
          <div class="spacer"></div>
          ${!isLast ? `<button type="button" class="btn small ghost" data-set-last="${esc(uid)}" title="手動將此人設為基準紀錄人" style="font-size:11px; padding:2px 8px; color:var(--muted);">設為上次紀錄人</button>` : ''}
          <button type="button" class="btn icon small ghost" data-rot-up="${idx}" ${idx === 0 ? 'disabled' : ''} title="往前移">▲</button>
          <button type="button" class="btn icon small ghost" data-rot-down="${idx}" ${idx === order.length - 1 ? 'disabled' : ''} title="往後移">▼</button>
        </div>`;
    }).join('') + `
      <div class="hint" style="margin-top:10px; font-size:12px; color:var(--text-muted); background:var(--bg-subtle); padding:8px 12px; border-radius:6px; border-left:3px solid var(--accent, #6366f1); line-height:1.6;">
        💡 <b>併行判定機制</b>：
        <br>1. 系統自動以<b>已開完的最近一場月會紀錄人</b>作為基準往下輪值（如當天請假/出差自動跳下一位）。
        <br>2. 若排定時當事人無法到場，除了可於排定月會時隨時<b>下拉手動指定他人</b>，也可點擊上方<b>「設為上次紀錄人」</b>直接校正輪值基準點。
        <br>3. 主管（徐嘉鴻）與常態外勤組員（孔令淳、葉爵豪、陸逸群）已自動自紀錄人輪值序列中排除。
      </div>`;
  }

  q('[data-rotation-list]')?.addEventListener('click', e => {
    const setLastBtn = e.target.closest('[data-set-last]');
    if (setLastBtn) {
      const uid = setLastBtn.dataset.setLast;
      const u = state.users.get(uid);
      saveMeetingSettings({ lastRecorderUid: uid }).then(() => {
        toast(`已將 ${u?.displayName || ''} 設為紀錄人輪值基準`, 'success');
        renderRotationList();
      });
      return;
    }
    const upBtn = e.target.closest('[data-rot-up]');
    if (upBtn) {
      const idx = Number(upBtn.dataset.rotUp);
      if (idx > 0) {
        const tmp = currentRotation[idx];
        currentRotation[idx] = currentRotation[idx - 1];
        currentRotation[idx - 1] = tmp;
        saveMeetingSettings({ rotationOrder: currentRotation }).then(() => toast('輪值順序已更新', 'info'));
      }
      return;
    }
    const downBtn = e.target.closest('[data-rot-down]');
    if (downBtn) {
      const idx = Number(downBtn.dataset.rotDown);
      if (idx < currentRotation.length - 1) {
        const tmp = currentRotation[idx];
        currentRotation[idx] = currentRotation[idx + 1];
        currentRotation[idx + 1] = tmp;
        saveMeetingSettings({ rotationOrder: currentRotation }).then(() => toast('輪值順序已更新', 'info'));
      }
    }
  });

  q('[data-meeting-settings-form]')?.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const patch = {
      defaultMeetUrl: f.defaultMeetUrl.value.trim(),
      defaultLocation: f.defaultLocation.value.trim(),
      defaultStartTime: f.defaultStartTime.value,
      defaultEndTime: f.defaultEndTime.value,
      rotationOrder: currentRotation,
    };
    try {
      await saveMeetingSettings(patch);
      toast('月會預設設定已儲存', 'success');
    } catch (err) {
      toast('儲存失敗：' + (err.code || err.message), 'error');
    }
  });

  // 權限矩陣表格渲染
  function renderPermMatrix() {
    const table = q('[data-perm-table]');
    if (!table) return;

    const me = myUid();
    const all = [...state.users.values()];
    const customUserOrder = state.meetingSettings?.userOrder || [];
    const userOrderMap = new Map(customUserOrder.map((uid, idx) => [uid, idx]));
    const activeList = all.filter(u => u.active).sort((a, b) => {
      const idxA = userOrderMap.has(a.uid) ? userOrderMap.get(a.uid) : 999;
      const idxB = userOrderMap.has(b.uid) ? userOrderMap.get(b.uid) : 999;
      if (idxA !== idxB) return idxA - idxB;
      return (a.displayName || '').localeCompare(b.displayName || '', 'zh-Hant');
    });

    table.innerHTML = `
      <thead>
        <tr>
          <th style="min-width:180px;">組員姓名 / 職稱</th>
          <th style="min-width:140px;">系統角色</th>
          <th style="text-align:center; min-width:120px;">
            <div style="display:inline-flex; align-items:center; gap:4px;">
              <span>🚲 模擬體驗</span>
            </div>
          </th>
          <th style="text-align:center; min-width:120px;">
            <div style="display:inline-flex; align-items:center; gap:4px;">
              <span>📝 每日回報</span>
            </div>
          </th>
          <th style="text-align:center; min-width:120px;">
            <div style="display:inline-flex; align-items:center; gap:4px;">
              <span>📢 採購佈告欄</span>
            </div>
          </th>
          <th style="min-width:200px;">權限說明狀態</th>
        </tr>
      </thead>
      <tbody>
        ${activeList.map(u => {
          const isUserAdmin = u.role === 'admin';
          const canSim = hasModulePermission(u, 'simulation');
          const canDaily = hasModulePermission(u, 'dailyReport');
          const canBulletin = hasModulePermission(u, 'bulletin');
          const isSelf = u.uid === me;
          const activeModCount = [canSim, canDaily, canBulletin].filter(Boolean).length;

          return `
            <tr data-perm-uid="${esc(u.uid)}">
              <td>
                <div class="person" style="gap:8px;">
                  ${avatar(u, 30)}
                  <div>
                    <div style="font-weight:600; display:flex; align-items:center; gap:6px;">
                      ${esc(u.displayName || u.email)}
                      ${isSelf ? '<span class="me-tag">我</span>' : ''}
                      ${isFieldStaff(u) ? '<span class="member-field-tag">外勤</span>' : ''}
                    </div>
                    <div class="muted small-text">${esc(u.title || '一般組員')} · ${esc(u.email || '')}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge-role ${isUserAdmin ? 'role-admin' : 'role-member'}">
                  ${isUserAdmin ? '⚙️ 管理員' : '👤 組員'}
                </span>
              </td>
              <td style="text-align:center;">
                <label class="perm-check-wrap ${isUserAdmin ? 'disabled' : ''}">
                  <input type="checkbox" data-perm-mod="simulation"
                    ${canSim ? 'checked' : ''}
                    ${isUserAdmin ? 'disabled title="管理員預設擁有全模組權限"' : ''}>
                  <span class="perm-check-custom"></span>
                </label>
              </td>
              <td style="text-align:center;">
                <label class="perm-check-wrap ${isUserAdmin ? 'disabled' : ''}">
                  <input type="checkbox" data-perm-mod="dailyReport"
                    ${canDaily ? 'checked' : ''}
                    ${isUserAdmin ? 'disabled title="管理員預設擁有全模組權限"' : ''}>
                  <span class="perm-check-custom"></span>
                </label>
              </td>
              <td style="text-align:center;">
                <label class="perm-check-wrap ${isUserAdmin ? 'disabled' : ''}">
                  <input type="checkbox" data-perm-mod="bulletin"
                    ${canBulletin ? 'checked' : ''}
                    ${isUserAdmin ? 'disabled title="管理員預設擁有全模組權限"' : ''}>
                  <span class="perm-check-custom"></span>
                </label>
              </td>
              <td>
                ${isUserAdmin ?
                  '<span class="perm-status-note note-admin">全通權限（管理員最高權限）</span>' :
                  `<span class="perm-status-note ${activeModCount === 3 ? 'note-all' : (activeModCount > 0 ? 'note-partial' : 'note-none')}">
                    ${activeModCount === 3 ? '全業務模組已開通' : (activeModCount > 0 ? `已開通 ${activeModCount} 項業務模組` : '未開通業務模組')}
                  </span>`
                }
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    `;
  }

  // 監聽矩陣單一勾選切換
  q('[data-perm-table]')?.addEventListener('change', async e => {
    const target = e.target;
    if (!target.matches('input[data-perm-mod]')) return;
    const tr = target.closest('tr[data-perm-uid]');
    if (!tr) return;
    const uid = tr.dataset.permUid;
    const mod = target.dataset.permMod;
    const allowed = target.checked;

    try {
      await saveUserModulePermission(uid, mod, allowed);
      toast('模組權限已更新', 'success');
      renderPermMatrix();
    } catch (err) {
      console.error(err);
      toast('權限更新失敗：' + (err.code || err.message), 'error');
      target.checked = !allowed;
    }
  });



  render();
  return {
    update() {
      render();
      if (currentTab === 'permissions') {
        renderPermMatrix();
      }
    }
  };
}
