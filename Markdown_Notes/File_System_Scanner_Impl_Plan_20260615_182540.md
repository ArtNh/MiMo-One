# 本地工作区文件扫描与上下文感知实施计划

---

### [2026-06-15 18:25:40] 工作区扫描实施计划

## 目标描述
为了让智能体中枢 Harri 能够真正理解并分析本地工作区的内容，我们将实现一个本地文件扫描系统，并在 B、C 两栏实施深度交互：
1. **Zustand 状态库拓展**：扩展 `workspaceFiles` 状态以及对应的 setter Action，用以集中缓存检索到的文件实体。
2. **构建 IPC 读盘通道**：在 Electron 主进程中实现文件结构的递归扫描与详情读取，并通过 `preload.js` 注入的安全白名单通道将其暴露给前端。
3. **实现 FileSystem 扫描服务**：在 `src/services/fileScanner.ts` 中实现递归扫描方法，读取符合特定后缀的文件元数据及摘要，并在扫描期间流式推进 C 区“索引本地工作区”任务进度。
4. **上下文注入**：重构 B 区对话和大模型响应接口，将 `workspaceFiles` 作为 context 注入到 LLM 交互链中。
5. **安全策略文档归档**：在 `Markdown_Notes/文件系统安全策略.md` 中记录文件扫描的安全策略。

---

## User Review Required

> [!IMPORTANT]
> **本地读盘安全边界（UAC与安全策略）**：
> - 扫描仅限于主进程的 `process.cwd()`（即项目根目录下），严格过滤 `.git`、`node_modules`、`dist` 和 `dist-electron` 等巨型或敏感目录。
> - 在文件摘要读取时，每个文件的读取字符上限设定为 `1500` 字符，防止在大文件读取时引发内存溢出导致程序卡死。

---

## Open Questions
无。

---

## Proposed Changes

### 核心状态库

#### [MODIFY] [useAppStore.ts](file:///d:/MiMo%20One/src/store/useAppStore.ts)
- 定义 `WorkspaceFile` 接口：包含 `filePath`（相对路径）、`summary`（内容摘要）、`size`（大小）。
- 在 `AppState` 中扩展 `workspaceFiles` 状态与 `setWorkspaceFiles` 方法。

---

### 桌面端物理层与通道注入

#### [MODIFY] [preload.js](file:///d:/MiMo%20One/electron/preload.js)
- 在 `validChannels.invoke` 白名单中新增 `'scan-workspace-paths'` 和 `'read-file-summary'` 通道。

#### [MODIFY] [main.js](file:///d:/MiMo%20One/electron/main.js)
- 引入 `fs` 和 `path`。
- 实现 `scan-workspace-paths` 处理器：通过深度优先递归，找出工作区内所有的 `.ts`, `.tsx`, `.md` 相对路径列表，过滤掉敏感/无关文件夹。
- 实现 `read-file-summary` 处理器：读取指定相对路径文件的完整内容，截取前 1500 字符作为 `summary` 连同文件总大小返回。

---

### 本地扫描引擎服务

#### [NEW] [fileScanner.ts](file:///d:/MiMo%20One/src/services/fileScanner.ts)
- 实现 `scanWorkspace()` 异步导出方法。
- **进度与日志联动**：
  - 在 C 区任务池挂载新任务 `“索引本地工作区”` 并获取 ID。
  - 获取到相对路径数组后，循环读取每一个文件。
  - 每一个循环结束后计算 `Math.floor(((i + 1) / total) * 100)` 并更新至 store 中，同时将当前扫描的文件名追加到任务日志。
- **环境兼容回退（Graceful Degradation）**：
  - 若在浏览器非 Electron 环境下运行，自动切换为 Mock 数据并在定时器中以每 500ms 模拟仿真推进。

---

### 智能体应答接口与对话联调

#### [MODIFY] [llmService.ts](file:///d:/MiMo%20One/src/services/llmService.ts)
- 扩展 `fetchAgentResponse` 签名以接收可选的 `workspaceFiles: WorkspaceFile[]`。
- 修改大模型回复，提取文件路径在回复中以漂亮的 Markdown 格式打印并展示统计摘要。

#### [MODIFY] [App.tsx](file:///d:/MiMo%20One/src/App.tsx)
- 在 `handleSend` 里获取 Zustand 的 `workspaceFiles` 并传入 `fetchAgentResponse` 中。
- 挂载页面初始化副作用（`useEffect`），在加载完成时自动调用 `scanWorkspace()` 进行工作区索引初始化。

---

### 技术说明文档

#### [NEW] [文件系统安全策略.md](file:///d:/MiMo%20One/Markdown_Notes/文件系统安全策略.md)
- 详细记录文件读取权限限制、目录白名单、敏感文件防御和摘要容量阈值管理。

---

## Verification Plan

### Automated Tests
- 运行 `npm run build` 进行 TS 全局语法检查。

### Manual Verification
- 启动物理桌面端，查看右侧 C 栏在初始挂载时是否自动拉起“索引本地工作区”的进度条，且以实际的读盘速度流畅增加至 100%。
- 发送“分析一下代码架构”消息，验证 Harri 的消息气泡回复中是否展示了真实的源码目录以及精确的文件计数。
- 在浏览器环境以 Web App 形式加载，验证在缺乏 IPC 机制下程序能否优雅降级并通过模拟器仿真成功运行，没有发生白屏报错。
