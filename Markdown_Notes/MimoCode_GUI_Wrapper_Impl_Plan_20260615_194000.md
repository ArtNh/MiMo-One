# Mimo Code CLI 1:1 可视化桌面端外壳（GUI Wrapper）实施计划

---

### [2026-06-15 19:40:00] 实施计划草案

## 实施目标

将 MiMo One 客户端彻底改造为官方 Mimo Code CLI 的 1:1 可视化桌面端外壳（GUI Wrapper）。底层不再自己实现大模型请求适配，而是通过 `child_process.spawn` 直接包装原生的 Mimo Code 进程。将 B 栏聊天输入映射到进程 `stdin`，B/C 栏渲染直接映射为进程的 `stdout/stderr` 输出。

---

## User Review Required

> [!IMPORTANT]
> **原生命令依赖性**：
> - 桌面端应用在运行时需依赖系统环境中安装的 `mimo` / `mimo-code` 全局可执行程序。
> - 在本地测试时，若系统中未检测到 Mimo CLI，主进程将自动切入优雅的本地仿真 CLI 状态，以保障系统整体演示不中断。

---

## Proposed Changes

### Electron 主进程与 Preload 重构

在主进程中管理常驻 Mimo 交互进程，并在 IPC 层面提供 stdin 输入接口、配置写入和项目初始化动作。

#### [MODIFY] [main.js](file:///d:/MiMo%20One/electron/main.js)
- 引入 `save-mimo-config` 处理器：覆写 `~/.mimo_config` 配置文件，并尝试执行 `mimo config set` 命令行。
- 引入 `mimo-new-session` 处理器：运行 `mimo session new`，提取并返回会话 ID。
- 引入 `mimo-init` 处理器：运行 `mimo init` 并在子智能体监控中输出项目初始化日志。
- 实现 Mimo 交互会话生命周期管理：当页面拉起或触发 `mimo-start-chat-process` 时，使用 `spawn` 拉起 `mimo chat` 常驻进程。
- 注册 `send-mimo-input` 接口：允许渲染进程将用户消息写入进程的 `stdin`。
- 将子进程的 stdout 与 stderr 彩色流通过 `mimo-process-stdout` 和 `mimo-process-stderr` 实时推送至渲染层。

#### [MODIFY] [preload.js](file:///d:/MiMo%20One/electron/preload.js)
- 在 `validChannels` 双向通信白名单中追加：`save-mimo-config`、`mimo-new-session`、`mimo-init`、`mimo-start-chat-process`、`send-mimo-input`。
- 在 `on` 监听白名单中追加推送通道：`mimo-process-stdout`、`mimo-process-stderr`、`mimo-process-exit`。

---

### 前端状态机与视图联动

#### [MODIFY] [useAppStore.ts](file:///d:/MiMo%20One/src/store/useAppStore.ts)
- 在 store 中添加 `sessionId`（会话 ID）状态及 `setSessionId` 动作。

#### [MODIFY] [Sidebar.tsx](file:///d:/MiMo%20One/src/components/A-Zone/Sidebar.tsx)
- 新增“新建项目”和“新建会话”按钮，分别触发 IPC `mimo-init` 和 `mimo-new-session`。
- 新建会话成功后将生成的会话 ID 保存到 Zustand 的 `sessionId` 中。

#### [MODIFY] [SettingsModal.tsx](file:///d:/MiMo%20One/src/components/SettingsModal.tsx)
- 在 `handleSave` 中，除了更新前端 Store，还要触发 IPC 调用 `save-mimo-config` 覆写底层 `.mimo_config` 文件。

#### [MODIFY] [App.tsx](file:///d:/MiMo%20One/src/App.tsx)
- 在组件挂载时，如果处于 Electron 环境，触发 `mimo-start-chat-process` 绑定 Native CLI 进程。
- 监听 `mimo-process-stdout` 和 `mimo-process-stderr`：
  - 提取干净文字（去除 ANSI 颜色控制码），流式追加到 B 栏当前消息列表中（作为 Harri 中枢的实时回复）。
  - 将原始带 ANSI 的流输出作为日志实体直接喂给 C 栏任务监控进行彩色渲染。
- 重构 `handleSend`：当在 Electron 环境下，直接在 B 栏追加用户消息，并通过 `send-mimo-input` 写入子进程 `stdin`。

---

## Verification Plan

### Automated Tests
- 构建验证：`npm run build` 确保打包无误。

### Manual Verification
- 验证 A 栏中“新建项目”和“新建会话”的按钮在点击后能否正常触发，以及会话 ID 是否能成功挂载。
- 验证左下角“保存设置”后在 `~/.mimo_config` 中是否生成了正确的配置文件。
- 验证 B 栏消息输入后，能否将数据送进主进程的 stdin，且 stdout 彩色输出能否呈现在 C 栏。
