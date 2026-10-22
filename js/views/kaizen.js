// 💡 改善提案作業管理辦法（2023.05 修訂 · 五版）圖文懶人包小卡、線上提案登錄表 ＆ 2026 修訂建議對照
import { state, myUid, isAdmin, userName, saveToolsDoc } from '../data.js';
import { esc, ymd, toast, openModal, closeModal } from '../utils.js';

const KAIZEN_CARDS = [
  {
    id: 'kz_target',
    badge: '01 · 提案目標與時限',
    title: '🎯 誰要提？一年幾件？何時交件？',
    img: 'assets/kaizen/card1_target.jpg',
    highlight: '每半年 1 件 · 全年 2 件',
    points: [
      '<b>必達對象</b>：<b>U 職等同仁</b>、<b>Y 職等領班</b>（每半年 1 件、全年 2 件；<b>8 等案件不計入</b>）。',
      '<b>鼓勵參與</b>：其餘 Y 職等同仁無件數限制，但提案照領獎金！處級及經副理級以上主管負責輔導同仁達標。',
      '<b>收件與公佈</b>：每月 <b>20 日</b>截止收件，改善事務局於<b>次月 5 日前</b>彙總公佈成績。',
      '<b>立案時效</b>：先改善、後提案！須於改善實施起始日 <b>1 年內</b>提交登錄表，逾期不予立案。',
    ],
  },
  {
    id: 'kz_flow',
    badge: '02 · 四階段闖關流程',
    title: '🔄 提案怎麼審？核決權限與公開表揚',
    img: 'assets/kaizen/card2_flow.jpg',
    highlight: '3 等(含)以上經營月會公開頒獎',
    points: [
      '<b>Step 1 填表送審</b>：個人或小團體（限 <b>2 人以下</b>）完成改善後填寫「改善提案登錄表」送單位主管（跨單位可先會簽擴散）。',
      '<b>Step 2 單位初審（5~8 等）</b>：5~8 等由單位直接核定（7~8 等 Y 職由主任核定、U 職由處長/Team 主管核定；5~6 等由處長/Team 主管核定）。',
      '<b>Step 3 高等案件審查會（4 等↑）</b>：單位主管採分達 <b>4 等(含)以上</b>，由改善事務局召開審查會（至少 <b>3 位處長/經理級</b>審查評分）。',
      '<b>Step 4 總經理核決（3 等↑）</b>：審查會採分達 <b>3 等(含)以上</b>送交<b>總經理</b>核決，並於每月<b>經營月會公開頒獎表揚</b>！',
    ],
  },
  {
    id: 'kz_rewards',
    badge: '03 · 單件獎金與點數',
    title: '💰 單件提案採分、等級、獎金與考績點數對照',
    img: 'assets/kaizen/card3_rewards.jpg',
    highlight: '單件最高 $20,000 元 ＋ 30 點',
    points: [
      '<b>1 等（90 分↑）</b>：獎金 <b>$20,000 元</b> · 考績點數 <b>30 點</b>（總經理核准、月會頒獎）。',
      '<b>2 等（76~90 分）</b>：獎金 <b>$10,000 元</b> · 考績點數 <b>15 點</b>（總經理核准、月會頒獎）。',
      '<b>3 等（61~75 分）</b>：獎金 <b>$5,000 元</b> · 考績點數 <b>10 點</b>（總經理核准、月會頒獎）。',
      '<b>4 等（51~60 分）</b>：獎金 <b>$1,000 元</b> · <b>5 點</b> ｜ <b>5~7 等（31~50 分）</b>：獎金 <b>$100 ~ $300 元</b> · <b>1~3 點</b>（隨當月薪資發放，點數列入 6 月、12 月考績）。',
    ],
  },
  {
    id: 'kz_most',
    badge: '04 · 年度採納最多獎',
    title: '🏅 個人年度表彰：「年採納最多獎」前五名',
    img: 'assets/kaizen/card4_most_cases.jpg',
    highlight: '全年 6 件(含)以上即可角逐',
    points: [
      '<b>參賽門檻</b>：個人全年度 <b>7 等～1 等</b>之提案件數達 <b>6 件(含)以上</b>（且所屬部門上、下半年平均參與率達 80%↑）。',
      '<b>評比排序</b>：取年度總點數較高者前五名；若總點數相同，以擁有<b>較高等級案件</b>者優先。',
      '<b>前五名獎金</b>：🥇第一名 <b>$5,000 元</b>、🥈第二名 <b>$4,000 元</b>、🥉第三名 <b>$3,000 元</b>、第四名 <b>$2,000 元</b>、第五名 <b>$1,000 元</b>。',
    ],
  },
  {
    id: 'kz_points',
    badge: '05 · 年度點數積分獎',
    title: '💎 個人年度表彰：「年度點數獎」最高 $20,000',
    img: 'assets/kaizen/card5_points_award.jpg',
    highlight: '鑽石獎 $20,000 · 銅獎與優秀獎人數不限',
    points: [
      '<b>💎 第一名 鑽石獎（$20,000 元）</b>：總點數 <b>50 點↑</b>，且須有 <b>3 等(含)以上案件達 20 點↑</b>。',
      '<b>🥇 第二名 金獎（$15,000 元）</b>：總點數 <b>40 點↑</b>，且須有 <b>3 等(含)以上案件達 20 點↑</b>。',
      '<b>🥈 第三名 銀獎（$10,000 元）</b>：總點數 <b>35 點↑</b>，且須有 <b>3 等(含)以上案件達 15 點↑</b>。',
      '<b>🥉 銅獎（$6,000 元）＆ ✨ 優秀獎（$2,000 元）</b>：銅獎 <b>35 點↑</b>、優秀獎 <b>25 點↑</b>（皆須有 <b>4 等(含)以上達 15 點↑</b>，<b>得獎人數不限制！</b>）。',
    ],
  },
  {
    id: 'kz_dept',
    badge: '06 · 部門團體獎與活動費',
    title: '🤝 單位推行績優活動費 ＆ 部門年度總錦標',
    img: 'assets/kaizen/card6_dept_award.jpg',
    highlight: '參與率 ≥ 80% 每半年領人數 × $50',
    points: [
      '<b>🎉 單位推行績優活動費</b>：上、下半年平均<b>參與率 ≥ 80%</b>，每半年發放「<b>部門總正職人數 × $50 元</b>」活動費（憑發票報銷）。',
      '<b>📊 參與率怎麼算？</b>一般單位＝提案人數 ÷ 部門總人數（不含部門主管）；營運處＝(部門提案人數＋Y職提案人數) ÷ (部門總人數＋Y職提案人數)。',
      '<b>🏆 單位年度表彰</b>：分為「<b>營運單位</b>（營運處+工程處）」與「<b>幕僚單位</b>（3人以上）」兩組，依部門年度總點數各取<b>第一名 $3,000 元、第二名 $2,000 元</b>！',
    ],
  },
];

