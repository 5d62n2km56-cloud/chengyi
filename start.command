#!/bin/bash
# 双击启动承艺原型：在本机起一个静态服务并打开浏览器。关闭这个终端窗口即停止。
cd "$(dirname "$0")"
PORT=5173
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT + 1)); done
echo "承艺原型运行在 http://localhost:$PORT"
echo "关闭此窗口即停止。"
(sleep 1 && open "http://localhost:$PORT") &
python3 -m http.server $PORT --bind 127.0.0.1
