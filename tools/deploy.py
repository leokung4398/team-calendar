"""
經營 Team 行事曆 - 部署到 Firebase Hosting（只需要 Python，不需要 Node.js / firebase CLI）

用法：python tools/deploy.py
網址：https://<專案ID>.web.app

安全設計：
- 只上傳白名單內的檔案（index.html、css/、js/），金鑰、Python、規則檔等一律不會上傳
- 金鑰內容只在記憶體中使用，不會印出
"""
import glob
import gzip
import hashlib
import os
import subprocess
import sys
import time

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://firebasehosting.googleapis.com/v1beta1"

# 只部署這些檔案（相對於專案根目錄）
INCLUDE = ["index.html", "css/**/*", "js/**/*"]
ALLOWED_EXT = {".html", ".css", ".js", ".json", ".svg", ".png", ".jpg", ".ico", ".webmanifest", ".txt"}


def collect_files():
    files = set()
    for pattern in INCLUDE:
        for p in glob.glob(os.path.join(ROOT, pattern), recursive=True):
            if os.path.isfile(p) and os.path.splitext(p)[1].lower() in ALLOWED_EXT:
                rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
                if "adminsdk" in rel or "serviceAccount" in rel:
                    continue  # 雙重保險：絕不上傳金鑰
                files.add(rel)
    return sorted(files)


def main():
    keys = glob.glob(os.path.join(ROOT, "*firebase-adminsdk*.json"))
    if len(keys) != 1:
        sys.exit("❌ 專案資料夾內需要恰好一把 *firebase-adminsdk*.json 金鑰")
    creds = service_account.Credentials.from_service_account_file(
        keys[0], scopes=["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/firebase"])
    s = AuthorizedSession(creds)
    P = creds.project_id

    def req(method, url, **kw):
        r = s.request(method, url, timeout=60, **kw)
        if not r.ok:
            msg = r.text[:600]
            if r.status_code == 403:
                msg += ("\n\n👉 服務帳戶沒有 Hosting 權限：請到 https://console.cloud.google.com/iam-admin/iam?project=" + P +
                        "\n   找到 firebase-adminsdk 開頭的帳戶 → 編輯 → 新增角色「Firebase Hosting 管理員」後重跑")
            sys.exit(f"❌ {method} {url.replace(API, '')} 失敗（{r.status_code}）：{msg}")
        return r.json() if r.text else {}

    # 1. 取得預設網站
    sites = req("GET", f"{API}/projects/{P}/sites").get("sites", [])
    site = next((x for x in sites if x.get("type") == "DEFAULT_SITE"), sites[0] if sites else None)
    if not site:
        sys.exit("❌ 找不到 Hosting 網站，請先在 Firebase 控制台 → Hosting → 開始使用（只需點到建立網站即可）")
    site_name = site["name"]  # projects/xxx/sites/yyy
    site_url = site.get("defaultUrl", "")

    # 2. 準備檔案（gzip + sha256）
    files = collect_files()
    blobs = {}
    manifest = {}
    for rel in files:
        with open(os.path.join(ROOT, rel), "rb") as f:
            gz = gzip.compress(f.read(), mtime=0)
        h = hashlib.sha256(gz).hexdigest()
        blobs[h] = gz
        manifest["/" + rel] = h
    print(f"📦 準備上傳 {len(files)} 個檔案到 {site_url}")

    # 3. 建立版本（設定：不快取 HTML/JS/CSS，確保更新立即生效；加上基本安全標頭）
    config = {
        "headers": [
            {"glob": "**", "headers": {
                "Cache-Control": "no-cache",
                "X-Content-Type-Options": "nosniff",
                "Referrer-Policy": "strict-origin-when-cross-origin",
            }},
        ],
    }
    version = req("POST", f"{API}/{site_name}/versions", json={"config": config})["name"]

    # 4. 上傳需要的檔案
    pop = req("POST", f"{API}/{version}:populateFiles", json={"files": manifest})
    need = pop.get("uploadRequiredHashes", [])
    upload_url = pop["uploadUrl"]
    for i, h in enumerate(need, 1):
        r = s.post(f"{upload_url}/{h}", data=blobs[h], headers={"Content-Type": "application/octet-stream"}, timeout=60)
        if not r.ok:
            sys.exit(f"❌ 上傳失敗（{r.status_code}）：{r.text[:300]}")
        print(f"  ⬆ {i}/{len(need)}")
    if not need:
        print("  （所有檔案都已存在，無需重新上傳）")

    # 5. 完成並發布 Hosting
    req("PATCH", f"{API}/{version}?update_mask=status", json={"status": "FINALIZED"})
    req("POST", f"{API}/{site_name}/releases?versionName={version}", json={"message": time.strftime("deploy %Y-%m-%d %H:%M")})
    print(f"🎉 網站部署完成：{site_url}")

    # 6. 同步部署 firestore.rules
    rules_file = os.path.join(ROOT, "firestore.rules")
    if os.path.isfile(rules_file):
        with open(rules_file, "r", encoding="utf-8") as rf:
            rules_content = rf.read()
        rc = s.post(f"https://firebaserules.googleapis.com/v1/projects/{P}/rulesets",
                    json={"source": {"files": [{"name": "firestore.rules", "content": rules_content}]}})
        if rc.ok:
            rs_data = rc.json()
            rel_body = {"release": {"name": f"projects/{P}/releases/cloud.firestore", "rulesetName": rs_data["name"]}}
            rc2 = s.patch(f"https://firebaserules.googleapis.com/v1/projects/{P}/releases/cloud.firestore", json=rel_body)
            if not rc2.ok:
                rc2 = s.post(f"https://firebaserules.googleapis.com/v1/projects/{P}/releases", json=rel_body["release"])
            if rc2.ok:
                print("🛡️ Firestore 安全規則同步發布成功！")
            else:
                print(f"⚠️ 規則發布失敗：{rc2.text[:200]}")
        else:
            print(f"⚠️ 規則編譯/上傳失敗：{rc.text[:200]}")

    # 7. 自動同步推送至 GitHub Pages (https://leokung4398.github.io/team-calendar/)
    if os.path.isdir(os.path.join(ROOT, ".git")):
        try:
            subprocess.run(["git", "add", "."], cwd=ROOT, check=True)
            status = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT, capture_output=True, text=True)
            if status.stdout.strip():
                msg = time.strftime("Auto deploy sync %Y-%m-%d %H:%M")
                subprocess.run(["git", "commit", "-m", msg], cwd=ROOT, check=True)
                subprocess.run(["git", "push", "origin", "main"], cwd=ROOT, check=True)
                print("🐙 GitHub Pages 同步推送完成：https://leokung4398.github.io/team-calendar/")
            else:
                print("🐙 GitHub 已是最新狀態：https://leokung4398.github.io/team-calendar/")
        except Exception as ge:
            print(f"⚠️ GitHub 同步略過：{ge}")


if __name__ == "__main__":
    main()