const KAIZEN_TIERS = [
  { scoreMin: 90, scoreMax: 100, range: '90 分 ↑', grade: '1 等', prize: 20000, prizeText: 'NT$ 20,000', points: 30, approver: '總經理（經營月會公開頒獎）', badgeBg: '#FEF3C7', badgeColor: '#B45309' },
  { scoreMin: 76, scoreMax: 90, range: '76 ~ 90 分', grade: '2 等', prize: 10000, prizeText: 'NT$ 10,000', points: 15, approver: '總經理（經營月會公開頒獎）', badgeBg: '#E0F2FE', badgeColor: '#0369A1' },
  { scoreMin: 61, scoreMax: 75, range: '61 ~ 75 分', grade: '3 等', prize: 5000, prizeText: 'NT$ 5,000', points: 10, approver: '總經理（經營月會公開頒獎）', badgeBg: '#FFEDD5', badgeColor: '#C2410C' },
  { scoreMin: 51, scoreMax: 60, range: '51 ~ 60 分', grade: '4 等', prize: 1000, prizeText: 'NT$ 1,000', points: 5, approver: '高等案件審查會（處長/Team 主管）', badgeBg: '#DCFCE7', badgeColor: '#15803D' },
  { scoreMin: 45, scoreMax: 50, range: '45 ~ 50 分', grade: '5 等', prize: 300, prizeText: 'NT$ 300', points: 3, approver: 'Y職：處長 ／ U職：處長/Team 主管', badgeBg: '#F1F5F9', badgeColor: '#334155' },
  { scoreMin: 37, scoreMax: 44, range: '37 ~ 44 分', grade: '6 等', prize: 200, prizeText: 'NT$ 200', points: 2, approver: 'Y職：處長 ／ U職：處長/Team 主管', badgeBg: '#F1F5F9', badgeColor: '#334155' },
  { scoreMin: 31, scoreMax: 36, range: '31 ~ 36 分', grade: '7 等', prize: 100, prizeText: 'NT$ 100', points: 1, approver: 'Y職：主任/授權者 ／ U職：處長/Team 主管', badgeBg: '#F1F5F9', badgeColor: '#475569' },
  { scoreMin: 0, scoreMax: 30, range: '0 ~ 30 分', grade: '8 等', prize: 0, prizeText: '再接再厲 ($0)', points: 0, approver: 'Y職：主任/授權者 ／ U職：處長/Team 主管（不列入目標件數）', badgeBg: '#F8FAFC', badgeColor: '#94A3B8' },
];

// 2026 修訂建議對照方案（讓同仁與長官自由觀看、按讚共鳴與留言發酵）
const REFORM_TOPICS = [
  {
    id: 'ref_1',
    icon: '🧋',
    title: '痛點 1：部門推行活動費「每人 $50 元」不敷 2026 物價與報銷成本',
    currentRule: '上、下半年參與率 ≥ 80%，每半年發放「部門總正職人數 × $50 元」，須憑發票報銷。',
    problemDesc: '2026 年手搖飲一杯 $65~$80、雞排 $100。10 人部門辛苦催件半年達標只領 $500 元（一人 50 元連一杯珍奶都不夠），還要行政人員特地開發票貼憑證報銷，行政作業成本比獎金還高。',
    proposedRule: '調升為「人數 × $150 ～ $200 元」；若部門達成 100% 全員提案，加碼為「人數 × $300 元」。',
    benefitDesc: '每人 $150~$300 才夠部門買下午茶（披薩+飲料），真正發揮「部門主管帶頭催件、同儕互相激勵」的團隊凝聚效果！',
  },
  {
    id: 'ref_2',
    icon: '💸',
    title: '痛點 2：日常微改善（5~7 等）單件獎金 $100~$300，投入產出不成正比',
    currentRule: '7 等 (31~36分) $100 元、6 等 (37~44分) $200 元、5 等 (45~50分) $300 元（併入薪資所得）。',
    problemDesc: '辦法要求「先改善、後提案」，同仁實作改善後還要拍照、算效益、填寫登錄表送簽。結果日常改善多數落在 6~7 等，只領 $100~$200（連一個便當加飲料都不夠），容易淪為「為交差而交差」。',
    proposedRule: '提高基層保底獎金：7 等調為 $300、6 等調為 $500、5 等調為 $800、4 等調為 $2,000（6點）。',
    benefitDesc: '只要通過立案（7等）至少有 $300 元（一頓簡餐+飲料），消除「寫半天只領 100 元」的無力感，並拉平 5 等 ($800) 到 4 等 ($2,000) 的階梯斷層。',
  },
  {
    id: 'ref_3',
    icon: '🚧',
    title: '痛點 3：4 等 ($1,000) 就要召開「3 位處長/經理高等審查會」，造成主管壓分效應',
    currentRule: '單位最高主管採分達 4 等 (51分 / $1,000) 以上，即須由改善事務局召開高等案件審查會（至少 3 位處長/經理審查評分）。',
    problemDesc: '為了 $1,000 元獎金就要召集 3 位處長級主管開會，會議時間成本遠超 $1,000 元；許多單位主管為了怕麻煩或怕被跨處挑戰，會下意識把好案子壓在 50 分（5 等 $300），反而扼殺優秀提案！',
    proposedRule: '放寬 4 等由「處長 / Team 主管」直接核決；改為「3 等 (61分 / $5,000↑)」以上才召開高等案件審查會。',
    benefitDesc: '賦予處長與 Team 主管實質核決 $1,000~$2,000 的權限，大幅減少跨處室開會負擔，讓真正優秀的中階改善案不再被壓分！',
  },
  {
    id: 'ref_4',
    icon: '💎',
    title: '痛點 4：個人年度「點數積分獎」門檻過高（25~50 點），看得到吃不到',
    currentRule: '鑽石獎 50 點、金獎 40 點、銀獎 35 點、銅獎 35 點、優秀獎 25 點（且須有 3~4 等以上達 15~20 點）。',
    problemDesc: '一般同仁一年目標 2 件，若拿 5~6 等一年僅 4~6 點。要摸到最低門檻「優秀獎 25 點（含 4 等以上 15 點）」，一年至少要生出 3 件 4 等大案＋5 件一般案，導致年度大獎常年從缺或難以普及。',
    proposedRule: '合理下修年度點數門檻並區隔銀/銅獎：鑽石獎 40 點、金獎 32 點、銀獎 25 點、銅獎 18 點、優秀獎 12 點。',
    benefitDesc: '讓一年認真提出 3~4 件優質改善案的同仁真的能摸到「優秀獎」與「銅獎」，把年度大獎從「少數神人專屬」變成「努力就有機會達成」！',
  },
  {
    id: 'ref_5',
    icon: '⚖️',
    title: '痛點 5：單位年度表彰看「部門總點數」且冠軍僅 $3,000，精實小部門天生吃虧',
    currentRule: '分為營運組與幕僚組，以「部門年度總點數」計算，第一名 $3,000 元、第二名 $2,000 元。',
    problemDesc: '比「總點數」而非「人均點數」，30 人大部門一人湊 2 點就 60 點，5~10 人的精實團隊就算人人拿高分也贏不了；且全公司年度第一名部門獎金僅 $3,000（比單件 3 等獎 $5,000 還少）。',
    proposedRule: '改依「部門年度人均點數」評比；年度第一名調升為 $10,000 元、第二名 $6,000 元。',
    benefitDesc: '大小部門站在同一起跑線公平競爭，且萬元級年度團體獎金才配得上全公司冠軍部門的榮譽感！',
  },
  {
    id: 'ref_6',
    icon: '📸',
    title: '痛點 6：小團體限 2 人以下 ＆ 缺乏「Before / After 隨手拍」微改善快速通道',
    currentRule: '小團體改善硬性限定「2 人以下」；所有案件不論大小皆須填寫傳統完整登錄表。',
    problemDesc: '場站調度、維修或跨班別協作常需 3~4 人共同完成，限 2 人會讓協力同仁無法掛名；且外勤與年輕同仁最怕長篇文書表單。',
    proposedRule: '小團體放寬為「2 ～ 4 人」；並針對 6~7 等日常微改善增設「Before / After 照片＋50字說明」線上快速提案通道！',
    benefitDesc: '降低基層與外勤同仁的文書門檻，隨手拍改善前後對比就能提案，參與率自然水到渠成！',
  },
];

