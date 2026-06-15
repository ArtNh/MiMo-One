# Subagent 监控数据链路修复实施计划

---

### [2026-06-15 18:06:00] 链路修复实施计划

## 目标描述
目前 B 栏对话流发送特定指令时，没有通过 `eventBus` 的事件流向 C 栏传递，且 C 栏组件未能通过事件监听动态触发任务仿真。我们将执行以下链路修复：
1. **指令事件派发**：在 B 栏发送消息的 `handleSend` 回调中，如果匹配特定关键字，通过 `eventBus.emit('TASK_TRIGGER', { type: '...', description: message })` 发送事件。
2. **事件订阅与状态仿真**：在 C 栏的 `SubagentMonitor.tsx` 中订阅该事件。在事件回调中，向全局 store 添加新任务并启动 `setInterval` 仿真计时器，周期累加 `progress` 并记录各阶段日志，驱动 Zustand 重绘。
3. **一致性检查**：验证 C 栏以百分百动态数据驱动方式渲染进度条与日志。
4. **日志归档**：在 `Markdown_Notes/Debug_Logs.md` 中记录修复逻辑。

---

## User Review Required

> [!IMPORTANT]
> **联动架构重构**：
> 从原先的“B 栏直接同步调用 `TaskRunner` 类”重构为“B 栏派发事件广播 (`eventBus.emit('TASK_TRIGGER')`) -> C 栏订阅并处理仿真进度”。这能够解耦 B、C 两栏在组件层面上的直接代码依赖。

---

## Open Questions
无。

---

## Proposed Changes

### 对话中枢

#### [MODIFY] [App.tsx](file:///d:/MiMo%20One/src/App.tsx)
- 重新引入 `eventBus`：`import { eventBus } from './lib/eventBus';`
- 移除对 `TaskRunner` 的直接调用和 import。
- 在 `handleSend` 内：
  - 若输入内容匹配“编译/构建/生成”，则派发 `eventBus.emit('TASK_TRIGGER', { type: 'compile', description: message })`。
  - 若输入内容匹配“分析/检索/搜索/定位”，则派发 `eventBus.emit('TASK_TRIGGER', { type: 'analyze', description: message })`。
  - 若输入内容匹配“测试/诊断”，则派发 `eventBus.emit('TASK_TRIGGER', { type: 'test', description: message })`。

---

### 任务监控区

#### [MODIFY] [SubagentMonitor.tsx](file:///d:/MiMo%20One/src/components/Subagent/SubagentMonitor.tsx)
- 引入 `useEffect` 及 `eventBus`：`import { eventBus } from '../../lib/eventBus';`
- 在 `SubagentMonitor` 组件内部新增 `useEffect`：
  - 订阅 `TASK_TRIGGER` 事件。
  - 触发时，映射出对应的 `agentName` 与 `taskName`，然后调用 `addTask` 添加任务并记录初次日志。
  - 使用 `setInterval` 定时器以 800ms 间隔逐步累进 progress，并在 100% 后将其标记为 `completed` 且清除定时器。
  - 创建一个 `activeIntervals` Ref 以追踪活跃的定时器，在组件卸载时彻底清除以防内存泄漏。

---

### 调试与诊断日志

#### [NEW] [Debug_Logs.md](file:///d:/MiMo%20One/Markdown_Notes/Debug_Logs.md)
- 新建调试日志文档，以多级标题、内容分栏和引言块记录链路修复过程。

---

## Verification Plan

### Automated Tests
- 执行 `npm run build` 验证全局 TypeScript 编译和 Rollup 打包没有任何报错。

### Manual Verification
- 打开 Electron 物理桌面端，发送 “编译代码”、“分析项目架构” 等特定指令，验证 C 栏是否会动态渲染新卡片，其进度从 0% 流畅加至 100% 且折叠面板中不断打印进度日志。
- 确认组件卸载或热更新时不会发生定时器内存溢出或多重挂载。
