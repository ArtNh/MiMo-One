# 子智能体 (Subagent) 监控架构设计规范说明

> **架构概述**
> 本文档定义了 MiMo One 项目中右侧 C 区（Subagent 监控）的组件架构、任务生命周期追踪数据结构与多线程状态映射机制。

---

## 1. 数据结构与接口规范

### 1.1 `SubagentTask` 子智能体任务对象
- **对象类型定义**：
  ```typescript
  export interface SubagentTask {
    id: string;        // 任务唯一标识符 (例如: 'task-1')
    taskName: string;  // 任务描述性名称
    status: 'pending' | 'running' | 'completed'; // 任务生命周期状态
    progress: number;  // 任务当前执行进度 (百分比数值，范围 0-100)
  }
  ```

### 1.2 生命周期状态指示
- **`pending` (排队中)**：
  - 视觉表现：使用极简冷灰色指示点（`bg-slate-300`）。
  - 进度：通常归零 `progress = 0`。
- **`running` (执行中)**：
  - 视觉表现：使用闪烁的淡蓝色光晕点（`bg-sky-500` 配合 `animate-ping` 的 `bg-sky-400`），表明该任务在后台具有高频活跃的并发进程。
  - 进度：动态范围 `0 < progress < 100`。
- **`completed` (已完成)**：
  - 视觉表现：使用带有呼吸动画的翠绿色指示点（`bg-emerald-500` 与 `animate-ping` 的 `bg-emerald-400`）。
  - 进度：强制归整 `progress = 100`。

---

## 2. 视图设计与挂载实现

### 2.1 任务列表渲染 (`SubagentMonitor.tsx`)
- **文件路径**：`src/components/Subagent/SubagentMonitor.tsx`
- **Flex 布局排版**：
  - 每个任务项封装在独立的 `div` 容器中，配以 `border-slate-100 bg-white shadow-sm` 的胶囊背景，支持悬浮过渡发光样式。
  - **信息展示层**：左右两端分栏对齐。左侧展示状态指示点和 `text-slate-700 text-xs` 的任务名称，右侧以 `font-mono text-slate-400` 展示进度百分比。
  - **进度条轨道**：下层嵌套全宽度的极简轨道 (`h-1 bg-slate-100`)，其内的进度填充色根据 `status` 动态判定：
    - `completed` 状态：填充为 `bg-emerald-400`
    - `running` 状态：填充为 `bg-sky-400`
    - `pending` 状态：填充为 `bg-slate-200`
- **挂载点**：在 `App.tsx` 右侧 C 区 `<aside className="w-96">` 的标题下方直接注入挂载。

---

> **监控架构结论**
> 本架构通过解耦的列表渲染和规范的状态机制，实现了并发多线程任务的物理级映射。设计版式上延续了偏冷、极简的高端视觉风格，为后续对接真实的并发子智能体后台执行队列提供了通用的展示载体。
