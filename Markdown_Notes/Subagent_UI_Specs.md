# 子智能体监控 (Subagent Monitor) 界面视觉规范

> **设计概述**
> 本规范定义了右侧 C 区（Subagent 监控）经重构后的极简冷色调扁平化 UI 样式标准，确保其在系统全局视图中保持克制、高级的理性美感。

---

## 1. 布局与样式属性映射 (Tailwind Specs)

### 1.1 扁平化任务卡片容器 (`Card Container`)
- **设计标准**：去除所有可能破坏扁平化质感的阴影效果，改用细边框和轻量级的 hover 交互反馈。
- **Tailwind 类名**：
  `flex flex-col p-3 border border-gray-100 rounded-lg bg-transparent mb-2 hover:bg-gray-50/50 transition-colors`

### 1.2 状态指示点 (`Status Dots`)
- **设计标准**：采用极低色彩饱和度的点状标识，代表不同生命周期的进展：
  - **已完成 (completed)**：`bg-emerald-400`（呼吸波动层使用 `bg-emerald-300 opacity-20`）。
  - **执行中 (running)**：`bg-blue-400`（呼吸波动层使用 `bg-blue-300 opacity-75`）。
  - **排队中 (pending)**：`bg-gray-300` 极简实心点。

### 1.3 极简进度条 (`Progress Bar`)
- **纵向高度**：高度统一约束为 `h-1` (4px)，展现纤细的线条美。
- **轨道背景**：`bg-gray-100` (浅灰) 轨道。
- **填充条配色**：
  - 已完成：`bg-emerald-400`
  - 执行中：`bg-blue-400`
  - 挂起中：`bg-gray-200`
- **轨道圆角**：`rounded-full`

---

## 2. 排版与字号层级 (Typography)

### 2.1 主任务名称
- **类名**：`text-sm text-gray-700`
- **标准**：使用标准的正文小字和深灰字体，去除原本过于突出的中粗体，融入整体背景。

### 2.2 辅助属性（Task ID 与 状态指示）
- **类名**：`text-xs text-gray-400`
- **标准**：进度百分比与底部的 ID 标签、状态文字均降级为 `text-xs text-gray-400`，字重设为极细，整体呈现低对比的秩序感。

---

> **设计重构结论**
> 本次重构消除了三维卡片的厚重阴影，通过纯扁平边框、低饱和度冷色填充和微缩进度条，将 C 区监控模块从“突出强调”重塑为“静默背景”，完美契合了 MiMo One 的整体环境设计美感。
