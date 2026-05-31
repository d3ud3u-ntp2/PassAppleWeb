import http.server

PORT = 8000

# CGIを扱えるハンドラーを指定
handler = http.server.CGIHTTPRequestHandler

# サーバーの起動設定
with http.server.HTTPServer(("", PORT), handler) as httpd:
    print(self_address := f"Serving CGI on port {PORT}...")
    httpd.serve_forever()