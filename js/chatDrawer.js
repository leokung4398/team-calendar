// 團隊即時聊天室（全站常駐滑出抽屜 + 支援最大化寬版模式）
// 單一全組共用大廳、支援 @標註組員、引用回覆、表情符號反應、貼上圖片自動壓縮、YouBike 專屬快捷語
import { state, myUid, isAdmin, activeUsers, userOf, sendChatMessage, toggleChatReaction, deleteChatMessage, onChange } from './data.js';
import { esc, avatar, toast, openModal, confirmDialog, formatTaipeiDateTime } from './utils.js';

const QUICK_PHRASES = [
  '出發巡檢！',
  '下雨路滑注意安全',
  '塞車中，稍後抵達',
  '收到！馬上處理',
  '+1 算我一份',
  '有人要訂飲料嗎？',
];

const REACTION_ITEMS = [
  { key: '讚', icon: '👍', title: '讚' },
  { key: '愛心', icon: '❤️', title: '愛心' },
  { key: '好笑', icon: '😂', title: '好笑' },
  { key: '推', icon: '🔥', title: '推' },
  { key: '感謝', icon: '🙏', title: '感謝' },
];

let drawerOpen = false;
let isMaximized = false;
let replyTarget = null; // { id, authorName, text }
let pendingImageData = '';
let lastReadTime = Number(localStorage.getItem('yb_chat_last_read') || 0);
let expandedRxMsgId = null;

function syncChatBodyLock() {
  const shouldLock = drawerOpen && window.innerWidth <= 640;
  document.body.classList.toggle('chat-open-lock', shouldLock);
}

/** 前端自動將圖片壓縮至合理尺寸（最大邊 720px, JPEG 0.72），避免超過 Firestore 單筆限制 */
function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 720;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          if (width > height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatTextWithLinksAndMentions(text) {
  const safe = esc(text || '');
  // 網址自動轉為可點擊連結
  const withLinks = safe.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--primary);text-decoration:underline">$1 ↗</a>');
  // @姓名 高亮
  return withLinks.replace(/@([^\s@]+)/g, '<span class="chat-mention-tag">@$1</span>');
}

export function getUnreadChatCount() {
  const uid = myUid();
  return state.chatMessages.filter(m => {
    if (m.uid === uid) return false;
    const t = m.createdAtIso ? new Date(m.createdAtIso).getTime() : 0;
    return t > lastReadTime;
  }).length;
}

export function toggleChatDrawer(forceState) {
  drawerOpen = typeof forceState === 'boolean' ? forceState : !drawerOpen;
  if (drawerOpen) {
    lastReadTime = Date.now();
    try { localStorage.setItem('yb_chat_last_read', String(lastReadTime)); } catch {}
  } else {
    expandedRxMsgId = null;
  }
  syncChatBodyLock();
  renderChatSystem({ full: true });
}

let rootEl = null;
let offDataListener = null;

export function initChatDrawer() {
  if (!rootEl) {
    rootEl = document.createElement('div');
    rootEl.id = 'team-chat-root';
    document.body.appendChild(rootEl);
  }
  offDataListener?.();
  offDataListener = onChange(() => {
    if (drawerOpen) {
      lastReadTime = Date.now();
      try { localStorage.setItem('yb_chat_last_read', String(lastReadTime)); } catch {}
    }
    renderChatSystem({ messagesOnly: true });
    updateTopbarChatBadge();
  });
  renderChatSystem({ full: true });
  updateTopbarChatBadge();
  return () => {
    offDataListener?.();
  };
}

export function updateTopbarChatBadge() {
  const unread = getUnreadChatCount();
  const txt = unread > 99 ? '99+' : String(unread);
  document.querySelectorAll('[data-topbar-chat-badge], [data-mobile-chat-badge]').forEach(badge => {
    badge.textContent = txt;
    badge.hidden = unread === 0;
  });
}

