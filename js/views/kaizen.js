// 💡 改善提案作業管理辦法（2023.05 修訂 · 五版）圖文懶人包小卡 ＆ 獎金點數試算專頁
import { esc, openModal } from '../utils.js';

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
  let kzScore = 65;
  let kzDeptStaff = 16;
  let kzDeptProposers = 14;

  function render() {
    const curKzTier = getKaizenTierByScore(kzScore);
    const kzRatePct = kzDeptStaff > 0 ? Math.round((kzDeptProposers / kzDeptStaff) * 100) : 0;
    const kzDeptEligible = kzRatePct >= 80;
    const kzDeptBonus = kzDeptEligible ? kzDeptStaff * 50 : 0;

    el.innerHTML = `
      <div class="toolbar" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <h2 class="view-title" style="margin:0">💡 改善提案（作業管理辦法圖文懶人包）</h2>
          <span class="tools-live-badge" style="background:#FEF3C7;color:#B45309;border-color:#FDE68A">📘 標準編號 GUT02202 · 2023.05.19 五版修訂</span>
          <span class="info-pill-tip" data-tip="將《改善提案作業管理辦法》文字與獎勵數字全面直白化！點擊任一張小卡可放大檢視，下方更提供單件採分獎金與部門推行活動費即時試算器">ⓘ 操作提示</span>
        </div>
        <div class="toolbar-end" style="display:flex;gap:6px;flex-wrap:wrap">
          <span class="yb-sum-pill yb2">🎯 必達目標：<b>每半年 1 件 · 全年 2 件</b></span>
          <span class="yb-sum-pill eyb">📅 每月截止：<b>20 日收件 · 次月 5 日公佈</b></span>
        </div>
      </div>

      <div class="card pad tools-builtin-card" style="margin-bottom:16px">
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

        <!-- 改善提案單件採分獎金點數 ＆ 部門活動費互動試算器 -->
        <div style="background:#FFFBEB;padding:12px 14px;border-radius:12px;border:1px solid #FDE68A">
          <div style="font-size:13.5px;font-weight:800;color:#92400E;margin-bottom:8px">🧮 改善提案獎金／點數 ＆ 部門推行績優活動費即時試算器</div>
          <div class="grid2" style="gap:12px">
            <div style="background:#ffffff;padding:10px 12px;border-radius:10px;border:1px solid #FDE68A">
              <label style="font-size:12px;color:#475569;font-weight:700;display:block">🏅 單件提案採分試算（輸入審查分數 0 ~ 100 分）
                <input type="number" data-kz-score value="${kzScore}" min="0" max="100" style="width:100%;margin-top:5px;padding:6px 10px;border-radius:8px;border:1px solid #CBD5E1;font-weight:800;font-size:14px">
              </label>
              <div style="margin-top:8px;font-size:13px;line-height:1.5" data-kz-score-res>
                對應等級：<span style="background:${curKzTier.badgeBg};color:${curKzTier.badgeColor};padding:2px 8px;border-radius:999px;font-weight:800">${curKzTier.grade}</span>
                · 獎金 <b style="color:#B45309;font-size:15px">${curKzTier.prizeText}</b> · 考績 <b>${curKzTier.points} 點</b>
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
                參與率：<b style="color:${kzDeptEligible ? '#059669' : '#DC2626'};font-size:15px">${kzRatePct}%</b>（${kzDeptEligible ? `✅ 達標！每半年可申請推行活動費 <b>NT$ ${kzDeptBonus.toLocaleString()} 元</b>（憑發票報銷）` : `⚠️ 未達 80% 門檻（需至少 ${Math.ceil(kzDeptStaff * 0.8)} 人提案）`}）
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    el.querySelectorAll('[data-kz-zoom]').forEach(wrap => {
      wrap.onclick = () => {
        const idx = Number(wrap.dataset.kzZoom) || 0;
        openKaizenLightboxModal(idx);
      };
    });

    const kzScoreIn = el.querySelector('[data-kz-score]');
    const kzScoreRes = el.querySelector('[data-kz-score-res]');
    if (kzScoreIn) {
      kzScoreIn.oninput = () => {
        kzScore = Math.max(0, Math.min(100, Number(kzScoreIn.value || 0)));
        const t = getKaizenTierByScore(kzScore);
        if (kzScoreRes) {
          kzScoreRes.innerHTML = `
            對應等級：<span style="background:${t.badgeBg};color:${t.badgeColor};padding:2px 8px;border-radius:999px;font-weight:800">${t.grade}</span>
            · 獎金 <b style="color:#B45309;font-size:15px">${t.prizeText}</b> · 考績 <b>${t.points} 點</b>
            <div class="muted tiny" style="margin-top:3px">核准權限：${esc(t.approver)}</div>
          `;
        }
      };
    }

    const kzStaffIn = el.querySelector('[data-kz-staff]');
    const kzPropIn = el.querySelector('[data-kz-proposers]');
    const kzDeptRes = el.querySelector('[data-kz-dept-res]');
    const updateKzDept = () => {
      kzDeptStaff = Math.max(1, Number(kzStaffIn?.value || 1));
      kzDeptProposers = Math.max(0, Number(kzPropIn?.value || 0));
      const pct = Math.round((kzDeptProposers / kzDeptStaff) * 100);
      const ok = pct >= 80;
      const bonus = ok ? kzDeptStaff * 50 : 0;
      if (kzDeptRes) {
        kzDeptRes.innerHTML = `參與率：<b style="color:${ok ? '#059669' : '#DC2626'};font-size:15px">${pct}%</b>（${ok ? `✅ 達標！每半年可申請推行活動費 <b>NT$ ${bonus.toLocaleString()} 元</b>（憑發票報銷）` : `⚠️ 未達 80% 門檻（需至少 ${Math.ceil(kzDeptStaff * 0.8)} 人提案）`}）`;
      }
    };
    if (kzStaffIn) kzStaffIn.oninput = updateKzDept;
    if (kzPropIn) kzPropIn.oninput = updateKzDept;
  }

  render();
  return { onData: render };
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
