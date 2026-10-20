// ☕ 晨間補給站（三合一輕量資訊卡：自行車新聞與延伸話題 / 每日笑話 / 歷史上的今天）
import { state, myUid, isAdmin, saveVibeDoc } from '../data.js';
import { esc, ymd, toast, openModal, closeModal } from '../utils.js';

// 內建精選幽默笑話庫（依日期 Hash 每日自動換一則，全組員當天看到同一則有共鳴，亦可按「換一則」或投稿）
const BUILTIN_JOKES = [
  '主管問：「為什麼你這週進度落後？」我：「因為我在等靈感，結果靈感搭到沒電的 YouBike 2.0E。」',
  '剛剛去便利商店買咖啡，店員問：「載具嗎？」我：「不，我騎 YouBike 來的。」空氣突然安靜了三秒。',
  '小明去面試，面試官問：「你最大的缺點是什麼？」小明：「太誠實。」面試官：「我覺得這不算缺點啊？」小明：「我根本不在乎你怎麼想。」',
  '外勤同仁最怕的三件事：1. 手機剩 5% 電 2. 下雨沒帶雨衣 3. 要還車時發現最後一格剛被推進去。',
  '有一天火柴頭抓癢抓太大力，然後他就著火了。送醫後包著繃帶出來，他就變成了棉花棒。',
  '工程師去買包子，老婆交代：「看到西瓜就買一個。」結果工程師只買了一個包子回來，因為他看到賣西瓜的了。',
  '為什麼企鵝的肚子是白色的？因為牠手太短，洗澡的時候只能洗到肚子。',
  '今天早上量體重，發現自己瘦了兩公斤！仔細一看，原來是忘記戴眼鏡，連體重計都看不清楚。',
  '客戶：「這個需求很簡單，明天能上線嗎？」設計師：「生小孩也很簡單，但找九個孕婦也沒辦法一個月生出來喔！」',
  '去早餐店點餐：「阿姨，我要一份蛋餅不要蛋。」阿姨愣了一下：「那叫餅。」',
  '騎 YouBike 上坡的時候我以為自己在環法自行車賽，看了一眼時速：6 公里，連散步的阿伯都超我車。',
  '同事問我：「你每天上班怎麼都看起來這麼有精神？」我：「這叫迴光返照。」',
  '「醫師，我最近記憶力變得很差。」醫師：「什麼時候開始的？」病患：「什麼時候開始什麼？」',
  '螃蟹過馬路被撞到，警察問牠：「你為什麼不看路？」螃蟹委屈地說：「我有看啊，只是我走路橫著走嘛！」',
  '老闆：「我們公司像一個大家庭！」員工心想：「難怪每天都有人叫我幫他擦屁股。」',
  '鬧鐘響的時候，人類會在 0.3 秒內完成以下思考：1. 今天星期幾 2. 請假扣多少錢 3. 算了還是起床吧。',
  '為什麼圖書館是最高的建築物？因為它有最多的「樓層（Stories）」。',
  '外勤巡檢時看到一台坐墊反轉的 YouBike，走近一看，車籃裡還放了一張紙條：「不是壞掉，是我怕坐墊被太陽曬太燙。」',
  '有個人去算命，算命師摸了摸他的骨頭說：「你這個人二十歲以前很有錢，二十歲以後就習慣沒錢了。」',
  '開會時主管說：「大家暢所欲言！」這句話就像路邊寫著「內有惡犬，但牠平常不咬人」一樣讓人不敢輕舉妄動。',
  '「你知道為什麼紅茶比綠茶有自信嗎？」因為紅茶都會說：「我（紅）的！」',
  '每次說「改天約吃飯」，那個「改天」通常比哈雷彗星回歸的週期還要長。',
  '老婆問老公：「如果我跟完美女神同時掉進水裡，你先救誰？」老公：「我先看是誰把完美女神推下去的。」',
  '冬天起床需要靠毅力，夏天出外勤需要靠超能力，星期一上班需要靠失憶。',
  '剛入職時：「我要改變世界！」入職三年後：「拜託今天 Excel 不要當機就好。」',
  '為什麼減肥永遠從明天開始？因為「今天」永遠抓不到「明天」。',
  '去買手搖飲：「微糖微冰謝謝。」店員：「我們微糖是三分糖喔。」我：「好，那給我像發薪水後第三天那種甜度就好。」',
  '綠豆從十樓掉下來會變成什麼？會變成「紅豆」，因為牠流血了。',
  '有一隻北極熊太無聊開始拔自己的毛，一根、兩根、三根……拔完最後一根時，牠發抖說：「好冷喔！」',
  '「為什麼行事曆上面的格子永遠不夠寫？」因為計畫趕不上變化，變化趕不上主管的一通電話。',
  '在台北騎 YouBike 最刺激的瞬間：綠燈倒數 5 秒，而對面的還車柱剛好只剩最後 1 空位！',
];

