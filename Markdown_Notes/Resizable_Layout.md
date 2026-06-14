# 可拖拽工作舱布局 (Resizable Layout) 设计说明书

> **设计概述**
> 本说明书详细记录了 B 栏 (中央主工作舱) 与 C 栏 (Subagent 监控区) 之间动态横向拖拽调节宽度布局的交互设计、数据驱动与性能优化方案。

---

## 1. 数据驱动与交互状态

### 1.1 宽度状态管理 (App.tsx)
- 在最外层大容器引入拖拽控制状态：
  ```typescript
  const [rightPanelWidth, setRightPanelWidth] = useState(320); // 默认右侧面板宽度为 320px
  const [isDragging, setIsDragging] = useState(false);        // 拖拽激活标记
  ```

### 1.2 全局 DOM 拖拽钩子监听
- 仅当 `isDragging` 激活为 `true` 时，才向 `window` 全局注册鼠标监听器，保证事件的轻量与高内聚，并在鼠标释放时重置为 `false`。
- **拖拽计算公式**：
  `newWidth = window.innerWidth - e.clientX`
- **安全宽度区间 (Threshold)**：
  - 最小限制宽度：`250 px` (防止 C 区因过窄挤压致变形)
  - 最大限制宽度：`600 px` (确保 B 舱的核心主工作区始终拥有最充裕的可视区域)

---

## 2. 布局重构与样式映射

### 2.1 B 栏 (主自适应区域)
- **样式**：`flex-1 min-w-[400px]`
- **标准**：在布局重塑后，主区域通过 `flex-1` 默认充盈所有多余的屏幕宽度，并强加 `min-w-[400px]` 的底线边界以防止被右侧面板过度挤压。

### 2.2 可拖拽分割条 resizer (`<div />`)
- **样式**：
  `w-1 cursor-col-resize bg-gray-100 hover:bg-blue-400 active:bg-blue-500 transition-colors z-10 shrink-0`
- **事件绑定**：在 mousedown 时执行默认行为阻止，防止拖动时引起不必要的文本框选中：
  `onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}`

### 2.3 C 栏 (受控宽度区域)
- **样式**：`style={{ width: rightPanelWidth }}` 与 `shrink-0`
- **标准**：移除原先的 `w-96` 固定类名，改用 React 内联数据驱动。强加 `shrink-0` 属性确保其不受 Flex 弹性盒的自动形变挤压。

---

## 3. 拖拽体验优化 (UX Opt)

- **文本防选中**：当 `isDragging === true` 激活时，最外层大容器将临时挂载 `user-select-none` Tailwind 类，彻底解决鼠标在高速左右滑移中意外触发网页局部文本被高亮选中的体验痛点。

---

> **设计结论**
> 本拖拽布局成功打破了传统的固定卡片宽度，为桌面级应用提供了极佳的高度自由的视野分配。自适应策略与边界阈值的强行拦截，保证了各种屏幕规格下的视觉层级秩序，完全符合 MiMo One 的环境理性美学。
