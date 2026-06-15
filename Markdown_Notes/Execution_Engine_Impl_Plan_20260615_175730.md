# 执行引擎与智能体联动实施计划

---

### [2026-06-15 17:57:30] 执行引擎实施计划

## 目标描述
为了让桌面端应用 MiMo One 具备真实的任务处理联动能力，我们将引入全局任务执行器（TaskRunner），并实现 A、B、C 三栏的深度联动：
1. **任务执行器**：实现模拟任务运行的异步进度更新逻辑，动态更新 progress 0% -> 100% 并生成各阶段日志。
2. **对话指令解析**：在 B 栏发送消息时进行关键词识别，若匹配到特定指令则动态在 C 栏派发对应任务。
3. **对话上下文隔离**：点击 A 栏不同 Agent 时，B 栏的对话上下文能够各自独立关联，实现状态一致性。
4. **技术文档编写**：新建中文说明文档归档在 `Markdown_Notes/Execution_Engine.md` 中。

---

## User Review Required

> [!IMPORTANT]
> **状态库接口调整**：
> 核心 Zustand 状态库（`useAppStore`）中，原本的 `addTask` 返回类型为 `void`。为了在调用 `addTask` 后能够即时获得新生成的任务 ID 并进行后续进度累加更新，我们需要将接口的返回类型修改为 `string`。

> [!TIP]
> **指令关键词匹配规则**：
> - 匹配 **“编译/构建/生成”** 关键字：任务将指派给 `agent-coder` (Coder 编译)，触发对应编译任务流。
> - 匹配 **“分析/检索/搜索/定位”** 关键字：任务将指派给 `agent-explorer` (Explorer 检索)，触发检索任务流.
> - 匹配其他内容：任务将由 `agent-harri` (Harri 中枢) 自行消化处理。

---

## Open Questions
无。

---

## Proposed Changes

### 核心状态库

#### [MODIFY] [useAppStore.ts](file:///d:/MiMo%20One/src/store/useAppStore.ts)
- 修改 `addTask` 的 TS 接口定义：`addTask: (task: Omit<AgentTask, 'id' | 'logs'> & { id?: string }) => string;`
- 修改 `addTask` 的具体实现：在添加前随机或按时间戳生成 `id` 并作为函数返回值返回。

---

### 任务执行引擎

#### [NEW] [taskRunner.ts](file:///d:/MiMo%20One/src/lib/taskRunner.ts)
- 引入 `useAppStore` 模块。
- 声明 `TaskRunner` 类，暴露出静态方法 `runTask(agentId: string, taskDescription: string): void`。
- `runTask` 逻辑：
  1. 根据 `agentId` 定位智能体名称。
  2. 调用 `addTask` 并获取生成的任务 `id`，往任务中追加首条日志。
  3. 创建周期为 `800ms` 的异步定时器，在更新进度的同时不断调用 `addTaskLog` 模拟子智能体的日常运行日志。
  4. 当进度达到 100% 后，更新任务状态为 `completed` 并清除定时器。

---

### 对话逻辑与界面联动

#### [MODIFY] [App.tsx](file:///d:/MiMo%20One/src/App.tsx)
- **上下文隔离**：
  - 将原单数组状态 `messages` 改造为按 `agentId` 索引的字典对象：`agentMessages: Record<string, Message[]>`。
  - 在页面上渲染当前 `activeAgentId` 对应智能体的对话气泡流。
- **对话 Header 渲染**：
  - 根据全局 `activeAgentId` 取出当前激活的智能体名字，在 Header 状态栏处渲染 `(已连接: [智能体名称])`。
- **发送逻辑联动**：
  - 重构 `handleSend`：当消息被发送时，除了将消息放入对应智能体的上下文外，还将使用正则/关键词检测消息内容。
  - 若命中“编译”、“分析”等特定关键词，则调用 `TaskRunner.runTask` 对 C 区任务池派发对应智能体的监控进度。
  - 移除了原有的硬编码 `eventBus.emit('TASK_START', ...)` 触发。

---

### 技术说明文档

#### [NEW] [Execution_Engine.md](file:///d:/MiMo%20One/Markdown_Notes/Execution_Engine.md)
- 记录 `TaskRunner` 的设计模式 and B-C 栏联动数据结构，确保文档中不使用情绪化 Emoji。

---

## Verification Plan

### Automated Tests
- 执行 `npm run build` 验证全局 TypeScript 编译以及生产包打包没有任何类型报错或语法警告。

### Manual Verification
- 启动本地开发环境，测试点击左侧 A 栏中的不同智能体，验证中央 B 栏是否成功展现不同的独立上下文且 Header 状态一致。
- 发送包含 “编译代码” 或者是 “分析项目架构” 的指令，验证右侧 C 栏的 Subagent 监控中是否会动态挂载一个相应的任务卡片，并且进度条在数秒内由 0% 平滑更新至 100% 且日志在不断更新。