// 預設範例提案（當雲端尚無提案時，提供 1 筆示範種子讓大家秒懂怎麼填）
const SEED_PROPOSALS = [
  {
    id: 'kzp_seed_1',
    title: '【示範提案】外勤巡檢與高鐵/國道/氣象工具整合至團隊協同平台，省去跨網站切換時間',
    category: '流程簡化 / 數位工具',
    proposerType: '個人改善',
    proposerName: '經營 Team 示範',
    coProposer: '',
    dept: '經營 Team',
    startDate: '2026-10-01',
    beforeDesc: '過去外勤巡檢與差旅前，同仁需分別開啟 YouBike 官網查電輔車、氣象署查雷達、Windy 看颱風、高鐵/台鐵查時刻票價、1968 看路況，來回切換 5~6 個網頁耗時又容易漏看。',
    afterDesc: '將所有常用查詢系統與「改善提案辦法懶人包＋線上登錄表」直接內建在經營 Team 協同平台，一頁直查免跳轉，並支援點擊放大與即時試算。',
    benefitType: '節省工時 / 提升品質',
    benefitDetail: '預估每位同仁每次外勤出差前可節省 5~8 分鐘查詢時間，全組每年累計省下超過 40 小時行政查詢工時，資訊透明度大幅提升。',
    canSpread: '可擴散至營運處各區調度與維運團隊參考',
    selfScore: 68,
    status: '已立案示範',
    likes: [],
    createdAtIso: '2026-10-22T10:00:00.000Z',
  },
];

function getKaizenTierByScore(score) {
  const s = Number(score) || 0;
  if (s > 90) return KAIZEN_TIERS[0];
  if (s >= 76) return KAIZEN_TIERS[1];
  if (s >= 61) return KAIZEN_TIERS[2];
  if (s >= 51) return KAIZEN_TIERS[3];
  if (s >= 45) return KAIZEN_TIERS[4];
  if (s >= 37) return KAIZEN_TIERS[5];
  if (s >= 31) return KAIZEN_TIERS[6];
  return KAIZEN_TIERS[7];
}

