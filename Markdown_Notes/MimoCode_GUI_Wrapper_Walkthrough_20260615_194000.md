# Mimo Code CLI 1:1 GUI Wrapper 桌面外壳重构验收报告

---

### [2026-06-15 19:44:00] 验收结果汇总

## 验收概述

我们已成功将 MiMo One 客户端重构为官方 Mimo Code CLI 1:1 可视化完整桌面端外壳（GUI Wrapper）。底层通信架构由自建 LLM 逻辑全面转型为直接在后台通过进程控制管道控制系统的 `mimo` / `mimo-code` 原生命令行，彻底完成 1:1 全功能映射与数据面接轨。

---

## 核心实现说明

1. **Native 物理进程控制与 stdin/stdout 重定向**：
   - 在 [main.js](file:///d:/MiMo%20One/electron/main.js#L240) 中增加 `mimo-start-chat-process` 处理器，通过 `child_process.spawn` 常驻拉起 `mimo chat` 进程。
   - 监听其输出，利用主进程 IPC 实时推送 stdout 彩色流，前端 [App.tsx](file:///d:/MiMo%20One/src/App.tsx#L38) 接收并清洗 ANSI 逃逸控制符后流式追加在对话 B 栏；而原始带 ANSI 编码的终端彩色日志则流式展示于 C 栏。
   - 开发 `send-mimo-input` 接口，用户在聊天框回车后，输入流将物理送入常驻进程的 `stdin`，实现 1:1 动态控制台外壳包装。

2. **1:1 原生命令功能链映射**：
   - **项目初始化**：在 A 侧边栏新增“新建项目”按钮，绑定 [Sidebar.tsx](file:///d:/MiMo%20One/src/components/A-Zone/Sidebar.tsx#L29) 物理触发 `mimo init`。
   - **会话新建与隔离**：侧边栏新增“新建会话”，运行 `mimo session new` 并正则捕获生成的 `sess_<hash>` ID 挂载至 Zustand 的 `sessionId` 全局状态。
   - **配置静默覆写**：修改设置面板 [SettingsModal.tsx](file:///d:/MiMo%20One/src/components/SettingsModal.tsx#L24)，点击保存后立即向主进程发送 `save-mimo-config` 覆写家目录配置文件 `~/.mimo_config`，并静默执行 `mimo config set` 达成 1:1 原生配置覆写。

3. **仿真降级安全机制**：
   - 妥善处理宿主系统未安装 `mimo` CLI 时的极端兜底场景。一旦进程拉起失败，自动回退到前端仿真降级沙箱，保证网页演示与独立分发演示健全性。

---

## 验证结果

- **编译测试**：运行 `npm run build` 成功完成 Vite 静态编译与 Electron 模块压缩，无任何 TypeScript 类型检查警告。
- **Git 物理归档**：仓库安全审查通过，全量 wrapper 源码及手记已安全推送到 GitHub 主分支。
