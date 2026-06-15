# 订阅渲染与任务进度模拟器实施计划

---

### [2026-06-15 18:12:30] 订阅与模拟器实施计划

## 目标描述
为了确保 C 栏（Subagent 监控）卡片能够准确随全局任务状态更新而刷新，并排查由于渲染挂载失效导致的链路断开，我们将执行以下深度修复：
1. **强制订阅式渲染**：显式检查并使用 Zustand 选择器 Hook：`const tasks = useAppStore((state) => state.tasks);` 来挂载渲染列表，确保任何引用更新都能强制重绘组件。
2. **任务状态模拟器注入**：在 `useAppStore.ts` 中新增 `simulateTaskProgress(taskId: string)` 测试方法，使用 `setInterval` 每 500ms 累加指定任务的进度至 100%。并在 C 栏组件初始化加载时，手动调用此函数以对初始任务（如 `task-02`）执行仿真测试。
3. **调试日志打印**：在 C 栏渲染组件中增加基于 `tasks` 改变的 `useEffect`，向控制台输出最新的状态，验证数据接收状况。
4. **日志归档**：将该调试和模拟日志记录到项目本地的 `Markdown_Notes/Debug_Logs.md` 之中。

---

## User Review Required

> [!IMPORTANT]
> **测试函数副作用与清理**：
> - 状态库中的 `simulateTaskProgress` 主要是用于测试驱动的仿真更新，它在底层使用全局 `useAppStore.getState().updateTaskStatus` 触发。
> - 在 C 栏组件的 `useEffect` 挂载时，我们将手动启动一次 `simulateTaskProgress('task-02')` 进行对初始运行状态任务（`task-02`）的首次运行模拟测试。

---

## Open Questions
无。

---

## Proposed Changes

### 核心状态库

#### [MODIFY] [useAppStore.ts](file:///d:/MiMo%20One/src/store/useAppStore.ts)
- 在 `AppState` 接口中添加新动作定义：`simulateTaskProgress: (taskId: string) => void;`
- 实现 `simulateTaskProgress`：
  - 每 500ms 更新一次指定 task 的 `progress` 值（随机累加 5%-15%）。
  - 更新至 100% 后自动调用 `clearInterval` 清除该定时器。
  - 在更新进度的同时，调用 `addTaskLog` 写入模拟器专有调试日志。

---

### 任务监控区

#### [MODIFY] [SubagentMonitor.tsx](file:///d:/MiMo%20One/src/components/Subagent/SubagentMonitor.tsx)
- 强制使用选择器 Hook 订阅数据：`const tasks = useAppStore((state) => state.tasks);`
- 新增一个依赖于 `[tasks]` 的 `useEffect` 用作实时渲染监控：
  ```typescript
  useEffect(() => {
    console.log('Subagent component rendering with tasks:', tasks);
  }, [tasks]);
  ```
- 在已有的挂载阶段 `useEffect`（依赖项为 `[]`）中，在事件订阅完毕后，手动触发一次 `simulateTaskProgress`：
  ```typescript
  // 手动调用一次测试函数，确保即便没有 B 栏触发，初始加载后 task-02 也会动起来
  useAppStore.getState().simulateTaskProgress('task-02');
  ```

---

### 调试与诊断日志

#### [MODIFY] [Debug_Logs.md](file:///d:/MiMo%20One/Markdown_Notes/Debug_Logs.md)
- 追加本次订阅强制重绘与模拟器验证的过程记录。

---

## Verification Plan

### Automated Tests
- 执行 `npm run build` 确保无任何语法和编译类型错误。

### Manual Verification
- 启动物理 Electron 窗口（或者通过 HTTP 抓取），打开浏览器调试控制台（DevTools Console），观察控制台是否以 500ms 频率流式打印出 `Subagent component rendering with tasks: ...` 的日志。
- 确认在无需人工输入的情况下，C 栏中原进度为 45% 的 “生成代码片段”（`task-02`）进度条和日志能在极短时间内自动、流式地由 45% 更新至 100%。
