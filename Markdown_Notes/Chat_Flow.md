# 对话交互流视图与 Header 响应式布局设计说明书

> **设计概述**
> 本说明书定义了 B 舱（中央主工作舱）Header 部分的 Left-Center-Right Flex 三栏自适应去重叠设计，以及核心对话气泡流的渲染结构与状态机通信机制。

---

## 1. Header 三栏式 Flex 布局 (Anti-Overlap Flex Layout)

### 1.1 问题背景与重构
在先前版本中，由于 Header 采用 `relative` 定位，在拖拽改变面板宽度时，绝对定位在中心的 Harri 胶囊组件会与两侧的“工作区”及“上下文”文本产生物理上的视觉重叠Bug。
- **重构方案**：彻底移除 `relative` 与绝对定位类，引入无绝对重叠的 Flexbox 弹性排版。

### 1.2 三栏容器定义 (Tailwind Classes)
- **Header 父容器**：
  `flex items-center w-full h-12 px-4 border-b border-gray-100 gap-4`
- **左侧工作区 (Left)**：
  `flex-1 min-w-0`
  内部文本强加 `truncate` 样式，保证在容器因拖动被大幅压缩时，工作区名称能够自动截断为省略号而绝不重合或换行。
- **居中状态胶囊 (Center)**：
  `shrink-0 flex justify-center`
  使用 `shrink-0` 确保 Harri 状态标签在任何情况下都不会被两侧挤压缩放，始终保持标准的物理尺寸，并通过 flex 机制完美置于视窗中轴线。
- **右侧操作区 (Right)**：
  `flex-1 flex justify-end shrink-0`
  通过 `justify-end` 保证“上下文长度”与“压缩”按钮始终靠右对齐。

---

## 2. 核心对话流气泡视图 (Chat bubble stream)

### 2.1 模拟数据结构与事件拦截
- **消息数组状态**：在 App 组件中维护 messages 对话数据结构：
  ```typescript
  const [messages, setMessages] = useState<{ role: 'harri' | 'user'; content: string }[]>([
    { role: 'harri', content: '你好，我是 Harri...' }
  ]);
  ```
- **数据管线流转**：当触发 handleSend 发送动作时，首先在渲染端立刻追加一条 User 类型气泡；接口 Promise 成功 resolve 之后，再次向数据队列中追加一条 Harri 类型的回执响应气泡。

### 2.2 气泡 UI 设计与圆角规范
- **对话区容器**：
  `flex-1 overflow-y-auto p-6 space-y-6`
  为聊天板块提供独立的纵向滚动条支持及标准的呼吸感大内边距。
- **Harri 的消息气泡 (居左)**：
  - 类名：`max-w-[70%] p-3.5 rounded-2xl rounded-tl-none bg-gray-50 border border-gray-100/50 text-gray-700 text-sm leading-relaxed shadow-sm`
  - 视觉：温和的浅灰背景色。由于是对方发送，左上角采用直角 (`rounded-tl-none`)。
- **用户的消息气泡 (居右)**：
  - 类名：`max-w-[70%] p-3.5 rounded-2xl rounded-tr-none bg-blue-50 border border-blue-100/50 text-blue-700 text-sm leading-relaxed shadow-sm`
  - 视觉：醒目的淡蓝底色。由于是己方发送，右上角采用直角 (`rounded-tr-none`)。

---

> **设计结论**
> 本次重构从根本上消除了横向拖动大小时多组件挤压、覆盖的 Bug，极大增强了系统的响应式弹性。同时，初始化了标志性的左右对话流气泡视图，不仅在视觉上极显高档、优雅，更为后续与真实的 AI 主动交互数据流预留了完美的可渲染容器。
