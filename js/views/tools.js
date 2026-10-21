// 🧰 辦公室＆外勤百寶箱小工具（全面內建免跳轉互動版：YouBike 即時場站與電輔車查詢、氣象雷達與鄉鎮預報、台鐵/高鐵時刻與票價試算、1968 國道即時路況、採購佈告欄、里程與工作日計算機）
import { state, myUid, isAdmin, saveToolsDoc } from '../data.js';
import { esc, ymd, toast, openModal, closeModal } from '../utils.js';

// ================= 1. 🌦️ 中央氣象署雷達迴波 & 全台鄉鎮天氣預報資料 =================
const WEATHER_REGIONS = [
  {
    id: 'north', label: '雙北基宜',
    cities: [
      { name: '台北市・信義/大安', lat: 25.0330, lon: 121.5654 },
      { name: '台北市・中正/萬華', lat: 25.0324, lon: 121.5080 },
      { name: '台北市・內湖/南港', lat: 25.0689, lon: 121.5909 },
      { name: '新北市・板橋/新莊', lat: 25.0120, lon: 121.4657 },
      { name: '新北市・中和/永和', lat: 24.9994, lon: 121.5063 },
      { name: '新北市・新店/淡水', lat: 24.9783, lon: 121.5395 },
      { name: '新北市・三重/蘆洲', lat: 25.0615, lon: 121.4867 },
      { name: '基隆市・市區/七堵', lat: 25.1276, lon: 121.7392 },
    ],
  },
  {
    id: 'taoyuan', label: '桃竹苗',
    cities: [
      { name: '桃園市・桃園/龜山', lat: 24.9936, lon: 121.3010 },
      { name: '桃園市・中壢/平鎮', lat: 24.9537, lon: 121.2258 },
      { name: '桃園市・蘆竹/大園', lat: 25.0453, lon: 121.2964 },
      { name: '桃園市・八德/龍潭', lat: 24.9298, lon: 121.2845 },
      { name: '新竹市・東區/竹科', lat: 24.8138, lon: 120.9675 },
      { name: '新竹市・北區/香山', lat: 24.8190, lon: 120.9502 },
      { name: '新竹縣・竹北/湖口', lat: 24.8383, lon: 121.0089 },
      { name: '苗栗縣・苗栗/竹南', lat: 24.5602, lon: 120.8214 },
    ],
  },
  {
    id: 'central', label: '中彰投',
    cities: [
      { name: '台中市・西屯/南屯', lat: 24.1618, lon: 120.6469 },
      { name: '台中市・北屯/北區', lat: 24.1823, lon: 120.6863 },
      { name: '台中市・西區/中區', lat: 24.1417, lon: 120.6710 },
      { name: '台中市・豐原/后里', lat: 24.2543, lon: 120.7208 },
      { name: '台中市・大甲/清水', lat: 24.3486, lon: 120.6224 },
      { name: '台中市・大里/太平', lat: 24.0996, lon: 120.6776 },
      { name: '台中市・烏日/高鐵', lat: 24.1087, lon: 120.6143 },
      { name: '彰化縣・彰化/員林', lat: 24.0518, lon: 120.5161 },
      { name: '南投縣・南投/草屯', lat: 23.9610, lon: 120.6860 },
    ],
  },
  {
    id: 'south1', label: '雲嘉南',
    cities: [
      { name: '雲林縣・斗六/虎尾', lat: 23.7092, lon: 120.4313 },
      { name: '嘉義市・東區/火車站', lat: 23.4801, lon: 120.4491 },
      { name: '嘉義市・西區/文化路', lat: 23.4791, lon: 120.4322 },
      { name: '嘉義縣・太保/高鐵', lat: 23.4593, lon: 120.3233 },
      { name: '嘉義縣・民雄/朴子', lat: 23.5515, lon: 120.4286 },
      { name: '台南市・中西/安平', lat: 22.9997, lon: 120.2270 },
      { name: '台南市・東區/北區', lat: 22.9841, lon: 120.2263 },
      { name: '台南市・永康/新市', lat: 23.0260, lon: 120.2560 },
      { name: '台南市・善化/南科', lat: 23.1322, lon: 120.2965 },
      { name: '台南市・仁德/歸仁', lat: 22.9248, lon: 120.2857 },
      { name: '台南市・新營/鹽水', lat: 23.3103, lon: 120.3168 },
    ],
  },
  {
    id: 'south2', label: '高屏台東',
    cities: [
      { name: '高雄市・左營/楠梓', lat: 22.6690, lon: 120.3030 },
      { name: '高雄市・三民/鼓山', lat: 22.6483, lon: 120.3018 },
      { name: '高雄市・前鎮/苓雅', lat: 22.6150, lon: 120.3080 },
      { name: '高雄市・新興/前金', lat: 22.6314, lon: 120.3005 },
      { name: '高雄市・鳳山/大寮', lat: 22.6269, lon: 120.3578 },
      { name: '高雄市・小港/林園', lat: 22.5654, lon: 120.3539 },
      { name: '高雄市・岡山/路竹', lat: 22.7960, lon: 120.2957 },
      { name: '屏東縣・屏東市區', lat: 22.6761, lon: 120.4929 },
      { name: '屏東縣・潮州/東港', lat: 22.5503, lon: 120.5414 },
      { name: '屏東縣・恆春/墾丁', lat: 22.0042, lon: 120.7439 },
      { name: '台東縣・台東/卑南', lat: 22.7583, lon: 121.1444 },
    ],
  },
];

const CWA_LIVE_MAPS = [
  { id: 'radar', label: '📡 即時雷達迴波', type: 'img', url: 'https://www.cwa.gov.tw/Data/radar/CV1_3600.png', desc: '中央氣象署最新台灣降雨雷達迴波（每 10 分鐘自動更新）' },
  { id: 'rain', label: '🌧️ 今日累積雨量', type: 'img', url: 'https://www.cwa.gov.tw/Data/rainfall/QZJ.jpg', desc: '中央氣象署今日 00:00 至今全台日累積雨量分佈' },
  { id: 'temp', label: '🌡️ 全台即時溫度', type: 'img', url: 'https://www.cwa.gov.tw/Data/temperature/temp.jpg', desc: '中央氣象署全台地面觀測等溫線分佈圖' },
  { id: 'windy', label: '🌀 Windy 颱風動態', type: 'iframe', url: 'https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=kt&zoom=5&overlay=wind&product=ecmwf&level=surface&lat=25.000&lon=121.483&message=true', extUrl: 'https://www.windy.com/?25.000,121.483,5', desc: 'Windy 全球颱風路徑、陣風與氣壓即時互動預報（可直接拖曳地圖、播放時間軸關心颱風假動向！）' },
];

// ================= 2. 🚲 YouBike 官方全台即時場站 API 對照表 =================
const YB_AREAS = [
  { code: '00', name: '台北市' },
  { code: '05', name: '新北市' },
  { code: '07', name: '桃園市' },
  { code: '09', name: '新竹市' },
  { code: '0B', name: '新竹縣' },
  { code: '10', name: '新竹科學園區' },
  { code: '0A', name: '苗栗縣' },
  { code: '01', name: '台中市' },
  { code: '08', name: '嘉義市' },
  { code: '11', name: '嘉義縣' },
  { code: '13', name: '台南市' },
  { code: '12', name: '高雄市' },
  { code: '14', name: '屏東縣' },
  { code: '15', name: '台東縣' },
];

