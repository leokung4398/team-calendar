"""
經營 Team 行事曆 - 本機預覽伺服器（只需要 Python，不需要 Node.js）

用法：
    python serve.py            # 預設 http://localhost:8000
    python serve.py 8080       # 指定連接埠

說明：
- 只監聽 127.0.0.1（本機），區網其他電腦連不到，安全無虞。
- Google 登入需要使用 http://localhost:<port> 開啟（localhost 預設在 Firebase 授權網域中）。
- 按 Ctrl + C 結束。
"""
import functools
import http.server
import os
import sys
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    # Windows 登錄檔可能把 .js 對應成 text/plain，會導致 ES Module 無法載入，這裡強制指定
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
    }

    def end_headers(self):
        # 開發時避免瀏覽器快取舊的 JS
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "--quiet" not in sys.argv:
            super().log_message(fmt, *args)


def main():
    handler = functools.partial(Handler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        url = f"http://localhost:{PORT}/"
        print(f"本機預覽已啟動：{url}")
        print("按 Ctrl + C 結束")
        if "--no-browser" not in sys.argv:
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已停止")


if __name__ == "__main__":
    main()
