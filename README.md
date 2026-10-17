# 📅 經營 Team 行事曆

讓組員登記出差、外出、公休等行程，接到電話時可以馬上知道同事在哪裡、什麼時候回來。

- **正式網址：<https://team-calendar-93cb2.web.app>**
- **純 HTML + JavaScript**：Firebase、月曆、Excel 元件都從 CDN 載入，**不需要安裝 Node.js**
- 本機預覽、Firebase 設定、部署都**只需要 Python**
- 資料庫：Firebase Firestore；登入：公司 Google 帳號（限 `@youbike.com.tw`）；網站：Firebase Hosting

---

## 一、Firebase 專案設定（已完成；換專案時才需要重做）

1. 在 Firebase 控制台建立專案 → Authentication 啟用 **Google** → 建立 **Firestore**（`asia-east1`、正式版模式）。
2. 專案設定 → 服務帳戶 → **產生新的私密金鑰**，把 JSON 放到本資料夾（已被 `.gitignore` 排除）。
3. 執行：
   ```powershell
   python tools/setup_firebase.py
   ```
   會自動部署 `firestore.rules`、建立網頁應用程式並寫入 `js/config.js`、設定授權網域。

> 🔐 金鑰等同資料庫最高權限：不要寄出、不要放雲端硬碟、不要上傳 GitHub。
> `js/config.js` 裡的 `firebaseConfig` 則不是機密，本來就會出現在網頁中；資料安全由 Firestore 規則保護。

## 二、本機預覽

雙擊 **`啟動本機預覽.bat`**，或執行 `python serve.py`，瀏覽器會開啟 <http://localhost:8000>。

> ⚠️ 請用 `localhost` 開啟（不要用 `127.0.0.1` 或直接雙擊 index.html），Google 登入才會成功。

**第一位登入的人會自動成為管理員**，並建立預設的行程類型。之後其他組員用公司帳號登入就會自動加入。

## 三、部署（更新正式網站）

```powershell
python tools/deploy.py
```

- 只會上傳 `index.html`、`css/`、`js/`（白名單），金鑰與腳本不會被上傳。
- 修改 `firestore.rules` 後，請重跑 `python tools/setup_firebase.py` 部署規則。
- 舊版本可在 Firebase 控制台 → Hosting → 發布紀錄 一鍵還原。

## 功能一覽

| 頁面 | 說明 |
|---|---|
| 🧭 今日動態 | 每位組員的即時狀態（在辦公室 / 外出中）、地點、聯絡電話、是否可接電話、代理人、預計回來時間；可切換日期 |
| 🗓️ 月曆 | 月曆檢視，顏色區分類型，可依組員 / 類型篩選；點日期新增、點行程查看 |
| 📊 總表 | 組員 × 日期排班表，週末與國定假日標色 |
| ⚙️ 管理 | （管理員）組員角色與停用、行程類型名稱 / 顏色 / 排序 |
| 🔔 通知 | 「與我相關」：被設為代理人、同行組員、被代為登記；「全組動態」：所有新增 / 修改 / 刪除 |
| ⬇ 匯出 | 指定月份、可篩選組員，匯出 Excel |

**權限**：所有組員都能看到全部行程；只能修改自己登記的行程；管理員可以修改所有人的行程，也可以代組員登記。

## 檔案結構

```
index.html               入口
css/style.css            樣式
js/config.js             ★ Firebase 設定、公司網域、時段定義
js/firebase.js           Firebase 初始化
js/data.js               資料存取（登入、同步、CRUD、通知）
js/schedule.js           時段 / 重疊 / 今日狀態邏輯
js/holidays.js           台灣國定假日（ruyut/TaiwanCalendar）
js/eventForm.js          行程檢視 / 編輯視窗
js/export.js             Excel 匯出
js/views/*.js            今日動態、月曆、總表、管理
firestore.rules          ★ Firestore 安全規則
serve.py                 本機預覽伺服器
tools/setup_firebase.py  Firebase 自動設定（規則、網頁設定、授權網域）
tools/deploy.py          部署到 Firebase Hosting
```

## 常見問題

- **登入後顯示「沒有存取權限」**：確認規則已部署（重跑 `tools/setup_firebase.py`），且使用 `@youbike.com.tw` 帳號。
- **畫面一直顯示「載入中」**：按 F12 看 Console 錯誤；通常是公司網路擋住 CDN（gstatic.com / jsdelivr.net）。
- **要修改上午 / 下午的時間**：編輯 `js/config.js` 的 `periods` 後重新部署。
- **要允許其他網域**：同時修改 `js/config.js` 的 `allowedDomains`，以及 `firestore.rules` 的 `isCompany()`。
