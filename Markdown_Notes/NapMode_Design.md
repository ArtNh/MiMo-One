# “伴我午睡” (Nap Mode) 视图设计说明书

> **设计概述**
> 本文档记录了“伴我午睡”（Nap Mode）沉浸专注遮罩的视图设计、DOM 结构及逃逸唤醒逻辑的实现规范。

---

## 1. 视图表现与 DOM 结构

### 1.1 全屏遮罩组件 (`NapModeOverlay.tsx`)
- **文件路径**：`src/components/NapModeOverlay.tsx`
- **层级架构**：
  - **外层全屏遮罩**：使用 fixed 定位，z-index 设置为 `z-50` 确保覆盖应用所有区域。采用偏冷的深灰色半透明背景与高斯模糊滤镜：
    `fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md transition-opacity duration-700`
  - **内层睡眠视觉元素**：渲染呼吸发光动画的月亮图标 (🌙)，由两个多重模糊的半透明渐变光晕叠加而成：
    - `absolute w-24 h-24 rounded-full bg-blue-500/10 blur-xl animate-pulse`
    - `absolute w-16 h-16 rounded-full bg-indigo-500/15 blur-lg animate-pulse`
  - **提示信息**：
    - `text-slate-300 text-lg tracking-widest font-light` 声明的“沉浸专注中...”主标题。
    - `text-slate-500 text-xs tracking-wider` 声明的“双击任意区域唤醒”副标题。

---

## 2. 状态提升与事件联动

### 2.1 状态声明与组件绑定 (App.tsx)
- 在根组件中引入 `NapModeOverlay` 并维护全局午睡激活状态：
  ```tsx
  const [isNapModeActive, setIsNapModeActive] = useState(false);
  ```
- **激活流程**：用户点击 `HarriStateViewer` 状态胶囊，触发 React 前端 onClick 事件与主进程 `trigger-nap-mode` IPC 信号双向传导，前端状态更新为休眠：
  ```tsx
  <HarriStateViewer 
    status={harriStatus} 
    onClick={() => {
      setIsNapModeActive(true);
      setHarriStatus('sleeping');
    }}
  />
  ```

### 2.2 双击唤醒逃逸机制
- **唤醒逻辑**：在遮罩组件的最外层 div 容器上绑定 `onDoubleClick` 双击监听器。用户在遮罩上双击任意区域时，回调通知父组件重置状态，退出午睡全屏遮罩：
  ```tsx
  // 退出触发
  <div onDoubleClick={onWakeUp} className="...">
  ```
- **复位处理**：双击后，`isNapModeActive` 设为 `false` 卸载遮罩，同时 Harri 状态复位为 `idle`：
  ```tsx
  onWakeUp={() => {
    setIsNapModeActive(false);
    setHarriStatus('idle');
  }}
  ```

---

> **设计结论**
> 本视图完美结合了深色美感与沉浸式毛玻璃体验，通过受控状态与双击逃逸机制实现了易用与美学的平衡。组件解耦良好，全屏遮罩事件能够有效拦截除双击以外的全部鼠标键盘行为，确保用户能彻底专注。