// 預設自行車與政策精選新聞（當 RSS 載入中或網路受限時的即時保底內容）
const FALLBACK_BIKE_NEWS = [
  { title: '公共自行車與 TPASS 通勤月票整合效益持續攀升，綠色運具轉乘率創新高', source: '交通政策快訊', link: 'https://news.google.com/search?q=YouBike+%E8%87%AA%E8%A1%8C%E8%BB%8A&hl=zh-TW&gl=TW&ceid=TW:zh-Hant', date: '最新趨勢' },
  { title: 'YouBike 2.0E 電輔車深受通勤與跨區騎乘青睞，周轉率表現亮眼', source: '產業動態', link: 'https://news.google.com/search?q=YouBike+2.0E&hl=zh-TW&gl=TW&ceid=TW:zh-Hant', date: '市場熱點' },
  { title: '各縣市持續擴充自行車專用道與安全騎乘環境，推動人本交通與減碳目標', source: '城市治理', link: 'https://news.google.com/search?q=%E8%87%AA%E8%A1%8C%E8%BB%8A%E9%81%93+%E6%94%BF%E7%AD%96&hl=zh-TW&gl=TW&ceid=TW:zh-Hant', date: '政策焦點' },
];

// 預設歷史上的今天保底資料庫（若 Wikipedia API 讀取中時立即顯示）
const FALLBACK_HISTORY = [
  { year: '1817', text: '德國發明家卡爾·德萊斯（Karl Drais）發明人類歷史上第一輛雙輪推進車「Draisine」，成為現代自行車的始祖。' },
  { year: '2009', text: '台北市公共自行車租賃系統 YouBike 於信義計畫區正式啟動示範營運，開啟台灣共享單車新紀元。' },
  { year: '1903', text: '第一屆環法自行車賽（Tour de France）於法國巴黎近郊正式開跑，成為全球最具指標性的自行車賽事。' },
  { year: '1969', text: '網際網路的前身 ARPANET 成功傳送第一條訊息，開啟全球數位通訊時代。' },
];

let cachedBikeNews = null;
let cachedWikiHistory = null;
let cachedDateStr = '';
let currentJokeOffset = 0;
let activeExpandedTab = null; // null | 'news' | 'joke' | 'history'

function getDayIndex(dateStr) {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  return h;
}

