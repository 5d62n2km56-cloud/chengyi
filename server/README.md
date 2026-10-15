# 非遗大模型讲解后端 · 轻量版

后台已接入 Dify 的“非遗讲解人”旧版 Agent，支持知识库问答、部位讲解、分句播报和短录音转写。

## 现在可以打开

- 管理后台：http://127.0.0.1:8000/
- 文字体验：http://127.0.0.1:8000/demo
- 语音体验：http://127.0.0.1:8000/voice
- 前端接口文档：http://127.0.0.1:8000/docs

管理员账号在项目目录的 `.local-credentials.txt`，Dify 与硅基流动密钥保存在后端 `.env`，这些文件不要交给前端或上传到公共仓库。

当前已有“青花缠枝莲纹碗”（C001）与碗心、外壁两个部位入口，详细事实从 Dify 非遗知识库检索。其他三件物品仍是演示资料。

## 使用

服务未运行时，双击 `启动后台.command`。已经运行时直接打开页面，不要重复启动占用同一个端口。

本次后台使用独立进程运行，关闭或中断聊天不会停止服务。独立启动入口为 `scripts/run_local_background.py`，日志位于 `data/backend.log`，进程编号位于 `data/backend.pid`。

管理页面可选择 Dify、保存应用 Key、测试连接；声音设置支持 Anna、Bella、Alex、Benjamin、Charles、David 六种音色。开发环境保存设置立即生效。

语音页面可以选择物品、点击部位、打字提问，也可以按住按钮说话后松开发送。首次使用需要用户允许麦克风。录音期间暂停声音，避免把讲解录进去；单次不超过 30 秒。

“暂停讲解”“继续播放”“再讲一遍”“停止讲解”等明确语音指令由页面执行播放控制，普通问题交给 Agent。声音依次播放，并显示第一段文字、第一段声音准备好与实际播放耗时。

## 承艺前端对接

上一级目录（仓库根目录）是承艺的交互原型，它的「承艺之声」通过 `/sessions/{id}/interact/stream` 调用本后台：本机地址 127.0.0.1:8000，页面端口 5173，已在 CORS_ORIGINS 里。

- **讲解条目**：每次提问都带一个讲解条目编号，比如 `chengyi-jiangxi-ceramic`。这些条目由 `scripts/seed_chengyi.py` 登记，可以重复运行。
  - 条目只描述网页场景，工艺事实仍从 Dify 非遗知识库检索。
  - 新数据库要先运行一次这个脚本。仓库根目录的 `启动承艺.command` 会自动运行它。
- **只用文字**：前端目前只接了文字流，没接语音。
- **作品状态**：在创作台提问时，前端会在问题前加一句作品状态，例如「【参观者正在瓷器工坊创作：花瓶，釉色月白…】」。
- **请勿改动**：`/interact/stream` 的事件名，以及 result 里的 `text`、`mode`、`sources` 字段，前端依赖这些。

## 安装到另一台电脑

需要 Python 3.12 或更新版本。不要复制本机 `.venv`：

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/bootstrap.py
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
```

安装后填写自己的 Dify 应用 Key 和硅基流动 Key，并录入与知识库名称对应的物品。当前本机的 C001 资料关联不会自动出现在新数据库中。

```sh
.venv/bin/python -m pytest -q
.venv/bin/python -m alembic check
```

## 验证与边界

2026-10-15：36 项自动测试通过；真实 Dify 知识库回答、硅基流动播报、录音文件转写及浏览器声音播放通过。浏览器实际开始播放约 7.25 秒，比第一段文字晚约 0.76 秒；这是一次短问答实测，不是固定速度承诺。

麦克风权限、实际按住录音操作及不同手机浏览器需人工试用。识别结果可能包含错字，不能凭一次转写成功认定准确率已达标。正式前端动画、真实 MySQL/PostgreSQL 数据库和服务器部署仍需联调。

前端调用自己的后台接口，不直接持有供应商 Key。详见 `docs/前端对接说明.md`、`docs/部署与模型配置.md`、`docs/语音交互需求.md` 和 `docs/验收记录.md`。
