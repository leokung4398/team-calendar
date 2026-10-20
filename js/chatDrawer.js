// 💬 團隊即時聊天室（全站常駐滑出抽屜 + 支援最大化寬版模式）
// 支援：3 大頻道分流（📢 團隊大廳 / 🚲 外勤連線 / ☕ 摸魚茶水間）、@標註組員、引用回覆、表情符號反應、貼上圖片自動壓縮、YouBike 專屬趣味貼圖與快捷語
import { state, myUid, isAdmin, activeUsers, userOf, sendChatMessage, toggleChatReaction, deleteChatMessage, onChange } from './data.js';
import { esc, avatar, toast } from './utils.js';

const CHANNELS = [
  { id: 'general', label: '📢 團隊大廳', desc: '全組日常協作與公告交流' },
  { id: 'field',   label: '🚲 外勤連線', desc: '即時路況、場站支援、外勤連線' },
  { id: 'lounge',  label: '☕ 摸魚茶水間', desc: '美食、下午茶揪團、輕鬆閒聊' },
];

const QUICK_PHRASES = [
  '🚲 出發巡檢！',
  '🌧️ 下雨路滑注意安全',
  '🚗 塞車中，稍後抵達',
  '👌 收到！馬上處理',
  '🙌 +1 算我一份',
  '🧋 有人要訂飲料嗎？',
];

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '🙏'];

let drawerOpen = false;
let isMaximized = false;
let activeChannel = 'general';
let replyTarget = null; // { id, authorName, text }
let pendingImageData = '';
let lastReadTime = Number(localStorage.getItem('yb_chat_last_read') || 0);

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
  }
  renderChatSystem();
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
    renderChatSystem();
    updateTopbarChatBadge();
  });
  renderChatSystem();
  updateTopbarChatBadge();
  return () => {
    offDataListener?.();
  };
}

export function updateTopbarChatBadge() {
  const badge = document.querySelector('[data-topbar-chat-badge]');
  if (!badge) return;
  const unread = getUnreadChatCount();
  badge.textContent = unread > 99 ? '99+' : String(unread);
  badge.hidden = unread === 0;
}

