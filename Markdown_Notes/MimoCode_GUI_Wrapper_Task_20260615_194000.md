# Mimo Code CLI 1:1 GUI Wrapper 重构任务清单

---

### [2026-06-15 19:42:00] 任务启动

## 任务进度清单

- `[x]` 主进程重构：在 `electron/main.js` 中开发 config 覆写、会话/项目管理、常驻 mimo chat 进程拉起与 stdin/stdout 通信处理器
- `[x]` 通道桥接：在 `electron/preload.js` 中将新的 IPC 通道和 on 推送事件暴露给渲染进程
- `[x]` 状态机扩展：在 `src/store/useAppStore.ts` 中增加 `sessionId` 状态及 Actions
- `[x]` 侧边栏映射：在 `src/components/A-Zone/Sidebar.tsx` 中增加新建项目和新建会话按钮，并绑定底层原生指令
- `[x]` 配置保存：在 `src/components/SettingsModal.tsx` 保存时触发 `save-mimo-config` 物理写盘
- `[x]` 会话流与终端流接轨：重构 `src/App.tsx`，在桌面端环境下使用 stdin/stdout 对接 mimo 进程，在 B/C 栏直接渲染其进程流
- `[x]` 编译验证：运行 `npm run build` 确保零打包报错
- `[x]` 规范手记编写：编写 `Markdown_Notes/MimoCode_GUI_Wrapper_20260615_043818.md` 规范设计手记
- `[/]` 提交推送：Git 归档提交并推送至 GitHub 个人资产库

---

### [2026-06-15 19:44:00] 1:1 GUI Wrapper 重构完毕

- 全链路物理进程包装和 IPC 逻辑已通过 Electron 完成部署。
- A 栏项目、会话按钮完美接轨原生 `mimo init` / `mimo session new` 命令。
- B 栏输入接入 `stdin`，B/C 栏渲染完美呈现 `stdout/stderr` 的终端流。
- 编译零报错，准备执行最终提交。