function buildChatMessagesHtml() {
  const msgs = state.chatMessages;
  const uid = myUid();
  if (msgs.length === 0) {
    return `
      <div class="muted" style="text-align:center;padding:48px 16px;font-size:13px">
        聊天大廳目前還沒有訊息，發送第一句招呼熱絡一下吧！
      </div>
    `;
  }
  return msgs.map(m => {
    const mine = m.uid === uid;
    const uObj = userOf(m.uid) || { displayName: m.authorName || '組員', photoURL: m.photoURL || '' };
    const rx = m.reactions || {};
    const canDel = mine || isAdmin();
    const timeStr = formatTaipeiDateTime(m.createdAt || m.createdAtIso, { includeYear: false, includeTime: true });
    const rxOpen = expandedRxMsgId === m.id;

    return `
      <div class="chat-msg-row ${mine ? 'mine' : ''}">
        ${!mine ? `<div class="chat-msg-avatar">${avatar(uObj, 28)}</div>` : ''}
        <div class="chat-msg-bubble-wrap">
          <div class="chat-msg-meta">
            ${!mine ? `<strong>${esc(uObj.displayName)}</strong>` : ''}
            <span>${esc(timeStr)}</span>
          </div>
          <div class="chat-msg-bubble">
            ${m.replyTo ? `
              <div class="chat-reply-quote">
                <strong>↩ ${esc(m.replyTo.authorName)}：</strong>${esc(m.replyTo.text)}
              </div>
            ` : ''}
            ${m.sticker ? `<div style="font-size:28px;margin-bottom:4px">${esc(m.sticker)}</div>` : ''}
            ${m.text ? `<div class="chat-msg-text">${formatTextWithLinksAndMentions(m.text)}</div>` : ''}
            ${m.imageData ? `<img src="${esc(m.imageData)}" alt="聊天圖片" class="chat-msg-img" data-chat-zoom-img title="點擊放大檢視圖片">` : ''}
          </div>

          <!-- 表情符號與操作列 -->
          <div class="chat-msg-actions ${rxOpen ? 'rx-open' : ''}">
            ${REACTION_ITEMS.map(item => {
              const arr = [
                ...(Array.isArray(rx[item.key]) ? rx[item.key] : []),
                ...(Array.isArray(rx[item.icon]) ? rx[item.icon] : []),
              ];
              const uniqueUids = [...new Set(arr)];
              const hasMe = uniqueUids.includes(uid);
              const whoNames = uniqueUids.map(u => userOf(u)?.displayName || '組員').join('、');
              const tip = uniqueUids.length ? `${item.title}：${whoNames}` : item.title;
              return `<button type="button" class="chat-rx-btn ${hasMe ? 'active' : ''} ${uniqueUids.length === 0 ? 'is-zero' : ''}" data-rx-msg="${esc(m.id)}" data-rx-em="${item.key}" title="${esc(tip)}">${item.icon}${uniqueUids.length ? ` <span>${uniqueUids.length}</span>` : ''}</button>`;
            }).join('')}
            <button type="button" class="chat-rx-btn chat-rx-picker-btn" data-rx-toggle="${esc(m.id)}" title="更多表情回應">${rxOpen ? '收合' : '😊+'}</button>
            <button type="button" class="chat-rx-btn" data-reply-msg="${esc(m.id)}" title="回覆此訊息">↩ 回覆</button>
            ${canDel ? `<button type="button" class="chat-rx-btn" data-del-msg="${esc(m.id)}" title="收回/刪除" style="color:var(--danger)">✕</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function buildComposerStatusHtml() {
  return `
    ${replyTarget ? `
      <div class="chat-replying-bar">
        <span>↩ 正在回覆 <b>${esc(replyTarget.authorName)}</b>：${esc(replyTarget.text.slice(0, 28))}</span>
        <button type="button" class="icon-btn" data-cancel-reply>✕</button>
      </div>
    ` : ''}
    ${pendingImageData ? `
      <div class="chat-replying-bar" style="background:#EFF6FF">
        <img src="${esc(pendingImageData)}" style="height:36px;border-radius:4px">
        <span style="font-size:12px">已準備傳送圖片</span>
        <button type="button" class="icon-btn" data-cancel-img>✕</button>
      </div>
    ` : ''}
  `;
}

function updateComposerStatusSlot() {
  const slot = rootEl?.querySelector('#chat-composer-status');
  if (!slot) return;
  slot.innerHTML = buildComposerStatusHtml();
  const cancelReply = slot.querySelector('[data-cancel-reply]');
  if (cancelReply) cancelReply.onclick = () => { replyTarget = null; updateComposerStatusSlot(); };
  const cancelImg = slot.querySelector('[data-cancel-img]');
  if (cancelImg) cancelImg.onclick = () => { pendingImageData = ''; updateComposerStatusSlot(); };
}

function bindChatMessageEvents(scrollBox) {
  if (!scrollBox) return;
  scrollBox.querySelectorAll('[data-rx-msg]').forEach(btn => {
    btn.onclick = () => {
      expandedRxMsgId = null;
      toggleChatReaction(btn.dataset.rxMsg, btn.dataset.rxEm);
    };
  });
  scrollBox.querySelectorAll('[data-rx-toggle]').forEach(btn => {
    btn.onclick = () => {
      const mid = btn.dataset.rxToggle;
      expandedRxMsgId = expandedRxMsgId === mid ? null : mid;
      const rowActions = btn.closest('.chat-msg-actions');
      if (rowActions) {
        rowActions.classList.toggle('rx-open', expandedRxMsgId === mid);
        btn.textContent = expandedRxMsgId === mid ? '收合' : '😊+';
      }
    };
  });
  scrollBox.querySelectorAll('[data-reply-msg]').forEach(btn => {
    btn.onclick = () => {
      const m = state.chatMessages.find(x => x.id === btn.dataset.replyMsg);
      if (m) {
        replyTarget = { id: m.id, authorName: m.authorName || '組員', text: m.text || '[圖片]' };
        updateComposerStatusSlot();
        document.getElementById('chat-text-input')?.focus();
      }
    };
  });
  scrollBox.querySelectorAll('[data-del-msg]').forEach(btn => {
    btn.onclick = async () => {
      const msgId = btn.dataset.delMsg;
      const ok = await confirmDialog('確定要收回並刪除這則聊天訊息嗎？', { danger: true, okText: '確定收回' });
      if (ok) await deleteChatMessage(msgId);
    };
  });
  scrollBox.querySelectorAll('[data-chat-zoom-img]').forEach(img => {
    img.onclick = () => {
      openModal({
        title: '圖片檢視',
        wide: true,
        body: `<div style="text-align:center;background:#0f172a;padding:10px;border-radius:10px"><img src="${esc(img.src)}" alt="聊天室圖片" style="max-width:100%;max-height:74vh;border-radius:6px;object-fit:contain"></div>`,
        footer: `<button type="button" class="btn primary" data-close>關閉</button>`,
      });
    };
  });
}

function renderChatSystem({ messagesOnly = false, full = false } = {}) {
  if (!rootEl) return;
  const unread = getUnreadChatCount();

  if (!drawerOpen) {
    rootEl.innerHTML = `
      <button class="chat-fab-btn" data-open-chat title="開啟團隊即時聊天室" aria-label="開啟團隊即時聊天室">
        <svg class="chat-fab-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span class="chat-fab-label">聊天室</span>
        ${unread > 0 ? `<span class="chat-fab-badge">${unread > 99 ? '99+' : unread}</span>` : ''}
      </button>
    `;
    const btn = rootEl.querySelector('[data-open-chat]');
    if (btn) btn.onclick = () => toggleChatDrawer(true);
    return;
  }

  // 若抽屜已掛載且只是訊息資料更新，僅局部更新訊息列表（絕不銷毀輸入框，避免手機輸入法/鍵盤閃斷）
  const existingScroll = rootEl.querySelector('#chat-scroll-box');
  if (messagesOnly && !full && existingScroll && rootEl.querySelector('#chat-text-input')) {
    const savedScrollTop = existingScroll.scrollTop;
    const wasNearBottom = (existingScroll.scrollHeight - existingScroll.scrollTop - existingScroll.clientHeight) < 80;
    existingScroll.innerHTML = buildChatMessagesHtml();
    existingScroll.scrollTop = wasNearBottom ? existingScroll.scrollHeight : savedScrollTop;
    bindChatMessageEvents(existingScroll);
    return;
  }

  // 完整建構抽屜時仍保留輸入草稿與捲動位置
  const prevInput = rootEl.querySelector('#chat-text-input');
  const savedInputVal = prevInput ? prevInput.value : '';
  const wasFocused = prevInput ? document.activeElement === prevInput : false;
  const savedSelStart = prevInput ? prevInput.selectionStart : null;
  const savedSelEnd = prevInput ? prevInput.selectionEnd : null;

  let wasNearBottom = true;
  let savedScrollTop = 0;
  if (existingScroll) {
    savedScrollTop = existingScroll.scrollTop;
    wasNearBottom = (existingScroll.scrollHeight - existingScroll.scrollTop - existingScroll.clientHeight) < 80;
  }

  const users = activeUsers();

  rootEl.innerHTML = `
    <div class="chat-drawer-backdrop open ${isMaximized ? 'show' : ''}" data-close-backdrop></div>
    <aside class="chat-drawer open ${isMaximized ? 'maximized' : ''}">
      <div class="chat-head">
        <div style="display:flex;align-items:center;gap:8px;min-width:0">
          <div style="min-width:0">
            <strong style="font-size:14.5px">經營 Team 即時聊天大廳</strong>
            <div class="muted" style="font-size:11px">全組日常協作、外勤連線與輕鬆交流</div>
          </div>
        </div>
        <div style="display:flex;gap:4px;align-items:center;flex-shrink:0">
          <button type="button" class="btn sm ghost chat-max-btn" data-toggle-max title="${isMaximized ? '還原側邊抽屜大小' : '最大化寬版視窗'}" style="padding:3px 8px;font-size:12px">${isMaximized ? '還原' : '放大'}</button>
          <button type="button" class="icon-btn" data-close-chat title="收起聊天室">✕</button>
        </div>
      </div>

      <!-- 訊息列表區 -->
      <div class="chat-body" id="chat-scroll-box">
        ${buildChatMessagesHtml()}
      </div>

      <!-- 快捷語與 @標註工具列 -->
      <div class="chat-quick-bar">
        <select class="chat-mention-select" data-mention-picker title="快速 @標註組員並發送通知">
          <option value="">@標註組員…</option>
          ${users.map(u => `<option value="${esc(u.uid)}" data-name="${esc(u.displayName)}">@${esc(u.displayName)}</option>`).join('')}
        </select>
        <div class="chat-quick-phrases">
          ${QUICK_PHRASES.map(p => `<button type="button" class="chat-phrase-chip" data-quick-phrase="${esc(p)}">${esc(p)}</button>`).join('')}
        </div>
      </div>

      <div id="chat-composer-status">${buildComposerStatusHtml()}</div>

      <!-- 輸入框 -->
      <form class="chat-input-form" id="chat-send-form">
        <label class="btn sm ghost" title="上傳或貼上圖片/截圖" style="cursor:pointer;flex-shrink:0;padding:5px 8px;font-size:12px">
          圖片
          <input type="file" accept="image/*" data-chat-file hidden>
        </label>
        <input type="text" name="text" id="chat-text-input" placeholder="輸入訊息（可貼上截圖）…" autocomplete="off">
        <button type="submit" class="btn primary sm" style="flex-shrink:0">傳送</button>
      </form>
    </aside>
  `;

  // 還原捲動位置
  const scrollBox = rootEl.querySelector('#chat-scroll-box');
  if (scrollBox) {
    scrollBox.scrollTop = wasNearBottom ? scrollBox.scrollHeight : savedScrollTop;
    bindChatMessageEvents(scrollBox);
  }
  updateComposerStatusSlot();

  // 還原輸入框未送出的草稿與游標焦點
  const textInput = rootEl.querySelector('#chat-text-input');
  if (textInput && savedInputVal) {
    textInput.value = savedInputVal;
  }
  if (textInput && wasFocused) {
    textInput.focus();
    try {
      if (savedSelStart !== null && savedSelEnd !== null) {
        textInput.setSelectionRange(savedSelStart, savedSelEnd);
      }
    } catch {}
  }

  // 綁定關閉與最大化
  rootEl.querySelector('[data-close-chat]').onclick = () => toggleChatDrawer(false);
  const bd = rootEl.querySelector('[data-close-backdrop]');
  if (bd) bd.onclick = () => toggleChatDrawer(false);
  rootEl.querySelector('[data-toggle-max]').onclick = () => {
    isMaximized = !isMaximized;
    renderChatSystem({ full: true });
  };

  // @標註組員選單
  const mentionPicker = rootEl.querySelector('[data-mention-picker]');
  if (mentionPicker && textInput) {
    mentionPicker.onchange = () => {
      const opt = mentionPicker.selectedOptions[0];
      const name = opt?.dataset?.name;
      if (name) {
        textInput.value = `${textInput.value ? textInput.value + ' ' : ''}@${name} `;
        textInput.focus();
      }
      mentionPicker.value = '';
    };
  }

  // 快捷語直接發送
  rootEl.querySelectorAll('[data-quick-phrase]').forEach(btn => {
    btn.onclick = async () => {
      const phrase = btn.dataset.quickPhrase;
      await sendChatMessage({ channel: 'general', text: phrase, replyTo: replyTarget });
      replyTarget = null;
      updateComposerStatusSlot();
    };
  });

  // 圖片選擇與剪貼簿貼上圖片
  const fileIn = rootEl.querySelector('[data-chat-file]');
  if (fileIn) {
    fileIn.onchange = async () => {
      const f = fileIn.files?.[0];
      if (!f) return;
      try {
        pendingImageData = await compressImageFile(f);
        fileIn.value = '';
        updateComposerStatusSlot();
      } catch {
        toast('圖片處理失敗', 'error');
      }
    };
  }
  if (textInput) {
    textInput.onpaste = async e => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) {
            e.preventDefault();
            pendingImageData = await compressImageDataSafe(f);
            updateComposerStatusSlot();
          }
        }
      }
    };
  }

  // 送出訊息
  const sendForm = rootEl.querySelector('#chat-send-form');
  if (sendForm) {
    sendForm.onsubmit = async e => {
      e.preventDefault();
      const text = (textInput?.value || '').trim();
      if (!text && !pendingImageData) return;
      const curUsers = activeUsers();
      const mentions = [];
      for (const u of curUsers) {
        if (u.displayName && text.includes('@' + u.displayName)) {
          mentions.push(u.uid);
        }
      }
      const img = pendingImageData;
      const rep = replyTarget;
      if (textInput) textInput.value = '';
      pendingImageData = '';
      replyTarget = null;
      updateComposerStatusSlot();
      await sendChatMessage({
        channel: 'general',
        text,
        imageData: img,
        replyTo: rep,
        mentions,
      });
    };
  }
}

async function compressImageDataSafe(file) {
  try {
    return await compressImageFile(file);
  } catch {
    toast('圖片處理失敗', 'error');
    return '';
  }
}
