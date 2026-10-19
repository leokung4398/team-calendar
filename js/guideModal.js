// 功能操作導覽指引（含遊戲式全螢幕聚焦高亮導覽 Tour）
import { openModal } from './utils.js';
import { state, hasModulePermission } from './data.js';

export function openGuideModal() {
  const steps = [
    {
      title: '🧭 今日動態 (Today)',
      badge: '首頁概覽',
      color: '#16a34a',
      desc: '一目了然看見全組當天同仁的行蹤與出勤狀況。',
      items: [
        { label: '即時動態統計', detail: '頂部即時計算目前外出中、在辦公室或外勤的人數。外勤性質同仁平常自動標記「常態外勤」，每月僅需進辦公室 2 天。' },
        { label: '今日騎行進度條', detail: '跟著 YouBike 小單車隨時間前進，快速了解當前為上午、午休或下午工作時段。' },
        { label: '同仁出勤卡片', detail: '每張卡片顯示組員今天是否有外出行程、地點、聯絡電話、是否可接聽電話，以及外出代理人。' }
      ]
    },
    {
      title: '🗓️ 行事曆 (Schedule)',
      badge: '月曆與總表雙視圖',
      color: '#2563eb',
      desc: '掌握全月行程分配與排班矩陣，支援「月曆」與「總表」無縫一鍵切換。',
      items: [
        { label: '雙重視圖切換', detail: '上方提供「🗓️ 月曆」與「📊 總表」切換鈕，月份無縫同步，既可看格狀月曆，也可看全組排班矩陣。' },
        { label: '行程分類色標', detail: '以藍色（出差）、綠色（外出）、黃橘色（進辦公室）、紅色（公休/請假）、紫色（會議）等不同色彩清楚標示。' },
        { label: '外勤同仁進辦登記', detail: '外勤同仁（孔令淳、葉爵豪、陸逸群）每月排定進辦公室的 2 天，只要登記為「進辦公室」即可輕鬆打卡並顯示在辦公室！' },
        { label: '雙週預審與代理機制', detail: '外出或差旅同仁可指派「代理人」，讓其他組員清楚在同仁外出時該找誰聯繫協助。' }
      ]
    },
    {
      title: '💼 經營組月會 (Meeting)',
      badge: '會議與紀錄',
      color: '#9333ea',
      desc: '每個月定期的經營組月會管理、會前簡報資料共享與會後紀錄。',
      items: [
        { label: '月會資訊與 Meet 連結', detail: '置頂展示即將舉行的月會倒數、時間地點、主持人與本月輪值紀錄人，一鍵加入 Google Meet。' },
        { label: '會前議題與簡報資料', detail: '報告人於會前點擊「＋ 貼上簡報/資料連結」，讓現場與高雄遠端同仁能同步開啟簡報瀏覽。' },
        { label: '鍵盤即時輸入會議紀錄', detail: '輪值紀錄人於開會時直接輸入出席狀況、各議題討論重點、主管裁示、決議與待辦事項 (Action Items)。' },
        { label: '歷次月會存檔庫', detail: '下方隨時可查閱過往各月份的會議紀錄存檔，方便隨時追蹤歷史決議。' }
      ]
    },
    {
      title: '🚲 模擬體驗 (Simulation)',
      badge: '巡檢與排班',
      color: '#0284c7',
      desc: '全台各縣市品質抽檢配額管制、排班協同矩陣與北南區每日品管巡檢。',
      items: [
        { label: '全台車機配額管制', detail: '清楚呈現雙北、桃園、新竹、台中、南區等各縣市 2.0 / 2.0E 抽樣配額與執行天數規劃。' },
        { label: '排班矩陣與一鍵同步', detail: '組員分工自主登記與協調，排定後可一鍵同步至行事曆出差行程，避免手動重複輸入。' },
        { label: '北區 / 南區每日品管巡檢', detail: '整合北區與南區各站點每日車輛狀況、調度巡檢細部日程與排班安排。' }
      ]
    },
    {
      title: '📝 每日回報 (Daily Report)',
      badge: '下班進度與 LINE 快貼',
      color: '#0d9488',
      desc: '內勤同仁每日下班工作進度回報、一鍵複製個人 LINE 格式與主管已閱簽核。',
      items: [
        { label: '一鍵帶入昨日項目 & 職務快選膠囊', detail: '自動帶入前一日工作項目，並依採購、倉管、勞安、營運提供專屬常用詞彙，點一下即可插入。' },
        { label: '複製個人 LINE 回報格式', detail: '儲存後自動排版個人進度並複製，點擊「💬 開啟 LINE」即可直接貼到群組向代理副理回報。' },
        { label: '颱風天切換、休假連動 & 17:30 溫和提醒', detail: '自動連動行事曆請假與國定假日；遇颱風假可一鍵設為全員免回報，平日 17:30 則提供不打擾的溫和下班提醒。' },
        { label: '行動端通勤極速快填鈕 (FAB)', detail: '手機右下角常駐「✍️ 今日回報」大按鈕，方便趕車或等紅綠燈空檔單手 15 秒完成填寫與複製。' }
      ]
    },
    {
      title: '📢 採購佈告欄 (Bulletin)',
      badge: '電子週報與管理',
      color: '#e11d48',
      desc: '串聯微笑單車採購電子週報、公告交期異動與採購後台發布系統。',
      items: [
        { label: '採購電子週報大畫面瀏覽', detail: '內嵌大畫面整合週報前台，即時查閱每週採購重點、交期異動與公告資訊。' },
        { label: '前往佈告欄管理後台', detail: '右上角一鍵直達採購管理後台，供採購主責人員發布週報、閱讀打卡統計與設定管理。' },
        { label: '業務權限精準保護', detail: '結合管理模組權限矩陣，僅授權組員可見該頁籤，維護採購機密與分工獨立性。' }
      ]
    },
    {
      title: '🔔 通知中心與個人設定',
      badge: '訊息與代理',
      color: '#f59e0b',
      desc: '不會漏接任何與自己相關的公務指派與行程變更。',
      items: [
        { label: '小鈴鐺通知', detail: '當有人將你設為「外出代理人」、「同行夥伴」或被輪值指派為「月會紀錄人」時，小鈴鐺會即時紅點通知。' },
        { label: '最新全組動態', detail: '隨時掌握組內同仁最新的行程登記、更新或會議紀錄發布通知。' }
      ]
    }
  ].filter(s => {
    if (s.title.includes('模擬體驗') && !hasModulePermission(state.me, 'simulation')) return false;
    if (s.title.includes('每日回報') && !hasModulePermission(state.me, 'dailyReport')) return false;
    if (s.title.includes('採購佈告欄') && !hasModulePermission(state.me, 'bulletin')) return false;
    return true;
  });

  let currentStep = 0;

  const renderContent = () => {
    const s = steps[currentStep];
    return `
      <div class="guide-modal-wrap">
        <!-- 頂部進度指引標籤 -->
        <div class="guide-steps-bar">
          ${steps.map((st, i) => `
            <button type="button" class="guide-step-btn ${i === currentStep ? 'active' : (i < currentStep ? 'done' : '')}" data-step-nav="${i}">
              <span class="gs-num">${i + 1}</span>
              <span class="gs-title">${st.title.split(' ')[0]}</span>
            </button>
          `).join('')}
        </div>

        <!-- 導覽主卡片 -->
        <div class="guide-card" style="border-top-color: ${s.color};">
          <div class="guide-head">
            <span class="badge-tag" style="background:${s.color}15; color:${s.color}; font-weight:700;">${s.badge}</span>
            <h3 class="guide-title">${s.title}</h3>
          </div>
          <p class="guide-desc">${s.desc}</p>

          <div class="guide-items">
            ${s.items.map(it => `
              <div class="guide-item">
                <div class="gi-dot" style="background:${s.color};"></div>
                <div class="gi-content">
                  <b>${it.label}</b>
                  <p>${it.detail}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  };

  const renderFooter = () => `
    <div style="display:flex; align-items:center; gap:8px;">
      <button type="button" class="btn ok-btn ghost" data-start-interactive-tour style="font-weight:700;">
        🎮 啟動實景聚焦導覽
      </button>
      <span class="muted small-text hide-sm">像遊戲一樣逐一高亮畫面元件！</span>
    </div>
    <div class="spacer"></div>
    ${currentStep > 0 ? `<button type="button" class="btn ghost" data-prev-guide>上一步</button>` : ''}
    ${currentStep < steps.length - 1
      ? `<button type="button" class="btn primary" data-next-guide>下一步 👉</button>`
      : `<button type="button" class="btn ok-btn" data-close>完成導覽 🎉</button>`}
  `;

  const modal = openModal({
    title: '📖 經營 Team 行事曆操作指引',
    body: renderContent(),
    footer: renderFooter(),
    wide: true,
  });

  const updateModal = () => {
    modal.el.querySelector('.modal-body').innerHTML = renderContent();
    modal.el.querySelector('.modal-foot').innerHTML = renderFooter();
    attachEvents();
  };

  const attachEvents = () => {
    modal.el.querySelectorAll('[data-step-nav]').forEach(btn => {
      btn.onclick = () => {
        currentStep = Number(btn.dataset.stepNav);
        updateModal();
      };
    });

    modal.el.querySelector('[data-start-interactive-tour]')?.addEventListener('click', () => {
      modal.close();
      startInteractiveSpotlightTour();
    });

    modal.el.querySelectorAll('[data-close]').forEach(b => {
      b.onclick = () => modal.close();
    });

    const nextBtn = modal.el.querySelector('[data-next-guide]');
    if (nextBtn) {
      nextBtn.onclick = () => {
        if (currentStep < steps.length - 1) {
          currentStep++;
          updateModal();
        }
      };
    }

    const prevBtn = modal.el.querySelector('[data-prev-guide]');
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (currentStep > 0) {
          currentStep--;
          updateModal();
        }
      };
    }
  };

  // 鍵盤左右方向鍵控制上下步
  const onKey = e => {
    if (e.key === 'ArrowRight') {
      if (currentStep < steps.length - 1) {
        currentStep++;
        updateModal();
      }
    } else if (e.key === 'ArrowLeft') {
      if (currentStep > 0) {
        currentStep--;
        updateModal();
      }
    }
  };
  document.addEventListener('keydown', onKey);

  // 彈窗關閉時解綁鍵盤監聽
  const origClose = modal.close;
  modal.close = () => {
    document.removeEventListener('keydown', onKey);
    origClose();
  };

  attachEvents();
}

