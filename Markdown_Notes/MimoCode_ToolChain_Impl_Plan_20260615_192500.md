# Mimo Code 官方内核工具链与 Function Calling 协议设计实施计划

---

### [2026-06-15 19:25:00] 实施计划草案

## 实施目标

实装 Mimo Code 官方原生的 Function Calling（工具调用）协议，打通前端渲染层与 Electron 主进程之间的物理操作壁垒。大模型可以通过标准 JSON 描述自主调用读取文件、重写文件以及派生终端子进程，从而具备对本地工作区的完全自主控制权。

---

## User Review Required

> [!IMPORTANT]
> **物理操作权限及安全熔断保障**：
> - 所有大模型请求写入或读取的路径，必须严格通过安全限额校验与 Path Traversal 防护（必须限定在当前项目工作区根目录下，即绝对路径必须以 `process.cwd()` 为前缀）。
> - 大模型可能多次并行发起工具调用，系统设计了同步互斥机制及单任务串行流式拦截。

---

## Proposed Changes

### Electron 主进程与 Preload 桥接

为了向大模型提供完整的读写能力，需要在 Electron 层面新增读取完整文件内容及安全写入本地文件的 IPC 处理器。

#### [MODIFY] [main.js](file:///d:/MiMo%20One/electron/main.js)
- 增加 `ipcMain.handle('read-workspace-file', ...)`：获取工作区内某个文件的完整字符串内容，配合 Path Traversal 校验。
- 增加 `ipcMain.handle('write-workspace-file', ...)`：在工作区内写入或重写特定相对路径的文件内容，同样配合 Path Traversal 校验。

#### [MODIFY] [preload.js](file:///d:/MiMo%20One/electron/preload.js)
- 在 `validChannels` 白名单中追加暴露：`read-workspace-file`、`write-workspace-file`。

---

### 前端状态机与 LLM 服务重构

#### [MODIFY] [llmService.ts](file:///d:/MiMo%20One/src/services/llmService.ts)
- 重构 `fetchAgentResponse` 函数以支持 `tools` 参数的组装。
- 定义 `read_workspace_file`, `write_workspace_file`, `execute_terminal_command` 对应的声明格式（符合 OpenAI Tool Call 规范）。
- 建立 Tool Loop（工具调用循环拦截与重调机制）：
  - 当流中拦截到 `tool_calls` 或响应返回 `tool_calls` 时，触发对应的物理操作。
  - 读取操作：直接通过 IPC 读取完整内容，并返回作为 `tool_response`。
  - 写入操作：在写入前先通过 IPC 获取原文件内容，再写入新文件内容，然后将 `fileName`, `oldValue`, `newValue` 保存至 Zustand 状态库中的 `pendingDiff`（实现 B 栏 Diff 功能），最后返回成功标记。
  - 执行命令操作：在 C 栏创建任务，触发 `executeMimoCommand` 指令。建立 Promise 状态侦听机制，当子进程完成/失败后收集 logs 聚合后返回给大模型。
  - 带着工具执行结果递归/循环重新请求大模型，直至返回普通文本。

#### [MODIFY] [App.tsx](file:///d:/MiMo%20One/src/App.tsx)
- 在对话流 B 栏中，设计流式响应过程中的 UI 状态指示：当 `harriStatus === 'processing'` 且触发工具调用时，在气泡上方或在 B 区显示 `[Mimo Code 内核调用中...]` 的动态呼吸条或微动画状态。

---

## Verification Plan

### Automated Tests
- 编译验证：`npm run build`。
- 运行联调：启动 `npm run dev:desktop`。

### Manual Verification
- 在 B 区对话框中输入指令，例如：“读取 src/App.tsx 并在末尾加上一行注释”，或“执行 npm run build 并返回结果”。
- 验证 B 区上方是否正确弹出 `[Mimo Code 内核调用中...]` 的提示，随后是否展示修改后的 Diff 差异以及执行结果。
- 验证本地文件是否已真正被修改。
