# A 栏与 C 栏交互细节设计手记

---

> 本文档记录了左侧 A 栏智能体列表项的点击切换高亮逻辑，以及右侧 C 栏 Subagent 并发任务卡片的折叠与展开动效，打通了局部状态与全局 Zustand 状态仓的事件通道。

---

### [2026-06-14 20:19:15] A 栏智能体点亮与 C 栏卡片折叠交互实装

#### 1. A 栏智能体高亮切换逻辑
- **数据流向**：
  - 用户在左侧 A 栏点击任意 Agent 节点时，触发 `Sidebar.tsx` 的 `onClick` 处理器。
  - 触发全局 actions：调用 `useAppStore.getState().setActiveAgentId(agent.id)`，将选中的智能体 ID 同步至全局 Store。
  - 样式联动：`Sidebar` 实时订阅 `activeAgentId`，选中的 Agent 节点点亮样式 `border-blue-300 bg-blue-50`，其余恢复默认轮廓。

#### 2. C 栏任务卡片折叠与交互提示
- **交互提示**：给任务卡片容器追加了 `cursor-pointer hover:border-gray-300 transition-all` 以提示其可点击交互属性。
- **按需折叠机制**：使用 React 局部 `useState` 维护展开状态 `expandedTasks: Record<string, boolean>`。点击卡片后，切换对应 `taskId` 的布尔值，在展开时展示日志详情，折叠时隐去，保持 C 栏侧边监控视图的极简清爽。