/** 非同步抓取 Google News RSS（自行車/YouBike/政策）與 Wikipedia 歷史上的今天 */
async function ensureExternalFeeds(todayStr, onReady) {
  if (cachedDateStr === todayStr && cachedBikeNews && cachedWikiHistory) return;
  cachedDateStr = todayStr;

  const [, mStr, dStr] = todayStr.split('-');
  const monthNum = parseInt(mStr, 10);
  const dayNum = parseInt(dStr, 10);

  // 1. Wikipedia 歷史上的今天 API
  if (!cachedWikiHistory) {
    try {
      const res = await fetch(`https://zh.wikipedia.org/api/rest_v1/feed/onthisday/events/${monthNum}/${dayNum}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.events) && json.events.length > 0) {
          cachedWikiHistory = json.events.slice(0, 8).map(ev => ({
            year: String(ev.year || ''),
            text: String(ev.text || '').trim(),
            url: ev.pages?.[0]?.content_urls?.desktop?.page || '',
          }));
          onReady?.();
        }
      }
    } catch (e) {
      cachedWikiHistory = FALLBACK_HISTORY;
    }
  }

  // 2. 自行車 / YouBike 即時新聞（透過 rss2json 轉發 Google News RSS）
  if (!cachedBikeNews) {
    try {
      const rssUrl = encodeURIComponent('https://news.google.com/rss/search?q=YouBike+OR+%E5%85%AC%E5%85%B1%E8%87%AA%E8%A1%8C%E8%BB%8A+OR+%E8%87%AA%E8%A1%8C%E8%BB%8A%E6%94%BF%E7%AD%96&hl=zh-TW&gl=TW&ceid=TW:zh-Hant');
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.items) && json.items.length > 0) {
          cachedBikeNews = json.items.slice(0, 6).map(item => ({
            title: String(item.title || '').replace(/ - [^-]+$/, ''),
            source: (String(item.title || '').match(/ - ([^-]+)$/) || [])[1] || '新聞快訊',
            link: item.link || '#',
            date: (item.pubDate || '').slice(5, 16),
          }));
          onReady?.();
        }
      }
    } catch (e) {
      cachedBikeNews = FALLBACK_BIKE_NEWS;
    }
  }
}

export function renderDailyVibeBar(container, onRerender) {
  const today = ymd();
  ensureExternalFeeds(today, onRerender);

  // 取得團隊投稿笑話與延伸話題
  const sharedJokesDoc = state.vibeShared.get('jokes') || { list: [], votes: {} };
  const sharedTopicsDoc = state.vibeShared.get('topics') || { list: [] };

  const customJokes = Array.isArray(sharedJokesDoc.list) ? sharedJokesDoc.list : [];
  const allJokes = [
    ...customJokes.map(j => ({ text: j.text, author: j.authorName, id: j.id })),
    ...BUILTIN_JOKES.map((text, idx) => ({ text, author: '系統精選', id: 'builtin_' + idx })),
  ];
  const baseIdx = getDayIndex(today);
  const currentJoke = allJokes[(baseIdx + currentJokeOffset) % allJokes.length];
  const jokeVotes = sharedJokesDoc.votes?.[currentJoke.id] || { up: [], cold: [] };
  const myUp = (jokeVotes.up || []).includes(myUid());
  const myCold = (jokeVotes.cold || []).includes(myUid());

  const newsList = cachedBikeNews || FALLBACK_BIKE_NEWS;
  const sharedTopics = Array.isArray(sharedTopicsDoc.list) ? sharedTopicsDoc.list : [];
  const topNews = sharedTopics[0]
    ? { title: `[組員分享] ${sharedTopics[0].title}`, source: sharedTopics[0].authorName, link: sharedTopics[0].url }
    : newsList[0];

  const historyList = cachedWikiHistory || FALLBACK_HISTORY;
  const topHistory = historyList[0] || FALLBACK_HISTORY[0];
  const [, mStr, dStr] = today.split('-');
  const mdLabel = `${parseInt(mStr, 10)}/${parseInt(dStr, 10)}`;

  container.innerHTML = `
    <div class="vibe-bar-wrap">
      <div class="vibe-pills-row">
        <!-- 1. 自行車新聞與趨勢 -->
        <div class="vibe-pill ${activeExpandedTab === 'news' ? 'active' : ''}" data-vibe-tab="news" title="點擊展開更多自行車新聞與組員話題分享">
          <span class="vibe-pill-tag bike">🚲 單車快訊</span>
          <span class="vibe-pill-text">${esc(topNews?.title || '查看最新自行車與政策動態')}</span>
          <span class="vibe-pill-caret">${activeExpandedTab === 'news' ? '▴' : '▾'}</span>
        </div>

        <!-- 2. 每日笑話一則 -->
        <div class="vibe-pill ${activeExpandedTab === 'joke' ? 'active' : ''}" data-vibe-tab="joke" title="點擊查看完整笑話、投票或投稿">
          <span class="vibe-pill-tag joke">😂 每日一笑</span>
          <span class="vibe-pill-text">${esc(currentJoke?.text || '')}</span>
          <span class="vibe-pill-caret">${activeExpandedTab === 'joke' ? '▴' : '▾'}</span>
        </div>

        <!-- 3. 歷史上的今天 -->
        <div class="vibe-pill ${activeExpandedTab === 'history' ? 'active' : ''}" data-vibe-tab="history" title="點擊查看歷史上的今天發生了什麼事">
          <span class="vibe-pill-tag history">📜 歷史今天 (${esc(mdLabel)})</span>
          <span class="vibe-pill-text">${esc(topHistory ? `${topHistory.year}年：${topHistory.text}` : '')}</span>
          <span class="vibe-pill-caret">${activeExpandedTab === 'history' ? '▴' : '▾'}</span>
        </div>
      </div>

      ${activeExpandedTab ? renderExpandedPanel(activeExpandedTab, {
        newsList, sharedTopics, currentJoke, jokeVotes, myUp, myCold, historyList, mdLabel,
      }) : ''}
    </div>
  `;

  // 綁定切換展開事件
  container.querySelectorAll('[data-vibe-tab]').forEach(el => {
    el.onclick = () => {
      const tab = el.dataset.vibeTab;
      activeExpandedTab = activeExpandedTab === tab ? null : tab;
      renderDailyVibeBar(container, onRerender);
    };
  });

  // 綁定關閉按鈕
  const closeBtn = container.querySelector('[data-vibe-close]');
  if (closeBtn) {
    closeBtn.onclick = () => {
      activeExpandedTab = null;
      renderDailyVibeBar(container, onRerender);
    };
  }

  // 笑話互動：換一則 / 投票 / 投稿
  const nextJokeBtn = container.querySelector('[data-next-joke]');
  if (nextJokeBtn) {
    nextJokeBtn.onclick = () => {
      currentJokeOffset = (currentJokeOffset + 1) % allJokes.length;
      renderDailyVibeBar(container, onRerender);
    };
  }

  container.querySelectorAll('[data-joke-vote]').forEach(btn => {
    btn.onclick = async () => {
      const kind = btn.dataset.jokeVote; // 'up' | 'cold'
      const uid = myUid();
      if (!uid) return;
      const allVotes = { ...(sharedJokesDoc.votes || {}) };
      const cur = { up: [...(jokeVotes.up || [])], cold: [...(jokeVotes.cold || [])] };
      const arr = new Set(cur[kind]);
      if (arr.has(uid)) arr.delete(uid);
      else arr.add(uid);
      cur[kind] = [...arr];
      allVotes[currentJoke.id] = cur;
      await saveVibeDoc('jokes', { list: customJokes, votes: allVotes });
      renderDailyVibeBar(container, onRerender);
    };
  });

  const addJokeBtn = container.querySelector('[data-add-joke]');
  if (addJokeBtn) {
    addJokeBtn.onclick = () => openSubmitJokeModal(customJokes, sharedJokesDoc.votes || {}, () => renderDailyVibeBar(container, onRerender));
  }

  // 新聞話題分享互動
  const addTopicBtn = container.querySelector('[data-add-topic]');
  if (addTopicBtn) {
    addTopicBtn.onclick = () => openSubmitTopicModal(sharedTopics, () => renderDailyVibeBar(container, onRerender));
  }

  container.querySelectorAll('[data-topic-like]').forEach(btn => {
    btn.onclick = async () => {
      const tid = btn.dataset.topicLike;
      const uid = myUid();
      const nextList = sharedTopics.map(t => {
        if (t.id !== tid) return t;
        const likes = new Set(Array.isArray(t.likes) ? t.likes : []);
        if (likes.has(uid)) likes.delete(uid);
        else likes.add(uid);
        return { ...t, likes: [...likes] };
      });
      await saveVibeDoc('topics', { list: nextList });
      renderDailyVibeBar(container, onRerender);
    };
  });

  container.querySelectorAll('[data-topic-del]').forEach(btn => {
    btn.onclick = async () => {
      const tid = btn.dataset.topicDel;
      const nextList = sharedTopics.filter(t => t.id !== tid);
      await saveVibeDoc('topics', { list: nextList });
      toast('已移除分享話題');
      renderDailyVibeBar(container, onRerender);
    };
  });
}

function renderExpandedPanel(tab, ctx) {
  if (tab === 'news') {
    const { newsList, sharedTopics } = ctx;
    return `
      <div class="vibe-drawer">
        <div class="vibe-drawer-head">
          <div>
            <strong>🚲 自行車產業、交通政策與市場趨勢</strong>
            <span class="muted" style="font-size:12px;margin-left:8px">自動聚合 Google News 即時新聞與組員延伸話題</span>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn sm primary" data-add-topic>＋ 分享話題／貼新聞</button>
            <button class="btn sm ghost" data-vibe-close>收起 ▴</button>
          </div>
        </div>
        <div class="vibe-news-grid">
          <div class="vibe-news-col">
            <div class="vibe-col-title">📰 即時自行車與政策新聞（點擊閱讀）</div>
            <ul class="vibe-news-list">
              ${newsList.map(n => `
                <li>
                  <a href="${esc(n.link)}" target="_blank" rel="noopener noreferrer" class="vibe-news-link">
                    <span class="vibe-news-title">${esc(n.title)}</span>
                    <span class="vibe-news-meta">${esc(n.source)}${n.date ? ' · ' + esc(n.date) : ''} ↗</span>
                  </a>
                </li>
              `).join('')}
            </ul>
          </div>
          <div class="vibe-news-col">
            <div class="vibe-col-title">💡 組員延伸話題與市場觀察（${sharedTopics.length}）</div>
            ${sharedTopics.length === 0 ? `
              <div class="muted" style="font-size:12.5px;padding:12px 0">目前尚無組員張貼延伸話題，看到有趣的單車政策或新聞歡迎點擊右上角「＋ 分享話題」！</div>
            ` : `
              <ul class="vibe-news-list">
                ${sharedTopics.slice(0, 6).map(t => {
                  const likes = Array.isArray(t.likes) ? t.likes : [];
                  const liked = likes.includes(myUid());
                  const canDel = t.uid === myUid() || isAdmin();
                  return `
                    <li style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px dashed var(--border)">
                      <div style="min-width:0;flex:1">
                        ${t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener" style="font-weight:700;font-size:13px;color:var(--primary)">${esc(t.title)} ↗</a>` : `<strong style="font-size:13px">${esc(t.title)}</strong>`}
                        ${t.note ? `<div style="font-size:12px;color:var(--text);margin-top:2px">${esc(t.note)}</div>` : ''}
                        <div class="muted" style="font-size:11px;margin-top:2px">由 ${esc(t.authorName)} 分享</div>
                      </div>
                      <div style="display:flex;gap:4px;align-items:center;flex-shrink:0">
                        <button class="btn sm ${liked ? 'primary' : 'ghost'}" data-topic-like="${esc(t.id)}" style="padding:2px 8px;font-size:11.5px">👍 ${likes.length}</button>
                        ${canDel ? `<button class="btn sm ghost" data-topic-del="${esc(t.id)}" style="padding:2px 6px;font-size:11px;color:var(--danger)">✕</button>` : ''}
                      </div>
                    </li>
                  `;
                }).join('')}
              </ul>
            `}
          </div>
        </div>
      </div>
    `;
  }

  if (tab === 'joke') {
    const { currentJoke, jokeVotes, myUp, myCold } = ctx;
    const upCount = (jokeVotes.up || []).length;
    const coldCount = (jokeVotes.cold || []).length;
    return `
      <div class="vibe-drawer">
        <div class="vibe-drawer-head">
          <div>
            <strong>😂 每日笑話補給站</strong>
            <span class="muted" style="font-size:12px;margin-left:8px">來源：${esc(currentJoke?.author || '系統精選')}</span>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn sm" data-next-joke>🎲 換一則笑話</button>
            <button class="btn sm primary" data-add-joke>✍️ 投稿笑話</button>
            <button class="btn sm ghost" data-vibe-close>收起 ▴</button>
          </div>
        </div>
        <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px 16px;margin-top:8px;font-size:15px;line-height:1.65;color:#1E293B;font-weight:600">
          「${esc(currentJoke?.text || '')}」
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:10px">
          <button class="btn sm ${myUp ? 'primary' : ''}" data-joke-vote="up">👍 這好笑 (${upCount})</button>
          <button class="btn sm ${myCold ? 'primary' : ''}" data-joke-vote="cold">🥶 有點冷 (${coldCount})</button>
          <span class="muted" style="font-size:12px;margin-left:auto">每天自動更新一則，祝大家今日工作順心！</span>
        </div>
      </div>
    `;
  }

  if (tab === 'history') {
    const { historyList, mdLabel } = ctx;
    return `
      <div class="vibe-drawer">
        <div class="vibe-drawer-head">
          <div>
            <strong>📜 歷史上的今天（${esc(mdLabel)}）</strong>
            <span class="muted" style="font-size:12px;margin-left:8px">串接維基百科歷史大事紀</span>
          </div>
          <button class="btn sm ghost" data-vibe-close>收起 ▴</button>
        </div>
        <ul class="vibe-history-list">
          ${historyList.slice(0, 6).map(h => `
            <li>
              <span class="vibe-history-year">${esc(h.year)} 年</span>
              <span class="vibe-history-text">
                ${esc(h.text)}
                ${h.url ? `<a href="${esc(h.url)}" target="_blank" rel="noopener" style="font-size:11.5px;margin-left:6px">維基百科 ↗</a>` : ''}
              </span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }
  return '';
}

function openSubmitJokeModal(customJokes, votes, onDone) {
  openModal(`
    <div class="modal-head">
      <h3>✍️ 投稿團隊笑話</h3>
      <button class="icon-btn" data-close>✕</button>
    </div>
    <form class="form" id="joke-form">
      <label>笑話內容 <span class="req">*</span>
        <textarea name="text" rows="4" required placeholder="輸入好笑的笑話、諧音梗或外勤趣事…"></textarea>
      </label>
      <div class="modal-foot">
        <button type="button" class="btn" data-close>取消</button>
        <button type="submit" class="btn primary">送出投稿</button>
      </div>
    </form>
  `);
  document.getElementById('joke-form').onsubmit = async e => {
    e.preventDefault();
    const text = e.target.text.value.trim();
    if (!text) return;
    const nextList = [
      { id: 'cj_' + Date.now().toString(36), text, authorName: state.me?.displayName || '組員', uid: myUid(), at: new Date().toISOString() },
      ...customJokes,
    ];
    await saveVibeDoc('jokes', { list: nextList, votes });
    closeModal();
    toast('已新增笑話！');
    currentJokeOffset = 0;
    onDone?.();
  };
}

function openSubmitTopicModal(sharedTopics, onDone) {
  openModal(`
    <div class="modal-head">
      <h3>🚲 分享自行車新聞／市場趨勢話題</h3>
      <button class="icon-btn" data-close>✕</button>
    </div>
    <form class="form" id="topic-form">
      <label>話題或新聞標題 <span class="req">*</span>
        <input type="text" name="title" required placeholder="例如：台中市宣布新增 200 站 YouBike 2.0E 電輔車規劃">
      </label>
      <label>相關網址連結（選填）
        <input type="url" name="url" placeholder="https://...">
      </label>
      <label>簡短心得或延伸討論（選填）
        <textarea name="note" rows="2" placeholder="這對我們北區/南區場站配置很有參考價值…"></textarea>
      </label>
      <div class="modal-foot">
        <button type="button" class="btn" data-close>取消</button>
        <button type="submit" class="btn primary">發布分享</button>
      </div>
    </form>
  `);
  document.getElementById('topic-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const title = f.title.value.trim();
    if (!title) return;
    const nextList = [
      {
        id: 'tp_' + Date.now().toString(36),
        title,
        url: f.url.value.trim(),
        note: f.note.value.trim(),
        authorName: state.me?.displayName || '組員',
        uid: myUid(),
        likes: [myUid()],
        at: new Date().toISOString(),
      },
      ...sharedTopics,
    ];
    await saveVibeDoc('topics', { list: nextList });
    closeModal();
    toast('話題已分享至晨間補給站！');
    onDone?.();
  };
}
