// 💡 改善提案作業管理辦法（2023.05 修訂 · 五版）圖文懶人包小卡、線上提案登錄表 ＆ 2026 修訂建議對照
import { state, myUid, isAdmin, userName, saveToolsDoc } from '../data.js';
import { esc, ymd, toast, openModal, closeModal } from '../utils.js';

const KAIZEN_CARDS = [
  {
    id: 'kz_target',
    badge: '01 · 提案目標與時限',
    title: '🎯 誰要提？一年幾件？何時交件？',
    img: 'assets/kaizen/card1_target.jpg?v=20261023v53',
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
    img: 'assets/kaizen/card2_flow.jpg?v=20261023v53',
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
    img: 'assets/kaizen/card3_rewards.jpg?v=20261023v53',
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
    img: 'assets/kaizen/card4_most_cases.jpg?v=20261023v53',
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
    img: 'assets/kaizen/card5_points_award.jpg?v=20261023v53',
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
    img: 'assets/kaizen/card6_dept_award.jpg?v=20261023v53',
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

// 2026 通膨優化調整建議對比圖卡（8 張視覺化 Before vs. After 圖卡 ＋ 下方「為什麼這樣改？（管理效益）」說明）
const VS_COMPARISON_CARDS = [
  {
    id: 'vs_1',
    badge: '對比 01 · 基層日常改善',
    title: '💸 基層單件獎金（5~7 等日常改善）',
    img: 'assets/kaizen/vs1_basic_bonus.jpg?v=20261023v50',
    oldSummary: '7等 $100 (1點) · 6等 $200 (2點) · 5等 $300 (3點)',
    newSummary: '7等 $300 (1點) · 6等 $500 (2點) · 5等 $800 (3點)',
    whyChange: '反映 2026 物價水準，只要通過立案（7等）至少有 <b>$300 元</b>（約一頓簡餐＋手搖飲），徹底消除同仁「先實作改善、拍照、算效益、寫半天表單卻只領 100 元（連便當都買不起）」的剝奪感，讓基層與外勤真正願意動腦提報日常微改善！',
  },
  {
    id: 'vs_2',
    badge: '對比 02 · 中高階重大改善',
    title: '🚀 中高階單件獎金（1~4 等重大改善）',
    img: 'assets/kaizen/vs2_high_bonus.jpg?v=20261023v50',
    oldSummary: '4等 $1,000 (5點) · 3等 $5,000 (10點) · 2等 $10,000 (15點) · 1等 $20,000 (30點)',
    newSummary: '4等 $2,000 (6點) · 3等 $6,000 (12點) · 2等 $12,000 (20點) · 1等 $25,000 (30點)',
    whyChange: '平滑補齊 <b>5等($800) ➔ 4等($2,000) ➔ 3等($6,000)</b> 的階梯感，不再出現原本「5等 $300 跳 4等 $1,000（3.3倍）、再跳 3等 $5,000（5倍）」的斷崖式落差；並同步微調 2~4 等考績點數（6點/12點/20點），讓年度積分大獎更容易銜接達成。',
  },
  {
    id: 'vs_3',
    badge: '對比 03 · 消除主管壓分效應',
    title: '🔓 高等案件審查會門檻（解決壓分問題）',
    img: 'assets/kaizen/vs3_review_gate.jpg?v=20261023v50',
    oldSummary: '4 等 (51分 / $1,000) 以上就要召開 3 位處長/經理級高等審查會',
    newSummary: '4 等由處長/Team 主管直接核定！改為 3 等 (61分 / $6,000) 以上才召開高等審查會',
    whyChange: '現行為了 $1,000 元獎金就要召集 3 位處長開會，會議時間成本遠超獎金本身，更導致單位主管「為了怕麻煩或怕跨處審查，下意識把好案子壓在 50 分（5等 $300）以下」。釋放 4 等核決權給處長/Team 主管，才能真正解放中階優質提案！',
  },
  {
    id: 'vs_4',
    badge: '對比 04 · 部門同儕激勵',
    title: '🧋 部門每半年推行活動費（參與率 ≥ 80%）',
    img: 'assets/kaizen/vs4_dept_fee.jpg?v=20261023v50',
    oldSummary: '參與率 ≥ 80%，每半年發給「部門人數 × $50 元」（憑發票報銷）',
    newSummary: '參與率 ≥ 80% 發給「人數 × $200 元」；若達 100% 全員提案加碼為「人數 × $300 元」',
    whyChange: '2026 年手搖飲一杯 $70、雞排 $100，現行一人半年 $50 元連一杯珍奶都買不起，還要開發票報銷（行政成本比獎金還貴）。調升至每人 <b>$200~$300 元</b>才夠部門買披薩＋飲料辦下午茶，真正發揮「部門主管催件、同儕互相激勵」的團隊凝聚效果！',
  },
  {
    id: 'vs_5',
    badge: '對比 05 · 年度提案王榮譽',
    title: '🏅 個人年度「採納最多獎」（全年達 6 件↑）',
    img: 'assets/kaizen/vs5_most_cases.jpg?v=20261023v50',
    oldSummary: '門檻 6 件↑，第 1~5 名：$5,000 / $4,000 / $3,000 / $2,000 / $1,000',
    newSummary: '門檻維持 6 件↑，第 1~5 名調升為：$8,000 / $6,000 / $4,000 / $3,000 / $2,000',
    whyChange: '全年度能通過 6 件（含）以上 7~1 等提案，代表同仁平均每兩個月就主動發掘並落實一項工作改善。將全公司年度第一名獎金調升至 <b>$8,000 元</b>、第五名保底 <b>$2,000 元</b>，才配得上全公司「年度提案王」的實質貢獻與榮譽感。',
  },
  {
    id: 'vs_6',
    badge: '對比 06 · 打破看得到吃不到',
    title: '💎 個人年度「點數積分獎」門檻下修與分級',
    img: 'assets/kaizen/vs6_points_threshold.jpg?v=20261023v50',
    oldSummary: '鑽石 50點 / 金 40點 / 銀 35點 / 銅 35點 / 優秀 25點（銀銅同分卡死、門檻極高）',
    newSummary: '合理下修門檻：鑽石 40點 / 金 32點 / 銀 25點 / 銅 18點 / 優秀 12點',
    whyChange: '現行一般同仁一年提 2 件日常改善僅 4~6 點，要摸到最低「優秀獎 25 點（且含 4 等以上 15 點）」幾乎不可能，且銀獎與銅獎都卡在 35 點。下修並拉開階梯（<b>12點 / 18點 / 25點 / 32點 / 40點</b>），讓一年認真提 3~4 件好案子的同仁真的摸得到獎！',
  },
  {
    id: 'vs_7',
    badge: '對比 07 · 大小部門公平競爭',
    title: '⚖️ 單位年度表彰（團體總錦標）改看人均點數',
    img: 'assets/kaizen/vs7_team_award.jpg?v=20261023v50',
    oldSummary: '依「部門年度總點數」計算 · 第 1 名 $3,000、第 2 名 $2,000',
    newSummary: '改依「部門人均點數」評比 · 第 1 名 $10,000、第 2 名 $6,000',
    whyChange: '過去比「部門總點數」，30 人大部門一人湊 2 點就贏過 8 人精實小部門；且全公司第一名部門只領 $3,000（比單件 3 等獎 $5,000 還少）。<b>改看「部門人均點數」才能讓像經營 Team 這樣精實的單位公平競爭</b>，且萬元級團體獎金才具冠軍榮譽感！',
  },
  {
    id: 'vs_8',
    badge: '對比 08 · 跨班協作與數位化',
    title: '📸 小團體人數上限放寬 ＆ 快速微改善通道',
    img: 'assets/kaizen/vs8_group_fasttrack.jpg?v=20261023v50',
    oldSummary: '小團體硬性限定「2 人以下」· 所有案件皆須填寫傳統長篇表單',
    newSummary: '放寬為「2 ～ 4 人」團隊協作 · 6~7 等增設「Before/After 隨手拍」快速通道',
    whyChange: 'YouBike 場站調度、維修動線或系統改善常需 3~4 人（如早晚班、外勤＋內勤）協作，放寬至 2~4 人才能讓協力夥伴共同掛名；同時增設「<b>改善前後照片＋50字說明</b>」線上快速提案通道，大幅降低基層文書門檻，讓參與率自然衝破 90%！',
  },
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
    id: 'kzp_seed_2026h1_leo',
    title: '模擬體驗會議閱覽體驗升級與防呆視覺化報表重構',
    category: '流程',
    proposerType: '個人改善',
    proposerName: '孔令淳',
    empId: 'B4398',
    coProposer: '',
    dept: '經營組',
    startDate: '2026-06-19',
    implArea: '新辦公室',
    needCoSign: '否',
    coSignDept: '',
    stdDocAction: '無',
    stdDocType: '',
    stdDocNo: '',
    stdDocVer: '',
    beforeDesc: `1. 報表產出極度耗時、易出錯：每月需仰賴人工整理龐雜的 Excel 數據，並手動複製貼上至 PPT，不僅耗費大量工時，且極易產生人為登錄錯誤。
2. 視覺擁擠，長官閱覽體驗不佳：傳統靜態簡報受限於版面，將海量數據硬塞入單一頁面，導致字體過小；且在會議室投影機的低解析度下，數字模糊不清，嚴重影響會議效率。
3. 缺乏動態下鑽與重點警示：靜態報表無法即時互動。長官無法直覺對照「上月與本月」的趨勢差異，也無法在發現異常時，立即調閱對應的現場照片或影片實證，導致決策過程不夠直覺。`,
    afterDesc: `1. 開發「自動化數據轉譯引擎 (ETL)」：導入前端網頁技術取代傳統 PPT。未來只需匯入原始 CSV 檔，系統即會自動清洗、對齊並生成資料，將數小時的製表作業縮短至幾秒鐘。
2. 導入「專屬報告模式」與「減法視覺設計」：
   • 量身打造會議專用的全螢幕簡報模式，結合滑鼠滾輪平滑切換。
   • 強制實裝「字體巨大化」與「高對比重點標色（紅色警示退步 / 藍色標註進步）」，自動過濾正常數據，引導長官視線一秒聚焦核心問題（例外管理）。
3. 建構「動態戰情室」與「多媒體實證牆」：整合 ECharts 互動圖表，並首創「現場問題實證紀錄區」。長官不只能看見冰冷的數據，更能點擊查看高畫質的「異常狀況相片與影片（燈箱特效）」，讓營運會議做到真正的「有圖有真相」。`,
    benefitType: '節省工時 / 數位轉型',
    tangibleBenefit: `• 製表工時大幅縮減（自動化）：導入專屬 CSV 數據轉譯引擎 (ETL) 後，每月月報的資料整理與產出時間，由原先人工製作的 2 小時，極速縮減至 1 分鐘內（一鍵拖曳解析），報表前置作業人力成本節省達 90% 以上。
• 零人工錯誤率（防呆）：系統程式碼自動讀取並對齊 CSV 數據，徹底根絕過去人工操作 Excel 複製貼上 (Copy & Paste) 容易產生的錯行、漏字等致命人為失誤。
• 會議溝通效率提升：透過「專屬報告模式」隱藏干擾元素並極大化字體，省去長官在密密麻麻表格中尋找重點的時間，單次會議檢討時間預估可有效縮短 15%~20%。`,
    intangibleBenefit: `• 直覺化決策輔助（例外管理）：導入嚴謹的色彩心理學（紅色警示異常、藍色標註進步、黑色收納正常數據），讓高階主管能「一秒鎖定痛點」，大腦無須進行多餘的數字運算，大幅提升營運決策品質。
• 會議體驗與專業度躍升：首創「第八頁動態多媒體實證區（相片/影片燈箱特效）」，打破傳統靜態簡報的沉悶感。長官能直接調閱現場異常畫面，做到真正的「有圖有真相」，大幅提升提案團隊的科技專業形象。
• 響應數位轉型與綠色企業：淘汰紙本或傳統檔案夾帶傳輸，全面邁向 Web 雲端化、無紙化閱覽，建立團隊擁抱數位工具的創新文化。`,
    horizontalExpansion: `• 跨部門無縫複製套用：本系統底層已實現「UI 組件與數據資料庫分離」的高階架構。此套模板可低成本、快速地平行展開至其他單位（如：客服滿意度監控、物流調度分析、零件庫存數據板）。
• 即時數據中心擴充潛力：目前系統已具備高度動態互動性，未來若有需求，只需串接後端 API 或雲端資料庫（如 Firebase），即可「零痛感」升級為 24 小時大螢幕自動滾動的「即時營運監控管理中心」。`,
    benefitDetail: '每月製表時間由 2 小時縮短至 1 分鐘內（節省 90% 以上工時）、人工複製貼上錯誤率降為 0%，單次會議檢討時間縮短 15%~20%。',
    beforeImg: 'assets/kaizen/demo_before.png',
    afterImg: 'assets/kaizen/demo_after.png',
    spreadNeed: '需要',
    canSpread: '客服滿意度監控、物流調度分析、零件庫存數據板等相關單位',
    spreadStatus: '未擴散',
    selfScore: 78,
    status: '2026上半年實績範本',
    likes: [],
    createdAtIso: '2026-06-19T09:00:00.000Z',
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
    if (!isAdmin()) {
      el.innerHTML = `<div class="card pad" style="text-align:center;padding:40px 20px;color:#64748b">🔒 此專區目前僅限管理員檢視。</div>`;
      return;
    }
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

      <!-- 頂部四大模式切換導覽列 -->
      <div class="tools-sys-nav" style="margin-bottom:14px">
        <button type="button" class="tools-sys-tab ${activeTab === 'guide' ? 'active' : ''}" data-kz-tab="guide">
          📘 現行辦法圖文懶人包 (6張小卡＆試算)
        </button>
        <button type="button" class="tools-sys-tab ${activeTab === 'vs_cards' ? 'active' : ''}" data-kz-tab="vs_cards">
          📊 2023 vs 2026 優化對比圖卡 <span class="kz-nav-count warm">8張圖卡</span>
        </button>
        <button type="button" class="tools-sys-tab ${activeTab === 'form' ? 'active' : ''}" data-kz-tab="form">
          📝 線上提案登錄表＆點子庫 <span class="kz-nav-count">${proposals.length}</span>
        </button>
        <button type="button" class="tools-sys-tab ${activeTab === 'reform' ? 'active' : ''}" data-kz-tab="reform">
          🌱 修訂痛點對照＆共鳴投票 <span class="kz-nav-count warm">${totalReformVotes + reformData.comments.length}</span>
        </button>
      </div>

      ${activeTab === 'guide' ? renderGuideSection({ curKzTier, kzRatePct, kzDeptEligible, kzDeptBonus, displayPrizeText, perPersonFee }) : ''}
      ${activeTab === 'vs_cards' ? renderVsCardsSection(reformData) : ''}
      ${activeTab === 'form' ? renderFormSection(proposals) : ''}
      ${activeTab === 'reform' ? renderReformSection(reformData) : ''}
    `;

    bindEvents(proposals, reformData);
  }

  function renderGuideSection({ curKzTier, kzRatePct, kzDeptEligible, kzDeptBonus, displayPrizeText, perPersonFee }) {
    return `
      <div class="card pad tools-builtin-card kaizen-editorial-card" style="margin-bottom:16px">
        <div class="tools-card-header" style="border-bottom:1px solid rgba(184,148,70,0.22);padding-bottom:14px;margin-bottom:18px">
          <div>
            <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:#9a7428;text-transform:uppercase;margin-bottom:4px">KAIZEN EDITORIAL ARCHIVE · 2026 COLLECTOR'S GUIDE</div>
            <h3 style="margin:0;font-size:18px;font-family:'Noto Serif TC','Songti TC','PMingLiU',serif;color:#1e3f35;letter-spacing:0.03em">📘 《改善提案作業管理辦法》6 張質感圖文策展誌</h3>
            <div class="muted tiny" style="margin-top:4px;color:#6e6559">點擊任一張微縮模型攝影圖卡可全螢幕沉浸檢視與左右切換；想自己動手寫提案或看 2026 優化對照，請點選上方分頁切換。</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <span class="yb-sum-pill" style="background:#f6efe2;color:#78581a;border:1px solid rgba(184,148,70,0.38)">🎯 必達目標：<b>每半年 1 件 · 全年 2 件</b></span>
            <span class="yb-sum-pill" style="background:#1e3f35;color:#f5ebd6;border:1px solid rgba(200,155,60,0.45)">📅 每月截止：<b>20 日收件 · 次月 5 日公佈</b></span>
          </div>
        </div>

        <!-- 6 張繪圖視覺化資訊小卡 Grid -->
        <div class="kaizen-cards-grid">
          ${KAIZEN_CARDS.map((kc, idx) => `
            <div class="kaizen-info-card">
              <div class="kaizen-img-wrap" data-kz-zoom="${idx}" title="點擊放大檢視《${esc(kc.title)}》高畫質圖卡">
                <img src="${esc(kc.img)}" alt="${esc(kc.title)}" loading="lazy">
                <span class="kaizen-zoom-pill">🔍 點擊放大圖卡</span>
              </div>
              <div class="kaizen-card-body">
                <div class="kaizen-meta-strip">
                  <span class="kaizen-badge-pill">${esc(kc.badge)}</span>
                  <span class="kaizen-hl-tag">${esc(kc.highlight)}</span>
                </div>
                <div class="kaizen-card-title-row">
                  <h4>${esc(kc.title)}</h4>
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

  function renderVsCardsSection(reformData) {
    return `
      <div class="card pad tools-builtin-card kaizen-editorial-card" style="margin-bottom:16px">
        <div class="tools-card-header" style="border-bottom:1px solid rgba(184,148,70,0.22);padding-bottom:14px;margin-bottom:18px">
          <div>
            <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:#9a7428;text-transform:uppercase;margin-bottom:4px">KAIZEN REFORM EXHIBITION · 2023 LEGACY VS. 2026 EVOLUTION</div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <h3 style="margin:0;font-size:18px;font-family:'Noto Serif TC','Songti TC','PMingLiU',serif;color:#1e3f35;letter-spacing:0.03em">📊 符合 2026 通膨程度的優化調整建議（8 大微縮工藝對比策展）</h3>
              <span class="tools-live-badge" style="background:#1e3f35;color:#f5e6b3;border-color:#c89b3c">🚀 專供主管與經營層一眼看懂「2023 現行 vs 2026 建議優化」</span>
            </div>
            <div class="muted tiny" style="margin-top:5px;color:#6e6559">
              每張微縮模型攝影圖卡左方為「<b>2023 現行規定</b>」，右方為「<b>2026 建議優化方案</b>」，並在圖卡正下方詳列「<b>💡 為什麼這樣改？（管理效益）</b>」；點擊任一圖卡可全螢幕沉浸放大檢視！
            </div>
          </div>
          <button type="button" class="btn sm ghost" data-kz-tab="reform" style="border-color:rgba(184,148,70,0.45);color:#1e3f35;background:#faf5e8">前往投票與留言共鳴 ➔</button>
        </div>

        <div class="kaizen-vs-cards-grid">
          ${VS_COMPARISON_CARDS.map((vc, idx) => {
            const voters = Array.isArray(reformData.votes[vc.id]) ? reformData.votes[vc.id] : [];
            const hasVoted = voters.includes(myUid());
            return `
              <div class="kaizen-info-card vs-card">
                <div class="kaizen-img-wrap" data-vs-zoom="${idx}" title="點擊放大檢視《${esc(vc.title)}》高解析對比圖卡">
                  <img src="${esc(vc.img)}" alt="${esc(vc.title)}" loading="lazy">
                  <span class="kaizen-zoom-pill">🔍 點擊放大對比圖卡</span>
                </div>
                <div class="kaizen-card-body" style="gap:10px">
                  <div class="kaizen-meta-strip">
                    <span class="kaizen-badge-pill">${esc(vc.badge)}</span>
                    <button type="button" class="btn sm ${hasVoted ? 'primary' : 'ghost'}" data-vote-reform="${vc.id}" style="padding:3px 10px;font-size:11.5px;font-weight:800">
                      ${hasVoted ? '🔥 已贊同此優化' : '👍 贊同此優化'} (${voters.length})
                    </button>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-bottom:6px;border-bottom:1px dashed #e2d9c8">
                    <h4 style="margin:0;font-size:15.5px;font-weight:800;color:#1c2924;font-family:'Noto Serif TC','Songti TC','PMingLiU',Georgia,serif">${esc(vc.title)}</h4>
                  </div>

                  <!-- 2023 vs 2026 一行對比膠囊 -->
                  <div class="vs-summary-pills">
                    <div class="vs-sum-row old">
                      <span class="vs-tag old">2023 現行</span>
                      <span>${esc(vc.oldSummary)}</span>
                    </div>
                    <div class="vs-sum-row new">
                      <span class="vs-tag new">2026 建議</span>
                      <strong>${esc(vc.newSummary)}</strong>
                    </div>
                  </div>

                  <!-- 圖卡下方：為什麼這樣改？（管理效益） -->
                  <div class="vs-why-box">
                    <div class="vs-why-title">💡 為什麼這樣改？（管理效益）</div>
                    <div class="vs-why-text">${vc.whyChange}</div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
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
              <h3 style="margin:0;font-size:16px">📝 線上改善提案登錄表 ＆ 團隊改善點子庫（100% 對齊公司標準雙頁表單）</h3>
              <span class="tools-live-badge">⚡ 支援一鍵套用正式公文排版列印 / 匯出 PDF（含改善前後對照圖＆第2頁採分基準表）</span>
            </div>
            <div class="muted tiny" style="margin-top:3px">已依據《2026 上半年改善提案登錄表 By 經營組_孔令淳.docx》完整重構欄位：涵蓋「提案類別勾選、人事編號、實施區域、會簽與標準化文件、改善前問題、我的對策、效果確認（有形／無形效益／平行展開）、改善前後對照圖」，並可一鍵產出與 Word 完全一致的正式表格列印送簽！</div>
          </div>
          <button type="button" class="btn primary sm" data-open-new-proposal>＋ 新增改善提案登錄表</button>
        </div>

        <div class="kz-proposal-list">
          ${proposals.map(p => {
            const tier = getKaizenTierByScore(p.selfScore || 65);
            const likes = Array.isArray(p.likes) ? p.likes : [];
            const liked = likes.includes(myUid());
            const canDel = p.uid && (p.uid === myUid() || isAdmin());
            return `
              <div class="kz-prop-card">
                <div class="kz-prop-head">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <span class="fw-badge" style="background:#FEF3C7;color:#92400E">類別：${esc(p.category || '流程')}</span>
                    <span class="fw-badge">${esc(p.dept || '經營組')} · ${esc(p.empId || 'B4398')} ${esc(p.proposerName || '組員')}${p.coProposer ? `、${esc(p.coProposer)}` : ''}</span>
                    <span class="fw-status-pill" style="background:${tier.badgeBg};color:${tier.badgeColor}">自評預估：${tier.grade} (${tier.prizeText} / ${tier.points}點)</span>
                    <span class="muted tiny">📅 實施日：${esc(p.startDate || '-')} · 📍 實施區域：<b>${esc(p.implArea || '新辦公室')}</b></span>
                  </div>
                  <div style="display:flex;gap:6px;align-items:center">
                    <button type="button" class="btn sm ${liked ? 'primary' : 'ghost'}" data-like-prop="${esc(p.id)}" style="padding:3px 9px;font-size:12px">
                      👍 好點子 (${likes.length})
                    </button>
                    <button type="button" class="btn sm primary" data-print-prop="${esc(p.id)}" style="padding:3px 11px;font-size:12px">
                      🖨️ 預覽正式登錄表／列印送簽
                    </button>
                    ${canDel ? `<button type="button" class="icon-btn" data-del-prop="${esc(p.id)}" title="刪除此提案" style="color:var(--danger);font-size:12px">✕</button>` : ''}
                  </div>
                </div>

                <h4 class="kz-prop-title">案名：${esc(p.title)}</h4>

                <div class="kz-ba-grid">
                  <div class="kz-ba-box before">
                    <div class="kz-ba-lbl">🔍 改善前問題是什麼（有何缺失需要改善）</div>
                    <div class="kz-ba-txt">${esc(p.beforeDesc)}</div>
                  </div>
                  <div class="kz-ba-box after">
                    <div class="kz-ba-lbl">✨ 我的對策（利用什麼方式或手法將問題處理完成）</div>
                    <div class="kz-ba-txt">${esc(p.afterDesc)}</div>
                  </div>
                </div>

                ${(p.tangibleBenefit || p.intangibleBenefit || p.horizontalExpansion) ? `
                  <div style="margin-top:10px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;font-size:12.5px;line-height:1.58">
                    <div style="font-weight:800;color:#92400E;margin-bottom:6px">📊 效果確認（有形效益 ／ 無形效益 ／ 平行展開）</div>
                    ${p.tangibleBenefit ? `<div style="margin-bottom:6px"><b style="color:#0F172A">【有形效益（具體量化指標）】</b><div style="white-space:pre-wrap;color:#334155">${esc(p.tangibleBenefit)}</div></div>` : ''}
                    ${p.intangibleBenefit ? `<div style="margin-bottom:6px"><b style="color:#0F172A">【無形效益（質性與體驗升級）】</b><div style="white-space:pre-wrap;color:#334155">${esc(p.intangibleBenefit)}</div></div>` : ''}
                    ${p.horizontalExpansion ? `<div><b style="color:#0F172A">【平行展開（未來擴充與複製性）】</b><div style="white-space:pre-wrap;color:#334155">${esc(p.horizontalExpansion)}</div></div>` : ''}
                  </div>
                ` : ''}

                ${(p.beforeImg || p.afterImg) ? `
                  <div class="kz-ba-grid" style="margin-top:10px">
                    <div style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:10px;padding:8px 10px">
                      <div style="font-size:11.5px;font-weight:800;color:#475569;margin-bottom:6px">🖼️ 改善前示意圖／附件</div>
                      ${p.beforeImg ? `<img src="${esc(p.beforeImg)}" alt="改善前" style="width:100%;max-height:240px;object-fit:contain;border-radius:6px;background:#fff;border:1px solid #E2E8F0">` : '<div class="muted tiny">未附圖</div>'}
                    </div>
                    <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:10px;padding:8px 10px">
                      <div style="font-size:11.5px;font-weight:800;color:#166534;margin-bottom:6px">🖼️ 改善後示意圖／附件</div>
                      ${p.afterImg ? `<img src="${esc(p.afterImg)}" alt="改善後" style="width:100%;max-height:240px;object-fit:contain;border-radius:6px;background:#fff;border:1px solid #BBF7D0">` : '<div class="muted tiny">未附圖</div>'}
                    </div>
                  </div>
                ` : ''}

                <div class="kz-prop-foot" style="margin-top:10px">
                  <span>🎯 <b>效益摘要：</b>${esc(p.benefitDetail || p.tangibleBenefit?.slice(0, 70) || '詳見效果確認')}</span>
                  ${p.canSpread ? `<span class="kz-spread-tag">🔄 擴散相關單位（${esc(p.spreadNeed || '需要')} · ${esc(p.spreadStatus || '未擴散')}）：${esc(p.canSpread)}</span>` : ''}
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

    // 6 張現行圖卡點擊放大
    el.querySelectorAll('[data-kz-zoom]').forEach(wrap => {
      wrap.onclick = () => {
        const idx = Number(wrap.dataset.kzZoom) || 0;
        openKaizenLightboxModal(idx);
      };
    });

    // 8 張 2023 vs 2026 對比圖卡點擊放大
    el.querySelectorAll('[data-vs-zoom]').forEach(wrap => {
      wrap.onclick = () => {
        const idx = Number(wrap.dataset.vsZoom) || 0;
        openVsComparisonLightboxModal(idx);
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

function readImageFileAsDataUrl(file, maxWidth = 1100) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(reader.result);
      img.onload = () => {
        const scale = Math.min(1, maxWidth / (img.width || maxWidth));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function openNewProposalModal(currentList, onSaved) {
  const meName = state.me?.displayName || '孔令淳';
  const today = ymd();
  openModal(`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #f1f5f9">
      <div style="display:flex;align-items:center;gap:10px;min-width:0">
        <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#fef08a 0%,#f59e0b 100%);display:grid;place-items:center;font-size:21px;flex-shrink:0">📝</div>
        <div style="min-width:0">
          <h3 style="margin:0;font-size:17px;font-weight:800;color:#0f172a">線上填寫「改善提案登錄表」</h3>
          <div style="font-size:12px;color:#64748b;margin-top:2px">100% 對齊公司標準 Word 表格（GUT02202 雙頁規格：含改善前後對照圖＆採分基準表）</div>
        </div>
      </div>
      <button type="button" class="icon-btn" data-close style="flex-shrink:0">✕</button>
    </div>

    <form class="form" id="kz-proposal-form" style="gap:14px;max-height:76vh;overflow-y:auto;padding-right:4px">
      <div class="field">
        <span>📌 案名（提案主題名稱） <em>*</em></span>
        <input type="text" name="title" required placeholder="例如：模擬體驗會議閱覽體驗升級與防呆視覺化報表重構">
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        <div class="field">
          <span>🏷️ 提案類別(請勾選)</span>
          <select name="category">
            <option value="流程" selected>☑️ 流程</option>
            <option value="品質">☑️ 品質</option>
            <option value="成本">☑️ 成本</option>
            <option value="5S">☑️ 5S</option>
            <option value="其它">☑️ 其它</option>
          </select>
        </div>
        <div class="field">
          <span>🏢 提案單位</span>
          <input type="text" name="dept" value="經營組" required>
        </div>
        <div class="field">
          <span>🪪 人事編號</span>
          <input type="text" name="empId" value="B4398" placeholder="例如：B4398">
        </div>
        <div class="field">
          <span>👤 姓名 <em>*</em></span>
          <input type="text" name="proposerName" value="${esc(meName)}" required>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div class="field">
          <span>📅 實施起始日（從 MM月DD日起實施中） <em>*</em></span>
          <input type="date" name="startDate" value="${esc(today)}" required>
        </div>
        <div class="field">
          <span>📍 實施區域</span>
          <input type="text" name="implArea" value="新辦公室" placeholder="例如：新辦公室 / 全區場站">
        </div>
        <div class="field">
          <span>👥 共同提案人（選填）</span>
          <input type="text" name="coProposer" placeholder="個人提案免填">
        </div>
      </div>

      <!-- 會簽單位與標準化文件區塊 -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;display:grid;grid-template-columns:1fr 2fr;gap:10px">
        <div class="field">
          <span>🤝 會簽單位（□是 □否）</span>
          <div style="display:flex;gap:6px">
            <select name="needCoSign" style="width:90px">
              <option value="否" selected>□ 否</option>
              <option value="是">☑ 是</option>
            </select>
            <input type="text" name="coSignDept" placeholder="會簽單位名稱（無免填）" style="flex:1">
          </div>
        </div>
        <div class="field">
          <span>📄 標準化文件（□新增 □修訂 · 作業標準書/表單/圖面）</span>
          <div style="display:grid;grid-template-columns:110px 130px 1fr 80px;gap:6px">
            <select name="stdDocAction">
              <option value="無" selected>無異動</option>
              <option value="新增">☑ 新增</option>
              <option value="修訂">☑ 修訂</option>
            </select>
            <select name="stdDocType">
              <option value="">文件類型…</option>
              <option value="作業標準書">作業標準書</option>
              <option value="表單文件">表單文件</option>
              <option value="圖面文件">圖面文件</option>
            </select>
            <input type="text" name="stdDocNo" placeholder="文件編號">
            <input type="text" name="stdDocVer" placeholder="版次">
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="field">
          <span>🔍 改善前問題是什麼（請說明改善前有何缺失需要改善的） <em>*</em></span>
          <textarea name="beforeDesc" rows="5" required placeholder="1. 報表產出極度耗時、易出錯…&#10;2. 視覺擁擠，長官閱覽體驗不佳…&#10;3. 缺乏動態下鑽與重點警示…"></textarea>
        </div>
        <div class="field">
          <span>✨ 我的對策：（說明利用什麼方式或手法將問題處理完成） <em>*</em></span>
          <textarea name="afterDesc" rows="5" required placeholder="1. 開發「自動化數據轉譯引擎 (ETL)」…&#10;2. 導入「專屬報告模式」與「減法視覺設計」…&#10;3. 建構「動態戰情室」與「多媒體實證牆」…"></textarea>
        </div>
      </div>

      <!-- 效果確認（有形效益 / 無形效益 / 平行展開） -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:10px">
        <div style="font-size:13.5px;font-weight:800;color:#92400e">📊 效果確認：（將改善完成後有形的及無形的成果加以說明）</div>
        <div class="field">
          <span>📈 有形效益（具體量化指標：如工時縮減、零錯誤率、成本節省） <em>*</em></span>
          <textarea name="tangibleBenefit" rows="3" required placeholder="• 製表工時大幅縮減（自動化）：由原先 2 小時縮減至 1 分鐘內，節省達 90% 以上…&#10;• 零人工錯誤率（防呆）：自動讀取並對齊 CSV 數據…"></textarea>
        </div>
        <div class="field">
          <span>🌟 無形效益（質性與體驗升級：如直覺決策輔助、專業形象、無紙化）</span>
          <textarea name="intangibleBenefit" rows="3" placeholder="• 直覺化決策輔助（例外管理）：導入色彩心理學讓高階主管一秒鎖定痛點…&#10;• 會議體驗與專業度躍升：有圖有真相…"></textarea>
        </div>
        <div class="field">
          <span>🚀 平行展開（未來擴充與跨部門複製性）</span>
          <textarea name="horizontalExpansion" rows="2" placeholder="• 跨部門無縫複製套用：可低成本快速平行展開至其他單位…"></textarea>
        </div>
      </div>

      <!-- 改善前 / 改善後 圖畫或截圖附件 -->
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px">
        <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:8px">🖼️ 將您改善前與改善後的過程、方法、圖片、表格以圖畫(或附件)任何人都能一目了然（選填，支援上傳截圖）</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="field">
            <span>📸 改善前圖片／截圖</span>
            <input type="file" name="beforeImgFile" accept="image/*" style="font-size:12px">
          </div>
          <div class="field">
            <span>📸 改善後圖片／截圖</span>
            <input type="file" name="afterImgFile" accept="image/*" style="font-size:12px">
          </div>
        </div>
      </div>

      <!-- 擴散相關單位與自評採分 -->
      <div style="display:grid;grid-template-columns:120px 1fr 130px 150px;gap:10px;align-items:end">
        <div class="field">
          <span>🔄 擴散相關單位</span>
          <select name="spreadNeed">
            <option value="需要" selected>☑ 需要</option>
            <option value="不需要">□ 不需要</option>
          </select>
        </div>
        <div class="field">
          <span>🏢 需擴散之單位說明</span>
          <input type="text" name="canSpread" placeholder="例如：客服滿意度監控、物流調度分析等相關單位">
        </div>
        <div class="field">
          <span>📌 擴散狀態</span>
          <select name="spreadStatus">
            <option value="未擴散" selected>□ 未擴散</option>
            <option value="已擴散">☑ 已擴散</option>
          </select>
        </div>
        <div class="field">
          <span>🏅 自評預估採分(0~100)</span>
          <input type="number" name="selfScore" value="78" min="31" max="100">
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;align-items:center;gap:10px;padding-top:12px;border-top:1px solid #f1f5f9">
        <button type="button" class="btn" data-close style="padding:8px 18px;border-radius:10px">取消</button>
        <button type="submit" class="btn primary" style="padding:8px 20px;border-radius:10px">💾 儲存並產出標準登錄表</button>
      </div>
    </form>
  `, { wide: true });

  document.getElementById('kz-proposal-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const beforeImg = await readImageFileAsDataUrl(f.beforeImgFile?.files?.[0]);
    const afterImg = await readImageFileAsDataUrl(f.afterImgFile?.files?.[0]);
    const tangible = f.tangibleBenefit.value.trim();
    const item = {
      id: 'kzp_' + Date.now().toString(36),
      title: f.title.value.trim(),
      proposerType: f.coProposer.value.trim() ? '小團體改善' : '個人改善',
      category: f.category.value,
      proposerName: f.proposerName.value.trim(),
      empId: f.empId.value.trim() || 'B4398',
      coProposer: f.coProposer.value.trim(),
      dept: f.dept.value.trim() || '經營組',
      startDate: f.startDate.value,
      implArea: f.implArea.value.trim() || '新辦公室',
      needCoSign: f.needCoSign.value,
      coSignDept: f.coSignDept.value.trim(),
      stdDocAction: f.stdDocAction.value,
      stdDocType: f.stdDocType.value,
      stdDocNo: f.stdDocNo.value.trim(),
      stdDocVer: f.stdDocVer.value.trim(),
      beforeDesc: f.beforeDesc.value.trim(),
      afterDesc: f.afterDesc.value.trim(),
      tangibleBenefit: tangible,
      intangibleBenefit: f.intangibleBenefit.value.trim(),
      horizontalExpansion: f.horizontalExpansion.value.trim(),
      benefitType: f.category.value + '改善',
      benefitDetail: tangible.split('\n')[0] || '詳見效果確認',
      beforeImg: beforeImg || '',
      afterImg: afterImg || '',
      spreadNeed: f.spreadNeed.value,
      canSpread: f.canSpread.value.trim(),
      spreadStatus: f.spreadStatus.value,
      selfScore: Number(f.selfScore.value || 78),
      uid: myUid(),
      likes: [],
      createdAtIso: new Date().toISOString(),
    };
    const next = [item, ...currentList];
    await saveToolsDoc('kaizenProposals', { list: next });
    closeModal();
    toast('🎉 已建立改善提案登錄表！可點選「預覽正式登錄表／列印送簽」匯出完整雙頁公文');
    onSaved?.();
  };
}

function openPrintProposalModal(p) {
  const cats = ['品質', '成本', '流程', '5S', '其它'];
  const activeCat = cats.find(c => (p.category || '').includes(c)) || '流程';
  const dtParts = (p.startDate || '2026-06-19').split('-');
  const startMonth = dtParts[1] || '06';
  const startDay = dtParts[2] || '19';
  const chk = cond => (cond ? '☑' : '□');

  openModal(`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e2e8f0">
      <div>
        <h3 style="margin:0;font-size:17px;font-weight:800">🖨️ 改善提案登錄表（標準 Word 雙頁格式 1:1 預覽）</h3>
        <div class="muted tiny">已 100% 還原《2026 上半年改善提案登錄表 By 經營組_孔令淳.docx》第 1 頁登錄表與第 2 頁採分基準表</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button type="button" class="btn primary sm" data-do-print>🖨️ 列印 ／ 另存為 PDF 送簽</button>
        <button type="button" class="icon-btn" data-close>✕</button>
      </div>
    </div>

    <div style="max-height:75vh;overflow-y:auto;background:#e2e8f0;padding:14px;border-radius:10px">
      <div id="kz-printable-sheet" style="background:#fff;max-width:820px;margin:0 auto;padding:22px 26px;color:#000;font-family:'Microsoft JhengHei','PMingLiU',sans-serif;font-size:12px;line-height:1.45;box-shadow:0 4px 18px rgba(0,0,0,0.12)">
        <style>
          #kz-printable-sheet table.kz-doc-tbl { width: 100%; border-collapse: collapse; margin-bottom: 6px; table-layout: fixed; }
          #kz-printable-sheet table.kz-doc-tbl th,
          #kz-printable-sheet table.kz-doc-tbl td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; word-wrap: break-word; font-size: 11.5px; }
          #kz-printable-sheet .kz-doc-title { text-align: center; font-size: 20px; font-weight: 800; letter-spacing: 6px; margin: 0 0 8px; }
          #kz-printable-sheet .kz-sec-head { font-weight: 800; background: #f8fafc; }
          @media print {
            .kz-page-break { page-break-before: always; margin-top: 16px; }
          }
        </style>

        <!-- ==================== 第 1 頁：改善提案登錄表 ==================== -->
        <div class="kz-doc-title">改善提案登錄表</div>

        <!-- 頂部基本資料表 (TABLE 0) -->
        <table class="kz-doc-tbl">
          <tr>
            <td style="width:9%;font-weight:800;text-align:center">案名</td>
            <td colspan="9" style="font-weight:800;font-size:13.5px">${esc(p.title)}</td>
            <td colspan="2" style="width:18%;font-size:11px">提案編號<br>(事務局填寫):</td>
            <td style="width:12%"></td>
          </tr>
          <tr style="text-align:center;font-weight:700;background:#f8fafc">
            <td colspan="10">提案類別(請V勾選)</td>
            <td>提案單位</td>
            <td>人事編號</td>
            <td>姓名</td>
          </tr>
          <tr style="text-align:center">
            <td>品質</td>
            <td style="font-weight:900">${activeCat === '品質' ? 'V' : ''}</td>
            <td>成本</td>
            <td style="font-weight:900">${activeCat === '成本' ? 'V' : ''}</td>
            <td>流程</td>
            <td style="font-weight:900">${activeCat === '流程' ? 'V' : ''}</td>
            <td>5S</td>
            <td style="font-weight:900">${activeCat === '5S' ? 'V' : ''}</td>
            <td>其它</td>
            <td style="font-weight:900">${activeCat === '其它' ? 'V' : ''}</td>
            <td>${esc(p.dept || '經營組')}</td>
            <td>${esc(p.empId || 'B4398')}</td>
            <td style="font-weight:700">${esc(p.proposerName || '孔令淳')}${p.coProposer ? `<br><small>${esc(p.coProposer)}</small>` : ''}</td>
          </tr>
          <tr>
            <td colspan="10">從 <b>${esc(startMonth)}</b> 月 <b>${esc(startDay)}</b> 日起實施中, 實施區域( <b>${esc(p.implArea || '新辦公室')}</b> )</td>
            <td colspan="3">會簽單位：${esc(p.coSignDept || '')}</td>
          </tr>
          <tr>
            <td colspan="2" style="text-align:center">${chk(p.needCoSign === '是')}是 ${chk(p.needCoSign !== '是')}否</td>
            <td colspan="2" style="text-align:center;font-weight:700">標準化文件</td>
            <td colspan="2">${chk(p.stdDocAction === '新增')}新增 ${chk(p.stdDocAction === '修訂')}修訂</td>
            <td colspan="4">${chk(p.stdDocType === '作業標準書')}作業標準書 ${chk(p.stdDocType === '表單文件')}表單文件 ${chk(p.stdDocType === '圖面文件')}圖面文件</td>
            <td colspan="2">文件編號：${esc(p.stdDocNo || '')}</td>
            <td>版次：${esc(p.stdDocVer || '')}</td>
          </tr>
        </table>
        <div style="text-align:center;font-size:11px;font-weight:700;margin:2px 0 4px">↑以上欄位由提案者詳細填寫</div>

        <!-- 評等權限與採分、等級、獎金、點數對照表 (TABLE 1) -->
        <table class="kz-doc-tbl" style="text-align:center">
          <tr style="background:#f8fafc;font-weight:700">
            <td rowspan="2" style="width:13%">評等權限</td>
            <td style="width:7%">創造性</td>
            <td style="width:7%">努力性</td>
            <td style="width:7%">實際<br>效益</td>
            <td rowspan="2" style="width:6%">採分</td>
            <td rowspan="2" style="width:6%">等級</td>
            <td rowspan="2" style="width:8%">簽核</td>
            <td colspan="9" style="text-align:left;font-size:11px">※提案採分、等級、獎金、點數對照表。</td>
          </tr>
          <tr style="background:#f8fafc;font-size:10.5px">
            <td>40%</td>
            <td>20%</td>
            <td>40%</td>
            <td>等級</td>
            <td>8等</td>
            <td>7等</td>
            <td>6等</td>
            <td>5等</td>
            <td>4等</td>
            <td>3等</td>
            <td>2等</td>
            <td>1等</td>
          </tr>
          <tr>
            <td style="font-size:10.5px">主任/指定授權者</td>
            <td></td><td></td><td></td><td></td><td></td><td></td>
            <td style="background:#f8fafc;font-weight:700">採分</td>
            <td>0~30</td><td>31~36</td><td>37~44</td><td>45~50</td><td>51~60</td><td>61~75</td><td>76~90</td><td>90↑</td>
          </tr>
          <tr>
            <td style="font-size:10.5px">處長/Team主管</td>
            <td></td><td></td><td></td><td></td><td></td><td></td>
            <td style="background:#f8fafc;font-weight:700">獎金</td>
            <td style="font-size:10px">再接再勵</td><td>100</td><td>200</td><td>300</td><td>1000</td><td>5000</td><td>10000</td><td>20000</td>
          </tr>
          <tr>
            <td style="font-size:10.5px">高等案件審查會</td>
            <td></td><td></td><td></td><td></td><td></td><td></td>
            <td style="background:#f8fafc;font-weight:700">點數</td>
            <td>0</td><td>1</td><td>2</td><td>3</td><td>5</td><td>10</td><td>15</td><td>30</td>
          </tr>
          <tr>
            <td style="font-size:10.5px">總經理</td>
            <td></td><td></td><td></td><td></td><td></td><td></td>
            <td style="background:#f8fafc;font-weight:700">核准<br>權限</td>
            <td colspan="2" style="font-size:9.5px;line-height:1.25">Y職:主任/指定授權者<br>U職:處長/Team主管</td>
            <td colspan="3" style="font-size:9.5px;line-height:1.25">Y職:處長<br>U職:處長/Team主管</td>
            <td colspan="3" style="font-size:9.5px;line-height:1.25">總經理<br>(需檢附改善效益評估表)</td>
          </tr>
        </table>

        <!-- 改善前問題、我的對策、效果確認、改善前後圖示 (TABLE 2) -->
        <table class="kz-doc-tbl">
          <tr>
            <td style="width:50%;vertical-align:top;padding:8px">
              <div style="font-weight:800;margin-bottom:4px">改善前問題是什麼(請說明改善前有何缺失需要改善的)</div>
              <div style="white-space:pre-wrap;line-height:1.5">${esc(p.beforeDesc)}</div>
            </td>
            <td style="width:50%;vertical-align:top;padding:8px">
              <div style="font-weight:800;margin-bottom:4px">我的對策：(說明利用什麼方式或手法將問題處理完成)</div>
              <div style="white-space:pre-wrap;line-height:1.5">${esc(p.afterDesc)}</div>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="vertical-align:top;padding:8px">
              <div style="font-weight:800;margin-bottom:4px">效果確認：(將改善完成後有形的及無形的成果加以說明)</div>
              ${p.tangibleBenefit ? `
                <div style="margin-bottom:6px">
                  <div style="font-weight:800">有形效益(具體量化指標)：</div>
                  <div style="white-space:pre-wrap;line-height:1.5">${esc(p.tangibleBenefit)}</div>
                </div>
              ` : `<div style="white-space:pre-wrap;line-height:1.5">${esc(p.benefitDetail || '')}</div>`}
              ${p.intangibleBenefit ? `
                <div style="margin-bottom:6px">
                  <div style="font-weight:800">無形效益(質性與體驗升級)：</div>
                  <div style="white-space:pre-wrap;line-height:1.5">${esc(p.intangibleBenefit)}</div>
                </div>
              ` : ''}
              ${p.horizontalExpansion ? `
                <div>
                  <div style="font-weight:800">平行展開(未來擴充與複製性)：</div>
                  <div style="white-space:pre-wrap;line-height:1.5">${esc(p.horizontalExpansion)}</div>
                </div>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="text-align:center;font-weight:700;background:#f8fafc">
              將您改善前與改善後的過程、方法、圖片、表格以圖畫(或附件)任何人都能一目了然
            </td>
          </tr>
          <tr>
            <td style="vertical-align:top;padding:8px;min-height:160px">
              <div style="font-weight:800;margin-bottom:6px">改善前：</div>
              ${p.beforeImg ? `<img src="${esc(p.beforeImg)}" alt="改善前" style="max-width:100%;max-height:220px;display:block;margin:0 auto;object-fit:contain">` : '<div style="height:120px;display:grid;place-items:center;color:#94a3b8;font-size:11px">（如附件或說明）</div>'}
            </td>
            <td style="vertical-align:top;padding:8px;min-height:160px">
              <div style="font-weight:800;margin-bottom:6px">改善後：</div>
              ${p.afterImg ? `<img src="${esc(p.afterImg)}" alt="改善後" style="max-width:100%;max-height:220px;display:block;margin:0 auto;object-fit:contain">` : '<div style="height:120px;display:grid;place-items:center;color:#94a3b8;font-size:11px">（如附件或說明）</div>'}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding:6px 8px">
              <div>擴散相關單位：${chk((p.spreadNeed || '需要') === '需要')}需要　　${chk(p.spreadNeed === '不需要')}不需要</div>
              <div style="display:flex;justify-content:space-between;margin-top:3px">
                <span>需擴散之單位：${esc(p.canSpread || '')}</span>
                <span>${chk(p.spreadStatus === '已擴散')}已擴散　${chk((p.spreadStatus || '未擴散') !== '已擴散')}未擴散</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- ==================== 第 2 頁：改善提案採分基準表 ＆ 績效點數對照表 ==================== -->
        <div class="kz-page-break" style="margin-top:18px;padding-top:12px;border-top:2px dashed #94a3b8">
          <div style="text-align:center;font-size:16px;font-weight:800;margin-bottom:6px">改善提案採分基準表</div>
          <table class="kz-doc-tbl" style="text-align:center">
            <tr style="background:#f8fafc;font-weight:700">
              <td style="width:14%">區分</td>
              <td colspan="5">評價</td>
            </tr>
            <tr>
              <td rowspan="2" style="font-weight:700">創造性(40%)</td>
              <td>完全模仿公司內既有者</td>
              <td>模仿公司內既有者並加以應用或改造者</td>
              <td>參考或應用他人之手法者，並加入自己的創意</td>
              <td>能略參考以往經驗後，大量加入自己的創意</td>
              <td>完全屬個人創新並構想優異</td>
            </tr>
            <tr style="background:#f8fafc;font-weight:700">
              <td>1~8</td><td>9~16</td><td>17~24</td><td>25~32</td><td>33~40</td>
            </tr>
            <tr>
              <td rowspan="2" style="font-weight:700">努力性(20%)</td>
              <td>完全由他人協助執行完成</td>
              <td>需由它人協助共同執行完成或自己可容易執行完成者</td>
              <td>自己可執行完成且須花費時間完成</td>
              <td>難度一般, 需相當努力用苦心完成</td>
              <td>難度高，極為努力克服困難完成</td>
            </tr>
            <tr style="background:#f8fafc;font-weight:700">
              <td>1~4</td><td>5~8</td><td>9~12</td><td>13~16</td><td>17~20</td>
            </tr>
          </table>

          <table class="kz-doc-tbl" style="text-align:center;font-size:10.5px">
            <tr style="background:#f8fafc;font-weight:700">
              <td style="width:12%">區分</td>
              <td colspan="14">評價（有形效益與無形效益擇一評分）</td>
            </tr>
            <tr>
              <td rowspan="6" style="font-weight:700">預估或實際效益<br>(40%)</td>
              <td rowspan="3" style="width:8%;font-weight:700">有形效益</td>
              <td style="width:14%">成本的降低<br>需扣除材料人工等費用(元/年) · <b>U職</b></td>
              <td>2萬以下</td><td>4萬以下</td><td>8萬以下</td><td>12萬以下</td><td>16萬以下</td><td>20萬以下</td><td>24萬以下</td><td>28萬以下</td><td>35萬以下</td><td>42萬以下</td><td>50萬以下</td><td>50萬以上</td>
            </tr>
            <tr>
              <td><b>Y職</b></td>
              <td colspan="2">5仟元以下</td><td colspan="2">1萬元以下</td><td colspan="2">2萬元以下</td><td colspan="3">5萬元以下</td><td colspan="3">10萬元以下</td>
            </tr>
            <tr style="background:#f8fafc;font-weight:700">
              <td>分數</td>
              <td>3</td><td>6</td><td>9</td><td>12</td><td>15</td><td>18</td><td>21</td><td>24</td><td>28</td><td>32</td><td>36</td><td>40</td>
            </tr>
            <tr>
              <td rowspan="3" style="font-weight:700">無形效益</td>
              <td rowspan="2">品質/速度/服務/<br>安全/環境的提升</td>
              <td colspan="2">有效果, 但需增加成本負擔</td>
              <td colspan="3">有效果, 且不需增加成本</td>
              <td colspan="2">有效果, 且還能降低成本1萬元以下</td>
              <td colspan="3">有相當效果, 且還能降低成本1~10萬元</td>
              <td colspan="2">有相當效果, 提升公司形象, 且降低10~20萬</td>
            </tr>
            <tr>
              <td colspan="2"></td>
              <td colspan="3"></td>
              <td colspan="2">有相當的效果</td>
              <td colspan="3">效果相當大</td>
              <td colspan="2">效果相當大, 且降低1~10萬</td>
            </tr>
            <tr style="background:#f8fafc;font-weight:700">
              <td>分數</td>
              <td colspan="2">2~6</td>
              <td colspan="3">7~11</td>
              <td colspan="2">12~17</td>
              <td colspan="3">18~24</td>
              <td colspan="2">25~32</td>
            </tr>
          </table>

          <div style="text-align:center;font-size:14px;font-weight:800;margin:8px 0 4px">提案績效點數對照表</div>
          <table class="kz-doc-tbl" style="text-align:center">
            <tr style="background:#f8fafc;font-weight:700">
              <td>提案等級</td><td>8等</td><td>7等</td><td>6等</td><td>5等</td><td>4等</td><td>3等</td><td>2等</td><td>1等</td>
            </tr>
            <tr>
              <td style="font-weight:700">採分</td><td>0~30</td><td>31~36</td><td>37~44</td><td>45~50</td><td>51~60</td><td>61~75</td><td>76~90</td><td>90↑</td>
            </tr>
            <tr>
              <td style="font-weight:700">核准權限</td>
              <td colspan="2">Y職：主任/指定授權者<br>U職：處長/Team主管</td>
              <td colspan="3">Y職：處長<br>U職：處長/Team主管</td>
              <td colspan="3">總經理</td>
            </tr>
            <tr>
              <td style="font-weight:700">績效點數</td><td>0</td><td>1</td><td>2</td><td>3</td><td>5</td><td>10</td><td>15</td><td>30</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  `, { xl: true });

  const printBtn = document.querySelector('[data-do-print]');
  if (printBtn) {
    printBtn.onclick = () => {
      const content = document.getElementById('kz-printable-sheet')?.outerHTML || '';
      const w = window.open('', '_blank', 'width=900,height=760');
      if (!w) {
        window.print();
        return;
      }
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>改善提案登錄表 - ${esc(p.title)}</title><style>body{font-family:"Microsoft JhengHei",sans-serif;padding:12px;color:#000}@media print{body{padding:0}}</style></head><body>${content}<script>window.onload=function(){window.print();}<\/script></body></html>`);
      w.document.close();
    };
  }
}

function openKaizenLightboxModal(startIdx = 0) {
  let idx = startIdx;
  function renderLightbox() {
    const kc = KAIZEN_CARDS[idx] || KAIZEN_CARDS[0];
    openModal(`
      <div class="modal-head" style="padding:4px 4px 12px;border-bottom:1px solid #e6decb;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span class="kaizen-badge-pill">${esc(kc.badge)}</span>
          <strong style="font-size:19px;color:#1e3f35;font-family:'Noto Serif TC','Songti TC','PMingLiU',Georgia,serif">${esc(kc.title)}</strong>
          <span class="kaizen-hl-tag">${esc(kc.highlight)}</span>
        </div>
        <button class="icon-btn" data-close style="font-size:18px">✕</button>
      </div>
      <div style="background:#141c19;padding:16px;border-radius:14px;text-align:center;position:relative;box-shadow:inset 0 2px 12px rgba(0,0,0,0.4)">
        <img src="${esc(kc.img)}" alt="${esc(kc.title)}" style="width:100%;max-height:74vh;object-fit:contain;border-radius:10px;display:block;margin:0 auto">
      </div>
      <div style="background:#f8f3e8;border:1px solid #e2d4b7;border-left:4px solid #b89446;border-radius:10px;padding:12px 16px;margin-top:12px">
        <div style="font-weight:800;color:#7c5c1a;font-size:13.5px;margin-bottom:5px;font-family:'Noto Serif TC','Songti TC','PMingLiU',Georgia,serif">📌 重點速讀（${esc(kc.highlight)}）</div>
        <ul class="kaizen-bullet-list" style="margin:0;font-size:13.5px">
          ${kc.points.map(pt => `<li>${pt}</li>`).join('')}
        </ul>
      </div>
      <div class="modal-foot" style="justify-content:space-between;padding:14px 4px 2px;margin-top:12px">
        <div style="display:flex;gap:10px;align-items:center">
          <button type="button" class="btn ghost" data-kz-prev style="padding:8px 16px;font-weight:700">◀ 上一張圖卡</button>
          <span class="muted" style="font-size:13px;font-weight:700">第 ${idx + 1} / ${KAIZEN_CARDS.length} 張</span>
          <button type="button" class="btn ghost" data-kz-next style="padding:8px 16px;font-weight:700">下一張圖卡 ▶</button>
        </div>
        <button type="button" class="btn primary" data-close style="padding:8px 22px;font-weight:800">關閉</button>
      </div>
    `, { xl: true });

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

function openVsComparisonLightboxModal(startIdx = 0) {
  let idx = startIdx;
  function renderVsLightbox() {
    const vc = VS_COMPARISON_CARDS[idx] || VS_COMPARISON_CARDS[0];
    openModal(`
      <div class="modal-head" style="padding:4px 4px 12px;border-bottom:1px solid #e6decb;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span class="kaizen-badge-pill">${esc(vc.badge)}</span>
          <strong style="font-size:19px;color:#1e3f35;font-family:'Noto Serif TC','Songti TC','PMingLiU',Georgia,serif">${esc(vc.title)}</strong>
        </div>
        <button class="icon-btn" data-close style="font-size:18px">✕</button>
      </div>
      <div style="background:#141c19;padding:16px;border-radius:14px;text-align:center;position:relative;box-shadow:inset 0 2px 12px rgba(0,0,0,0.4)">
        <img src="${esc(vc.img)}" alt="${esc(vc.title)}" style="width:100%;max-height:74vh;object-fit:contain;border-radius:10px;display:block;margin:0 auto">
      </div>
      <div class="vs-summary-pills" style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="vs-sum-row old" style="font-size:13.5px;padding:9px 14px">
          <span class="vs-tag old">2023 現行規定</span>
          <span>${esc(vc.oldSummary)}</span>
        </div>
        <div class="vs-sum-row new" style="font-size:13.5px;padding:9px 14px">
          <span class="vs-tag new">2026 建議優化</span>
          <strong>${esc(vc.newSummary)}</strong>
        </div>
      </div>
      <div class="vs-why-box" style="margin-top:10px;padding:12px 16px">
        <div class="vs-why-title" style="font-size:13.5px">💡 為什麼這樣改？（管理效益）</div>
        <div class="vs-why-text" style="font-size:13.5px">${vc.whyChange}</div>
      </div>
      <div class="modal-foot" style="justify-content:space-between;padding:14px 4px 2px;margin-top:12px">
        <div style="display:flex;gap:10px;align-items:center">
          <button type="button" class="btn ghost" data-vs-prev style="padding:8px 16px;font-weight:700">◀ 上一張對比圖卡</button>
          <span class="muted" style="font-size:13px;font-weight:700">第 ${idx + 1} / ${VS_COMPARISON_CARDS.length} 張</span>
          <button type="button" class="btn ghost" data-vs-next style="padding:8px 16px;font-weight:700">下一張對比圖卡 ▶</button>
        </div>
        <button type="button" class="btn primary" data-close style="padding:8px 22px;font-weight:800">關閉</button>
      </div>
    `, { xl: true });

    const prevBtn = document.querySelector('[data-vs-prev]');
    const nextBtn = document.querySelector('[data-vs-next]');
    if (prevBtn) {
      prevBtn.onclick = () => {
        idx = (idx - 1 + VS_COMPARISON_CARDS.length) % VS_COMPARISON_CARDS.length;
        renderVsLightbox();
      };
    }
    if (nextBtn) {
      nextBtn.onclick = () => {
        idx = (idx + 1) % VS_COMPARISON_CARDS.length;
        renderVsLightbox();
      };
    }
  }
  renderVsLightbox();
}
