// 🌠 許願池 & 🗣️ 意見箱（抱怨箱）模組
// - 許願池：具名公開，支援組員 +1 附議投票、管理員標記狀態（評估中／開發中／已實現）
// - 意見箱（抱怨箱）：支援「🥷 完全匿名（連資料庫與管理員都不記錄真實 UID）」或「具名」自由切換，讓組員放心大吐苦水並互相拍拍打氣
import {
  state, myUid, isAdmin, wishList, saveWishItem, toggleWishVote, deleteWishItem,
  ventList, createVentItem, toggleVentReaction, addVentReply, deleteVentItem,
} from '../data.js';
import { esc, toast, openModal, closeModal, confirmDialog } from '../utils.js';

const WISH_STATUSES = [
  { id: 'open',      label: '💡 許願集氣中', color: '#D97706', bg: '#FFFBEB' },
  { id: 'reviewing', label: '🔍 評估規劃中', color: '#2563EB', bg: '#EFF6FF' },
  { id: 'building',  label: '🛠️ 排程開發中', color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'done',      label: '🎉 已實現上線', color: '#16A34A', bg: '#F0FDF4' },
];

const VENT_CATEGORIES = [
  { id: 'work',   label: '💼 工作流程／制度吐苦水' },
  { id: 'field',  label: '🚲 外勤日曬雨淋辛酸淚' },
  { id: 'comm',   label: '📞 跨部門溝通心累日常' },
  { id: 'life',   label: '☕ 職場心情抒發' },
];

