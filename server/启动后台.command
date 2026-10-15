#!/bin/zsh
set -e
cd "$(dirname "$0")"
if [[ ! -x .venv/bin/python ]]; then
  print "请先按 README.md 安装项目环境。"
  read -r "?按回车退出"
  exit 1
fi
.venv/bin/python scripts/bootstrap.py
.venv/bin/python -m alembic upgrade head
print "管理后台：http://127.0.0.1:8000"
print "体验讲解：http://127.0.0.1:8000/demo"
print "语音交流：http://127.0.0.1:8000/voice"
print "管理员账号保存在项目目录的 .local-credentials.txt。关闭本窗口会停止后台。"
if [[ "$(uname)" == "Darwin" ]]; then
  open .local-credentials.txt 2>/dev/null || true
  open http://127.0.0.1:8000
fi
exec .venv/bin/python -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
