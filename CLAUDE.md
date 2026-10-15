# 承艺

开始任何修改前，先读 `承艺_交接文档.md`。它记录了项目现状、已定的决策（功能按 demo，视觉为「素纸 · 天光」）、代码地图、测试与发布方法，以及下一步该从哪里开始。

- 本目录就是公开仓库 https://github.com/ZeroOnehub/chengyi 的根目录。`main` 一更新就会上线 https://zeroonehub.github.io/chengyi/ ，所以 push 或合并前要先征得负责人同意。同事通过 Fork + PR 参与，见 `CONTRIBUTING.md`。
- 改完要跑 `tests/smoke.html`，基线是 45/45。界面改动要逐张截图自查，不要并行截图。
- AI 讲解后台在 `server/`（同事搭建）。双击 `启动承艺.command` 会同时起后台和原型。`server/.env`、`server/.local-credentials.txt` 是密钥，仓库是公开的，绝不能提交或外传。
- 交互或现状有变化时，同步更新交接文档和 `README.md`。
