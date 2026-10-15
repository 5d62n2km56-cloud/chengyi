#!/bin/zsh
# 双击启动完整的承艺：讲解后台（server/，端口 8000）+ 交互原型（本目录，端口 5173），然后打开浏览器。
# 后台在独立进程里运行，关掉这个窗口不会停；原型的静态服务随这个窗口关闭而停止。
# 只想看原型、不需要 AI，双击 start.command 即可（承艺之声会用规则演示）。
cd "$(dirname "$0")"
ROOT=$PWD
BACKEND="$ROOT/server"
APP="$ROOT"
URL="http://127.0.0.1:5173"

# 后台：已经在跑就跳过；首次使用要先按后端 README 装好 .venv
if curl -s --noproxy '*' -m 2 http://127.0.0.1:8000/health >/dev/null; then
  print "讲解后台已在运行：http://127.0.0.1:8000"
elif [[ -x "$BACKEND/.venv/bin/python" ]]; then
  (cd "$BACKEND" && .venv/bin/python scripts/bootstrap.py >/dev/null \
    && .venv/bin/python -m alembic upgrade head >/dev/null 2>&1 \
    && .venv/bin/python scripts/seed_chengyi.py \
    && .venv/bin/python scripts/run_local_background.py)
  for i in {1..40}; do
    curl -s --noproxy '*' -m 1 http://127.0.0.1:8000/health >/dev/null && break
    sleep 0.25
  done
else
  print "没找到讲解后台的 Python 环境（server/.venv），承艺之声会用规则演示。安装方法见 server/README.md。"
fi

# 原型：后台只允许 5173 端口的页面调用，所以端口固定
if curl -s --noproxy '*' -m 2 -o /dev/null "$URL/index.html"; then
  print "原型已在运行：$URL"
  open "$URL"
  exit 0
fi
if lsof -i :5173 >/dev/null 2>&1; then
  print "5173 端口被别的程序占用了，请先关掉它再双击本文件。"
  read -r "?按回车退出"
  exit 1
fi
print "承艺运行在 $URL ，关闭此窗口即停止原型（讲解后台继续在后台运行）。"
(sleep 1 && open "$URL") &
cd "$APP" && exec python3 -m http.server 5173 --bind 127.0.0.1