/** 🎮 遊戲式實景高亮聚焦導覽 (Interactive Spotlight Tour) */
export function startInteractiveSpotlightTour() {
  const tourSteps = [
    {
      target: '.brand',
      route: '#/today',
      badge: '起點站',
      title: '🚲 經營 Team 專屬行事曆',
      body: '歡迎來到經營組專用行事曆！點選左上角 Logo 可以隨時回到今日首頁。全系統針對 YouBike 經營團隊量身定制。',
      position: 'bottom',
    },
    {
      target: '[data-tabs]',
      route: '#/today',
      badge: '視圖切換',
      title: '📑 核心視圖導覽列',
      body: '上方頁籤整合經營組各項協同業務：<b>今日動態</b>、<b>行事曆</b>（月曆/總表）、<b>月會</b>、<b>模擬體驗</b>與<b>採購佈告欄</b>，各模組支援專屬業務權限控管。',
      position: 'bottom',
    },
    {
      target: '[data-new]',
      route: '#/today',
      badge: '外出登記',
      title: '➕ 新增與登記行程',
      body: '點擊此處可隨時登記出差、外出洽公、請假或會議。支援填寫外出地點、事由、聯絡電話、是否可接聽電話與代理人，還能勾選同行組員同步連動！',
      position: 'bottom',
    },
    {
      target: '.bell-wrap',
      route: '#/today',
      badge: '即時通知',
      title: '🔔 小鈴鐺通知中心',
      body: '當有組員指派你為外出代理人、同行夥伴，或輪值到你擔任月會紀錄人時，小鈴鐺會即時紅點提醒，重要公務不漏接。',
      position: 'bottom',
    },
    {
      target: '.user-wrap',
      route: '#/today',
      badge: '個人設定',
      title: '👤 組員個人專區',
      body: '點擊頭像可查看個人登入帳號、組員職位與權限身份，也是系統的安全登出入口。',
      position: 'bottom',
    },
    {
      target: '[data-ride]',
      route: '#/today',
      badge: '時段進度',
      title: '🚴 今日動態與騎行進度條',
      body: '依照當天時間推進，小單車會沿著專屬自行車道前行，視覺化清楚標示上午、午休及下午時段。',
      position: 'bottom',
    },
    {
      target: '[data-detail]',
      route: '#/today',
      badge: '出勤清單',
      title: '👥 經營站・全員即時動態卡片',
      body: '每位組員都有專屬卡片，顯示今天是否在辦公室、預計外出地點、回辦公室時間與代理人，支援一鍵撥打電話！',
      position: 'top',
    },
    {
      target: '[data-switcher]',
      route: '#/schedule',
      badge: '雙重視圖',
      title: '🗓️ 行事曆：月曆與總表雙視圖',
      body: '全月行程一目了然！系統整合「🗓️ 月曆」與「📊 總表」雙重視圖，右上角提供快速切換鈕。無論切換至月曆或總表，月份與篩選設定皆無縫保留！',
      position: 'bottom',
    },
    {
      target: '.filters',
      route: '#/schedule',
      badge: '篩選與匯出',
      title: '🔍 人員篩選與 Excel 匯出',
      body: '上方可依特定組員或行程類型快速篩選，還能一鍵將全月份行程匯出為 Excel 報表！',
      position: 'bottom',
    },
    {
      target: '.meeting-hero',
      route: '#/meeting',
      badge: '定期月會',
      title: '💼 經營組月會專區',
      body: '查看下一場月會倒數計時、一鍵加入 Google Meet、會前上傳簡報試算表連結、線上即時會議紀錄填寫與歷次存檔。',
      position: 'bottom',
    },
    {
      target: '.sim-tabs-header',
      route: '#/simulation',
      badge: '模擬體驗',
      title: '🚲 模擬體驗排班規劃',
      body: '全台各縣市車機 2.0 / 2.0E 抽樣配額管制與排班協同矩陣，更包含北區（Leo / Hao）與南區（Chun）每日品管巡檢日程，支援一鍵自動同步行事曆！',
      position: 'bottom',
    },
    {
      target: '.bulletin-frame-card',
      route: '#/bulletin',
      badge: '採購佈告欄',
      title: '📢 採購電子週報與後台',
      body: '大畫面整合微笑單車採購電子週報前台與閱讀打卡，右上角更提供專屬按鈕直通管理後台發布資訊，支援權限精準管控！',
      position: 'top',
    }
  ].filter(s => {
    // 依當前使用者權限動態過濾導覽步數
    if (s.route === '#/simulation' && !hasModulePermission(state.me, 'simulation')) return false;
    if (s.route === '#/bulletin' && !hasModulePermission(state.me, 'bulletin')) return false;
    return true;
  });

  let stepIdx = 0;

  // 建立 Overlay 與提示框
  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';

  // 使用 SVG 遮罩繪製黑幕與鏤空透光區域 (支援主目標與上方對應頁籤同時挖空高亮)
  const svgBackdrop = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgBackdrop.setAttribute('class', 'tour-svg-backdrop');
  svgBackdrop.innerHTML = `
    <defs>
      <mask id="tour-cutout-mask">
        <!-- 白色底：全部遮蓋 (暗幕) -->
        <rect x="0" y="0" width="100%" height="100%" fill="white" />
        <!-- 黑色區域：挖空透光 (高亮顯示真實頁面內容) -->
        <rect id="mask-target-rect" x="0" y="0" width="0" height="0" rx="10" ry="10" fill="black" />
        <rect id="mask-tab-rect" x="0" y="0" width="0" height="0" rx="6" ry="6" fill="black" />
      </mask>
    </defs>
    <!-- 套用遮罩的暗黑遮罩層 (78% 暗度) -->
    <rect x="0" y="0" width="100%" height="100%" fill="rgba(15, 23, 42, 0.82)" mask="url(#tour-cutout-mask)" />
  `;

  // 主目標外光暈框
  const box = document.createElement('div');
  box.className = 'tour-spotlight-box';

  // 頂部對應頁籤外光暈框
  const tabBox = document.createElement('div');
  tabBox.className = 'tour-spotlight-tab-box';

  // 提示卡片
  const card = document.createElement('div');
  card.className = 'tour-tooltip-card';

  overlay.appendChild(svgBackdrop);
  overlay.appendChild(box);
  overlay.appendChild(tabBox);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  document.body.classList.add('in-tour');

  function cleanup() {
    overlay.remove();
    document.body.classList.remove('in-tour');
    document.querySelectorAll('.tabs a').forEach(a => a.classList.remove('tour-active-tab'));
    window.removeEventListener('resize', updatePosition);
    window.removeEventListener('scroll', updatePosition);
    document.removeEventListener('keydown', onTourKey);
  }

  function updatePosition() {
    const s = tourSteps[stepIdx];
    let el = document.querySelector(s.target);

    const maskTarget = overlay.querySelector('#mask-target-rect');
    const maskTab = overlay.querySelector('#mask-tab-rect');

    // 如果元素尚未渲染出來（例如頁面切換中），稍候再試
    if (!el) {
      box.style.display = 'none';
      tabBox.style.display = 'none';
      if (maskTarget) { maskTarget.setAttribute('width', '0'); maskTarget.setAttribute('height', '0'); }
      if (maskTab) { maskTab.setAttribute('width', '0'); maskTab.setAttribute('height', '0'); }
      card.style.top = '50%';
      card.style.left = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      return;
    }

    box.style.display = 'block';
    const rect = el.getBoundingClientRect();
    const pad = 6;
    const bTop = Math.max(0, rect.top - pad);
    const bLeft = Math.max(0, rect.left - pad);
    const bWidth = rect.width + pad * 2;
    const bHeight = rect.height + pad * 2;

    // 設定主目標高亮聚焦框 (Spotlight Box)
    box.style.top = `${bTop}px`;
    box.style.left = `${bLeft}px`;
    box.style.width = `${bWidth}px`;
    box.style.height = `${bHeight}px`;

    // 更新 SVG 主目標挖空區
    if (maskTarget) {
      maskTarget.setAttribute('x', bLeft);
      maskTarget.setAttribute('y', bTop);
      maskTarget.setAttribute('width', bWidth);
      maskTarget.setAttribute('height', bHeight);
    }

    // 同步處理上方對應頁籤的挖空與高亮 (例如介紹月曆時，上方月曆鈕與下方月曆同步透光高亮)
    const targetRoute = s.route || '#/today';
    const tabEl = document.querySelector(`.tabs a[href="${targetRoute}"]`);
    const isTargetTheTabs = s.target === '[data-tabs]' || s.target === '.topbar';

    if (tabEl && !isTargetTheTabs) {
      const tabRect = tabEl.getBoundingClientRect();
      const tPad = 4;
      const tTop = Math.max(0, tabRect.top - tPad);
      const tLeft = Math.max(0, tabRect.left - tPad);
      const tWidth = tabRect.width + tPad * 2;
      const tHeight = tabRect.height + tPad * 2;

      tabBox.style.display = 'block';
      tabBox.style.top = `${tTop}px`;
      tabBox.style.left = `${tLeft}px`;
      tabBox.style.width = `${tWidth}px`;
      tabBox.style.height = `${tHeight}px`;

      if (maskTab) {
        maskTab.setAttribute('x', tLeft);
        maskTab.setAttribute('y', tTop);
        maskTab.setAttribute('width', tWidth);
        maskTab.setAttribute('height', tHeight);
      }
    } else {
      tabBox.style.display = 'none';
      if (maskTab) {
        maskTab.setAttribute('width', '0');
        maskTab.setAttribute('height', '0');
      }
    }

    // 捲動至可見區域（避免捲動到擋住頂部導覽列）
    if (rect.top < 70 || rect.bottom > window.innerHeight - 60) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 計算提示卡片位置
    const cardWidth = Math.min(380, window.innerWidth - 32);
    let top = 0;
    let left = Math.max(16, Math.min(rect.left + (rect.width / 2) - (cardWidth / 2), window.innerWidth - cardWidth - 16));

    if (s.position === 'top' && rect.top > 220) {
      top = rect.top - 200;
    } else {
      top = rect.bottom + 16;
      if (top + 220 > window.innerHeight) {
        top = Math.max(16, rect.top - 210);
      }
    }

    card.style.transform = 'none';
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  function renderStep() {
    const s = tourSteps[stepIdx];

    // 同步點亮頂部對應的頁籤按鈕 (Tab Highlight)
    const targetRoute = s.route || '#/today';
    document.querySelectorAll('.tabs a').forEach(a => {
      const match = a.getAttribute('href') === targetRoute;
      a.classList.toggle('tour-active-tab', match);
    });

    // 若需要切換頁面
    if (s.route && location.hash !== s.route) {
      location.hash = s.route;
      setTimeout(renderStep, 250);
      return;
    }

    card.innerHTML = `
      <div class="tour-head">
        <span class="tour-badge">${s.badge}</span>
        <span class="tour-step-counter">${stepIdx + 1} / ${tourSteps.length}</span>
      </div>
      <h4 class="tour-title">${s.title}</h4>
      <p class="tour-body">${s.body}</p>
      <div class="tour-actions">
        <button type="button" class="btn small ghost" data-tour-exit>離開導覽</button>
        <div style="display:flex; gap:6px;">
          ${stepIdx > 0 ? `<button type="button" class="btn small ghost" data-tour-prev>上一步</button>` : ''}
          ${stepIdx < tourSteps.length - 1
            ? `<button type="button" class="btn small primary" data-tour-next>下一步 👉</button>`
            : `<button type="button" class="btn small ok-btn" data-tour-finish>完成探索 🎉</button>`}
        </div>
      </div>
    `;

    card.querySelector('[data-tour-exit]').onclick = cleanup;
    card.querySelector('[data-tour-finish]')?.addEventListener('click', () => {
      cleanup();
      location.hash = '#/today';
    });

    const nextBtn = card.querySelector('[data-tour-next]');
    if (nextBtn) {
      nextBtn.onclick = () => {
        stepIdx++;
        renderStep();
      };
    }

    const prevBtn = card.querySelector('[data-tour-prev]');
    if (prevBtn) {
      prevBtn.onclick = () => {
        stepIdx--;
        renderStep();
      };
    }

    updatePosition();
  }

  // 支援鍵盤左右鍵切換上一步/下一步，Escape 鍵離開
  const onTourKey = e => {
    if (e.key === 'ArrowRight') {
      if (stepIdx < tourSteps.length - 1) {
        stepIdx++;
        renderStep();
      }
    } else if (e.key === 'ArrowLeft') {
      if (stepIdx > 0) {
        stepIdx--;
        renderStep();
      }
    } else if (e.key === 'Escape') {
      cleanup();
    }
  };
  document.addEventListener('keydown', onTourKey);

  window.addEventListener('resize', updatePosition);
  window.addEventListener('scroll', updatePosition, { passive: true });

  renderStep();
}

/** 🎮 會議紀錄專屬・遊戲式實景聚焦導覽 (Interactive In-Modal Spotlight Tour) */
export function startInteractiveMinutesSpotlightTour() {
  const modalEl = document.querySelector('.modal.wide');
  if (!modalEl) return;

  const modalBody = modalEl.querySelector('.modal-body') || modalEl;

  const tourSteps = [
    {
      target: '#sec-attendees',
      fallbackTarget: '[data-collapsible-section]',
      badge: '步驟 1 / 5',
      title: '👥 出席狀況盤點',
      body: '會議一開始，點選右上方<b>「⚡ 全員現場」</b>即可一秒將全員設為出席。盤點確認無誤後，<b>點擊標題即可合閉收合</b>，節省垂直空間！',
      position: 'bottom',
      onEnter: (targetEl) => {
        targetEl?.classList.remove('is-collapsed');
      }
    },
    {
      target: '.min-nav-anchors',
      badge: '步驟 2 / 5',
      title: '⚡ 快速跳轉錨點（邊聽邊跳）',
      body: '所有議題與報告人一覽無遺！各組員輪流上台或切換投影片時，<b>點擊他的按鈕會立即平滑捲動並自動展開該議題</b>，並閃爍醒目藍框定位。',
      position: 'bottom',
    },
    {
      target: '.mac-presenter-switch',
      fallbackTarget: '#ag-card-1',
      badge: '步驟 3 / 5',
      title: '📋 議題卡片與靈活切換',
      body: '各議題皆有溫和醒目的琥珀邊框區隔，<b>預設為合閉</b>。針對「二、模擬體驗品質分數」，右上角可<b>一鍵切換【葉爵豪】或【陸逸群】</b>！記錄完隨手點標題即可收合。',
      position: 'bottom',
      onEnter: (targetEl) => {
        // 自動展開包含切換器的第 2 項議題卡片
        const card = targetEl.closest('.min-agenda-card') || document.querySelector('#ag-card-1') || targetEl;
        card.classList.remove('is-collapsed');
      }
    },
    {
      target: '#sec-general',
      badge: '步驟 4 / 5',
      title: '📝 主管裁示與待辦追蹤',
      body: '會議尾聲，點擊標題即可展開記錄主管各項宣達裁示與臨時動議；下方亦可新增 <b>Action Items</b> 待辦指派負責人，以及<b>一鍵貼入下次會議預排資訊</b>！',
      position: 'top',
      onEnter: (targetEl) => {
        targetEl?.classList.remove('is-collapsed');
      }
    },
    {
      target: '.modal-foot',
      badge: '步驟 5 / 5',
      title: '💾 自動同步與正式發布',
      body: '系統<b>每 10 秒自動在背景安全存檔</b>，即使誤點旁邊灰底也有防誤關保護！全場會議結束校對無誤後，點擊<b>「🚀 正式發布會議紀錄」</b>即大功告成！',
      position: 'top',
      onEnter: () => {}
    }
  ];

  let stepIdx = 0;

  // 建立聚焦導覽圖層
  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.style.zIndex = '999999';

  const svgBackdrop = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgBackdrop.setAttribute('class', 'tour-svg-backdrop');
  svgBackdrop.style.zIndex = '999999';
  svgBackdrop.innerHTML = `
    <defs>
      <mask id="minutes-tour-mask">
        <rect width="100%" height="100%" fill="white" />
        <rect id="m-mask-target-rect" rx="10" fill="black" />
      </mask>
    </defs>
    <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.72)" mask="url(#minutes-tour-mask)" />
  `;

  const box = document.createElement('div');
  box.className = 'tour-spotlight-box';
  box.style.zIndex = '1000000';
  box.style.boxShadow = '0 0 0 3px var(--yb, #f5a623), 0 0 25px rgba(245, 166, 35, 0.85)';

  const card = document.createElement('div');
  card.className = 'tour-tooltip-card';
  card.style.zIndex = '1000001';

  overlay.appendChild(svgBackdrop);
  overlay.appendChild(box);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  function cleanup() {
    overlay.remove();
    window.removeEventListener('resize', updatePosition);
    window.removeEventListener('scroll', updatePosition);
    modalBody.removeEventListener('scroll', updatePosition);
    document.removeEventListener('keydown', onTourKey);
  }

  modalBody.addEventListener('scroll', updatePosition);

  function updatePosition() {
    const s = tourSteps[stepIdx];
    let el = document.querySelector(s.target) || (s.fallbackTarget ? document.querySelector(s.fallbackTarget) : null);

    // 如果是步驟 3，我們聚焦在第 2 個議題的卡片或切換區塊
    if (stepIdx === 2) {
      const switchEl = document.querySelector('.mac-presenter-switch');
      const ag2Card = switchEl?.closest('.min-agenda-card') || document.querySelector('#ag-card-1');
      if (ag2Card) {
        ag2Card.classList.remove('is-collapsed');
        // 聚焦整張卡片或切換按鈕，聚焦在整張 ag2Card 讓視覺完整看到第 2 題與切換鈕
        el = ag2Card;
      }
    }

    const maskTarget = overlay.querySelector('#m-mask-target-rect');

    if (!el) {
      box.style.display = 'none';
      if (maskTarget) { maskTarget.setAttribute('width', '0'); maskTarget.setAttribute('height', '0'); }
      card.style.top = '50%';
      card.style.left = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      return;
    }

    if (typeof s.onEnter === 'function') {
      s.onEnter(el);
    }

    box.style.display = 'block';

    const rect = el.getBoundingClientRect();
    const pad = 6;
    const bTop = Math.max(0, rect.top - pad);
    const bLeft = Math.max(0, rect.left - pad);
    const bWidth = rect.width + pad * 2;
    const bHeight = rect.height + pad * 2;

    box.style.top = `${bTop}px`;
    box.style.left = `${bLeft}px`;
    box.style.width = `${bWidth}px`;
    box.style.height = `${bHeight}px`;

    if (maskTarget) {
      maskTarget.setAttribute('x', bLeft);
      maskTarget.setAttribute('y', bTop);
      maskTarget.setAttribute('width', bWidth);
      maskTarget.setAttribute('height', bHeight);
    }

    const cardWidth = Math.min(380, window.innerWidth - 32);
    let top = 0;
    let left = Math.max(16, Math.min(rect.left + (rect.width / 2) - (cardWidth / 2), window.innerWidth - cardWidth - 16));

    if (s.position === 'top' && rect.top > 230) {
      top = rect.top - 210;
    } else {
      top = rect.bottom + 16;
      if (top + 230 > window.innerHeight) {
        top = Math.max(16, rect.top - 220);
      }
    }

    card.style.transform = 'none';
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  function renderStep() {
    const s = tourSteps[stepIdx];

    card.innerHTML = `
      <div class="tour-head">
        <span class="tour-badge">${s.badge}</span>
        <span class="tour-step-counter">${stepIdx + 1} / ${tourSteps.length}</span>
      </div>
      <h4 class="tour-title">${s.title}</h4>
      <p class="tour-body">${s.body}</p>
      <div class="tour-actions">
        <button type="button" class="btn small ghost" data-tour-exit>結束導覽</button>
        <div style="display:flex; gap:6px;">
          ${stepIdx > 0 ? `<button type="button" class="btn small ghost" data-tour-prev>上一步</button>` : ''}
          ${stepIdx < tourSteps.length - 1
            ? `<button type="button" class="btn small primary" data-tour-next>下一步 👉</button>`
            : `<button type="button" class="btn small ok-btn" data-tour-finish>學會了，開始記錄！ 🎉</button>`}
        </div>
      </div>
    `;

    card.querySelector('[data-tour-exit]').onclick = cleanup;
    card.querySelector('[data-tour-finish]')?.addEventListener('click', cleanup);

    const nextBtn = card.querySelector('[data-tour-next]');
    if (nextBtn) {
      nextBtn.onclick = () => {
        stepIdx++;
        renderStep();
      };
    }

    const prevBtn = card.querySelector('[data-tour-prev]');
    if (prevBtn) {
      prevBtn.onclick = () => {
        stepIdx--;
        renderStep();
      };
    }

    // 確保進入步驟時將目標元素平滑置中並正確重繪高亮區域
    const targetSelector = s.target;
    let targetEl = document.querySelector(targetSelector) || (s.fallbackTarget ? document.querySelector(s.fallbackTarget) : null);
    if (stepIdx === 2) {
      targetEl = document.querySelector('.mac-presenter-switch')?.closest('.min-agenda-card') || document.querySelector('#ag-card-1') || targetEl;
    }
    if (targetEl) {
      if (typeof s.onEnter === 'function') s.onEnter(targetEl);
      targetEl.scrollIntoView({ behavior: 'auto', block: 'center' });
    }

    updatePosition();
    setTimeout(updatePosition, 80);
    setTimeout(updatePosition, 250);
  }

  const onTourKey = e => {
    if (e.key === 'ArrowRight') {
      if (stepIdx < tourSteps.length - 1) {
        stepIdx++;
        renderStep();
      }
    } else if (e.key === 'ArrowLeft') {
      if (stepIdx > 0) {
        stepIdx--;
        renderStep();
      }
    } else if (e.key === 'Escape') {
      cleanup();
    }
  };
  document.addEventListener('keydown', onTourKey);

  window.addEventListener('resize', updatePosition);
  window.addEventListener('scroll', updatePosition, { passive: true });

  renderStep();
}

/** 🚲 模擬體驗專屬・6 步深度實景聚焦導覽 (Interactive Simulation Module Spotlight Tour) */
export function startInteractiveSimulationSpotlightTour() {
  if (location.hash !== '#/simulation') {
    location.hash = '#/simulation';
  }

  const tourSteps = [
    {
      target: '#sim-year-month-bar',
      fallbackTarget: '.sim-toolbar',
      badge: '步驟 1 / 6',
      title: '📅 2026 全年度月份快速切換',
      body: '系統已完整內建 <b>2026 年 1 月～11 月</b> 的真實歷史與預排資料！點擊任一月份按鈕即可瞬間切換檢視該月的各縣市配額與組員排班，右側還可一鍵打開<b>年度全覽與母體總數表</b>。',
      position: 'bottom',
      beforeStep: () => {
        document.querySelector('.sim-pill-btn[data-tab="matrix"]')?.click();
      }
    },
    {
      target: '.sim-tabs-header',
      badge: '步驟 2 / 6',
      title: '🗂️ 四大連動視角（串聯 6 張試算表）',
      body: '將原本分散在 Excel 的 6 張工作表整合為 4 個緊密連動的分頁：<b>① 當月配額矩陣</b>、<b>② 北區每日品管巡檢</b>、<b>③ 南區每日品管巡檢</b>、以及 <b>④ 2026年度總覽 & 🔒 母體總數表</b>。',
      position: 'bottom',
      beforeStep: () => {
        document.querySelector('.sim-pill-btn[data-tab="matrix"]')?.click();
      }
    },
    {
      target: '#sim-tripdate-thead',
      fallbackTarget: '.sim-matrix-table',
      badge: '步驟 3 / 6',
      title: '📌 出差日期 (幾號) ＆ 外縣市天數自動加總',
      body: '完美還原試算表頂部的粉紅列！內勤同仁可直接在<b>「📅 出差日期」輸入當月幾號出差（如 15, 16）</b>；下方<b>「🚄 外縣市天數」</b>則會自動統計，且<b>苗栗與台中（兩天一夜）會自動 ×2 天計算</b>！',
      position: 'bottom',
      beforeStep: () => {
        document.querySelector('.sim-pill-btn[data-tab="matrix"]')?.click();
      }
    },
    {
      target: '.sim-matrix-table',
      badge: '步驟 4 / 6',
      title: '📋 各縣市配額與組員排班矩陣',
      body: '點擊表格內的數字格即可直接修改各縣市分配次數，系統會<b>即時自動加總個人全月抽檢台數</b>並儲存至雲端；上方藍色連動列還能即時核對 <b>Leo / Hao / Chun</b> 在巡檢月曆已排定的外縣市天數！',
      position: 'top',
      beforeStep: () => {
        document.querySelector('.sim-pill-btn[data-tab="matrix"]')?.click();
      }
    },
    {
      target: '.daily-inspection-wrapper',
      fallbackTarget: '.sim-tabs-header',
      badge: '步驟 5 / 6',
      title: '🧭 北區 / 🌴 南區每日品管巡檢月曆',
      body: '切換至北區（Leo / Hao）或南區（Chun）分頁，即可在 7 欄月曆上<b>點選任意日期排定巡檢行政區、外縣市出差或辦公室會議</b>，並自動試算建議的出差申請單張數！',
      position: 'top',
      beforeStep: () => {
        document.querySelector('.sim-pill-btn[data-tab="north"]')?.click();
      }
    },
    {
      target: '#fleet-master-section',
      fallbackTarget: '#sim-tab-content-root',
      badge: '步驟 6 / 6',
      title: '📈 2026年度垂直總表 ＆ 🔒 母體總數試算表',
      body: '在第四個分頁中，除了可檢視如同 Excel <b>「一月～十一月垂直展開總表」</b>外，下方更完整呈現<b>「🔒 全台 114,094 台 2.0/2.0E 母體車數與 ~1.93% 抽驗配額公式」</b>及跨部門 36 人協同名單！',
      position: 'top',
      beforeStep: () => {
        document.querySelector('.sim-pill-btn[data-tab="annual"]')?.click();
      }
    }
  ];

  let stepIdx = 0;

  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.style.zIndex = '999999';

  const svgBackdrop = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgBackdrop.setAttribute('class', 'tour-svg-backdrop');
  svgBackdrop.style.zIndex = '999999';
  svgBackdrop.innerHTML = `
    <defs>
      <mask id="sim-tour-mask">
        <rect width="100%" height="100%" fill="white" />
        <rect id="sim-mask-target-rect" rx="10" fill="black" />
      </mask>
    </defs>
    <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.78)" mask="url(#sim-tour-mask)" />
  `;

  const box = document.createElement('div');
  box.className = 'tour-spotlight-box';
  box.style.zIndex = '1000000';
  box.style.boxShadow = '0 0 0 3px var(--yb, #f5a623), 0 0 25px rgba(245, 166, 35, 0.85)';

  const card = document.createElement('div');
  card.className = 'tour-tooltip-card';
  card.style.zIndex = '1000001';

  overlay.appendChild(svgBackdrop);
  overlay.appendChild(box);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  document.body.classList.add('in-tour');

  function cleanup() {
    overlay.remove();
    document.body.classList.remove('in-tour');
    window.removeEventListener('resize', updatePosition);
    window.removeEventListener('scroll', updatePosition);
    document.removeEventListener('keydown', onTourKey);
    // 導覽結束後切回第一個矩陣分頁並回到頂部
    document.querySelector('.sim-pill-btn[data-tab="matrix"]')?.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updatePosition() {
    const s = tourSteps[stepIdx];
    const el = document.querySelector(s.target) || (s.fallbackTarget ? document.querySelector(s.fallbackTarget) : null);
    const maskTarget = overlay.querySelector('#sim-mask-target-rect');

    if (!el) {
      box.style.display = 'none';
      if (maskTarget) { maskTarget.setAttribute('width', '0'); maskTarget.setAttribute('height', '0'); }
      card.style.top = '50%';
      card.style.left = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      return;
    }

    box.style.display = 'block';
    const rect = el.getBoundingClientRect();
    const pad = 6;
    const bTop = Math.max(0, rect.top - pad);
    const bLeft = Math.max(0, rect.left - pad);
    const bWidth = rect.width + pad * 2;
    const bHeight = Math.min(rect.height + pad * 2, window.innerHeight - 20);

    box.style.top = `${bTop}px`;
    box.style.left = `${bLeft}px`;
    box.style.width = `${bWidth}px`;
    box.style.height = `${bHeight}px`;

    if (maskTarget) {
      maskTarget.setAttribute('x', bLeft);
      maskTarget.setAttribute('y', bTop);
      maskTarget.setAttribute('width', bWidth);
      maskTarget.setAttribute('height', bHeight);
    }

    const cardWidth = Math.min(400, window.innerWidth - 32);
    let top = 0;
    let left = Math.max(16, Math.min(rect.left + (rect.width / 2) - (cardWidth / 2), window.innerWidth - cardWidth - 16));

    if (s.position === 'top' && rect.top > 230) {
      top = rect.top - 210;
    } else {
      top = Math.min(rect.bottom + 16, window.innerHeight - 230);
      if (top < 16) top = 16;
    }

    card.style.transform = 'none';
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  function renderStep() {
    const s = tourSteps[stepIdx];
    if (typeof s.beforeStep === 'function') {
      s.beforeStep();
    }

    card.innerHTML = `
      <div class="tour-head">
        <span class="tour-badge">${s.badge}</span>
        <span class="tour-step-counter">${stepIdx + 1} / ${tourSteps.length}</span>
      </div>
      <h4 class="tour-title">${s.title}</h4>
      <p class="tour-body">${s.body}</p>
      <div class="tour-actions">
        <button type="button" class="btn small ghost" data-tour-exit>結束導覽</button>
        <div style="display:flex; gap:6px;">
          ${stepIdx > 0 ? `<button type="button" class="btn small ghost" data-tour-prev>上一步</button>` : ''}
          ${stepIdx < tourSteps.length - 1
            ? `<button type="button" class="btn small primary" data-tour-next>下一步 👉</button>`
            : `<button type="button" class="btn small ok-btn" data-tour-finish>完成模擬體驗導覽 🎉</button>`}
        </div>
      </div>
    `;

    card.querySelector('[data-tour-exit]').onclick = cleanup;
    card.querySelector('[data-tour-finish]')?.addEventListener('click', cleanup);

    card.querySelector('[data-tour-next]')?.addEventListener('click', () => {
      stepIdx++;
      renderStep();
    });

    card.querySelector('[data-tour-prev]')?.addEventListener('click', () => {
      stepIdx--;
      renderStep();
    });

    setTimeout(() => {
      const targetEl = document.querySelector(s.target) || (s.fallbackTarget ? document.querySelector(s.fallbackTarget) : null);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      updatePosition();
      setTimeout(updatePosition, 180);
      setTimeout(updatePosition, 400);
    }, 50);
  }

  const onTourKey = e => {
    if (e.key === 'ArrowRight') {
      if (stepIdx < tourSteps.length - 1) {
        stepIdx++;
        renderStep();
      }
    } else if (e.key === 'ArrowLeft') {
      if (stepIdx > 0) {
        stepIdx--;
        renderStep();
      }
    } else if (e.key === 'Escape') {
      cleanup();
    }
  };
  document.addEventListener('keydown', onTourKey);

  window.addEventListener('resize', updatePosition);
  window.addEventListener('scroll', updatePosition, { passive: true });

  renderStep();
}


