# 事件总线与 Zustand 全局状态管理架构

---

> 本文档描述了多智能体协作中枢 MiMo One 桌面端所采用的全局状态设计与跨组件联动管道。利用 Zustand 构建集中化状态仓（Store）作为任务队列的唯一事实来源，并辅以轻量级 EventEmitter（事件总线 Event Bus）机制，解耦中央交互舱（B 栏）与子智能体监控舱（C 栏）的逻辑通讯。

---

### [2026-06-14 20:14:55] 全局状态存储与事件总线联动实装

#### 1. Zustand 状态存储架构 (AppState Store)
- **定义文件**：[useAppStore.ts](file:///d:/MiMo%20One/src/store/useAppStore.ts)
- **设计初衷**：在 C 区（Subagent 监控）渲染多智能体并发任务时，传统的局部 React State 难免由于组件间距离过远或生命周期不同步而导致数据丢失。为此，将子智能体状态提升至全局状态仓中，确立唯一事实来源。
- **核心接口声明 (AgentTask)**：
  ```typescript
  export interface AgentTask {
    id: string;
    status: 'pending' | 'running' | 'completed';
    logs: string[];
    agentName: string;
    taskName: string;
    progress: number;
  }
  ```
- **Store 行为方法**：
  - `addTask`：根据传参实例化任务节点，自动追加唯一时间戳 ID 并初始化第一条日志 `['Initializing...']`。
  - `updateTaskStatus`：修改指定 ID 任务的执行状态与执行进度（`progress`）。
  - `addTaskLog`：向任务节点中追加运行时日志。

---

#### 2. 事件总线驱动机制 (Event Bus)
- **定义文件**：[eventBus.ts](file:///d:/MiMo%20One/src/lib/eventBus.ts)
- **设计初衷**：为了让 B 栏对话舱在发起 LLM 运算时通知 C 栏生成子任务，而不需要直接在主程序中深度嵌合两个组件的内部状态，我们构建了轻量级的发布-订阅（Pub/Sub）模式：
  ```typescript
  type EventCallback = (...args: any[]) => void;
  class EventBus {
    private events: { [key: string]: EventCallback[] } = {};
    on(event: string, callback: EventCallback) { ... }
    off(event: string, callback: EventCallback) { ... }
    emit(event: string, ...args: any[]) { ... }
  }
  ```
- **联动行为模式 (B-C Linkage)**：
  1. 用户在 B 栏（交互舱）按下回车或点击“测试运算”发送消息。
  2. B 栏的 `handleSend` 在触发 LLM 通讯前，通过 `eventBus.emit('TASK_START', { agentName, taskName })` 向外广播。
  3. 全局容器 App 挂载的 `useEffect` 在捕获该事件后，调用 `useAppStore.getState().addTask(...)` 将其追加至全局 Store 中.
  4. 订阅了该 Store 的 C 栏（[SubagentMonitor.tsx](file:///d:/MiMo%20One/src/components/Subagent/SubagentMonitor.tsx)）自动检测到 `tasks` 变化并实现增量重绘，展示带有 `Initializing...` 日志的新任务卡片。

---

#### 3. 核心代码设计大纲 (App & Sidebar & Monitor)
- [Sidebar.tsx](file:///d:/MiMo%20One/src/components/A-Zone/Sidebar.tsx) 作为左侧数据源稳定运行。
- [SubagentMonitor.tsx](file:///d:/MiMo%20One/src/components/Subagent/SubagentMonitor.tsx) 基于 `useAppStore` 进行响应式监听，并在卡片下方动态展开日志视图：
  ```tsx
  {task.logs && task.logs.length > 0 && (
    <div className="mt-2.5 p-2 bg-gray-50/30 rounded text-[10px] font-mono text-gray-400 border border-gray-100/50 max-h-24 overflow-y-auto space-y-1">
      {task.logs.map((log, logIdx) => (
        <div key={logIdx} className="truncate">{`> ${log}`}</div>
      ))}
    </div>
  )}
  ```
