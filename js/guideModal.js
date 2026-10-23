// 功能操作導覽指引（含遊戲式全螢幕聚焦高亮導覽 Tour）
import { openModal } from './utils.js';
import { state, hasModulePermission, isFieldStaff, isSupervisor } from './data.js';

export function openGuideModal() {
  const steps = [
    {
      title: '今日動態 & 互動中樞 (Today)',
      badge: '滿版雙欄戰情室',
      color: '#16a34a',
      desc: '滿版雙欄 Bento 戰情室佈局，左側掌握全組即時出勤與騎行進度，右側常駐團隊高黏著度互動中樞。',
      items: [
        { label: '晨間補給站 (Daily Vibe Bar)', detail: '頂部三欄等高漸層膠囊，每天提供最新「 單車快訊」、「 每日一笑」與「 歷史今天」，點擊即可展開閱讀。' },
        { label: '即時出勤統計 & 精簡行程推算', detail: '自動統計外出中與在站人數；根據行程結束時間（如上午 08:30–12:00、下午 13:00–17:30）自動智慧推算「約 HH:MM 後回辦」或「今日不進辦公室」。' },
        { label: '隨手備忘錄 & 預排提醒', detail: '右側常駐備忘錄支援提早預排今天或未來某幾天的提醒（可選個人或全組），完成後點一下即可打勾消除，並與月曆/總表即時同步！' },
        { label: '五區天氣 / 每日 PK / 揪團板 / 誇誇牆', detail: '整合全台五區外勤降雨雷達、5 秒隨手投 PK、下午茶/午餐訂餐統計板，以及 Kudos 感謝貼紙誇誇牆，凝聚團隊向心力。' }
      ]
    },
    {
      title: '行事曆 & 備忘錄整合 (Schedule)',
      badge: '月曆與總表雙視圖',
      color: '#2563eb',
      desc: '掌握全月行程分配與排班矩陣，支援「月曆」與「總表」無縫切換，並深度整合「 隨手備忘錄」。',
      items: [
        { label: '雙重視圖無縫切換', detail: '上方提供「 月曆」與「 總表」切換鈕，月份與篩選無縫同步，亦可一鍵匯出全月 Excel 報表。' },
        { label: '備忘錄角標膠囊（零衝突整合）', detail: '有建立備忘錄的日期，會在月曆與總表日期格右上角顯示琥珀色「 N」角標（全部完成轉為綠色「✓」），點擊即可直接查看、新增或打勾消除！' },
        { label: '極簡行程登記 & 智慧時段帶入', detail: '新增行程已移除繁瑣欄位；點選「上午」直接帶入 08:30–12:00、點選「下午」直接帶入 13:00–17:30（亦可手動微調），3 秒完成登記！' },
        { label: '外勤同仁進辦登記', detail: '外勤同仁（孔令淳、葉爵豪、陸逸群）每月排定進辦公室的 2 天，只要登記為「進辦公室」即可自動顯示在辦公室！' }
      ]
    },
    {
      title: '經營 Team 月會 (Meeting)',
      badge: '會議與紀錄',
      color: '#9333ea',
      desc: '每個月定期的經營 Team 月會管理、會前簡報共享、例案進度一鍵引用與 Outlook 發信助手。',
      items: [
        { label: '月會資訊與 Meet 連結', detail: '置頂展示即將舉行的月會倒數、時間地點、主持人與本月輪值紀錄人，一鍵加入 Google Meet。' },
        { label: '一鍵引用「例案追蹤」進度', detail: '準備月會報告時，可直接點選將自己負責的長期「例案追蹤」最新進度與時間軸一鍵匯入月會議題中，免重複打字！' },
        { label: '鍵盤即時會議紀錄 & Outlook 寄信助手', detail: '輪值紀錄人線上即時記錄並每 10 秒自動存檔；發布後可使用「 Outlook 寄信助手」一鍵複製深藍大綱富文本並自動喚起 Outlook 預填收件人發信。' }
      ]
    },
    {
      title: '例案追蹤 (Cases)',
      badge: '長期專案時間軸',
      color: '#d97706',
      desc: '集中管理經營 Team 跨週、跨月的長期專案進度、卡關協商與歷史推進時間軸。',
      items: [
        { label: '極簡列表 & 看板模式雙視圖', detail: '支援「☰ 極簡列表（點擊展開完整時間軸軌跡）」與「▦ 看板模式（規劃中／進行中／卡關待協商／已結案）」一鍵切換。' },
        { label: '時間軸推進紀錄 (Timeline Log)', detail: '每次專案有新進展時，點擊「＋ 記錄新進度」即可累積時間軸歷史軌跡并更新完成百分比。' },
        { label: '月會無縫連動', detail: '所有登記在例案追蹤的最新進度，皆可在「 月會」頁面一鍵引用至月會報告中。' }
      ]
    },
    {
      title: '模擬體驗 (Simulation)',
      badge: '巡檢與排班',
      color: '#0284c7',
      desc: '整合《經營TEAM模擬體驗執行》6 大試算表：2026 全年度月份懸停切換、各縣市配額矩陣、北南區每日巡檢與母體總數表。',
      items: [
        { label: '2026 年度月份輕柔懸停膠囊', detail: '左上角月份膠囊滑鼠移入即輕柔向右滑出 1～11 月快速切換列（零版面推擠），並整合精簡 KPI 指標條與外勤月曆連動膠囊。' },
        { label: '出差日期粉紅列 & 配額矩陣', detail: '內勤同仁可於粉紅列直接輸入當月幾號出差，系統自動統計外縣市天數（苗栗/台中自動 ×2 天）並計算全月抽檢台數。' },
        { label: '北區 / 南區每日巡檢 & 母體總數表', detail: '支援北區（Leo/Hao）與南區（Chun）7 欄月曆排班、2026 年度垂直展開總表，以及全台 114,094 台母體抽驗公式表。' }
      ]
    },
    {
      title: '每日回報 (Daily Report)',
      badge: '內外勤分流與連動快填',
      color: '#0d9488',
      desc: '全組 9 位內外勤同仁每日工作回報（外勤縣市➔行政區連動選單三問、內勤條列進度）、嚴格防代填與內外勤分流查閱機制。',
      items: [
        { label: '外勤「縣市➔行政區」連動選單 & 內勤支援外勤切換', detail: '外勤品管採用「地區（縣市➔行政區二階選單）、稽查場站數、2.0 與 2.0E 數量」三問回報；內勤同仁平時填寫條列進度，每月支援外勤模擬體驗日亦可一鍵切換為「 外勤支援回報」！' },
        { label: '內外勤分流查閱 & 嚴格防代填保護', detail: '每人僅能填寫自己的回報（防代填）；內勤 6 位同仁工作進度全體組員皆可公開查看；外勤 3 位品管回報則僅「代理副理（徐嘉鴻）」、「外勤代理人（包于巧）」與「填寫本人」可見！' },
        { label: '複製個人 LINE 格式 & 颱風天免回報', detail: '儲存後自動依外勤/內勤格式排版並複製個人 LINE 訊息；遇颱風假可一鍵設為全員免回報，右下角更常駐「 今日回報」置中快填按鈕。' }
      ]
    },
    {
      title: '採購佈告欄 (Bulletin)',
      badge: '電子週報與管理',
      color: '#e11d48',
      desc: '串聯微笑單車採購電子週報、公告交期異動與採購後台發布系統。',
      items: [
        { label: '採購電子週報大畫面瀏覽', detail: '內嵌大畫面整合週報前台，即時查閱每週採購重點、交期異動與公告資訊。' },
        { label: '前往佈告欄管理後台', detail: '右上角一鍵直達採購管理後台，供採購主責人員發布週報、閱讀打卡統計與設定管理。' }
      ]
    },
    {
      title: '百寶箱 & 即時聊天大廳',
      badge: '內建工具與團隊交流',
      color: '#f59e0b',
      desc: '頂部「 百寶箱」整合免跳轉實用小工具、許願池、匿名意見箱，搭配右上角/右下角「 即時聊天大廳」。',
      items: [
        { label: '實用小工具（常用系統全內建）', detail: '免跳出網站即可直接查詢： 全台 9,700+ 站 YouBike 2.0/2.0E 即時車位、 氣象署雷達與「 Windy 颱風動態」互動圖、 高鐵/台鐵票價車程試算、 1968 國道外勤走廊路況，以及差旅里程與工作日計算機！' },
        { label: '經營 Team 即時聊天大廳', detail: '點擊頂部或右下角「 聊天室」即滑出單一團隊聊天大廳，支援 920px 寬螢幕放大、上傳圖片、@標註組員紅點通知、引用回覆與外勤快選詞。' },
        { label: '團隊許願池 & 100% 匿名意見箱', detail: '想要什麼新功能可在「許願池」發起並 +1 附議；工作上有任何想法或委屈可在「意見箱(抱怨箱)」切換為 完全匿名模式安心吐苦水！' }
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
              <span class="gs-title">${st.title.split(/\s|[&(]/)[0]}</span>
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

  const renderFooter = () => {
    const s = steps[currentStep];
    const isSimStep = s?.title?.includes('模擬體驗');
    const isDailyStep = s?.title?.includes('每日回報');
    return `
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn ok-btn ghost" data-start-interactive-tour style="font-weight:700;">
          啟動全站實景導覽
        </button>
        ${isSimStep ? `
          <button type="button" class="btn ghost" data-start-sim-tour style="font-weight:700; color:#b45309; background:#fef3c7; border-color:#fde68a;">
            模擬體驗 6 步聚焦導覽
          </button>
        ` : ''}
        ${isDailyStep ? `
          <button type="button" class="btn ghost" data-start-dr-tour style="font-weight:700; color:#0f766e; background:#ccfbf1; border-color:#99f6e4;">
            每日回報 6 步聚焦導覽
          </button>
        ` : ''}
        <span class="muted small-text hide-sm">像遊戲一樣逐一高亮畫面元件！</span>
      </div>
      <div class="spacer"></div>
      ${currentStep > 0 ? `<button type="button" class="btn ghost" data-prev-guide>上一步</button>` : ''}
      ${currentStep < steps.length - 1
        ? `<button type="button" class="btn primary" data-next-guide>下一步 </button>`
        : `<button type="button" class="btn ok-btn" data-close>完成導覽 </button>`}
    `;
  };

  const modal = openModal({
    title: '經營 Team 營運協同平台操作指引',
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

    modal.el.querySelector('[data-start-sim-tour]')?.addEventListener('click', () => {
      modal.close();
      startInteractiveSimulationSpotlightTour();
    });

    modal.el.querySelector('[data-start-dr-tour]')?.addEventListener('click', () => {
      modal.close();
      startInteractiveDailyReportSpotlightTour();
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

/** 遊戲式實景高亮聚焦導覽 (Interactive Spotlight Tour) */
export function startInteractiveSpotlightTour() {
  const tourSteps = [
    {
      target: '.brand',
      route: '#/today',
      badge: '起點站',
      title: '經營 Team 營運協同平台',
      body: '歡迎來到經營 Team 營運協同平台！點選左上角 Logo 可以隨時回到今日首頁。全系統採用滿版雙欄 Bento 戰情室視野，針對 YouBike 經營 Team 量身打造。',
      position: 'bottom',
    },
    {
      target: '[data-tabs]',
      route: '#/today',
      badge: '視圖切換',
      title: '核心業務與 百寶箱導覽列',
      body: '上方頁籤整合：<b>今日動態</b>、<b>行事曆</b>（月曆/總表）、<b>月會</b>、<b>例案追蹤</b>、<b>模擬體驗</b>、<b>每日回報</b>、<b>採購佈告欄</b>，以及收納<b>實用小工具／許願池／意見箱</b>的<b>「 百寶箱 ▾」</b>下拉選單！',
      position: 'bottom',
    },
    {
      target: '[data-open-chat-top]',
      route: '#/today',
      badge: '即時溝通',
      title: '經營 Team 即時聊天大廳',
      body: '點擊此處或右下角懸浮鈕即可滑出<b>「經營 Team 即時聊天大廳」</b>！支援一鍵放大寬螢幕、圖片上傳、<code>@標註組員</code>紅點通知、引用回覆與外勤常用快選詞。',
      position: 'bottom',
    },
    {
      target: '[data-new]',
      route: '#/today',
      badge: '極簡登記',
      title: '極簡行程登記 & 備忘錄',
      body: '點擊可隨時登記出差、外出、進辦公室或請假！表單已全面輕量化，點選<b>「上午」自動帶入 08:30–12:00</b>、<b>「下午」自動帶入 13:00–17:30</b>，視窗右上角還能一鍵切換建立<b>「 備忘錄」</b>！',
      position: 'bottom',
    },
    {
      target: '[data-vibe]',
      route: '#/today',
      badge: '晨間補給',
      title: '晨間補給站 (Daily Vibe Bar)',
      body: '每天早上一開網頁的三欄等高膠囊補給站：<b>單車快訊</b>（YouBike 與自行車產業新聞）、<b>每日一笑</b>（幽默笑話腦筋急轉彎）、<b>歷史今天</b>，點擊任一膠囊即可平滑展開閱讀！',
      position: 'bottom',
    },
    {
      target: '[data-ride]',
      route: '#/today',
      badge: '時段進度',
      title: '今日即時動態與智慧回辦推算',
      body: '清楚呈現目前誰外出中、誰在站上！系統會依行程結束時間自動推算<b>「約 HH:MM 後回辦」</b>或<b>「今日不進辦公室」</b>，下方更有隨時間推進的 YouBike 騎行進度條。',
      position: 'bottom',
    },
    {
      target: '[data-sticky-hub]',
      route: '#/today',
      badge: '高黏著中樞',
      title: '隨手備忘錄 & 團隊互動中樞 (Sticky Hub)',
      body: '首頁右側常駐四大互動卡片：<br>1. <b>隨手備忘錄</b>（可提早預排未來多日提醒，點擊即打勾消除，與行事曆同步）<br>2. <b>五區即時天氣 ＆ 每日隨手投 PK</b><br>3. <b>下午茶 / 午餐揪團板</b><br>4. <b>團隊感謝貼紙 (Kudos 誇誇牆)</b>',
      position: 'left',
    },
    {
      target: '[data-switcher]',
      route: '#/schedule',
      badge: '雙重視圖',
      title: '行事曆：月曆／總表雙視圖 ＆ 備忘角標',
      body: '全月行程與<b>「 備忘錄角標膠囊」</b>完美整合！凡是有備忘錄的日期，格子右上角都會浮現<b>「 N」</b>角標（不與下方行程條衝突），點擊角標即可直接檢視或打勾消除！',
      position: 'bottom',
    },
    {
      target: '.meeting-hero',
      route: '#/meeting',
      badge: '定期月會',
      title: '經營 Team 月會專區',
      body: '查看下一場月會倒數計時、一鍵加入 Google Meet、會前引用「例案追蹤」進度、線上即時會議紀錄填寫與<b>「 Outlook 寄信助手」</b>。',
      position: 'bottom',
    },
    {
      target: '.view-cases .toolbar',
      route: '#/cases',
      badge: '長期專案',
      title: '例案追蹤（極簡列表 ＆ 看板模式）',
      body: '針對部門跨月長期專案建立進度追蹤！支援<b>「☰ 極簡列表」</b>與<b>「▦ 看板模式」</b>切換，隨時新增推進時間軸軌跡，並可在月會報告中一鍵引用。',
      position: 'bottom',
    },
    {
      target: '#sim-year-month-bar',
      route: '#/simulation',
      badge: '模擬體驗',
      title: '模擬體驗排班規劃（懸停月份膠囊）',
      body: '左上角<b>「 2026年月份膠囊」</b>滑鼠移入即輕柔滑出 1～11 月切換列！完整整合各縣市 2.0/2.0E 配額矩陣、北區/南區每日巡檢月曆與全台 114,094 台母體總數表。',
      position: 'bottom',
    },
    {
      target: '.dr-hero-card',
      route: '#/dailyReport',
      badge: '下班進度',
      title: '每日工作進度回報中心',
      body: '全組 9 位同仁專屬回報（外勤品管制式三問、內勤條列進度並支援切換外勤支援回報），嚴格防代填且<b>內勤公開共享、外勤僅徐嘉鴻／包于巧與本人可見</b>！',
      position: 'bottom',
    },
    {
      target: '.bulletin-frame-card',
      route: '#/bulletin',
      badge: '採購佈告欄',
      title: '採購電子週報與後台',
      body: '大畫面整合微笑單車採購電子週報前台與閱讀打卡，右上角更提供專屬按鈕直通管理後台發布資訊！',
      position: 'top',
    },
    {
      target: '.tools-sys-nav',
      route: '#/tools',
      badge: '內建百寶箱',
      title: '實用小工具（常用系統免跳轉全內建）',
      body: '將常用系統直接內建於本頁！包含：<b>全台 9,700+ 站 YouBike 2.0/2.0E 即時車位直查</b>、<b>氣象署雷達與 Windy 颱風動態</b>、<b>高鐵/台鐵票價試算</b>與<b>1968 國道路況</b>！',
      position: 'bottom',
    }
  ].filter(s => {
    // 依當前使用者權限動態過濾導覽步數
    if (s.route === '#/simulation' && !hasModulePermission(state.me, 'simulation')) return false;
    if (s.route === '#/dailyReport' && !hasModulePermission(state.me, 'dailyReport')) return false;
    if (s.route === '#/bulletin' && !hasModulePermission(state.me, 'bulletin')) return false;
    return true;
  });

  // 判斷該步驟是否為介紹頂部全站共用按鈕（Logo、導覽列、聊天室、新增行程、通知鈴鐺、個人頭像）
  // 介紹頂部共用按鈕時，不應同時把「今日動態」頁籤框起來，避免視覺焦點分散
  const TOPBAR_GLOBAL_TARGETS = new Set(['.brand', '[data-tabs]', '.topbar', '[data-open-chat-top]', '[data-new]', '.bell-wrap', '.user-wrap']);

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
    document.querySelectorAll('.tabs a, .nav-more-trigger').forEach(a => a.classList.remove('tour-active-tab'));
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
    const bHeight = Math.min(rect.height + pad * 2, window.innerHeight - 20);

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

    // 同步處理上方對應頁籤的挖空與高亮 (僅在介紹下方頁面實景內容時點亮對應頁籤，介紹頂部共用按鈕時不點亮頁籤)
    const targetRoute = s.route || '#/today';
    const isMoreRoute = ['#/tools', '#/wishes', '#/vents'].includes(targetRoute);
    const tabEl = isMoreRoute
      ? document.querySelector('.nav-more-trigger')
      : document.querySelector(`.tabs a[href="${targetRoute}"]`);
    const isTopbarGlobalElement = TOPBAR_GLOBAL_TARGETS.has(s.target);

    if (tabEl && !isTopbarGlobalElement) {
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

    // 計算提示卡片位置（動態讀取提示卡真實高度，避免壓在目標框上）
    const cardRect = card.getBoundingClientRect();
    const cardWidth = cardRect.width || Math.min(380, window.innerWidth - 32);
    const cardHeight = cardRect.height || 230;
    const gap = 16;

    let top = 0;
    let left = Math.max(16, Math.min(bLeft + (bWidth / 2) - (cardWidth / 2), window.innerWidth - cardWidth - 16));

    const spaceAbove = bTop - gap;
    const spaceBelow = window.innerHeight - (bTop + bHeight) - gap;
    const spaceLeft = bLeft - gap;
    const spaceRight = window.innerWidth - (bLeft + bWidth) - gap;

    if (s.position === 'left' && spaceLeft >= cardWidth + 16) {
      left = bLeft - cardWidth - gap;
      top = Math.max(80, Math.min(bTop + 20, window.innerHeight - cardHeight - 16));
    } else if (s.position === 'top' && spaceAbove >= cardHeight) {
      top = bTop - cardHeight - gap;
    } else if (spaceBelow >= cardHeight) {
      top = bTop + bHeight + gap;
    } else if (spaceAbove >= cardHeight) {
      top = bTop - cardHeight - gap;
    } else {
      if (spaceRight >= cardWidth + 16) {
        left = bLeft + bWidth + gap;
        top = Math.max(16, Math.min(bTop, window.innerHeight - cardHeight - 16));
      } else if (spaceLeft >= cardWidth + 16) {
        left = bLeft - cardWidth - gap;
        top = Math.max(16, Math.min(bTop, window.innerHeight - cardHeight - 16));
      } else {
        top = spaceBelow >= spaceAbove
          ? Math.min(bTop + bHeight + gap, window.innerHeight - cardHeight - 12)
          : Math.max(12, bTop - cardHeight - gap);
      }
    }

    card.style.transform = 'none';
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  function renderStep() {
    const s = tourSteps[stepIdx];
    const isTopbarGlobalElement = TOPBAR_GLOBAL_TARGETS.has(s.target);

    // 同步點亮頂部對應的頁籤按鈕 (僅在介紹頁面內容時加上 tour-active-tab)
    const targetRoute = s.route || '#/today';
    const isMoreRoute = ['#/tools', '#/wishes', '#/vents'].includes(targetRoute);
    document.querySelectorAll('.tabs a').forEach(a => {
      const match = !isTopbarGlobalElement && a.getAttribute('href') === targetRoute;
      a.classList.toggle('tour-active-tab', match);
    });
    const moreTrig = document.querySelector('.nav-more-trigger');
    if (moreTrig) {
      moreTrig.classList.toggle('tour-active-tab', !isTopbarGlobalElement && isMoreRoute);
    }

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
            ? `<button type="button" class="btn small primary" data-tour-next>下一步 </button>`
            : `<button type="button" class="btn small ok-btn" data-tour-finish>完成探索 </button>`}
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
    setTimeout(updatePosition, 120);
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

/** 會議紀錄專屬・遊戲式實景聚焦導覽 (Interactive In-Modal Spotlight Tour) */
export function startInteractiveMinutesSpotlightTour() {
  const modalEl = document.querySelector('.modal.wide');
  if (!modalEl) return;

  const modalBody = modalEl.querySelector('.modal-body') || modalEl;

  const tourSteps = [
    {
      target: '#sec-attendees',
      fallbackTarget: '[data-collapsible-section]',
      badge: '步驟 1 / 5',
      title: '出席狀況盤點',
      body: '會議一開始，點選右上方<b>「 全員現場」</b>即可一秒將全員設為出席。盤點確認無誤後，<b>點擊標題即可合閉收合</b>，節省垂直空間！',
      position: 'bottom',
      onEnter: (targetEl) => {
        targetEl?.classList.remove('is-collapsed');
      }
    },
    {
      target: '.min-nav-anchors',
      badge: '步驟 2 / 5',
      title: '快速跳轉錨點（邊聽邊跳）',
      body: '所有議題與報告人一覽無遺！各組員輪流上台或切換投影片時，<b>點擊他的按鈕會立即平滑捲動並自動展開該議題</b>，並閃爍醒目藍框定位。',
      position: 'bottom',
    },
    {
      target: '.mac-presenter-switch',
      fallbackTarget: '#ag-card-1',
      badge: '步驟 3 / 5',
      title: '議題卡片與靈活切換',
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
      title: '主管裁示與待辦追蹤',
      body: '會議尾聲，點擊標題即可展開記錄主管各項宣達裁示與臨時動議；下方亦可新增 <b>Action Items</b> 待辦指派負責人，以及<b>一鍵貼入下次會議預排資訊</b>！',
      position: 'top',
      onEnter: (targetEl) => {
        targetEl?.classList.remove('is-collapsed');
      }
    },
    {
      target: '.modal-foot',
      badge: '步驟 5 / 5',
      title: '自動同步與正式發布',
      body: '系統<b>每 10 秒自動在背景安全存檔</b>，即使誤點旁邊灰底也有防誤關保護！全場會議結束校對無誤後，點擊<b>「 正式發布會議紀錄」</b>即大功告成！',
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
            ? `<button type="button" class="btn small primary" data-tour-next>下一步 </button>`
            : `<button type="button" class="btn small ok-btn" data-tour-finish>學會了，開始記錄！ </button>`}
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

/** 模擬體驗專屬・6 步深度實景聚焦導覽 (Interactive Simulation Module Spotlight Tour) */
export function startInteractiveSimulationSpotlightTour() {
  if (location.hash !== '#/simulation') {
    location.hash = '#/simulation';
  }

  const tourSteps = [
    {
      target: '.month-expander-bar',
      fallbackTarget: '#sim-year-month-bar',
      badge: '步驟 1 / 6',
      title: '2026 年度月份「輕柔懸停滑出膠囊」',
      body: '系統已完整內建 <b>2026 年 1 月～11 月</b> 的真實歷史與預排資料！將滑鼠移到左上角月份膠囊上，就會<b>輕柔向右浮出 1～11 月快速切換列（零版面推擠，絕不擠動右側分頁）</b>！',
      position: 'bottom',
      beforeStep: () => {
        document.querySelector('.sim-pill-btn[data-tab="matrix"]')?.click();
      }
    },
    {
      target: '.sim-nav-pills',
      fallbackTarget: '#sim-year-month-bar',
      badge: '步驟 2 / 6',
      title: '四大連動視角（串聯 6 張試算表）',
      body: '將原本分散在 Excel 的 6 張工作表整合為右側 4 個緊密連動的分頁：<b>① 排班矩陣</b>、<b>② 北區巡檢 (Leo/Hao)</b>、<b>③ 南區巡檢 (Chun)</b>、以及 <b>④ 年度總覽 & 母體表</b>。',
      position: 'bottom',
      beforeStep: () => {
        document.querySelector('.sim-pill-btn[data-tab="matrix"]')?.click();
      }
    },
    {
      target: '#sim-tripdate-thead',
      fallbackTarget: '.sim-matrix-table',
      badge: '步驟 3 / 6',
      title: '出差日期 (幾號) ＆ 外縣市天數自動加總',
      body: '完美還原試算表頂部的粉紅列！內勤同仁可直接在<b>「 出差日期」輸入當月幾號出差（如 15, 16）</b>；下方<b>「 外縣市天數」</b>則會自動統計，且<b>苗栗與台中（兩天一夜）會自動 ×2 天計算</b>！',
      position: 'bottom',
      beforeStep: () => {
        document.querySelector('.sim-pill-btn[data-tab="matrix"]')?.click();
      }
    },
    {
      target: '.sim-matrix-table',
      badge: '步驟 4 / 6',
      title: '各縣市配額與組員排班矩陣',
      body: '點擊表格內的數字格即可直接修改各縣市分配次數，系統會<b>即時自動加總個人全月抽檢台數</b>並儲存至雲端；上方指標條還能移上去查看 <b>Leo / Hao / Chun</b> 在巡檢月曆已排定的外縣市天數膠囊！',
      position: 'top',
      beforeStep: () => {
        document.querySelector('.sim-pill-btn[data-tab="matrix"]')?.click();
      }
    },
    {
      target: '.daily-inspection-wrapper',
      fallbackTarget: '.sim-nav-pills',
      badge: '步驟 5 / 6',
      title: '北區 / 南區每日品管巡檢月曆',
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
      title: '2026年度垂直總表 ＆ 母體總數試算表',
      body: '在第四個分頁中，除了可檢視如同 Excel <b>「一月～十一月垂直展開總表」</b>外，下方更完整呈現<b>「 全台 114,094 台 2.0/2.0E 母體車數與 ~1.93% 抽驗配額公式」</b>及跨部門 36 人協同名單！',
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

    const cardRect = card.getBoundingClientRect();
    const cardWidth = cardRect.width || Math.min(400, window.innerWidth - 32);
    const cardHeight = cardRect.height || 240;
    const gap = 16;

    let top = 0;
    let left = Math.max(16, Math.min(bLeft + (bWidth / 2) - (cardWidth / 2), window.innerWidth - cardWidth - 16));

    const spaceAbove = bTop - gap;
    const spaceBelow = window.innerHeight - (bTop + bHeight) - gap;

    if (s.position === 'top' && spaceAbove >= cardHeight) {
      top = bTop - cardHeight - gap;
    } else if (spaceBelow >= cardHeight) {
      top = bTop + bHeight + gap;
    } else if (spaceAbove >= cardHeight) {
      top = bTop - cardHeight - gap;
    } else {
      const spaceRight = window.innerWidth - (bLeft + bWidth) - gap;
      const spaceLeft = bLeft - gap;
      if (spaceRight >= cardWidth + 16) {
        left = bLeft + bWidth + gap;
        top = Math.max(16, Math.min(bTop, window.innerHeight - cardHeight - 16));
      } else if (spaceLeft >= cardWidth + 16) {
        left = bLeft - cardWidth - gap;
        top = Math.max(16, Math.min(bTop, window.innerHeight - cardHeight - 16));
      } else {
        top = spaceBelow >= spaceAbove
          ? Math.min(bTop + bHeight + gap, window.innerHeight - cardHeight - 12)
          : Math.max(12, bTop - cardHeight - gap);
      }
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
            ? `<button type="button" class="btn small primary" data-tour-next>下一步 </button>`
            : `<button type="button" class="btn small ok-btn" data-tour-finish>完成模擬體驗導覽 </button>`}
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

/** 每日回報專屬・6 步深度實景聚焦導覽 (Interactive Daily Report Module Spotlight Tour) */
export function startInteractiveDailyReportSpotlightTour() {
  if (location.hash !== '#/dailyReport') {
    location.hash = '#/dailyReport';
  }

  const me = state.me;
  const myId = me?.uid || '';
  const myName = me?.displayName || '您';
  const myTitle = me?.title || '專屬職務';
  const isMeField = isFieldStaff(me);
  const isMeSup = isSupervisor(me);
  const myCardSelector = myId ? `#dr-card-${CSS.escape(myId)}` : '.dr-member-card.is-me';

  // 若先前在步驟 4 自動打開了行內編輯器，切換到其他步驟或結束導覽時自動收合
  function closeInlineEditorIfOpen() {
    document.querySelector('.dr-inline-editor [data-cancel-edit]')?.click();
  }

  const step4Body = isMeSup
    ? `您目前以<b>代理副理（${myName}）</b>身份登入！擁有全組 9 位內外勤同仁回報內容之完整審閱權限，您可以在任一同仁已完成的卡片下方點選<b>「 點選已閱」</b>或留下<b>「 主管回饋」</b>。`
    : (isMeField
      ? `已自動為 <b>${myName}（外勤品管）</b> 展開專屬制式三問填寫區！包含：<br>① <b>地區</b>（支援<b>「① 縣市 ➔ ② 行政區」連動下拉選單</b>，選完自動收納為 <code>新北市（板橋區、中和區）</code>）<br>② <b>稽查場站數</b><br>③ <b>2.0 與 2.0E 的數量</b>（自動加總合計台數）<br>填完點擊<b>「 儲存並複製 LINE」</b>即可一鍵完成！`
      : `已自動為 <b>${myName}（${myTitle}）</b> 點開填寫面板！上方支援<b>「 內勤工作進度 / 外勤支援回報」雙分頁切換</b>、<b>「 一鍵帶入前次項目」</b>與<b>「 職務常用詞彙快選膠囊」</b>；填完點擊<b>「 儲存並複製 LINE」</b>即可一氣呵成！`);

  const tourSteps = [
    {
      target: '.dr-hero-actions',
      fallbackTarget: '.dr-hero-card',
      badge: '步驟 1 / 6',
      title: '立即填寫回報 ＆ 一鍵複製個人 LINE 格式',
      body: '全組 9 位同仁（3 位外勤品管＋6 位內勤）下班前點擊<b>「 填寫今日回報」</b>即可喚起置中快填視窗！儲存後系統會依您的外勤／內勤身份<b>自動排版並複製個人專屬 LINE 回報格式</b>，直接去 LINE 貼上即可回報！',
      position: 'bottom',
      beforeStep: () => {
        closeInlineEditorIfOpen();
        document.querySelector('.dr-tab-btn[data-view-mode="daily"]')?.click();
      }
    },
    {
      target: '.dr-toolbar',
      fallbackTarget: '.dr-hero-card',
      badge: '步驟 2 / 6',
      title: '日期補登切換 ＆ 颱風天全員免回報',
      body: '上方支援<b>「‹ 前一天 / 後一天 ›」</b>隨時回頭查閱紀錄或補登進度；若遇颱風停班停課，只需點一下右側<b>「 颱風免回報」</b>，全體 9 位同仁當日即自動轉為颱風假免回報，並自動暫停 17:30 下班提醒！',
      position: 'bottom',
      beforeStep: () => {
        closeInlineEditorIfOpen();
        document.querySelector('.dr-tab-btn[data-view-mode="daily"]')?.click();
      }
    },
    {
      target: '.dr-hero-top .compact-kpi-strip',
      fallbackTarget: '.dr-hero-card',
      badge: '步驟 3 / 6',
      title: '全組 9 位同仁回報進度總覽（休假自動連動）',
      body: '頂部膠囊即時統計 <b>3 位外勤品管＋6 位內勤同仁</b>的「 已回報」、「 待回報」與「 免回報」人數！若同仁當天在行事曆有登記<b>「公休/請假」</b>或遇國定例假日，系統會自動標示為免回報，絕不誤催。',
      position: 'bottom',
      beforeStep: () => {
        closeInlineEditorIfOpen();
        document.querySelector('.dr-tab-btn[data-view-mode="daily"]')?.click();
      }
    },
    {
      target: myCardSelector,
      fallbackTarget: '.dr-member-card.is-me, #dr-field-section .dr-member-card, #dr-office-section .dr-member-card',
      badge: '步驟 4 / 6',
      title: isMeSup
        ? ` ${myName} 代理副理專屬審閱權限`
        : ` ${myName} 的專屬回報卡（已為您展開實景填寫區）`,
      body: step4Body,
      position: 'top',
      beforeStep: () => {
        document.querySelector('.dr-tab-btn[data-view-mode="daily"]')?.click();
        // 自動點開「目前登入使用者自己」的填寫回報按鈕（嚴格僅點開本人的卡片）
        const myEditBtn = (myId && document.querySelector(`[data-start-edit="${CSS.escape(myId)}"]`))
          || document.querySelector('.dr-member-card.is-me [data-start-edit]');
        if (myEditBtn) {
          myEditBtn.click();
        }
      }
    },
    {
      target: '#dr-field-section',
      fallbackTarget: '#dr-office-section',
      badge: '步驟 5 / 6',
      title: '內外勤分流查閱規則 ＆ 嚴格防代填',
      body: '每個人僅能填寫自己的回報（防代填）！在查閱權限上：<br>• <b>內勤 6 位同仁進度</b>：比照 LINE 群組做法，<b>全體組員皆可公開查看</b>。<br>• <b>外勤 3 位品管回報</b>：因採另外回報機制，內容<b>僅代理副理（徐嘉鴻）、外勤代理人（包于巧）與填寫本人可見</b>，其他組員畫面自動以 遮罩保護！',
      position: 'top',
      beforeStep: () => {
        closeInlineEditorIfOpen();
        document.querySelector('.dr-tab-btn[data-view-mode="daily"]')?.click();
      }
    },
    {
      target: '.dr-history-section',
      fallbackTarget: '.dr-view-tabs',
      badge: '步驟 6 / 6',
      title: '歷史回報紀錄檢索（跨日關鍵字秒速查詢）',
      body: '切換至<b>「 歷史檢索」</b>分頁，可依組員篩選或輸入關鍵字（如：板橋區、採購、倉管、勞安）秒速查詢過往回報紀錄（內勤紀錄全員皆可檢索，外勤紀錄則依權限僅開放徐嘉鴻、包于巧與本人檢索）！',
      position: 'top',
      beforeStep: () => {
        closeInlineEditorIfOpen();
        document.querySelector('.dr-tab-btn[data-view-mode="history"]')?.click();
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
      <mask id="dr-tour-mask">
        <rect width="100%" height="100%" fill="white" />
        <rect id="dr-mask-target-rect" rx="10" fill="black" />
      </mask>
    </defs>
    <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.78)" mask="url(#dr-tour-mask)" />
  `;

  const box = document.createElement('div');
  box.className = 'tour-spotlight-box';
  box.style.zIndex = '1000000';
  box.style.boxShadow = '0 0 0 3px #0d9488, 0 0 25px rgba(13, 148, 136, 0.85)';

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
    closeInlineEditorIfOpen();
    document.querySelector('.dr-tab-btn[data-view-mode="daily"]')?.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updatePosition() {
    const s = tourSteps[stepIdx];
    const el = document.querySelector(s.target) || (s.fallbackTarget ? document.querySelector(s.fallbackTarget) : null);
    const maskTarget = overlay.querySelector('#dr-mask-target-rect');

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

    const cardRect = card.getBoundingClientRect();
    const cardWidth = cardRect.width || Math.min(400, window.innerWidth - 32);
    const cardHeight = cardRect.height || 240;
    const gap = 16;

    let top = 0;
    let left = Math.max(16, Math.min(bLeft + (bWidth / 2) - (cardWidth / 2), window.innerWidth - cardWidth - 16));

    const spaceAbove = bTop - gap;
    const spaceBelow = window.innerHeight - (bTop + bHeight) - gap;

    if (s.position === 'top' && spaceAbove >= cardHeight) {
      top = bTop - cardHeight - gap;
    } else if (spaceBelow >= cardHeight) {
      top = bTop + bHeight + gap;
    } else if (spaceAbove >= cardHeight) {
      top = bTop - cardHeight - gap;
    } else {
      // 若上下空間都不夠放整張提示卡（或目標高度較高），優先放在右側或左側空白處，絕不遮擋高亮目標！
      const spaceRight = window.innerWidth - (bLeft + bWidth) - gap;
      const spaceLeft = bLeft - gap;
      if (spaceRight >= cardWidth + 16) {
        left = bLeft + bWidth + gap;
        top = Math.max(16, Math.min(bTop, window.innerHeight - cardHeight - 16));
      } else if (spaceLeft >= cardWidth + 16) {
        left = bLeft - cardWidth - gap;
        top = Math.max(16, Math.min(bTop, window.innerHeight - cardHeight - 16));
      } else {
        top = spaceBelow >= spaceAbove
          ? Math.min(bTop + bHeight + gap, window.innerHeight - cardHeight - 12)
          : Math.max(12, bTop - cardHeight - gap);
      }
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
            ? `<button type="button" class="btn small primary" data-tour-next>下一步 </button>`
            : `<button type="button" class="btn small ok-btn" data-tour-finish>完成每日回報導覽 </button>`}
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
