// 專案成果 Modal 彈窗元件（承襲 YouBike 2.0 活力與營運協同平台白底溫暖風格）
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from './achievementsData.js';
import { esc } from './utils.js';

export function openAchievementsModal() {
  const root = document.getElementById('modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';

  // 目前選取的分類 ('all' 或 'core', 'security', 'design', 'data')
  let currentCat = 'all';

  // 預設全部展開，讓主管與同仁開箱即覽所有成果重點
  const expandedSet = new Set(ACHIEVEMENTS.map(m => m.id));

  function renderCategoryCards() {
    return Object.entries(ACHIEVEMENT_CATEGORIES)
      .filter(([key]) => key !== 'all')
      .map(([key, cat]) => {
        const count = ACHIEVEMENTS.filter(m => m.category === key).length;
        const isSelected = currentCat === key;
        return `
          <button type="button" class="achieve-cat-card ${isSelected ? 'active' : ''}" data-cat="${key}" style="
            --cat-color: ${cat.color};
            --cat-bg: ${cat.bg};
            --cat-border: ${cat.border};
            --cat-badge-bg: ${cat.badgeBg};
            --cat-badge-text: ${cat.badgeText};
          ">
            <div class="achieve-cat-info">
              <div class="achieve-cat-name-row">
                <span class="achieve-cat-name">${esc(cat.name)}</span>
                <span class="achieve-cat-count">${count} 項</span>
              </div>
              <p class="achieve-cat-desc">${esc(cat.desc)}</p>
            </div>
            ${isSelected ? '<span class="achieve-cat-pin-badge">置頂中</span>' : ''}
          </button>
        `;
      }).join('');
  }

  function getSortedAchievements() {
    if (currentCat === 'all') {
      return [...ACHIEVEMENTS];
    }
    // 選取特定構面時，「該分類成果全部置頂排列」
    const pinned = ACHIEVEMENTS.filter(m => m.category === currentCat);
    const others = ACHIEVEMENTS.filter(m => m.category !== currentCat);
    return [...pinned, ...others];
  }

  function renderMilestones() {
    const list = getSortedAchievements();
    return list.map((item, idx) => {
      const catCfg = ACHIEVEMENT_CATEGORIES[item.category] || ACHIEVEMENT_CATEGORIES.core;
      const isPinned = currentCat !== 'all' && item.category === currentCat;
      const isExpanded = expandedSet.has(item.id);

      return `
        <div class="milestone-item ${isPinned ? 'is-pinned' : ''}" data-item-id="${item.id}" style="
          --item-color: ${catCfg.color};
          --item-bg: ${catCfg.bg};
          --item-border: ${catCfg.border};
          --item-badge-bg: ${catCfg.badgeBg};
          --item-badge-text: ${catCfg.badgeText};
        ">
          <div class="milestone-seq" style="${isPinned ? 'background: ' + catCfg.badgeBg + '; color: ' + catCfg.badgeText + '; border-color: ' + catCfg.color + ';' : ''}">
            ${idx + 1}
          </div>
          <div class="milestone-body">
            <div class="milestone-head" data-toggle-item title="點擊展開/收合">
              <h3 class="milestone-title">
                <span>${esc(item.title)}</span>
                ${isPinned ? `<span style="font-size:11px; background:${catCfg.color}; color:#fff; padding:1px 7px; border-radius:10px; font-weight:600;">置頂推薦</span>` : ''}
              </h3>
              <div class="milestone-tags">
                <span class="milestone-cat-badge">${esc(item.catLabel)}</span>
                <span class="milestone-date">${esc(item.date)}</span>
                <span class="milestone-chevron" style="transform:${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}">▼</span>
              </div>
            </div>
            <div class="milestone-detail-wrap" style="${isExpanded ? 'display:block;' : 'display:none;'}">
              <div class="milestone-need-box">
                <strong>需求重點：</strong>
                <ul>
                  ${item.need.map(n => `<li>${esc(n)}</li>`).join('')}
                </ul>
              </div>
              <div class="milestone-result-box">
                <b>實作成果：</b>${esc(item.result)}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function getToggleAllBtnHtml() {
    const isAllExp = expandedSet.size === ACHIEVEMENTS.length;
    return `
      <button type="button" class="btn small" data-toggle-all>
        <span>${isAllExp ? '全部收合' : '全部展開'}</span>
      </button>
      <button type="button" class="btn small" data-reset-cat title="還原原始順序">
        <span>重置排序 (${ACHIEVEMENTS.length}項)</span>
      </button>
    `;
  }

  wrap.innerHTML = `
    <div class="modal achieve-modal" role="dialog" aria-modal="true">
      <div class="modal-head" style="padding: 14px 20px; border-bottom: 1px solid #f1f5f9; background:#fff;">
        <div style="display:flex; align-items:center; gap:10px;">
          <h3 style="margin:0; font-size:18px; font-weight:700; color:var(--ink);">專案開發成果與里程碑</h3>
          <span style="font-size:12px; background:var(--yb); color:var(--yb-ink); padding:2px 8px; border-radius:12px; font-weight:700;">經營 Team 營運協同平台</span>
        </div>
        <button type="button" class="icon-btn" data-close aria-label="關閉">✕</button>
      </div>
      <div class="modal-body">
        <div class="achieve-container">
          <!-- 頂部技術構面圖例與互動置頂按鈕 (平台統一風格) -->
          <div class="achieve-hero">
            <div class="achieve-hero-top">
              <div class="achieve-hero-title">
                <span class="achieve-hero-badge">互動置頂</span>
                <h4>專案開發成果構面分類</h4>
              </div>
              <div class="achieve-hero-actions" data-actions-container>
                ${getToggleAllBtnHtml()}
              </div>
            </div>
            <p class="achieve-hero-desc">
              系統導入四大技術色彩體系。<span class="hero-desc-highlight">點擊下方任一構面卡片，即可將該技術成果「置頂排列到最上方」</span>，方便長官與組員聚焦審查！
            </p>
            <div class="achieve-cats-grid" data-cats-container>
              ${renderCategoryCards()}
            </div>
          </div>
          <!-- 里程碑滾動清單 -->
          <div class="achieve-list" data-list-container>
            ${renderMilestones()}
          </div>
        </div>
      </div>
    </div>
  `;

  root.appendChild(wrap);

  const updateView = () => {
    wrap.querySelector('[data-cats-container]').innerHTML = renderCategoryCards();
    wrap.querySelector('[data-list-container]').innerHTML = renderMilestones();
    wrap.querySelector('[data-actions-container]').innerHTML = getToggleAllBtnHtml();
  };

  const closeModal = () => {
    wrap.remove();
    document.removeEventListener('keydown', onKeyDown);
  };

  // 事件綁定
  wrap.addEventListener('click', e => {
    // 點擊關閉按鈕或灰色背景
    if (e.target.closest('[data-close]') || e.target === wrap) {
      closeModal();
      return;
    }

    // 重置原始排序
    if (e.target.closest('[data-reset-cat]')) {
      currentCat = 'all';
      updateView();
      wrap.querySelector('.achieve-list').scrollTop = 0;
      return;
    }

    // 全部展開 / 全部收合
    if (e.target.closest('[data-toggle-all]')) {
      if (expandedSet.size === ACHIEVEMENTS.length) {
        expandedSet.clear();
      } else {
        ACHIEVEMENTS.forEach(m => expandedSet.add(m.id));
      }
      updateView();
      return;
    }

    // 點擊分類卡片置頂
    const catCard = e.target.closest('.achieve-cat-card');
    if (catCard) {
      const selected = catCard.dataset.cat;
      currentCat = (currentCat === selected) ? 'all' : selected;
      updateView();
      wrap.querySelector('.achieve-list').scrollTop = 0;
      return;
    }

    // 點擊項目展開／收合細節
    const toggleHead = e.target.closest('[data-toggle-item]');
    if (toggleHead) {
      const itemEl = toggleHead.closest('[data-item-id]');
      if (itemEl) {
        const id = Number(itemEl.dataset.itemId);
        if (expandedSet.has(id)) {
          expandedSet.delete(id);
        } else {
          expandedSet.add(id);
        }
        // 更新目前項目的顯示狀態與旋轉箭頭
        const detailWrap = itemEl.querySelector('.milestone-detail-wrap');
        const chevron = itemEl.querySelector('.milestone-chevron');
        const isExp = expandedSet.has(id);
        if (detailWrap) {
          detailWrap.style.display = isExp ? 'block' : 'none';
        }
        if (chevron) {
          chevron.style.transform = isExp ? 'rotate(180deg)' : 'rotate(0deg)';
        }
        // 同步頂端全部展開/收合按鈕狀態
        wrap.querySelector('[data-actions-container]').innerHTML = getToggleAllBtnHtml();
      }
      return;
    }
  });

  // ESC 鍵關閉
  const onKeyDown = ev => {
    if (ev.key === 'Escape') {
      wrap.remove();
      document.removeEventListener('keydown', onKeyDown);
    }
  };
  document.addEventListener('keydown', onKeyDown);
}