export function mountWishes(el) {
  function render() {
    const wishes = wishList();
    const uid = myUid();

    el.innerHTML = `
      <div class="toolbar">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <h2 class="view-title" style="margin:0">🌠 團隊許願池</h2>
          <span class="info-pill-tip" title="想要什麼實用工具、自動化報表或好用的系統介面？歡迎具名提出並讓大家按 +1 附議集氣！">ⓘ 說明</span>
          <div class="compact-kpi-strip">
            <span class="kpi-chip">總許願 <b>${wishes.length}</b></span>
            <span class="kpi-chip">🎉 已實現 <b>${wishes.filter(w => w.status === 'done').length}</b></span>
          </div>
        </div>
        <div class="toolbar-end" style="display:flex;gap:8px">
          <a href="#/vents" class="btn sm ghost" style="text-decoration:none">🗣️ 切換至意見箱(抱怨箱)</a>
          <button class="btn primary sm" data-new-wish>＋ 許一個願望</button>
        </div>
      </div>

      ${wishes.length === 0 ? `
        <div class="card pad empty" style="padding:48px 20px;text-align:center">
          <div style="font-size:40px;margin-bottom:8px">🌠</div>
          <h3 style="margin:0 0 6px">許願池目前還沒有願望</h3>
          <p class="muted" style="margin:0 0 16px">有任何希望加進平台的小工具、自動統計或介面優化，歡迎第一個提出！</p>
          <button class="btn primary" data-new-wish>＋ 提出第一個願望</button>
        </div>
      ` : `
        <div class="wish-grid">
          ${wishes.map(w => {
            const st = WISH_STATUSES.find(s => s.id === (w.status || 'open')) || WISH_STATUSES[0];
            const votes = Array.isArray(w.votes) ? w.votes : [];
            const voted = votes.includes(uid);
            const canDel = w.createdBy === uid || isAdmin();
            return `
              <div class="card pad wish-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
                  <div style="min-width:0;flex:1">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px">
                      <span class="case-status-badge" style="background:${st.bg};color:${st.color}">${st.label}</span>
                      <span class="muted" style="font-size:12px">許願人：<b>${esc(w.authorName || '組員')}</b> · ${esc((w.createdAtIso || '').slice(0, 10))}</span>
                    </div>
                    <h3 style="margin:0 0 6px;font-size:15.5px">${esc(w.title)}</h3>
                    <p style="margin:0;font-size:13.5px;color:var(--text);line-height:1.55;white-space:pre-wrap">${esc(w.description || '')}</p>
                    ${w.adminNote ? `
                      <div style="margin-top:8px;background:#F8FAFC;border-left:3px solid var(--primary);padding:6px 10px;border-radius:6px;font-size:12.5px">
                        <strong>🛠️ 開發評估回覆：</strong>${esc(w.adminNote)}
                      </div>
                    ` : ''}
                  </div>
                  <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0">
                    <button class="btn ${voted ? 'primary' : ''}" data-vote-wish="${esc(w.id)}" style="min-width:74px;flex-direction:column;padding:8px 12px;gap:2px">
                      <span style="font-size:16px">🙌 +1</span>
                      <span style="font-size:12px;font-weight:800">${votes.length} 人附議</span>
                    </button>
                    <div style="display:flex;gap:4px">
                      ${isAdmin() ? `<button class="btn sm ghost" data-status-wish="${esc(w.id)}" title="更新實現狀態">⚙️</button>` : ''}
                      ${canDel ? `<button class="btn sm ghost" data-del-wish="${esc(w.id)}" title="刪除" style="color:var(--danger)">✕</button>` : ''}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;

    el.querySelectorAll('[data-new-wish]').forEach(btn => {
      btn.onclick = () => openNewWishModal(render);
    });
    el.querySelectorAll('[data-vote-wish]').forEach(btn => {
      btn.onclick = async () => {
        await toggleWishVote(btn.dataset.voteWish);
        render();
      };
    });
    el.querySelectorAll('[data-status-wish]').forEach(btn => {
      btn.onclick = () => {
        const w = state.wishes.get(btn.dataset.statusWish);
        if (w) openWishAdminModal(w, render);
      };
    });
    el.querySelectorAll('[data-del-wish]').forEach(btn => {
      btn.onclick = async () => {
        const w = state.wishes.get(btn.dataset.delWish);
        if (!w) return;
        if (!(await confirmDialog(`確定要刪除許願「${w.title}」嗎？`, { danger: true, okText: '刪除' }))) return;
        await deleteWishItem(w.id);
        toast('已刪除許願');
        render();
      };
    });
  }

  render();
  return { onData: render };
}

function openNewWishModal(onDone) {
  openModal(`
    <div class="modal-head">
      <h3>🌠 許一個新願望（實用工具／介面優化）</h3>
      <button class="icon-btn" data-close>✕</button>
    </div>
    <form class="form" id="wish-form">
      <label>願望標題 <span class="req">*</span>
        <input type="text" name="title" required placeholder="例如：希望小工具新增各縣市 YouBike 場站天氣預警地圖">
      </label>
      <label>具體想法或使用情境說明 <span class="req">*</span>
        <textarea name="description" rows="4" required placeholder="說明這個工具或功能可以幫大家省下什麼麻煩…"></textarea>
      </label>
      <div class="modal-foot">
        <button type="button" class="btn" data-close>取消</button>
        <button type="submit" class="btn primary">送出許願</button>
      </div>
    </form>
  `);
  document.getElementById('wish-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    await saveWishItem({
      title: f.title.value.trim(),
      description: f.description.value.trim(),
    });
    closeModal();
    toast('願望已送出！快揪同事一起按 +1 附議');
    onDone?.();
  };
}

function openWishAdminModal(w, onDone) {
  openModal(`
    <div class="modal-head">
      <h3>⚙️ 更新許願狀態：${esc(w.title)}</h3>
      <button class="icon-btn" data-close>✕</button>
    </div>
    <form class="form" id="wish-admin-form">
      <label>目前處理狀態
        <select name="status">
          ${WISH_STATUSES.map(s => `<option value="${s.id}" ${w.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </label>
      <label>開發評估／回覆說明（選填）
        <textarea name="adminNote" rows="3" placeholder="例如：已排入下週更新，預計週五上線！">${esc(w.adminNote || '')}</textarea>
      </label>
      <div class="modal-foot">
        <button type="button" class="btn" data-close>取消</button>
        <button type="submit" class="btn primary">儲存更新</button>
      </div>
    </form>
  `);
  document.getElementById('wish-admin-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    await saveWishItem({
      status: f.status.value,
      adminNote: f.adminNote.value.trim(),
    }, w);
    closeModal();
    toast('許願狀態已更新');
    onDone?.();
  };
}

// ============================================================
// 🗣️ 意見箱（抱怨箱）：支援「完全匿名」吐苦水與打氣互動
// ============================================================
export function mountVents(el) {
  const expandedReplyIds = new Set();

  function render() {
    const vents = ventList();
    const uid = myUid();

    el.innerHTML = `
      <div class="toolbar">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <h2 class="view-title" style="margin:0">🗣️ 意見箱（吐苦水樹洞）</h2>
          <span class="info-pill-tip" title="選擇『🥷 完全匿名』發表時，系統連資料庫都不會寫入您的真實帳號 UID，管理員與任何人都無法反查身分，請安心抒發！">🛡️ 100% 零追蹤匿名保護</span>
        </div>
        <div class="toolbar-end" style="display:flex;gap:8px">
          <a href="#/wishes" class="btn sm ghost" style="text-decoration:none">🌠 切換至許願池</a>
          <button class="btn primary sm" data-new-vent>＋ 我要吐苦水／提意見</button>
        </div>
      </div>

      ${vents.length === 0 ? `
        <div class="card pad empty" style="padding:48px 20px;text-align:center">
          <div style="font-size:40px;margin-bottom:8px">🗣️</div>
          <h3 style="margin:0 0 6px">樹洞裡目前風平浪靜</h3>
          <p class="muted" style="margin:0 0 16px">工作遇到委屈、制度卡關或想大吐苦水？開啟「🥷 完全匿名模式」放心說出來，讓夥伴們給你拍拍打氣！</p>
          <button class="btn primary" data-new-vent>＋ 匿名吐苦水</button>
        </div>
      ` : `
        <div class="vent-list-grid">
          ${vents.map(v => {
            const cat = VENT_CATEGORIES.find(c => c.id === v.category) || VENT_CATEGORIES[0];
            const rx = { hug: [], cry: [], cheer: [], ...(v.reactions || {}) };
            const myHug = (rx.hug || []).includes(uid);
            const myCry = (rx.cry || []).includes(uid);
            const myCheer = (rx.cheer || []).includes(uid);
            const replies = Array.isArray(v.replies) ? v.replies : [];
            const isRepOpen = expandedReplyIds.has(v.id);
            const canDel = (!v.isAnonymous && v.createdBy === uid) || isAdmin();

            return `
              <div class="card pad vent-card">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span style="font-size:20px">${esc(v.mood || '😤')}</span>
                    <strong style="font-size:13.5px;color:${v.isAnonymous ? '#475569' : 'var(--text)'}">${esc(v.authorName || '匿名單車客 🚲')}</strong>
                    ${v.isAnonymous ? `<span class="badge" style="background:#F1F5F9;color:#475569;font-size:11px">🥷 完全匿名</span>` : ''}
                    <span class="badge" style="background:#FEF3C7;color:#92400E;font-size:11px">${esc(cat.label)}</span>
                    <span class="muted" style="font-size:11.5px">${esc((v.createdAtIso || '').slice(0, 16).replace('T', ' '))}</span>
                  </div>
                  ${canDel ? `<button class="btn sm ghost" data-del-vent="${esc(v.id)}" style="color:var(--danger);padding:2px 6px">✕</button>` : ''}
                </div>

                <div style="font-size:14.5px;line-height:1.65;color:var(--text);white-space:pre-wrap;background:#F8FAFC;padding:12px 14px;border-radius:10px;border:1px solid var(--border)">${esc(v.content)}</div>

                <div style="display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap">
                  <button class="btn sm ${myHug ? 'primary' : ''}" data-vent-rx="${esc(v.id)}" data-rx-type="hug">🫂 拍拍 (${(rx.hug || []).length})</button>
                  <button class="btn sm ${myCry ? 'primary' : ''}" data-vent-rx="${esc(v.id)}" data-rx-type="cry">😭 懂你 (${(rx.cry || []).length})</button>
                  <button class="btn sm ${myCheer ? 'primary' : ''}" data-vent-rx="${esc(v.id)}" data-rx-type="cheer">💪 加油 (${(rx.cheer || []).length})</button>
                  <button class="btn sm ghost" data-toggle-vreply="${esc(v.id)}" style="margin-left:auto">
                    💬 暖心留言 (${replies.length}) ${isRepOpen ? '▴' : '▾'}
                  </button>
                </div>

                ${isRepOpen ? `
                  <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border)">
                    ${replies.length > 0 ? `
                      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">
                        ${replies.map(r => `
                          <div style="font-size:12.5px;background:#fff;border:1px solid var(--border);padding:6px 10px;border-radius:8px">
                            <strong>${esc(r.authorName)}：</strong>${esc(r.text)}
                            <span class="muted" style="font-size:11px;margin-left:6px">${esc((r.at || '').slice(5, 16).replace('T', ' '))}</span>
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}
                    <form class="vent-reply-form" data-vreply-form="${esc(v.id)}" style="display:flex;gap:6px;align-items:center">
                      <input type="text" name="text" required placeholder="寫下打氣或共鳴留言…" style="flex:1;padding:6px 10px;border-radius:8px;border:1px solid var(--border);font-size:13px">
                      <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer">
                        <input type="checkbox" name="anon" checked> 匿名回覆
                      </label>
                      <button type="submit" class="btn sm primary">送出</button>
                    </form>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;

    el.querySelectorAll('[data-new-vent]').forEach(btn => {
      btn.onclick = () => openNewVentModal(render);
    });
    el.querySelectorAll('[data-vent-rx]').forEach(btn => {
      btn.onclick = async () => {
        await toggleVentReaction(btn.dataset.ventRx, btn.dataset.rxType);
        render();
      };
    });
    el.querySelectorAll('[data-toggle-vreply]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.toggleVreply;
        if (expandedReplyIds.has(id)) expandedReplyIds.delete(id);
        else expandedReplyIds.add(id);
        render();
      };
    });
    el.querySelectorAll('[data-vreply-form]').forEach(form => {
      form.onsubmit = async e => {
        e.preventDefault();
        const vid = form.dataset.vreplyForm;
        const text = form.text.value.trim();
        const isAnon = form.anon.checked;
        if (!text) return;
        await addVentReply(vid, { text, isAnonymous: isAnon });
        toast('已送出留言！');
        render();
      };
    });
    el.querySelectorAll('[data-del-vent]').forEach(btn => {
      btn.onclick = async () => {
        const vid = btn.dataset.delVent;
        if (!(await confirmDialog('確定要刪除這篇意見／吐苦水嗎？', { danger: true, okText: '刪除' }))) return;
        await deleteVentItem(vid);
        toast('已刪除');
        render();
      };
    });
  }

  render();
  return { onData: render };
}

function openNewVentModal(onDone) {
  const moods = ['😤', '😮‍💨', '🤯', '🌧️', '🫠', '🤬', '🙏', '💡'];
  openModal(`
    <div class="modal-head">
      <h3>🗣️ 發表意見／大吐苦水</h3>
      <button class="icon-btn" data-close>✕</button>
    </div>
    <form class="form" id="vent-form">
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;color:#166534;padding:10px 12px;border-radius:10px;font-size:12.5px;line-height:1.5">
        🛡️ <b>隱私保證：</b>勾選「🥷 完全匿名發表」時，系統會隨機分配一個單車代號（如：匿名單車客 🚲），且<b>連資料庫都不會記錄您的 UID</b>，任何人與管理員皆無法得知您的身分。
      </div>
      <div class="grid2">
        <label>發表身分
          <select name="isAnonymous">
            <option value="1" selected>🥷 完全匿名發表（隨機單車代號）</option>
            <option value="0">🙋‍♂️ 具名發表（顯示我的名字）</option>
          </select>
        </label>
        <label>主題分類
          <select name="category">
            ${VENT_CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
          </select>
        </label>
      </div>
      <label>當下心情圖示
        <div class="chips" style="padding:4px 0">
          ${moods.map((m, idx) => `
            <label class="chip-check">
              <input type="radio" name="mood" value="${m}" ${idx === 0 ? 'checked' : ''}>
              <span style="font-size:18px">${m}</span>
            </label>
          `).join('')}
        </div>
      </label>
      <label>想吐的苦水或建議內容 <span class="req">*</span>
        <textarea name="content" rows="5" required placeholder="把在職場上遇到的鳥事、跨部門卡關、外勤委屈或真心建議暢快寫下來吧…"></textarea>
      </label>
      <div class="modal-foot">
        <button type="button" class="btn" data-close>取消</button>
        <button type="submit" class="btn primary">送出到樹洞</button>
      </div>
    </form>
  `);

  document.getElementById('vent-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const isAnonymous = f.isAnonymous.value === '1';
    const mood = f.querySelector('input[name="mood"]:checked')?.value || '😤';
    await createVentItem({
      content: f.content.value.trim(),
      category: f.category.value,
      isAnonymous,
      mood,
    });
    closeModal();
    toast(isAnonymous ? '🥷 已完全匿名送出！辛苦了，給你一個擁抱 🫂' : '意見已發布！');
    onDone?.();
  };
}
