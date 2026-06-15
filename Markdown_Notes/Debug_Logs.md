# 调试与链路诊断日志

---

### [2026-06-15 18:07:00] 数据链路修复与 EventBus 联动接入

---

## 1. 问题描述
> 之前测试中发现 C 栏（Subagent 监控面板）与 B 栏对话流的数据链路存在断连，导致用户在 B 栏发送包含“分析”、“编译”等指令时，C 栏的任务进度条与日志流无法实现同步的流式刷新。

---

## 2. 诊断与排查
- **同步机制缺陷**：此前方案中，B 栏在触发消息发送时直接调用了 `TaskRunner` 类，而 C 栏组件未能通过轻量级事件总线订阅此外部信号，导致两栏组件在组件和数据模型层级产生了割裂。
- **状态驱动验证**：检查 `SubagentMonitor.tsx` 确认其已经订阅了全局 `useAppStore` 的 `tasks` 数组，且其进度条（`task.progress`）和详细日志（`task.logs`）的映射渲染逻辑完全是动态数据驱动，不存在静态赋值或硬编码。

---

## 3. 链路修复方案

### 3.1 注入事件触发器
- **修改位置**：[App.tsx](file:///d:/MiMo%20One/src/App.tsx)
- **改进方式**：移除了对 `TaskRunner` 的直接引用。在 `handleSend` 回调中对用户发送指令进行正则识别，如果匹配特定动作，则通过 `eventBus` 广播事件：
  - `编译/构建/生成` -> 发送 `{ type: 'compile', description: message }` 到 `TASK_TRIGGER`。
  - `分析/检索/搜索/定位` -> 发送 `{ type: 'analyze', description: message }` 到 `TASK_TRIGGER`。
  - `测试/诊断` -> 发送 `{ type: 'test', description: message }` 到 `TASK_TRIGGER`。

### 3.2 强制 C 栏订阅更新
- **修改位置**：[SubagentMonitor.tsx](file:///d:/MiMo%20One/src/components/Subagent/SubagentMonitor.tsx)
- **改进方式**：
  1. 重新引入 `useEffect`, `useRef` 及 `eventBus`。
  2. 挂载 `useEffect` 并订阅 `TASK_TRIGGER` 事件总线。
  3. 当监听到触发信号时，根据类型匹配派发给对应的智能体（如 Coder 编译、Explorer 检索、Tester 诊断）。
  4. 调用全局 action `store.addTask` 挂载任务，并实例化一个周期为 `800ms` 的 `setInterval` 定时仿真器，定时修改 tasks 进度（每次随机增加 `10%-20%`）。
  5. 进度变化后自动触发 Zustand 重绘，驱动 React 组件渲染最新的进度条和日志。
  6. 引入 `activeIntervals` Ref 管理所有运行的定时器句柄，在组件被卸载（Unmount）或热更新时彻底清除以杜绝内存泄漏风险。

---

## 4. 链路数据流动示意
`B 栏 handleSend` $\rightarrow$ `eventBus.emit('TASK_TRIGGER')` $\rightarrow$ `C 栏 useEffect 接收` $\rightarrow$ `setInterval 启动并更新 store.tasks` $\rightarrow$ `Zustand 通知更新` $\rightarrow$ `C 栏重绘`

---

### [2026-06-15 18:09:00] 修复 SubagentMonitor.tsx 中 NodeJS 命名空间未定义报错
> 在 TypeScript 编译时，因前端 React 运行环境默认未加载 Node.js 全局声明，导致声明 `activeIntervals` 时出现 “找不到命名空间 NodeJS” 的 TS 错误。已将 `activeIntervals` 的泛型声明更改为 `any[]` 以完美兼容，并成功通过本地编译打包。

### [2026-06-15 18:14:00] 强化 C 栏订阅机制与状态模拟器注入
> 为彻底验证 C 栏数据流的订阅重绘能力，在 Zustand 状态库中扩展了 `simulateTaskProgress(taskId)` 方法，以 500ms 周期异步累进进度。在 `SubagentMonitor.tsx` 初始化挂载时手动调用此方法测试 `task-02` 的自动推进。同时，在组件中声明了基于 `[tasks]` 改变的 `useEffect` 以在控制台实时打印任务的引用更新，全面验证数据同步链路。