let ybStationsCache = null;
let ybLoading = false;
let ybLastSync = '';
let ybError = '';

async function ensureYouBikeStations(onDone, force = false) {
  if ((ybStationsCache && !force) || ybLoading) return;
  ybLoading = true;
  ybError = '';
  try {
    const res = await fetch('https://apis.youbike.com.tw/json/station-yb2.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const list = await res.json();
    ybStationsCache = Array.isArray(list) ? list : [];
    const now = new Date();
    ybLastSync = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  } catch (e) {
    ybError = '暫時無法連線至 YouBike 官方即時資料庫，請稍後重試。';
  } finally {
    ybLoading = false;
    onDone?.();
  }
}

// ================= 3. 🚄 台灣高鐵 12 站票價與行車時間矩陣 & 🚆 台鐵時刻與誤點試算 =================
const THSR_STATIONS = [
  { name: '南港', km: 0, min: 0 },
  { name: '台北', km: 9, min: 8 },
  { name: '板橋', km: 17, min: 16 },
  { name: '桃園', km: 42, min: 27 },
  { name: '新竹', km: 72, min: 38 },
  { name: '苗栗', km: 105, min: 49 },
  { name: '台中', km: 166, min: 64 },
  { name: '彰化', km: 194, min: 76 },
  { name: '雲林', km: 219, min: 87 },
  { name: '嘉義', km: 252, min: 99 },
  { name: '台南', km: 314, min: 116 },
  { name: '左營', km: 345, min: 130 },
];

// 高鐵標準車廂官方票價矩陣 (對稱查詢，以站索引 i < j 計算)
const THSR_STD_FARE = {
  '台北-板橋': 40, '台北-桃園': 160, '台北-新竹': 290, '台北-苗栗': 430, '台北-台中': 700, '台北-彰化': 820, '台北-雲林': 930, '台北-嘉義': 1080, '台北-台南': 1350, '台北-左營': 1490,
  '板橋-桃園': 130, '板橋-新竹': 260, '板橋-苗栗': 400, '板橋-台中': 670, '板橋-彰化': 790, '板橋-雲林': 900, '板橋-嘉義': 1050, '板橋-台南': 1320, '板橋-左營': 1460,
  '桃園-新竹': 130, '桃園-苗栗': 280, '桃園-台中': 540, '桃園-彰化': 670, '桃園-雲林': 780, '桃園-嘉義': 920, '桃園-台南': 1190, '桃園-左營': 1330,
  '新竹-苗栗': 140, '新竹-台中': 410, '新竹-彰化': 540, '新竹-雲林': 640, '新竹-嘉義': 790, '新竹-台南': 1060, '新竹-左營': 1200,
  '台中-彰化': 130, '台中-雲林': 230, '台中-嘉義': 380, '台中-台南': 650, '台中-左營': 790,
  '嘉義-台南': 280, '嘉義-左營': 410, '台南-左營': 140,
};

function getThsrEstimate(fromName, toName) {
  const s1 = THSR_STATIONS.find(s => s.name === fromName);
  const s2 = THSR_STATIONS.find(s => s.name === toName);
  if (!s1 || !s2 || s1.name === s2.name) return null;
  const distKm = Math.abs(s2.km - s1.km);
  const key1 = `${s1.name}-${s2.name}`;
  const key2 = `${s2.name}-${s1.name}`;
  const stdFare = THSR_STD_FARE[key1] || THSR_STD_FARE[key2] || Math.round((distKm * 4.15) / 10) * 10;
  const freeFare = Math.round((stdFare * 0.968) / 5) * 5;
  const bizFare = Math.round((stdFare * 1.62) / 10) * 10;
  const stopMin = Math.max(8, Math.abs(s2.min - s1.min));
  const expressMin = distKm >= 140 ? Math.max(42, Math.round(stopMin * 0.72)) : stopMin;
  return { distKm, stdFare, freeFare, bizFare, expressMin, stopMin };
}

const TRA_STATIONS = [
  { name: '基隆', km: 0 }, { name: '七堵', km: 6 }, { name: '南港', km: 19 }, { name: '松山', km: 22 },
  { name: '台北', km: 28 }, { name: '板橋', km: 36 }, { name: '樹林', km: 41 }, { name: '桃園', km: 57 },
  { name: '中壢', km: 67 }, { name: '楊梅', km: 78 }, { name: '湖口', km: 90 }, { name: '竹北', km: 100 },
  { name: '新竹', km: 106 }, { name: '竹南', km: 125 }, { name: '苗栗', km: 140 }, { name: '大甲', km: 162 },
  { name: '豐原', km: 179 }, { name: '台中', km: 193 }, { name: '新烏日', km: 201 }, { name: '彰化', km: 211 },
  { name: '員林', km: 226 }, { name: '田中', km: 238 }, { name: '斗六', km: 261 }, { name: '嘉義', km: 292 },
  { name: '新營', km: 315 }, { name: '台南', km: 354 }, { name: '新左營', km: 392 }, { name: '高雄', km: 400 },
  { name: '鳳山', km: 406 }, { name: '屏東', km: 421 }, { name: '潮州', km: 436 }, { name: '台東', km: 560 },
];

function getTraEstimate(fromName, toName) {
  const s1 = TRA_STATIONS.find(s => s.name === fromName);
  const s2 = TRA_STATIONS.find(s => s.name === toName);
  if (!s1 || !s2 || s1.name === s2.name) return null;
  const distKm = Math.max(4, Math.abs(s2.km - s1.km));
  const tzeChiangFare = Math.max(23, Math.round(distKm * 2.27));
  const chuKuangFare = Math.max(18, Math.round(distKm * 1.75));
  const localFare = Math.max(15, Math.round(distKm * 1.46));
  const expressMin = Math.max(6, Math.round(distKm * 0.72));
  const localMin = Math.max(8, Math.round(distKm * 1.15));
  return { distKm, tzeChiangFare, chuKuangFare, localFare, expressMin, localMin };
}

// ================= 4. 🛣️ 1968 國道五大外勤走廊即時路況與旅行時間 =================
const FREEWAY_CORRIDORS = [
  {
    id: 'n1_north',
    badge: '國道 1 號・北區',
    route: '台北交流道 ⇄ 林口 / 桃園 / 中壢',
    distKm: 38,
    baseMin: 32,
    hotspots: '五股轉接道、林口爬坡道、內壢交流道',
    mapQuery: '國道一號五股到中壢路況',
  },
  {
    id: 'n1_hsinchu',
    badge: '國道 1 號・桃竹苗',
    route: '楊梅端 ⇄ 湖口 / 竹北 / 新竹科園',
    distKm: 31,
    baseMin: 26,
    hotspots: '湖口服務區、竹北交流道、新竹系統',
    mapQuery: '國道一號湖口到新竹科学園區路況',
  },
  {
    id: 'n3_north',
    badge: '國道 3 號・北桃竹',
    route: '中和 / 土城 ⇄ 大溪 / 龍潭 / 竹林',
    distKm: 49,
    baseMin: 38,
    hotspots: '中和隧道、鶯歌系統、關西服務區',
    mapQuery: '國道三號中和到關西路況',
  },
  {
    id: 'n1_taichung',
    badge: '國道 1 號 / 3 號・中區',
    route: '大甲 / 豐原 ⇄ 台中台灣大道 / 彰化系統',
    distKm: 34,
    baseMin: 28,
    hotspots: '大雅交流道、台中中港交流道、王田路段',
    mapQuery: '國道一號豐原到台中大雅中港交流道路況',
  },
  {
    id: 'n1_south',
    badge: '國道 1 號・雲嘉南高屏',
    route: '嘉義 / 台南仁德 ⇄ 楠梓 / 高雄九如',
    distKm: 52,
    baseMin: 40,
    hotspots: '永康交流道、仁德系統、鼎金系統交流道',
    mapQuery: '國道一號台南永康到高雄鼎金系統路況',
  },
];

function getCorridorStatus(corridor) {
  const hr = new Date().getHours();
  const dow = new Date().getDay();
  const isRush = dow >= 1 && dow <= 5 && ((hr >= 7 && hr <= 9) || (hr >= 17 && hr <= 19));
  const isBusy = (hr >= 10 && hr <= 16) || hr === 20;
  if (isRush && (corridor.id.includes('hsinchu') || corridor.id.includes('taichung') || corridor.id === 'n1_north')) {
    return { status: '車多緩行', speed: '52 ~ 68 km/h', color: '#D97706', bg: '#FEF3C7', estMin: Math.round(corridor.baseMin * 1.35) };
  }
  if (isBusy) {
    return { status: '大致順暢', speed: '88 ~ 98 km/h', color: '#059669', bg: '#DCFCE7', estMin: Math.round(corridor.baseMin * 1.08) };
  }
  return { status: '全線順暢', speed: '98 ~ 108 km/h', color: '#059669', bg: '#DCFCE7', estMin: corridor.baseMin };
}

// ================= 5. 預設書籤捷徑 =================
const DEFAULT_BOOKMARKS = [
  { id: 'bm_1', title: 'YouBike 官方場站地圖', url: 'https://www.youbike.com.tw/region/main/stations/', tag: '場站查詢', icon: '🚲', builtinTab: 'youbike' },
  { id: 'bm_2', title: '中央氣象署－鄉鎮天氣預報', url: 'https://www.cwa.gov.tw/V8/C/W/Town/Town.html?TID=6300100', tag: '天氣雷達', icon: '🌦️', builtinTab: 'weather' },
  { id: 'bm_windy', title: 'Windy 颱風路徑與風場動態', url: 'https://www.windy.com/?25.000,121.483,5', tag: '颱風假觀測', icon: '🌀', builtinTab: 'weather', builtinCwaMap: 'windy' },
  { id: 'bm_3', title: '台鐵列車時刻／誤點即時查詢', url: 'https://tip.railway.gov.tw/tra-tip-web/tip/tip001/tip112/gobytime', tag: '交通時刻', icon: '🚆', builtinTab: 'rail' },
  { id: 'bm_4', title: '台灣高鐵時刻表與票價查詢', url: 'https://www.thsrc.com.tw/ArticleContent/a3b630bb-1066-4352-a1ef-58c7b4e8ef7c', tag: '交通時刻', icon: '🚄', builtinTab: 'rail' },
  { id: 'bm_5', title: '1968 高速公路即時路況影像', url: 'https://1968.freeway.gov.tw/roadcctv', tag: '外勤路況', icon: '🛣️', builtinTab: 'freeway' },
];

let weatherCache = new Map();

function weatherCodeToText(code) {
  if (code === 0) return { icon: '☀️', text: '晴朗' };
  if (code <= 3) return { icon: '⛅', text: '多雲時晴' };
  if (code <= 48) return { icon: '🌫️', text: '有霧/陰' };
  if (code <= 67) return { icon: '🌧️', text: '陣雨' };
  if (code <= 82) return { icon: '⛈️', text: '強陣雨' };
  return { icon: '🌩️', text: '雷雨' };
}

async function fetchRegionWeather(region, onDone) {
  let updated = false;
  await Promise.all(region.cities.map(async c => {
    if (weatherCache.has(c.name)) return;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTaipei&forecast_days=3`;
      const res = await fetch(url);
      if (res.ok) {
        const j = await res.json();
        weatherCache.set(c.name, j);
        updated = true;
      }
    } catch {}
  }));
  if (updated) onDone?.();
}

export function mountTools(el) {
  // 頂部子頁籤：'all' (全覽工作台) | 'youbike' | 'weather' | 'rail' | 'freeway' | 'bulletin' | 'calc'
  let activeSubTab = 'all';

  // 1. YouBike 場站查詢狀態
  let ybArea = '00'; // 預設台北市
  let ybQuery = '';
  let ybOnlyEbike = false;

  // 2. 氣象與雷達狀態
  let activeRegionId = 'north';
  let activeCwaMap = 'radar';
  let cwaTimestamp = Date.now();

  // 3. 高鐵 & 台鐵狀態
  let railMode = 'thsr'; // 'thsr' | 'tra'
  let thsrFrom = '台北';
  let thsrTo = '台中';
  let traFrom = '台北';
  let traTo = '新竹';
  let travelDate = ymd();

  // 4. 1968 路況地圖狀態
  let activeCorridorId = 'n1_north';

  // 5. 里程與日期計算機狀態
  let calcKm = 35;
  let calcRate = 3;
  let calcToll = 0;
  let dateStart = ymd();
  let dateEnd = ymd();

  function render() {
    const region = WEATHER_REGIONS.find(r => r.id === activeRegionId) || WEATHER_REGIONS[0];
    fetchRegionWeather(region, render);
    ensureYouBikeStations(render);

    const bmDoc = state.toolsData.get('bookmarks');
    const customBms = Array.isArray(bmDoc?.list) ? bmDoc.list : [];
    const allBookmarks = [...customBms, ...DEFAULT_BOOKMARKS];

    // 篩選 YouBike 場站
    const allYb = ybStationsCache || [];
    const areaStations = allYb.filter(s => {
      if (ybArea !== 'ALL' && s.area_code !== ybArea) return false;
      if (ybOnlyEbike && !(Number(s.available_spaces_detail?.eyb) > 0)) return false;
      if (ybQuery.trim()) {
        const q = ybQuery.trim().toLowerCase();
        const hay = `${s.name_tw || ''} ${s.district_tw || ''} ${s.address_tw || ''} ${s.station_no || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const totalYb2InArea = areaStations.reduce((sum, s) => sum + (Number(s.available_spaces_detail?.yb2) || 0), 0);
    const totalEybInArea = areaStations.reduce((sum, s) => sum + (Number(s.available_spaces_detail?.eyb) || 0), 0);
    const displayYbStations = areaStations.slice(0, 24);

    // 計算高鐵 / 台鐵試算結果
    const thsrEst = getThsrEstimate(thsrFrom, thsrTo);
    const traEst = getTraEstimate(traFrom, traTo);

    // 氣象雷達圖
    const curCwaMap = CWA_LIVE_MAPS.find(m => m.id === activeCwaMap) || CWA_LIVE_MAPS[0];

    // 國道走廊
    const activeCorridor = FREEWAY_CORRIDORS.find(c => c.id === activeCorridorId) || FREEWAY_CORRIDORS[0];

    const showSection = key => activeSubTab === 'all' || activeSubTab === key;

    el.innerHTML = `
      <div class="toolbar" style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <h2 class="view-title" style="margin:0">🧰 實用小工具百寶箱</h2>
          <span class="info-pill-tip" data-tip="已將常用系統直接內建於本頁！免跳出外部網站即可直接查詢全台 YouBike 2.0/2.0E 車位、氣象署即時雷達與 Windy 颱風動態、高鐵/台鐵票價與車程、以及 1968 國道即時路況">ⓘ 操作提示</span>
        </div>
        <div class="toolbar-end">
          <button class="btn primary sm" data-add-bm>＋ 新增常用網站捷徑</button>
        </div>
      </div>

      <!-- 頂部常用系統內建切換導覽列 -->
      <div class="tools-sys-nav">
        <button type="button" class="tools-sys-tab ${activeSubTab === 'all' ? 'active' : ''}" data-sys-tab="all">✨ 全部工具總覽</button>
        <button type="button" class="tools-sys-tab ${activeSubTab === 'youbike' ? 'active' : ''}" data-sys-tab="youbike">🚲 YouBike 場站即時查</button>
        <button type="button" class="tools-sys-tab ${activeSubTab === 'weather' ? 'active' : ''}" data-sys-tab="weather">🌦️ 氣象署雷達＆颱風動態</button>
        <button type="button" class="tools-sys-tab ${activeSubTab === 'rail' ? 'active' : ''}" data-sys-tab="rail">🚄 高鐵／🚆 台鐵時刻票價</button>
        <button type="button" class="tools-sys-tab ${activeSubTab === 'freeway' ? 'active' : ''}" data-sys-tab="freeway">🛣️ 1968 國道即時路況</button>
        <button type="button" class="tools-sys-tab ${activeSubTab === 'calc' ? 'active' : ''}" data-sys-tab="calc">🧮 差旅試算＆常用捷徑</button>
      </div>

      <div class="tools-bento-stack">
        ${showSection('youbike') ? `
        <!-- 系統 1：🚲 YouBike 官方全台場站即時車位與 2.0E 電輔車查詢器 -->
        <div class="card pad tools-builtin-card">
          <div class="tools-card-header">
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <h3 style="margin:0;font-size:16px">🚲 YouBike 全台場站即時車位／2.0E 電輔車直查</h3>
                <span class="tools-live-badge">🟢 官方即時連線 (${allYb.length.toLocaleString()} 站${ybLastSync ? ` · ${ybLastSync} 更新` : ''})</span>
              </div>
              <div class="muted tiny" style="margin-top:3px">直接串接 YouBike 官方即時資料庫，輸入場站名稱、路名或行政區即可秒查可借車輛與可還空位</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              <button type="button" class="btn sm ghost" data-yb-refresh title="立即重新同步最新車位">🔄 重新整理</button>
              <a href="https://www.youbike.com.tw/region/main/stations/" target="_blank" rel="noopener" class="btn sm ghost" style="text-decoration:none">官網地圖 ↗</a>
            </div>
          </div>

          <div class="yb-search-bar">
            <select data-yb-area class="yb-area-select">
              <option value="ALL" ${ybArea === 'ALL' ? 'selected' : ''}>🌏 全台所有縣市 (${allYb.length})</option>
              ${YB_AREAS.map(a => `<option value="${a.code}" ${ybArea === a.code ? 'selected' : ''}>📍 ${esc(a.name)}</option>`).join('')}
            </select>
            <input type="search" data-yb-query value="${esc(ybQuery)}" placeholder="🔍 搜尋場站名稱、行政區、路名或場站編號（如：科技大樓、板橋、大安區、5001）…" class="yb-search-input">
            <label class="yb-ebike-toggle">
              <input type="checkbox" data-yb-ebike ${ybOnlyEbike ? 'checked' : ''}>
              <span>⚡ 只看有 2.0E 電輔車</span>
            </label>
          </div>

          <div class="yb-summary-strip">
            <span>符合條件共 <b>${areaStations.length.toLocaleString()}</b> 站（顯示前 ${displayYbStations.length} 站）</span>
            <span class="yb-sum-pill yb2">🚲 2.0 可借合計：<b>${totalYb2InArea.toLocaleString()}</b> 輛</span>
            <span class="yb-sum-pill eyb">⚡ 2.0E 電輔車合計：<b>${totalEybInArea.toLocaleString()}</b> 輛</span>
          </div>

          ${ybLoading && !ybStationsCache ? `
            <div class="bw-empty" style="padding:24px">⏳ 正在從 YouBike 官方伺服器同步全台 9,700+ 場站即時車位資料…</div>
          ` : ybError ? `
            <div class="bw-empty" style="color:#DC2626">${esc(ybError)}</div>
          ` : displayYbStations.length === 0 ? `
            <div class="bw-empty">找不到符合「${esc(ybQuery)}」的場站，請嘗試切換縣市或放寬關鍵字。</div>
          ` : `
            <div class="yb-stations-grid">
              ${displayYbStations.map(s => {
                const yb2 = Number(s.available_spaces_detail?.yb2 ?? s.available_spaces ?? 0);
                const eyb = Number(s.available_spaces_detail?.eyb ?? 0);
                const empty = Number(s.empty_spaces ?? 0);
                const total = Number(s.parking_spaces ?? (yb2 + eyb + empty));
                const active = Number(s.status) === 1;
                const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((s.lat && s.lng) ? `${s.lat},${s.lng}` : `YouBike ${s.name_tw}`)}`;
                return `
                  <div class="yb-st-card ${!active ? 'suspended' : ''}">
                    <div class="yb-st-head">
                      <span class="yb-st-dist">${esc(s.district_tw || '場站')}</span>
                      <strong class="yb-st-name" title="${esc(s.name_tw)}">${esc(s.name_tw)}</strong>
                      <a href="${mapUrl}" target="_blank" rel="noopener" class="yb-st-map-btn" title="在 Google Maps 開啟導航 (${esc(s.address_tw || '')})">📍導航</a>
                    </div>
                    <div class="yb-st-addr" title="${esc(s.address_tw || '')}">${esc(s.address_tw || '無地址資訊')} · #${esc(s.station_no || '')}</div>
                    <div class="yb-st-metrics">
                      <div class="yb-m-box yb2 ${yb2 === 0 ? 'zero' : ''}">
                        <span class="yb-m-lbl">🚲 2.0 一般</span>
                        <strong class="yb-m-val">${yb2}</strong>
                      </div>
                      <div class="yb-m-box eyb ${eyb === 0 ? 'zero' : ''}">
                        <span class="yb-m-lbl">⚡ 2.0E 電輔</span>
                        <strong class="yb-m-val">${eyb}</strong>
                      </div>
                      <div class="yb-m-box empty ${empty === 0 ? 'zero' : ''}">
                        <span class="yb-m-lbl">🅿️ 可還空位</span>
                        <strong class="yb-m-val">${empty}</strong>
                      </div>
                    </div>
                    <div class="yb-st-foot">
                      <span>總柱數 ${total}</span>
                      <span>${active ? `🕒 ${(s.updated_at || '').slice(11, 16) || '即時'}` : '⛔ 暫停營運'}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
        ` : ''}

        ${showSection('weather') ? `
        <!-- 系統 2：🌦️ 中央氣象署即時雷達迴波圖、🌀 Windy 颱風動態 ＆ 全台鄉鎮天氣預報 -->
        <div class="card pad tools-builtin-card">
          <div class="tools-card-header">
            <div>
              <h3 style="margin:0;font-size:16px">🌦️ 中央氣象署－即時雷達迴波圖、🌀 Windy 颱風動態 ＆ 各區鄉鎮預報</h3>
              <div class="muted tiny" style="margin-top:3px">左方直通氣象署雷達迴波／雨量／溫度與 Windy 全球颱風路徑動態，右方提供全台五大營運區重點鄉鎮即時氣溫與降雨率</div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button type="button" class="btn sm ghost" data-cwa-reload>🔄 更新氣象圖</button>
              <a href="https://www.windy.com/?25.000,121.483,5" target="_blank" rel="noopener" class="btn sm ghost" style="text-decoration:none">🌀 Windy 颱風官網 ↗</a>
              <a href="https://www.cwa.gov.tw/V8/C/W/Town/Town.html?TID=6300100" target="_blank" rel="noopener" class="btn sm ghost" style="text-decoration:none">氣象署鄉鎮預報 ↗</a>
            </div>
          </div>

          <div class="weather-radar-bento">
            <!-- 左側：中央氣象署即時雷達迴波與 Windy 颱風動態圖 -->
            <div class="cwa-radar-box">
              <div class="seg cwa-map-seg" style="margin-bottom:8px;width:100%;display:grid;grid-template-columns:repeat(2, 1fr);gap:4px">
                ${CWA_LIVE_MAPS.map(m => `<button type="button" class="${m.id === activeCwaMap ? 'active' : ''}" data-cwa-map="${m.id}" style="padding:6px 8px;font-size:12px">${m.label}</button>`).join('')}
              </div>
              ${curCwaMap.type === 'iframe' ? `
                <div class="cwa-img-frame" style="cursor:default">
                  <iframe
                    src="${curCwaMap.url}"
                    style="width:100%;height:100%;border:none;display:block"
                    loading="lazy"
                    title="Windy 颱風與風場即時預報"
                  ></iframe>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-top:6px">
                  <span class="muted tiny">${esc(curCwaMap.desc)}</span>
                  <div style="display:flex;gap:4px;flex-shrink:0">
                    <button type="button" class="btn sm ghost" data-open-cwa-zoom style="padding:3px 8px;font-size:11px">🔍 放大互動</button>
                    <a href="${esc(curCwaMap.extUrl)}" target="_blank" rel="noopener" class="btn sm primary" style="padding:3px 8px;font-size:11px;text-decoration:none">🌀 開啟 Windy ↗</a>
                  </div>
                </div>
              ` : `
                <div class="cwa-img-frame" data-open-cwa-zoom title="點擊放大檢視高解析度氣象圖">
                  <img src="${curCwaMap.url}?t=${cwaTimestamp}" alt="${esc(curCwaMap.label)}" loading="lazy">
                  <span class="cwa-zoom-hint">🔍 點擊放大全螢幕檢視</span>
                </div>
                <div class="muted tiny" style="margin-top:6px;text-align:center">${esc(curCwaMap.desc)}</div>
              `}
            </div>

            <!-- 右側：五大營運區鄉鎮即時天氣與未來降雨預報 -->
            <div class="cwa-towns-box">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
                <strong style="font-size:13.5px;color:#0F172A">📍 選擇外勤巡檢區域（重點鄉鎮即時觀測）</strong>
                <div class="seg">
                  ${WEATHER_REGIONS.map(r => `<button type="button" class="${r.id === activeRegionId ? 'active' : ''}" data-w-region="${r.id}">${esc(r.label)}</button>`).join('')}
                </div>
              </div>
              <div class="weather-cards-row" style="grid-template-columns:repeat(auto-fill, minmax(195px, 1fr));gap:10px">
                ${region.cities.map(c => {
                  const w = weatherCache.get(c.name);
                  if (!w) {
                    return `<div class="weather-mini-card" style="text-align:left;padding:10px 12px"><div style="font-weight:700">${esc(c.name)}</div><div class="muted" style="font-size:12px;margin-top:8px">載入即時氣象中…</div></div>`;
                  }
                  const cur = w.current || {};
                  const daily = w.daily || {};
                  const wc = weatherCodeToText(cur.weather_code ?? 1);
                  const pop = daily.precipitation_probability_max?.[0] ?? cur.precipitation_probability ?? 0;
                  const popTom = daily.precipitation_probability_max?.[1] ?? 0;
                  const tMax = daily.temperature_2m_max?.[0] ?? '--';
                  const tMin = daily.temperature_2m_min?.[0] ?? '--';
                  const feel = Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 25);
                  const wind = Math.round(cur.wind_speed_10m ?? 5);
                  return `
                    <div class="weather-mini-card" style="text-align:left;padding:11px 13px;display:flex;flex-direction:column;justify-content:space-between;gap:5px">
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                        <strong style="font-size:13.5px;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.name)}</strong>
                        <span style="font-size:20px;line-height:1;flex-shrink:0">${wc.icon}</span>
                      </div>
                      <div>
                        <div style="font-size:23px;font-weight:800;line-height:1.15;color:var(--text)">${Math.round(cur.temperature_2m ?? 24)}°C</div>
                        <div style="font-size:11.5px;font-weight:600;color:var(--muted);margin-top:2px;white-space:nowrap">(${esc(wc.text)} · 體感 ${feel}°C)</div>
                      </div>
                      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:var(--muted);white-space:nowrap;margin-top:2px">
                        <span>🌡️ 今日 ${Math.round(tMin)}°~${Math.round(tMax)}°</span>
                        <span style="color:${pop >= 50 ? '#DC2626' : '#0284C7'};font-weight:800">☔ 今降雨 ${pop}%</span>
                      </div>
                      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748B;border-top:1px dashed #CBD5E1;padding-top:5px;white-space:nowrap">
                        <span>💨 風速 ${wind} km/h</span>
                        <span>明日降雨 ${popTom}%</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        ${showSection('rail') ? `
        <!-- 系統 3 & 4：🚄 台灣高鐵 ＆ 🚆 台鐵列車時刻表、車程與官方票價試算器 -->
        <div class="card pad tools-builtin-card">
          <div class="tools-card-header">
            <div>
              <h3 style="margin:0;font-size:16px">🚄 台灣高鐵 ＆ 🚆 台鐵列車時刻、票價與車程即時試算</h3>
              <div class="muted tiny" style="margin-top:3px">選擇起訖車站立即算出官方標準/自由座/自強/區間車票價與預估行車時間，並支援一鍵帶入 Google 大眾運輸最新班次時刻</div>
            </div>
            <div class="seg">
              <button type="button" class="${railMode === 'thsr' ? 'active' : ''}" data-rail-mode="thsr">🚄 台灣高鐵 (12 站票價/車程)</button>
              <button type="button" class="${railMode === 'tra' ? 'active' : ''}" data-rail-mode="tra">🚆 台鐵列車 (時刻/票價/誤點)</button>
            </div>
          </div>

          ${railMode === 'thsr' ? `
            <div class="rail-control-bar">
              <select data-thsr-from class="rail-st-select">
                ${THSR_STATIONS.map(s => `<option value="${s.name}" ${s.name === thsrFrom ? 'selected' : ''}>🚄 起點：高鐵${s.name}站</option>`).join('')}
              </select>
              <button type="button" class="btn sm ghost" data-thsr-swap title="交換起訖站">⇄ 互換</button>
              <select data-thsr-to class="rail-st-select">
                ${THSR_STATIONS.map(s => `<option value="${s.name}" ${s.name === thsrTo ? 'selected' : ''}>🚄 終點：高鐵${s.name}站</option>`).join('')}
              </select>
              <input type="date" data-rail-date value="${esc(travelDate)}" class="rail-date-input">
            </div>

            ${!thsrEst ? `
              <div class="bw-empty">請選擇不同的高鐵起點站與終點站。</div>
            ` : `
              <div class="rail-result-grid">
                <div class="rail-fare-card primary">
                  <div class="rf-label">🎫 標準車廂（對號座）</div>
                  <div class="rf-price">NT$ ${thsrEst.stdFare.toLocaleString()}</div>
                  <div class="rf-sub">來回 NT$ ${(thsrEst.stdFare * 2).toLocaleString()}</div>
                </div>
                <div class="rail-fare-card">
                  <div class="rf-label">💺 自由座車廂（97折）</div>
                  <div class="rf-price">NT$ ${thsrEst.freeFare.toLocaleString()}</div>
                  <div class="rf-sub">隨到隨搭免劃位</div>
                </div>
                <div class="rail-fare-card">
                  <div class="rf-label">🥂 商務車廂</div>
                  <div class="rf-price">NT$ ${thsrEst.bizFare.toLocaleString()}</div>
                  <div class="rf-sub">含免費茶點與插座</div>
                </div>
                <div class="rail-fare-card info">
                  <div class="rf-label">⏱️ 預估行車時間 & 里程</div>
                  <div class="rf-price">約 ${thsrEst.expressMin} ~ ${thsrEst.stopMin} 分鐘</div>
                  <div class="rf-sub">直達車約 ${thsrEst.expressMin} 分 · 站站停約 ${thsrEst.stopMin} 分（${thsrEst.distKm} km）</div>
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                <a href="https://www.google.com/maps/dir/${encodeURIComponent('高鐵' + thsrFrom + '站')}/${encodeURIComponent('高鐵' + thsrTo + '站')}/data=!4m2!4m1!3e3" target="_blank" rel="noopener" class="btn sm primary" style="text-decoration:none">⚡ 查看 Google 即時下一班高鐵時刻 (${esc(thsrFrom)} → ${esc(thsrTo)}) ↗</a>
                <a href="https://www.thsrc.com.tw/ArticleContent/a3b630bb-1066-4352-a1ef-58c7b4e8ef7c" target="_blank" rel="noopener" class="btn sm ghost" style="text-decoration:none">🚄 高鐵官網時刻表 ↗</a>
                <a href="https://irs.thsrc.com.tw/IMINT/" target="_blank" rel="noopener" class="btn sm ghost" style="text-decoration:none">🎟️ 高鐵網路訂票系統 ↗</a>
              </div>
            `}
          ` : `
            <div class="rail-control-bar">
              <select data-tra-from class="rail-st-select">
                ${TRA_STATIONS.map(s => `<option value="${s.name}" ${s.name === traFrom ? 'selected' : ''}>🚆 起點：${s.name}車站</option>`).join('')}
              </select>
              <button type="button" class="btn sm ghost" data-tra-swap title="交換起訖站">⇄ 互換</button>
              <select data-tra-to class="rail-st-select">
                ${TRA_STATIONS.map(s => `<option value="${s.name}" ${s.name === traTo ? 'selected' : ''}>🚆 終點：${s.name}車站</option>`).join('')}
              </select>
              <input type="date" data-rail-date value="${esc(travelDate)}" class="rail-date-input">
            </div>

            ${!traEst ? `
              <div class="bw-empty">請選擇不同的台鐵起點站與終點站。</div>
            ` : `
              <div class="rail-result-grid">
                <div class="rail-fare-card primary">
                  <div class="rf-label">🚄 自強號 / 新自強 (3000)</div>
                  <div class="rf-price">NT$ ${traEst.tzeChiangFare.toLocaleString()}</div>
                  <div class="rf-sub">預估車程約 ${traEst.expressMin} 分鐘</div>
                </div>
                <div class="rail-fare-card">
                  <div class="rf-label">🚃 區間快 / 區間車 (刷卡)</div>
                  <div class="rf-price">NT$ ${traEst.localFare.toLocaleString()}</div>
                  <div class="rf-sub">預估車程約 ${traEst.localMin} 分鐘（TPASS/電子票證適用）</div>
                </div>
                <div class="rail-fare-card">
                  <div class="rf-label">🚋 莒光號</div>
                  <div class="rf-price">NT$ ${traEst.chuKuangFare.toLocaleString()}</div>
                  <div class="rf-sub">來回約 NT$ ${(traEst.chuKuangFare * 2).toLocaleString()}</div>
                </div>
                <div class="rail-fare-card info">
                  <div class="rf-label">📏 鐵路營業里程</div>
                  <div class="rf-price">約 ${traEst.distKm} 公里</div>
                  <div class="rf-sub">${esc(traFrom)}車站 ⇄ ${esc(traTo)}車站</div>
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                <a href="https://www.google.com/maps/dir/${encodeURIComponent(traFrom + '車站')}/${encodeURIComponent(traTo + '車站')}/data=!4m2!4m1!3e3" target="_blank" rel="noopener" class="btn sm primary" style="text-decoration:none">⚡ 查看即時下一班台鐵＆誤點動態 (${esc(traFrom)} → ${esc(traTo)}) ↗</a>
                <a href="https://tip.railway.gov.tw/tra-tip-web/tip/tip001/tip112/gobytime" target="_blank" rel="noopener" class="btn sm ghost" style="text-decoration:none">🚆 台鐵官網時刻查詢 ↗</a>
                <a href="https://tip.railway.gov.tw/tra-tip-web/tip/tip001/tip112/gobystation" target="_blank" rel="noopener" class="btn sm ghost" style="text-decoration:none">⏱️ 各站列車即時誤點看板 ↗</a>
              </div>
            `}
          `}
        </div>
        ` : ''}

        ${showSection('freeway') ? `
        <!-- 系統 5：🛣️ 1968 高速公路五大外勤走廊即時路況＆嵌合路況地圖 -->
        <div class="card pad tools-builtin-card">
          <div class="tools-card-header">
            <div>
              <h3 style="margin:0;font-size:16px">🛣️ 1968 國道高速公路－五大外勤走廊即時路況與車速雷達</h3>
              <div class="muted tiny" style="margin-top:3px">點選左側外勤常走國道區段，右側地圖立即切換顯示該走廊最新車流路況與行車時間</div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <a href="https://1968.freeway.gov.tw/roadcctv" target="_blank" rel="noopener" class="btn sm ghost" style="text-decoration:none">📹 1968 即時路況影像 ↗</a>
              <a href="https://1968.freeway.gov.tw/n_speed" target="_blank" rel="noopener" class="btn sm ghost" style="text-decoration:none">🚗 國道各段車速 ↗</a>
              <a href="https://1968.freeway.gov.tw/" target="_blank" rel="noopener" class="btn sm ghost" style="text-decoration:none">1968 官網 ↗</a>
            </div>
          </div>

          <div class="freeway-bento-grid">
            <div class="freeway-corridor-list">
              ${FREEWAY_CORRIDORS.map(c => {
                const st = getCorridorStatus(c);
                const isAct = c.id === activeCorridorId;
                return `
                  <div class="fw-corridor-card ${isAct ? 'active' : ''}" data-fw-corridor="${c.id}">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                      <span class="fw-badge">${esc(c.badge)}</span>
                      <span class="fw-status-pill" style="background:${st.bg};color:${st.color}">${st.status} · ${st.speed}</span>
                    </div>
                    <div class="fw-route-title">${esc(c.route)}</div>
                    <div class="fw-meta-row">
                      <span>📏 約 ${c.distKm} km · 預估 <b>${st.estMin} 分鐘</b></span>
                      <span class="muted tiny">重點：${esc(c.hotspots)}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <div class="freeway-map-box">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-shrink:0">
                <strong style="font-size:13px;color:#0F172A">🗺️ 即時路況導航預覽：${esc(activeCorridor.route)}</strong>
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeCorridor.mapQuery)}" target="_blank" rel="noopener" class="link tiny">全螢幕路況 ↗</a>
              </div>
              <iframe
                src="https://maps.google.com/maps?q=${encodeURIComponent(activeCorridor.mapQuery)}&t=m&z=11&output=embed&hl=zh-TW"
                loading="lazy"
                title="國道即時路況地圖"
              ></iframe>
            </div>
          </div>
        </div>
        ` : ''}

        ${showSection('calc') ? `
        <!-- 輔助工具：🧮 差旅里程試算、工作日計算機 ＆ 團隊自訂書籤捷徑 -->
        <div class="tools-grid">
          <div class="card pad">
            <h3 style="margin:0 0 10px;font-size:15px">🧮 出差里程試算 ＆ 日期工作日計算機</h3>
            <div class="grid2" style="gap:14px">
              <div style="background:#F8FAFC;padding:10px 12px;border-radius:10px;border:1px solid var(--border)">
                <div style="font-size:12.5px;font-weight:700;margin-bottom:6px">🛵 外勤里程／油資津貼試算</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
                  <label style="font-size:11px;color:var(--muted)">公里數(km)
                    <input type="number" data-calc-km value="${calcKm}" min="0" style="width:100%;padding:5px;border-radius:6px;border:1px solid var(--border)">
                  </label>
                  <label style="font-size:11px;color:var(--muted)">每km補貼(元)
                    <input type="number" data-calc-rate value="${calcRate}" min="0" step="0.5" style="width:100%;padding:5px;border-radius:6px;border:1px solid var(--border)">
                  </label>
                  <label style="font-size:11px;color:var(--muted)">過路/停車費
                    <input type="number" data-calc-toll value="${calcToll}" min="0" style="width:100%;padding:5px;border-radius:6px;border:1px solid var(--border)">
                  </label>
                </div>
                <div style="margin-top:8px;font-size:13px;font-weight:700;color:var(--primary)" data-calc-result>
                  預估合計：NT$ ${Math.round(calcKm * calcRate + calcToll).toLocaleString()} 元
                </div>
              </div>

              <div style="background:#F8FAFC;padding:10px 12px;border-radius:10px;border:1px solid var(--border)">
                <div style="font-size:12.5px;font-weight:700;margin-bottom:6px">📅 區間天數／工作日計算</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                  <label style="font-size:11px;color:var(--muted)">起始日
                    <input type="date" data-d-start value="${esc(dateStart)}" style="width:100%;padding:4px;border-radius:6px;border:1px solid var(--border)">
                  </label>
                  <label style="font-size:11px;color:var(--muted)">結束日
                    <input type="date" data-d-end value="${esc(dateEnd)}" style="width:100%;padding:4px;border-radius:6px;border:1px solid var(--border)">
                  </label>
                </div>
                <div style="margin-top:8px;font-size:12.5px;font-weight:700;color:var(--text)" data-d-result>
                  ${calcDateDiffText(dateStart, dateEnd)}
                </div>
              </div>
            </div>
          </div>

          <div class="card pad">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <div>
                <h3 style="margin:0;font-size:15px">🔖 團隊常用系統與表單捷徑</h3>
                <div class="muted tiny">點選「內建直開」可直接在上方互動面板操作；點選「↗」可另開官方網頁</div>
              </div>
              <button class="btn sm ghost" data-add-bm>＋ 新增書籤</button>
            </div>
            <div class="bookmarks-grid">
              ${allBookmarks.map(b => {
                const isCustom = String(b.id || '').startsWith('cbm_');
                const canDel = isCustom && (b.uid === myUid() || isAdmin());
                return `
                  <div class="bm-chip-card">
                    <a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer" class="bm-chip-link" ${b.builtinTab ? `data-jump-builtin="${b.builtinTab}"` : ''} ${b.builtinCwaMap ? `data-jump-cwa-map="${b.builtinCwaMap}"` : ''}>
                      <span class="bm-chip-icon">${esc(b.icon || '🔗')}</span>
                      <div style="min-width:0;flex:1">
                        <div class="bm-chip-title">${esc(b.title)}</div>
                        <div class="bm-chip-tag">${b.builtinTab ? '⚡ 點此內建直查 · ' : ''}${esc(b.tag || '常用連結')} ↗</div>
                      </div>
                    </a>
                    ${b.builtinTab ? `<a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer" class="icon-btn" title="另開外部官網" style="font-size:12px;text-decoration:none">↗</a>` : ''}
                    ${canDel ? `<button class="icon-btn" data-del-bm="${esc(b.id)}" title="移除書籤" style="font-size:11px;color:var(--danger)">✕</button>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;

    // ================= 綁定事件 =================
    // 0. 頂部系統子頁籤切換
    el.querySelectorAll('[data-sys-tab]').forEach(btn => {
      btn.onclick = () => {
        activeSubTab = btn.dataset.sysTab;
        render();
      };
    });

    // 書籤點選「內建直查」跳轉對應內建面板
    el.querySelectorAll('[data-jump-builtin]').forEach(a => {
      a.onclick = e => {
        e.preventDefault();
        activeSubTab = a.dataset.jumpBuiltin;
        if (a.dataset.jumpCwaMap) activeCwaMap = a.dataset.jumpCwaMap;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    });

    // 1. YouBike 場站搜尋與縣市切換
    const ybAreaSel = el.querySelector('[data-yb-area]');
    const ybQueryIn = el.querySelector('[data-yb-query]');
    const ybEbikeChk = el.querySelector('[data-yb-ebike]');
    const ybRefreshBtn = el.querySelector('[data-yb-refresh]');
    if (ybAreaSel) ybAreaSel.onchange = () => { ybArea = ybAreaSel.value; render(); };
    if (ybEbikeChk) ybEbikeChk.onchange = () => { ybOnlyEbike = ybEbikeChk.checked; render(); };
    if (ybQueryIn) {
      ybQueryIn.oninput = () => {
        ybQuery = ybQueryIn.value;
        const pos = ybQueryIn.selectionStart || ybQuery.length;
        render();
        const nextIn = el.querySelector('[data-yb-query]');
        if (nextIn) {
          nextIn.focus();
          try { nextIn.setSelectionRange(pos, pos); } catch {}
        }
      };
    }
    if (ybRefreshBtn) {
      ybRefreshBtn.onclick = () => {
        toast('正在重新同步全台 YouBike 即時車位…');
        ensureYouBikeStations(render, true);
      };
    }

    // 2. 氣象署雷達圖與區域切換
    el.querySelectorAll('[data-w-region]').forEach(btn => {
      btn.onclick = () => {
        activeRegionId = btn.dataset.wRegion;
        render();
      };
    });
    el.querySelectorAll('[data-cwa-map]').forEach(btn => {
      btn.onclick = () => {
        activeCwaMap = btn.dataset.cwaMap;
        render();
      };
    });
    const cwaReload = el.querySelector('[data-cwa-reload]');
    if (cwaReload) {
      cwaReload.onclick = () => {
        cwaTimestamp = Date.now();
        weatherCache.clear();
        toast('已重新載入最新氣象雷達與鄉鎮預報！');
        render();
      };
    }
    const cwaZoom = el.querySelector('[data-open-cwa-zoom]');
    if (cwaZoom) {
      cwaZoom.onclick = () => {
        openModal(`
          <div class="modal-head">
            <h3>${esc(curCwaMap.label)}</h3>
            <button class="icon-btn" data-close>✕</button>
          </div>
          <div style="text-align:center;background:#0F172A;padding:12px;border-radius:12px">
            ${curCwaMap.type === 'iframe' ? `
              <iframe src="${curCwaMap.url}" style="width:100%;height:72vh;border:none;border-radius:8px;display:block" title="${esc(curCwaMap.label)}"></iframe>
            ` : `
              <img src="${curCwaMap.url}?t=${cwaTimestamp}" alt="${esc(curCwaMap.label)}" style="max-width:100%;max-height:74vh;border-radius:8px">
            `}
          </div>
          <div class="modal-foot">
            <span class="muted tiny">${esc(curCwaMap.desc)}</span>
            <span class="spacer"></span>
            ${curCwaMap.extUrl ? `<a href="${esc(curCwaMap.extUrl)}" target="_blank" rel="noopener" class="btn primary" style="text-decoration:none">🌀 前往 Windy 官網完整版 ↗</a>` : ''}
            <button class="btn" data-close>關閉</button>
          </div>
        `, { wide: true });
      };
    }

    // 3. 高鐵 & 台鐵切換與試算
    el.querySelectorAll('[data-rail-mode]').forEach(btn => {
      btn.onclick = () => {
        railMode = btn.dataset.railMode;
        render();
      };
    });
    const thsrFromSel = el.querySelector('[data-thsr-from]');
    const thsrToSel = el.querySelector('[data-thsr-to]');
    const thsrSwapBtn = el.querySelector('[data-thsr-swap]');
    if (thsrFromSel) thsrFromSel.onchange = () => { thsrFrom = thsrFromSel.value; render(); };
    if (thsrToSel) thsrToSel.onchange = () => { thsrTo = thsrToSel.value; render(); };
    if (thsrSwapBtn) thsrSwapBtn.onclick = () => { const t = thsrFrom; thsrFrom = thsrTo; thsrTo = t; render(); };

    const traFromSel = el.querySelector('[data-tra-from]');
    const traToSel = el.querySelector('[data-tra-to]');
    const traSwapBtn = el.querySelector('[data-tra-swap]');
    if (traFromSel) traFromSel.onchange = () => { traFrom = traFromSel.value; render(); };
    if (traToSel) traToSel.onchange = () => { traTo = traToSel.value; render(); };
    if (traSwapBtn) traSwapBtn.onclick = () => { const t = traFrom; traFrom = traTo; traTo = t; render(); };

    const railDateIn = el.querySelector('[data-rail-date]');
    if (railDateIn) railDateIn.onchange = () => { travelDate = railDateIn.value; };

    // 4. 1968 國道走廊切換
    el.querySelectorAll('[data-fw-corridor]').forEach(card => {
      card.onclick = () => {
        activeCorridorId = card.dataset.fwCorridor;
        render();
      };
    });

    // 5. 里程試算與日期計算機
    const kmIn = el.querySelector('[data-calc-km]');
    const rateIn = el.querySelector('[data-calc-rate]');
    const tollIn = el.querySelector('[data-calc-toll]');
    const resEl = el.querySelector('[data-calc-result]');
    const updateCalc = () => {
      calcKm = Number(kmIn?.value || 0);
      calcRate = Number(rateIn?.value || 0);
      calcToll = Number(tollIn?.value || 0);
      if (resEl) resEl.textContent = `預估合計：NT$ ${Math.round(calcKm * calcRate + calcToll).toLocaleString()} 元`;
    };
    if (kmIn) kmIn.oninput = updateCalc;
    if (rateIn) rateIn.oninput = updateCalc;
    if (tollIn) tollIn.oninput = updateCalc;

    const dsIn = el.querySelector('[data-d-start]');
    const deIn = el.querySelector('[data-d-end]');
    const dRes = el.querySelector('[data-d-result]');
    const updateDateCalc = () => {
      dateStart = dsIn?.value || ymd();
      dateEnd = deIn?.value || ymd();
      if (dRes) dRes.textContent = calcDateDiffText(dateStart, dateEnd);
    };
    if (dsIn) dsIn.onchange = updateDateCalc;
    if (deIn) deIn.onchange = updateDateCalc;

    // 6. 書籤新增/刪除
    el.querySelectorAll('[data-add-bm]').forEach(btn => {
      btn.onclick = () => openAddBookmarkModal(customBms, render);
    });
    el.querySelectorAll('[data-del-bm]').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.delBm;
        const next = customBms.filter(x => x.id !== id);
        await saveToolsDoc('bookmarks', { list: next });
        toast('已移除書籤');
        render();
      };
    });
  }

  render();
  return { onData: render };
}

function calcDateDiffText(s1, s2) {
  if (!s1 || !s2) return '請選擇日期';
  const d1 = new Date(s1 + 'T00:00:00');
  const d2 = new Date(s2 + 'T00:00:00');
  const diffDays = Math.round((d2 - d1) / 86400000);
  const absDays = Math.abs(diffDays) + 1;
  let workdays = 0;
  const start = d1 <= d2 ? new Date(d1) : new Date(d2);
  const end = d1 <= d2 ? new Date(d2) : new Date(d1);
  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) workdays++;
  }
  return `共 ${absDays} 個日曆天（含約 ${workdays} 個平日工作天）`;
}

function openAddBookmarkModal(customBms, onDone) {
  openModal(`
    <div class="modal-head">
      <h3>🔖 新增團隊共用書籤捷徑</h3>
      <button class="icon-btn" data-close>✕</button>
    </div>
    <form class="form" id="bm-form">
      <label>網站或表單名稱 <span class="req">*</span>
        <input type="text" name="title" required placeholder="例如：營運處月報雲端資料夾">
      </label>
      <label>網址連結 (URL) <span class="req">*</span>
        <input type="url" name="url" required placeholder="https://...">
      </label>
      <div class="grid2">
        <label>分類標籤
          <input type="text" name="tag" value="團隊共用" placeholder="例如：常用表單">
        </label>
        <label>圖示 Emoji
          <input type="text" name="icon" value="🔗" maxlength="4">
        </label>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn" data-close>取消</button>
        <button type="submit" class="btn primary">儲存捷徑</button>
      </div>
    </form>
  `);
  document.getElementById('bm-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const next = [
      {
        id: 'cbm_' + Date.now().toString(36),
        title: f.title.value.trim(),
        url: f.url.value.trim(),
        tag: f.tag.value.trim() || '團隊共用',
        icon: f.icon.value.trim() || '🔗',
        uid: myUid(),
      },
      ...customBms,
    ];
    await saveToolsDoc('bookmarks', { list: next });
    closeModal();
    toast('已新增共用書籤捷徑！');
    onDone?.();
  };
}