function renderChatSystem() {
  if (!rootEl) return;
  const unread = getUnreadChatCount();

  if (!drawerOpen) {
    rootEl.innerHTML = `
      <button class="chat-fab-btn" data-open-chat title="開啟團隊即時聊天室">
        <span style="font-size:18px">💬</span>
        <span class="chat-fab-label">聊天室</span>
        ${unread > 0 ? `<span class="chat-fab-badge">${unread > 99 ? '99+' : unread}</span>` : ''}
      </button>
    `;
    const btn = rootEl.querySelector('[data-open-chat]');
    if (btn) btn.onclick = () => toggleChatDrawer(true);
    return;
  }

  const msgs = state.chatMessages.filter(m => (m.channel || 'general') === activeChannel);
  const users = activeUsers();
  const uid = myUid();
  const chObj = CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0];

  rootEl.innerHTML = `
    <div class="chat-drawer-backdrop open ${isMaximized ? 'show' : ''}" data-close-backdrop></div>
    <aside class="chat-drawer open ${isMaximized ? 'maximized' : ''}">
      <div class="chat-head">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">💬</span>
          <div>
            <strong style="font-size:14.5px">經營 Team 即時聊天室</strong>
            <div class="muted" style="font-size:11px">${esc(chObj.desc)}</div>
          </div>
        </div>
        <div style="display:flex;gap:4px;align-items:center">
          <button class="icon-btn" data-toggle-max title="${isMaximized ? '還原側邊抽屜大小' : '最大化寬版視窗'}">${isMaximized ? '🗗' : '🗖'}</button>
          <button class="icon-btn" data-close-chat title="收起聊天室">✕</button>
        </div>
      </div>

      <!-- 頻道切換列 -->
      <div class="chat-channels-bar">
        ${CHANNELS.map(c => {
          const count = state.chatMessages.filter(m => (m.channel || 'general') === c.id).length;
          return `
            <button class="chat-ch-tab ${c.id === activeChannel ? 'active' : ''}" data-ch="${c.id}">
              <span>${c.label}</span>
              <span class="chat-ch-count">${count}</span>
            </button>
          `;
        }).join('')}
      </div>

      <!-- 訊息列表區 -->
      <div class="chat-body" id="chat-scroll-box">
        ${msgs.length === 0 ? `
          <div class="muted" style="text-align:center;padding:48px 16px;font-size:13px">
            <div style="font-size:32px;margin-bottom:8px">🚲</div>
            「${esc(chObj.label)}」目前還沒有訊息，發送第一句招呼或貼圖熱絡一下吧！
          </div>
        ` : msgs.map(m => {
          const mine = m.uid === uid;
          const uObj = userOf(m.uid) || { displayName: m.authorName || '組員', photoURL: m.photoURL || '' };
          const rx = m.reactions || {};
          const canDel = mine || isAdmin();
          const timeStr = (m.createdAtIso || '').slice(5, 16).replace('T', ' ');

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
                  ${m.imageData ? `<img src="${esc(m.imageData)}" alt="圖片" class="chat-msg-img" onclick="window.open(this.src, '_blank')">` : ''}
                </div>

                <!-- 表情符號與操作列 -->
                <div class="chat-msg-actions">
                  ${REACTION_EMOJIS.map(em => {
                    const arr = Array.isArray(rx[em]) ? rx[em] : [];
                    const hasMe = arr.includes(uid);
                    return `<button class="chat-rx-btn ${hasMe ? 'active' : ''}" data-rx-msg="${esc(m.id)}" data-rx-em="${em}">${em}${arr.length ? ` <span>${arr.length}</span>` : ''}</button>`;
                  }).join('')}
                  <button class="chat-rx-btn" data-reply-msg="${esc(m.id)}" title="回覆此訊息">↩ 回覆</button>
                  ${canDel ? `<button class="chat-rx-btn" data-del-msg="${esc(m.id)}" title="收回/刪除" style="color:var(--danger)">✕</button>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
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

      <!-- 輸入框 -->
      <form class="chat-input-form" id="chat-send-form">
        <label class="icon-btn" title="上傳或貼上圖片/截圖" style="cursor:pointer;flex-shrink:0">
          🖼️
          <input type="file" accept="image/*" data-chat-file hidden>
        </label>
        <input type="text" name="text" id="chat-text-input" placeholder="輸入訊息（可直接 Ctrl+V 貼上截圖）…" autocomplete="off">
        <button type="submit" class="btn primary sm" style="flex-shrink:0">傳送 ➤</button>
      </form>
    </aside>
  `;

  // 自動捲動到底部
  const scrollBox = rootEl.querySelector('#chat-scroll-box');
  if (scrollBox) scrollBox.scrollTop = scrollBox.scrollHeight;

  // 綁定關閉與最大化
  rootEl.querySelector('[data-close-chat]').onclick = () => toggleChatDrawer(false);
  const bd = rootEl.querySelector('[data-close-backdrop]');
  if (bd) bd.onclick = () => toggleChatDrawer(false);
  rootEl.querySelector('[data-toggle-max]').onclick = () => {
    isMaximized = !isMaximized;
    renderChatSystem();
  };

  // 切換頻道
  rootEl.querySelectorAll('[data-ch]').forEach(btn => {
    btn.onclick = () => {
      activeChannel = btn.dataset.ch;
      renderChatSystem();
    };
  });

  // 表情反應、回覆、刪除
  rootEl.querySelectorAll('[data-rx-msg]').forEach(btn => {
    btn.onclick = () => toggleChatReaction(btn.dataset.rxMsg, btn.dataset.rxEm);
  });
  rootEl.querySelectorAll('[data-reply-msg]').forEach(btn => {
    btn.onclick = () => {
      const m = state.chatMessages.find(x => x.id === btn.dataset.replyMsg);
      if (m) {
        replyTarget = { id: m.id, authorName: m.authorName || '組員', text: m.text || '[圖片]' };
        renderChatSystem();
        document.getElementById('chat-text-input')?.focus();
      }
    };
  });
  rootEl.querySelectorAll('[data-del-msg]').forEach(btn => {
    btn.onclick = () => deleteChatMessage(btn.dataset.delMsg);
  });

  const cancelReply = rootEl.querySelector('[data-cancel-reply]');
  if (cancelReply) cancelReply.onclick = () => { replyTarget = null; renderChatSystem(); };
  const cancelImg = rootEl.querySelector('[data-cancel-img]');
  if (cancelImg) cancelImg.onclick = () => { pendingImageData = ''; renderChatSystem(); };

  // @標註組員選單
  const mentionPicker = rootEl.querySelector('[data-mention-picker]');
  const textInput = rootEl.querySelector('#chat-text-input');
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

  // 快捷語直接發送或填入
  rootEl.querySelectorAll('[data-quick-phrase]').forEach(btn => {
    btn.onclick = async () => {
      const phrase = btn.dataset.quickPhrase;
      await sendChatMessage({ channel: activeChannel, text: phrase, replyTo: replyTarget });
      replyTarget = null;
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
        renderChatSystem();
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
            pendingImageData = await compressImageFile(f);
            renderChatSystem();
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
      // 解析文字中的 @姓名 對應之組員 UID
      const mentions = [];
      for (const u of users) {
        if (u.displayName && text.includes('@' + u.displayName)) {
          mentions.push(u.uid);
        }
      }
      const img = pendingImageData;
      const rep = replyTarget;
      if (textInput) textInput.value = '';
      pendingImageData = '';
      replyTarget = null;
      await sendChatMessage({
        channel: activeChannel,
        text,
        imageData: img,
        replyTo: rep,
        mentions,
      });
    };
  }
}