export function mountKaizen(el) {
  // 三大子頁籤：'guide' (現行辦法圖卡與試算) | 'form' (線上填寫提案登錄表) | 'reform' (2026 制度優化建議對照與共鳴)
  let activeTab = 'guide';
  let kzScore = 65;
  let kzDeptStaff = 10;
  let kzDeptProposers = 8;
  let calcVer = '2023'; // '2023' | '2026'

  function getProposalsData() {
    const doc = state.toolsData.get('kaizenProposals');
    if (!doc || !Array.isArray(doc.list)) return SEED_PROPOSALS;
    return doc.list.length ? doc.list : SEED_PROPOSALS;
  }

  function getReformFeedbackData() {
    const doc = state.toolsData.get('kaizenReform');
    return {
      votes: doc?.votes || {},     // { [topicId]: [uid1, uid2, ...] }
      comments: Array.isArray(doc?.comments) ? doc.comments : [], // [{ id, topicId, text, author, isAnon, createdAtIso, likes: [] }]
    };
  }

  function render() {
    const proposals = getProposalsData();
    const reformData = getReformFeedbackData();
    const totalReformVotes = Object.values(reformData.votes).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);

    const curKzTier = getKaizenTierByScore(kzScore);
    const kzRatePct = kzDeptStaff > 0 ? Math.round((kzDeptProposers / kzDeptStaff) * 100) : 0;
    const kzDeptEligible = kzRatePct >= 80;
    const perPersonFee = calcVer === '2026' ? (kzRatePct >= 100 ? 300 : 200) : 50;
    const kzDeptBonus = kzDeptEligible ? kzDeptStaff * perPersonFee : 0;

    // 2026 建議版單件獎金對照
    const prize2026Map = { '1 等': 'NT$ 25,000', '2 等': 'NT$ 12,000', '3 等': 'NT$ 6,000', '4 等': 'NT$ 2,000', '5 等': 'NT$ 800', '6 等': 'NT$ 500', '7 等': 'NT$ 300', '8 等': '再接再厲 ($0)' };
    const displayPrizeText = calcVer === '2026' ? (prize2026Map[curKzTier.grade] || curKzTier.prizeText) : curKzTier.prizeText;

    el.innerHTML = `
      <div class="toolbar" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <h2 class="view-title" style="margin:0">💡 改善提案專區（圖文懶人包 · 線上登錄 · 2026 優化對照）</h2>
          <span class="tools-live-badge" style="background:#FEF3C7;color:#B45309;border-color:#FDE68A">📘 權責單位：經營 Team · GUT02202</span>
          <span class="info-pill-tip" data-tip="除了用 6 張直白圖卡秒懂現行辦法，同仁也可在此「線上試寫/預審改善提案登錄表」並匯出列印，或到「🌱 2026 修訂建議對照」按讚共鳴、留下想法讓種子自然發酵！">ⓘ 設計理念</span>
        </div>
        <div class="toolbar-end" style="display:flex;gap:6px;flex-wrap:wrap">
          <button type="button" class="btn primary sm" data-open-new-proposal>✍️ 線上填寫改善提案登錄表</button>
        </div>
      </div>

      <!-- 頂部三大模式切換導覽列 -->
      <div class="tools-sys-nav" style="margin-bottom:14px">
        <button type="button" class="tools-sys-tab ${activeTab === 'guide' ? 'active' : ''}" data-kz-tab="guide">
          📘 現行辦法圖文懶人包 (6張小卡＆試算)
        </button>
        <button type="button" class="tools-sys-tab ${activeTab === 'form' ? 'active' : ''}" data-kz-tab="form">
          📝 線上提案登錄表＆點子庫 <span class="kz-nav-count">${proposals.length}</span>
        </button>
        <button type="button" class="tools-sys-tab ${activeTab === 'reform' ? 'active' : ''}" data-kz-tab="reform">
          🌱 2026 修訂建議對照＆共鳴投票 <span class="kz-nav-count warm">${totalReformVotes + reformData.comments.length}</span>
        </button>
      </div>

      ${activeTab === 'guide' ? renderGuideSection({ curKzTier, kzRatePct, kzDeptEligible, kzDeptBonus, displayPrizeText, perPersonFee }) : ''}
      ${activeTab === 'form' ? renderFormSection(proposals) : ''}
      ${activeTab === 'reform' ? renderReformSection(reformData) : ''}
    `;

    bindEvents(proposals, reformData);
  }

  function renderGuideSection({ curKzTier, kzRatePct, kzDeptEligible, kzDeptBonus, displayPrizeText, perPersonFee }) {
    return `
      <div class="card pad tools-builtin-card" style="margin-bottom:16px">
        <div class="tools-card-header">
          <div>
            <h3 style="margin:0;font-size:16px">📘 《改善提案作業管理辦法》6 張直白圖文懶人包</h3>
            <div class="muted tiny" style="margin-top:3px">點擊任一張小卡可全螢幕放大檢視與左右切換；想自己動手寫提案或看 2026 通膨優化對照，請點選上方分頁切換！</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="yb-sum-pill yb2">🎯 必達目標：<b>每半年 1 件 · 全年 2 件</b></span>
            <span class="yb-sum-pill eyb">📅 每月截止：<b>20 日收件 · 次月 5 日公佈</b></span>
          </div>
        </div>

        <!-- 6 張繪圖視覺化資訊小卡 Grid -->
        <div class="kaizen-cards-grid">
          ${KAIZEN_CARDS.map((kc, idx) => `
            <div class="kaizen-info-card">
              <div class="kaizen-img-wrap" data-kz-zoom="${idx}" title="點擊放大檢視《${esc(kc.title)}》高畫質圖卡">
                <img src="${esc(kc.img)}" alt="${esc(kc.title)}" loading="lazy">
                <span class="kaizen-badge-pill">${esc(kc.badge)}</span>
                <span class="kaizen-zoom-pill">🔍 點擊放大圖卡</span>
              </div>
              <div class="kaizen-card-body">
                <div class="kaizen-card-title-row">
                  <h4>${esc(kc.title)}</h4>
                  <span class="kaizen-hl-tag">${esc(kc.highlight)}</span>
                </div>
                <ul class="kaizen-bullet-list">
                  ${kc.points.map(pt => `<li>${pt}</li>`).join('')}
                </ul>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- 改善提案採分、等級、獎金、點數與核決權限完整一覽表 -->
        <div class="kaizen-table-box" style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            <strong style="font-size:13.5px;color:#0F172A">📊 提案採分、等級、獎金、點數與核准權限速查表（列入每年 6 月、12 月考績參考）</strong>
            <span class="muted tiny">※ 3 等(含)以上案件不先撥入薪資，於每月經營月會由總經理公開頒獎表揚！</span>
          </div>
          <div class="table-wrap">
            <table class="kaizen-tier-table">
              <thead>
                <tr>
                  <th>提案採分</th>
                  <th>0 ~ 30 分</th>
                  <th>31 ~ 36 分</th>
                  <th>37 ~ 44 分</th>
                  <th>45 ~ 50 分</th>
                  <th>51 ~ 60 分</th>
                  <th>61 ~ 75 分</th>
                  <th>76 ~ 90 分</th>
                  <th>90 分 ↑</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>提案等級</th>
                  <td><span class="kz-grade-chip g8">8 等</span></td>
                  <td><span class="kz-grade-chip g7">7 等</span></td>
                  <td><span class="kz-grade-chip g6">6 等</span></td>
                  <td><span class="kz-grade-chip g5">5 等</span></td>
                  <td><span class="kz-grade-chip g4">4 等</span></td>
                  <td><span class="kz-grade-chip g3">3 等</span></td>
                  <td><span class="kz-grade-chip g2">2 等</span></td>
                  <td><span class="kz-grade-chip g1">1 等</span></td>
                </tr>
                <tr>
                  <th>提案獎金</th>
                  <td class="muted">再接再厲</td>
                  <td><b>$100</b></td>
                  <td><b>$200</b></td>
                  <td><b>$300</b></td>
                  <td style="color:#15803D;font-weight:800">$1,000</td>
                  <td style="color:#C2410C;font-weight:800">$5,000</td>
                  <td style="color:#0369A1;font-weight:800">$10,000</td>
                  <td style="color:#B45309;font-weight:900;font-size:14px">$20,000</td>
                </tr>
                <tr>
                  <th>提案點數</th>
                  <td class="muted">0 點</td>
                  <td>1 點</td>
                  <td>2 點</td>
                  <td>3 點</td>
                  <td><b>5 點</b></td>
                  <td><b>10 點</b></td>
                  <td><b>15 點</b></td>
                  <td><b style="color:#B45309">30 點</b></td>
                </tr>
                <tr>
                  <th>核准權限</th>
                  <td colspan="2" style="font-size:11.5px">Y職：主任/指定授權者<br>U職：處長/Team 主管</td>
                  <td colspan="3" style="font-size:11.5px">Y職：處長<br>U職：處長/Team 主管<br><span class="muted tiny">(4等↑召開高等案件審查會)</span></td>
                  <td colspan="3" style="font-size:12px;font-weight:800;color:#B45309;background:#FFFBEB">👑 總經理核決<br><span style="font-size:11px;font-weight:600;color:#92400E">（每月經營月會公開表揚頒獎）</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 改善提案單件採分獎金點數 ＆ 部門活動費互動試算器（支援切換 2023 現行 vs 2026 建議版感受差異） -->
        <div style="background:#FFFBEB;padding:12px 14px;border-radius:12px;border:1px solid #FDE68A">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            <div style="font-size:13.5px;font-weight:800;color:#92400E">🧮 改善提案獎金／點數 ＆ 部門推行活動費試算器</div>
            <div class="seg" style="background:#FEF3C7">
              <button type="button" class="${calcVer === '2023' ? 'active' : ''}" data-calc-ver="2023" style="font-size:11.5px;padding:4px 10px">📘 2023 現行標準</button>
              <button type="button" class="${calcVer === '2026' ? 'active' : ''}" data-calc-ver="2026" style="font-size:11.5px;padding:4px 10px">🌱 2026 通膨優化模擬</button>
            </div>
          </div>
          <div class="grid2" style="gap:12px">
            <div style="background:#ffffff;padding:10px 12px;border-radius:10px;border:1px solid #FDE68A">
              <label style="font-size:12px;color:#475569;font-weight:700;display:block">🏅 單件提案採分試算（輸入審查分數 0 ~ 100 分）
                <input type="number" data-kz-score value="${kzScore}" min="0" max="100" style="width:100%;margin-top:5px;padding:6px 10px;border-radius:8px;border:1px solid #CBD5E1;font-weight:800;font-size:14px">
              </label>
              <div style="margin-top:8px;font-size:13px;line-height:1.5" data-kz-score-res>
                對應等級：<span style="background:${curKzTier.badgeBg};color:${curKzTier.badgeColor};padding:2px 8px;border-radius:999px;font-weight:800">${curKzTier.grade}</span>
                · 獎金 <b style="color:#B45309;font-size:15px">${displayPrizeText}</b> · 考績 <b>${curKzTier.points} 點</b>
                <div class="muted tiny" style="margin-top:3px">核准權限：${esc(curKzTier.approver)}</div>
              </div>
            </div>
            <div style="background:#ffffff;padding:10px 12px;border-radius:10px;border:1px solid #FDE68A">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <label style="font-size:12px;color:#475569;font-weight:700">👥 部門正職總人數（不含主管）
                  <input type="number" data-kz-staff value="${kzDeptStaff}" min="1" style="width:100%;margin-top:5px;padding:6px 10px;border-radius:8px;border:1px solid #CBD5E1;font-weight:800;font-size:14px">
                </label>
                <label style="font-size:12px;color:#475569;font-weight:700">🙋 提案人數（達 80% 領活動費）
                  <input type="number" data-kz-proposers value="${kzDeptProposers}" min="0" style="width:100%;margin-top:5px;padding:6px 10px;border-radius:8px;border:1px solid #CBD5E1;font-weight:800;font-size:14px">
                </label>
              </div>
              <div style="margin-top:8px;font-size:13px;line-height:1.5" data-kz-dept-res>
                參與率：<b style="color:${kzDeptEligible ? '#059669' : '#DC2626'};font-size:15px">${kzRatePct}%</b>（${kzDeptEligible ? `✅ 達標！每半年領活動費 <b>NT$ ${kzDeptBonus.toLocaleString()} 元</b>（每人 $${perPersonFee} 元）` : `⚠️ 未達 80% 門檻（需至少 ${Math.ceil(kzDeptStaff * 0.8)} 人提案）`}）
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderFormSection(proposals) {
    return `
      <div class="card pad tools-builtin-card" style="margin-bottom:16px">
        <div class="tools-card-header">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <h3 style="margin:0;font-size:16px">📝 線上改善提案登錄表 ＆ 團隊改善點子庫</h3>
              <span class="tools-live-badge">⚡ 支援一鍵套用正式公文排版列印 / 匯出 PDF</span>
            </div>
            <div class="muted tiny" style="margin-top:3px">ไม่ต้อง再找舊 Word/Excel 檔！直接線上填寫「改善前問題 ➔ 改善後對策 ➔ 預估效益」，不僅可讓團隊互相觀摩給讚，還能一鍵產出標準「改善提案登錄表」列印送簽！</div>
          </div>
          <button type="button" class="btn primary sm" data-open-new-proposal>＋ 新增改善提案登錄表</button>
        </div>

        <div class="kz-proposal-list">
          ${proposals.map(p => {
            const tier = getKaizenTierByScore(p.selfScore || 60);
            const likes = Array.isArray(p.likes) ? p.likes : [];
            const liked = likes.includes(myUid());
            const canDel = p.uid && (p.uid === myUid() || isAdmin());
            return `
              <div class="kz-prop-card">
                <div class="kz-prop-head">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <span class="fw-badge" style="background:#FEF3C7;color:#92400E">${esc(p.proposerType || '個人改善')}</span>
                    <span class="fw-badge">${esc(p.category || '作業改善')}</span>
                    <span class="fw-status-pill" style="background:${tier.badgeBg};color:${tier.badgeColor}">自評預估：${tier.grade} (${tier.prizeText} / ${tier.points}點)</span>
                    <span class="muted tiny">📅 實施起始日：${esc(p.startDate || '-')} · 提案人：<b>${esc(p.proposerName || '組員')}</b>${p.coProposer ? `、${esc(p.coProposer)}` : ''}（${esc(p.dept || '經營 Team')}）</span>
                  </div>
                  <div style="display:flex;gap:6px;align-items:center">
                    <button type="button" class="btn sm ${liked ? 'primary' : 'ghost'}" data-like-prop="${esc(p.id)}" style="padding:3px 9px;font-size:12px">
                      👍 好點子 (${likes.length})
                    </button>
                    <button type="button" class="btn sm ghost" data-print-prop="${esc(p.id)}" style="padding:3px 9px;font-size:12px">
                      🖨️ 預覽登錄表／列印送簽
                    </button>
                    ${canDel ? `<button type="button" class="icon-btn" data-del-prop="${esc(p.id)}" title="刪除此提案" style="color:var(--danger);font-size:12px">✕</button>` : ''}
                  </div>
                </div>

                <h4 class="kz-prop-title">${esc(p.title)}</h4>

                <div class="kz-ba-grid">
                  <div class="kz-ba-box before">
                    <div class="kz-ba-lbl">🔍 改善前現況與痛點 (Before)</div>
                    <div class="kz-ba-txt">${esc(p.beforeDesc)}</div>
                  </div>
                  <div class="kz-ba-box after">
                    <div class="kz-ba-lbl">✨ 改善後具體作法 (After)</div>
                    <div class="kz-ba-txt">${esc(p.afterDesc)}</div>
                  </div>
                </div>

                <div class="kz-prop-foot">
                  <span>🎯 <b>效益類別：</b>${esc(p.benefitType || '提升效率')} — ${esc(p.benefitDetail || '無')}</span>
                  ${p.canSpread ? `<span class="kz-spread-tag">🔄 水平展開/會簽建議：${esc(p.canSpread)}</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderReformSection(reformData) {
    return `
      <!-- 頂部種子宣言橫幅 -->
      <div class="kz-seed-banner">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <span style="font-size:32px;line-height:1">🌱</span>
          <div style="flex:1">
            <h3 style="margin:0 0 4px;font-size:16px;color:#065F46">《改善提案作業管理辦法》2026 制度優化與通膨調整建議對照</h3>
            <p style="margin:0;font-size:13px;color:#047857;line-height:1.55">
              現行辦法（GUT02202）雖然行之有年，但部分獎金數字與審查門檻仍停留在十年前的物價水準。我們將<b>「2023 現行規定」與「2026 建議優化方案」</b>並排整理如下——<b>我們負責撒下改善的種子，歡迎各位同仁點擊「👍 我有同感」或留下具體想法，讓共識自然發酵，成為未來制度修訂最有力的養分！</b>
            </p>
          </div>
        </div>
      </div>

      <!-- 6 大修訂議題對照卡片 -->
      <div class="kz-reform-grid">
        ${REFORM_TOPICS.map(t => {
          const voters = Array.isArray(reformData.votes[t.id]) ? reformData.votes[t.id] : [];
          const hasVoted = voters.includes(myUid());
          return `
            <div class="kz-reform-card">
              <div class="kz-reform-head">
                <span style="font-size:22px">${t.icon}</span>
                <h4 style="margin:0;flex:1;font-size:14.5px;color:#0F172A">${esc(t.title)}</h4>
                <button type="button" class="btn sm ${hasVoted ? 'primary' : 'ghost'}" data-vote-reform="${t.id}" style="flex-shrink:0;font-weight:800">
                  ${hasVoted ? '🔥 已附議' : '👍 我有同感'} (${voters.length})
                </button>
              </div>

              <div class="kz-vs-boxes">
                <div class="kz-vs-col old">
                  <div class="kz-vs-badge old">📘 2023 現行規定與痛點</div>
                  <div style="font-size:12.5px;font-weight:700;color:#334155;margin-bottom:4px">${esc(t.currentRule)}</div>
                  <div style="font-size:12px;color:#64748B;line-height:1.5">⚠️ <b>為什麼不合理：</b>${esc(t.problemDesc)}</div>
                </div>
                <div class="kz-vs-col new">
                  <div class="kz-vs-badge new">🚀 2026 建議優化方案（符合通膨）</div>
                  <div style="font-size:12.5px;font-weight:800;color:#065F46;margin-bottom:4px">${esc(t.proposedRule)}</div>
                  <div style="font-size:12px;color:#047857;line-height:1.5">✨ <b>預期管理效益：</b>${esc(t.benefitDesc)}</div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- 底部：制度修訂意見種子牆（支援具名或 100% 匿名留言） -->
      <div class="card pad" style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <div>
            <h3 style="margin:0;font-size:15.5px">💬 制度優化共鳴與修訂建議牆（可選擇具名或匿名發聲）</h3>
            <div class="muted tiny">覺得哪一條最該改？或是有更好的獎勵點子？歡迎寫下來讓大家與長官看見！</div>
          </div>
        </div>

        <form id="kz-reform-comment-form" class="kz-comment-form">
          <select name="topicId" class="rail-st-select" style="font-size:12.5px">
            <option value="general">💡 綜合建議 / 整體制度想法</option>
            ${REFORM_TOPICS.map(t => `<option value="${t.id}">${t.icon} 針對：${esc(t.title.slice(0, 22))}…</option>`).join('')}
          </select>
          <input type="text" name="text" required placeholder="寫下您對改善提案制度的優化建議（例如：微改善拍照上傳就能領 $300 會更有動力…）" class="yb-search-input">
          <label class="yb-ebike-toggle" style="background:#F8FAFC;border-color:#CBD5E1;color:#334155">
            <input type="checkbox" name="isAnon" checked>
            <span>🎭 匿名發聲</span>
          </label>
          <button type="submit" class="btn primary sm">🌱 播下建議種子</button>
        </form>

        <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
          ${reformData.comments.length === 0 ? `
            <div class="bw-empty" style="padding:18px">🌱 目前尚無留言，歡迎成為第一位播下修訂建議種子的同仁！</div>
          ` : reformData.comments.map(c => {
            const topicObj = REFORM_TOPICS.find(t => t.id === c.topicId);
            const canDel = (c.uid && c.uid === myUid()) || isAdmin();
            return `
              <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px">
                <div>
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
                    <span class="fw-badge" style="background:#E0F2FE;color:#0369A1">${esc(topicObj ? topicObj.title.split('：')[0] : '💡 綜合建議')}</span>
                    <strong style="font-size:12.5px;color:#0F172A">${c.isAnon ? '🎭 匿名同仁' : esc(c.author || '組員')}</strong>
                    <span class="muted tiny">${esc((c.createdAtIso || '').slice(0, 10))}</span>
                  </div>
                  <div style="font-size:13px;color:#1E293B;line-height:1.5">${esc(c.text)}</div>
                </div>
                ${canDel ? `<button type="button" class="icon-btn" data-del-reform-comment="${esc(c.id)}" title="刪除留言" style="color:var(--danger);font-size:12px">✕</button>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function bindEvents(proposals, reformData) {
    // 子頁籤切換
    el.querySelectorAll('[data-kz-tab]').forEach(btn => {
      btn.onclick = () => {
        activeTab = btn.dataset.kzTab;
        render();
      };
    });

    // 試算器版本切換 (2023 vs 2026)
    el.querySelectorAll('[data-calc-ver]').forEach(btn => {
      btn.onclick = () => {
        calcVer = btn.dataset.calcVer;
        render();
      };
    });

    // 6 張圖卡點擊放大
    el.querySelectorAll('[data-kz-zoom]').forEach(wrap => {
      wrap.onclick = () => {
        const idx = Number(wrap.dataset.kzZoom) || 0;
        openKaizenLightboxModal(idx);
      };
    });

    // 試算器輸入即時更新
    const kzScoreIn = el.querySelector('[data-kz-score]');
    if (kzScoreIn) {
      kzScoreIn.oninput = () => {
        kzScore = Math.max(0, Math.min(100, Number(kzScoreIn.value || 0)));
        render();
        const nextIn = el.querySelector('[data-kz-score]');
        if (nextIn) nextIn.focus();
      };
    }
    const kzStaffIn = el.querySelector('[data-kz-staff]');
    const kzPropIn = el.querySelector('[data-kz-proposers]');
    if (kzStaffIn) {
      kzStaffIn.oninput = () => {
        kzDeptStaff = Math.max(1, Number(kzStaffIn.value || 1));
        render();
        const nextIn = el.querySelector('[data-kz-staff]');
        if (nextIn) nextIn.focus();
      };
    }
    if (kzPropIn) {
      kzPropIn.oninput = () => {
        kzDeptProposers = Math.max(0, Number(kzPropIn.value || 0));
        render();
        const nextIn = el.querySelector('[data-kz-proposers]');
        if (nextIn) nextIn.focus();
      };
    }

    // 開啟線上填寫提案登錄表 Modal
    el.querySelectorAll('[data-open-new-proposal]').forEach(btn => {
      btn.onclick = () => openNewProposalModal(proposals, () => {
        activeTab = 'form';
        render();
      });
    });

    // 提案按讚
    el.querySelectorAll('[data-like-prop]').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.likeProp;
        const uid = myUid();
        const next = proposals.map(p => {
          if (p.id !== id) return p;
          const set = new Set(Array.isArray(p.likes) ? p.likes : []);
          if (set.has(uid)) set.delete(uid);
          else set.add(uid);
          return { ...p, likes: [...set] };
        });
        await saveToolsDoc('kaizenProposals', { list: next });
        render();
      };
    });

    // 預覽與列印標準「改善提案登錄表」
    el.querySelectorAll('[data-print-prop]').forEach(btn => {
      btn.onclick = () => {
        const p = proposals.find(x => x.id === btn.dataset.printProp);
        if (p) openPrintProposalModal(p);
      };
    });

    // 刪除提案
    el.querySelectorAll('[data-del-prop]').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.delProp;
        const next = proposals.filter(p => p.id !== id);
        await saveToolsDoc('kaizenProposals', { list: next });
        toast('已移除該筆改善提案');
        render();
      };
    });

    // 2026 修訂議題投票附議
    el.querySelectorAll('[data-vote-reform]').forEach(btn => {
      btn.onclick = async () => {
        const topicId = btn.dataset.voteReform;
        const uid = myUid();
        const nextVotes = { ...reformData.votes };
        const set = new Set(Array.isArray(nextVotes[topicId]) ? nextVotes[topicId] : []);
        if (set.has(uid)) set.delete(uid);
        else set.add(uid);
        nextVotes[topicId] = [...set];
        await saveToolsDoc('kaizenReform', { votes: nextVotes, comments: reformData.comments });
        toast(set.has(uid) ? '🌱 已記錄您的附議共鳴！' : '已取消附議');
        render();
      };
    });

    // 2026 修訂建議留言表單
    const commentForm = el.querySelector('#kz-reform-comment-form');
    if (commentForm) {
      commentForm.onsubmit = async e => {
        e.preventDefault();
        const f = e.target;
        const text = f.text.value.trim();
        if (!text) return;
        const newComment = {
          id: 'krc_' + Date.now().toString(36),
          topicId: f.topicId.value,
          text,
          isAnon: f.isAnon.checked,
          uid: myUid(),
          author: userName(myUid()) || state.me?.displayName || '組員',
          createdAtIso: new Date().toISOString(),
        };
        const nextComments = [newComment, ...reformData.comments];
        await saveToolsDoc('kaizenReform', { votes: reformData.votes, comments: nextComments });
        toast('🌱 已播下您的修訂建議種子！');
        render();
      };
    }

    // 刪除修訂建議留言
    el.querySelectorAll('[data-del-reform-comment]').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.delReformComment;
        const nextComments = reformData.comments.filter(c => c.id !== id);
        await saveToolsDoc('kaizenReform', { votes: reformData.votes, comments: nextComments });
        toast('已移除留言');
        render();
      };
    });
  }

  render();
  return { onData: render };
}

function openNewProposalModal(currentList, onSaved) {
  const meName = state.me?.displayName || '';
  const today = ymd();
  openModal(`
    <div class="modal-head">
      <h3>✍️ 線上填寫「改善提案登錄表」（GUT02202 規格）</h3>
      <button class="icon-btn" data-close>✕</button>
    </div>
    <form class="form" id="kz-proposal-form">
      <label>提案主題名稱 <span class="req">*</span>
        <input type="text" name="title" required placeholder="例如：優化場站巡檢照片回傳流程，減少重複整理時間">
      </label>
      <div class="grid2">
        <label>提案型態
          <select name="proposerType">
            <option value="個人改善">👤 個人改善（1人）</option>
            <option value="小團體改善">👥 小團體改善（2人協作）</option>
            <option value="跨部門專案(CFT)">🤝 部門間專案改善 (CFT)</option>
          </select>
        </label>
        <label>改善類別
          <select name="category">
            <option value="流程簡化 / 數位工具">💻 流程簡化 / 數位工具</option>
            <option value="場站調度 / 外勤維運">🚲 場站調度 / 外勤維運</option>
            <option value="品質提升 / 客戶服務">⭐ 品質提升 / 客戶服務</option>
            <option value="成本節降 / 採購優化">💰 成本節降 / 採購優化</option>
            <option value="職場安全 / 5S 環境">🛡️ 職場安全 / 5S 環境</option>
          </select>
        </label>
      </div>
      <div class="grid2">
        <label>提案人姓名 <span class="req">*</span>
          <input type="text" name="proposerName" value="${esc(meName)}" required>
        </label>
        <label>共同提案人（小團體改善可填 1 位搭檔）
          <input type="text" name="coProposer" placeholder="個人提案免填">
        </label>
      </div>
      <div class="grid2">
        <label>所屬部門 / 單位
          <input type="text" name="dept" value="經營 Team" required>
        </label>
        <label>改善實施起始日（須於實施 1 年內提交） <span class="req">*</span>
          <input type="date" name="startDate" value="${esc(today)}" required>
        </label>
      </div>
      <label>🔍 改善前現況與問題點 (Before) <span class="req">*</span>
        <textarea name="beforeDesc" rows="3" required placeholder="請直白描述原本作業哪裡花時間、容易出錯、或造成不便？"></textarea>
      </label>
      <label>✨ 改善後具體對策與作法 (After) <span class="req">*</span>
        <textarea name="afterDesc" rows="3" required placeholder="請描述您實際做了什麼調整或工具改善？"></textarea>
      </label>
      <div class="grid2">
        <label>🎯 主要達成效益類別
          <select name="benefitType">
            <option value="節省工時 / 提升效率">⏱️ 節省工時 / 提升效率</option>
            <option value="提升服務與作業品質">📈 提升服務與作業品質</option>
            <option value="降低成本 / 減少浪費">💵 降低成本 / 減少浪費</option>
            <option value="強化安全 / 降低風險">🛡️ 強化安全 / 降低風險</option>
          </select>
        </label>
        <label>🏅 自評預估採分（0~100分，系統自動換算等級）
          <input type="number" name="selfScore" value="65" min="31" max="100">
        </label>
      </div>
      <label>📊 具體效益說明（量化數字或質化成果） <span class="req">*</span>
        <input type="text" name="benefitDetail" required placeholder="例如：每月節省約 4 小時人工統計時間、錯誤率降為 0%">
      </label>
      <label>🔄 是否可水平展開／擴散至其他單位會簽？
        <input type="text" name="canSpread" placeholder="例如：可擴散至各區營運處參考（無則免填）">
      </label>
      <div class="modal-foot">
        <button type="button" class="btn" data-close>取消</button>
        <button type="submit" class="btn primary">💾 儲存至提案庫（可隨時列印送簽）</button>
      </div>
    </form>
  `, { wide: true });

  document.getElementById('kz-proposal-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const item = {
      id: 'kzp_' + Date.now().toString(36),
      title: f.title.value.trim(),
      proposerType: f.proposerType.value,
      category: f.category.value,
      proposerName: f.proposerName.value.trim(),
      coProposer: f.coProposer.value.trim(),
      dept: f.dept.value.trim() || '經營 Team',
      startDate: f.startDate.value,
      beforeDesc: f.beforeDesc.value.trim(),
      afterDesc: f.afterDesc.value.trim(),
      benefitType: f.benefitType.value,
      benefitDetail: f.benefitDetail.value.trim(),
      canSpread: f.canSpread.value.trim(),
      selfScore: Number(f.selfScore.value || 65),
      uid: myUid(),
      likes: [],
      createdAtIso: new Date().toISOString(),
    };
    const next = [item, ...currentList];
    await saveToolsDoc('kaizenProposals', { list: next });
    closeModal();
    toast('🎉 已建立改善提案登錄表！可點選「預覽登錄表／列印送簽」匯出紙本或 PDF');
    onSaved?.();
  };
}

function openPrintProposalModal(p) {
  const tier = getKaizenTierByScore(p.selfScore || 65);
  openModal(`
    <div class="modal-head">
      <h3>🖨️ 微笑單車－改善提案登錄表（標準編號 GUT02202 預覽）</h3>
      <button class="icon-btn" data-close>✕</button>
    </div>
    <div id="kz-printable-sheet" style="background:#fff;border:2px solid #0F172A;border-radius:8px;padding:18px;color:#0F172A;font-size:13px;line-height:1.55">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0F172A;padding-bottom:8px;margin-bottom:12px">
        <div>
          <div style="font-size:11px;color:#475569;font-weight:700">微笑單車股份有限公司 · 標準編號 GUT02202</div>
          <h2 style="margin:2px 0 0;font-size:20px;letter-spacing:1px">改善提案登錄表</h2>
        </div>
        <div style="text-align:right;font-size:12px">
          <div><b>提報部門：</b>${esc(p.dept || '經營 Team')}</div>
          <div><b>實施起始日：</b>${esc(p.startDate || '-')}（每月 20 日截止）</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:13px">
        <tr>
          <th style="border:1px solid #334155;background:#F1F5F9;padding:7px 10px;width:110px;text-align:left">提案主題</th>
          <td colspan="3" style="border:1px solid #334155;padding:7px 10px;font-weight:800;font-size:14px">${esc(p.title)}</td>
        </tr>
        <tr>
          <th style="border:1px solid #334155;background:#F1F5F9;padding:7px 10px;text-align:left">提案人</th>
          <td style="border:1px solid #334155;padding:7px 10px">${esc(p.proposerName)}${p.coProposer ? `、${esc(p.coProposer)}` : ''}</td>
          <th style="border:1px solid #334155;background:#F1F5F9;padding:7px 10px;width:110px;text-align:left">提案型態／類別</th>
          <td style="border:1px solid #334155;padding:7px 10px">${esc(p.proposerType)} ／ ${esc(p.category)}</td>
        </tr>
        <tr>
          <th style="border:1px solid #334155;background:#FEF2F2;padding:10px;text-align:left;vertical-align:top">🔍 改善前現況<br><span style="font-size:11px;font-weight:500;color:#64748B">(問題點說明)</span></th>
          <td colspan="3" style="border:1px solid #334155;padding:10px;white-space:pre-wrap">${esc(p.beforeDesc)}</td>
        </tr>
        <tr>
          <th style="border:1px solid #334155;background:#F0FDF4;padding:10px;text-align:left;vertical-align:top">✨ 改善後對策<br><span style="font-size:11px;font-weight:500;color:#64748B">(具體作法)</span></th>
          <td colspan="3" style="border:1px solid #334155;padding:10px;white-space:pre-wrap">${esc(p.afterDesc)}</td>
        </tr>
        <tr>
          <th style="border:1px solid #334155;background:#FFFBEB;padding:9px 10px;text-align:left">🎯 具體效益</th>
          <td colspan="3" style="border:1px solid #334155;padding:9px 10px"><b>【${esc(p.benefitType)}】</b> ${esc(p.benefitDetail)}</td>
        </tr>
        <tr>
          <th style="border:1px solid #334155;background:#F1F5F9;padding:7px 10px;text-align:left">🔄 會簽／擴散</th>
          <td colspan="3" style="border:1px solid #334155;padding:7px 10px">${esc(p.canSpread || '本單位自主改善（無須跨單位會簽）')}</td>
        </tr>
      </table>

      <div style="border:1px solid #334155;border-radius:6px;padding:10px;background:#F8FAFC;font-size:12px">
        <div style="font-weight:800;margin-bottom:6px">📋 主管審核評等欄（自評預估參考：${p.selfScore} 分 ➔ ${tier.grade} · 獎金 ${tier.prizeText} · 點數 ${tier.points} 點）</div>
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;text-align:center;margin-top:8px">
          <div style="border:1px dashed #94A3B8;padding:18px 6px 6px;background:#fff">主任／指定授權者<br><span class="muted tiny">(7~8等核定)</span></div>
          <div style="border:1px dashed #94A3B8;padding:18px 6px 6px;background:#fff">處長／Team 主管<br><span class="muted tiny">(5~8等核定)</span></div>
          <div style="border:1px dashed #94A3B8;padding:18px 6px 6px;background:#fff">高等案件審查會<br><span class="muted tiny">(4等以上審查)</span></div>
          <div style="border:1px dashed #94A3B8;padding:18px 6px 6px;background:#fff">總經理核決<br><span class="muted tiny">(3等以上月會頒獎)</span></div>
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn" data-close>關閉</button>
      <button type="button" class="btn primary" data-do-print>🖨️ 列印 ／ 另存為 PDF 送簽</button>
    </div>
  `, { wide: true });

  const printBtn = document.querySelector('[data-do-print]');
  if (printBtn) {
    printBtn.onclick = () => {
      const content = document.getElementById('kz-printable-sheet')?.outerHTML || '';
      const w = window.open('', '_blank', 'width=840,height=680');
      if (!w) {
        window.print();
        return;
      }
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>改善提案登錄表 - ${esc(p.title)}</title><style>body{font-family:"Microsoft JhengHei",sans-serif;padding:20px;color:#0F172A}@media print{body{padding:0}}</style></head><body>${content}<script>window.onload=function(){window.print();}<\/script></body></html>`);
      w.document.close();
    };
  }
}

function openKaizenLightboxModal(startIdx = 0) {
  let idx = startIdx;
  function renderLightbox() {
    const kc = KAIZEN_CARDS[idx] || KAIZEN_CARDS[0];
    openModal(`
      <div class="modal-head">
        <div>
          <span class="kaizen-hl-tag" style="margin-right:6px">${esc(kc.badge)}</span>
          <strong style="font-size:16px">${esc(kc.title)}</strong>
        </div>
        <button class="icon-btn" data-close>✕</button>
      </div>
      <div style="background:#0F172A;padding:12px;border-radius:12px;text-align:center;position:relative">
        <img src="${esc(kc.img)}" alt="${esc(kc.title)}" style="max-width:100%;max-height:62vh;border-radius:8px;display:block;margin:0 auto">
      </div>
      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;margin-top:10px">
        <div style="font-weight:800;color:#92400E;font-size:13px;margin-bottom:4px">📌 重點速讀（${esc(kc.highlight)}）</div>
        <ul class="kaizen-bullet-list" style="margin:0">
          ${kc.points.map(pt => `<li>${pt}</li>`).join('')}
        </ul>
      </div>
      <div class="modal-foot" style="justify-content:space-between">
        <div style="display:flex;gap:6px">
          <button type="button" class="btn sm ghost" data-kz-prev>◀ 上一張小卡</button>
          <span class="muted tiny" style="align-self:center">第 ${idx + 1} / ${KAIZEN_CARDS.length} 張</span>
          <button type="button" class="btn sm ghost" data-kz-next>下一張小卡 ▶</button>
        </div>
        <button type="button" class="btn primary" data-close>關閉</button>
      </div>
    `, { wide: true });

    const prevBtn = document.querySelector('[data-kz-prev]');
    const nextBtn = document.querySelector('[data-kz-next]');
    if (prevBtn) {
      prevBtn.onclick = () => {
        idx = (idx - 1 + KAIZEN_CARDS.length) % KAIZEN_CARDS.length;
        renderLightbox();
      };
    }
    if (nextBtn) {
      nextBtn.onclick = () => {
        idx = (idx + 1) % KAIZEN_CARDS.length;
        renderLightbox();
      };
    }
  }
  renderLightbox();
}
