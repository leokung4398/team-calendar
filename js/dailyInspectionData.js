// 北區與南區每日品管巡檢區域規劃預設結構（實際排程與人員資料於登入後自 Firestore 雲端資料庫即時載入）
export const INITIAL_DAILY_INSPECTION_DATA = {
  "north": {
    "rules": {
      "tripForm": "依部門出差規範辦理",
      "office": "定期部門會議",
      "urban": {},
      "suburban": [],
      "special": []
    },
    "schedules": {}
  },
  "south": {
    "rules": {},
    "schedules": {}
  }
};
