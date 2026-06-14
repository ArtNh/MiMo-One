# 响应式布局控件修复记录

---

> 本文档记录了针对 B 栏（中央交互舱）在缩放与宽度拉伸时，顶部 Header 与底部输入区域控件出现文本节点换行（Text Wrapping）与容器变形的响应式修补细节。通过强制配置 `whitespace-nowrap` 与 `shrink-0` 属性，保障在不同容器宽度下的视觉呈现稳定性。

---

### [2026-06-14 19:35:12] 响应式换行与变形修补

#### 1. 问题陈述
当用户通过拖拽分割线或调整窗口大小导致 B 栏（中央交互舱）宽度收缩时，B 栏的 Header 右侧组件（上下文文本及压缩按钮）和 Footer 区域组件（Max Mode 标签及测试运算按钮）由于缺乏宽度锁定，会出现文字换行或按钮被挤压变形的现象。

#### 2. 修补机制与类名注入
为防止由于 Flex 弹性缩放导致的折行，执行了如下针对性 CSS 属性微调：

- **右上角操作区**：
  - 上下文文本节点（`<span>`）：注入 `whitespace-nowrap` 锁定单行展示。
  - “压缩”按钮（`<button>`）：注入 `whitespace-nowrap shrink-0` 确保其固有 padding 宽度与文字在空间受限时不被压缩。
- **右下角输入区**：
  - Max Mode 复选框包裹标签（`<label>`）：注入 `whitespace-nowrap shrink-0`，防止文本在 Checkbox 下方折行。
  - “测试运算”按钮（`<button>`）：注入 `whitespace-nowrap shrink-0` 锁定按钮轮廓。
- **左上角工作区**：
  - 当前工作区文本容器：在 `truncate` 基础之上叠加 `whitespace-nowrap`，保障在极端小空间下只展现省略号而绝不纵向折行。

---

#### 3. 代码变更对照 (Diff 概要)

```diff
@@ -118,3 +118,3 @@
           <div className="flex-1 min-w-0">
-            <div className="text-sm text-gray-500 truncate">当前工作区: {workspaceName}</div>
+            <div className="text-sm text-gray-500 truncate whitespace-nowrap">当前工作区: {workspaceName}</div>
           </div>
@@ -134,5 +134,5 @@
           <div className="flex-1 flex justify-end shrink-0">
             <div className="flex items-center gap-3 text-xs text-gray-500">
-              <span>上下文: 4.2k / 128k</span>
-              <button className="px-2 py-1 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer">压缩</button>
+              <span className="whitespace-nowrap">上下文: 4.2k / 128k</span>
+              <button className="px-2 py-1 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer whitespace-nowrap shrink-0">压缩</button>
             </div>
           </div>
@@ -167,8 +167,8 @@
           />
-          <label className="ml-4 flex items-center cursor-pointer select-none">
+          <label className="ml-4 flex items-center cursor-pointer select-none whitespace-nowrap shrink-0">
             <input
               type="checkbox"
               className="mr-1"
@@ -178,3 +178,3 @@
             onClick={() => {
               setHarriStatus(prev => prev === 'processing' ? 'idle' : 'processing');
             }}
-            className="ml-4 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium rounded shadow transition-colors"
+            className="ml-4 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium rounded shadow transition-colors whitespace-nowrap shrink-0"
           >
             测试运算
           </button>
```

---

### [2026-06-14 19:41:13] 视口与 A 栏防御性布局修补

#### 1. 问题陈述
极限缩放测试中发现，当视口宽度或高度被用户无限制缩小时，容易导致 DOM 树出现水平溢出；同时左侧导航栏（A 区）的 "MiMo One" 标题由于空间受挤压，极易发生文本节点自动折行，破坏整体视觉美感。

#### 2. 修补机制
- **底层窗口尺寸限制 (Electron 主进程)**：
  - 在 `electron/main.js` 的 `new BrowserWindow({...})` 初始化配置中注入 `minWidth: 850` 与 `minHeight: 600`。
  - 此尺寸在操作系统（OS）级别直接拦截了超出安全布局边界的过度收缩操作，保证了前端 React 响应式栅格/Flexbox 不会发生雪崩。
- **左侧 A 栏文本截断 (A-Panel Text Defense)**：
  - 针对 A 栏顶部 Logo 与标题所在的容器 `div` 元素追加 `overflow-hidden`。
  - 给文本节点自身追加 `truncate whitespace-nowrap`，在合理视口挤压情况下，文本优雅截断为省略号而决不纵向换行折叠。

---

#### 3. 代码变更对照 (Diff 概要)

```diff
@@ -5,2 +5,4 @@
   const win = new BrowserWindow({
     width: 1200,
     height: 800,
+    minWidth: 850,
+    minHeight: 600,
     autoHideMenuBar: true,
@@ -96,2 +96,2 @@
       {/* 左侧 A 区 */}
       <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4">
-        <div className="flex items-center space-x-2 mb-4">
+        <div className="flex items-center space-x-2 mb-4 overflow-hidden">
           <img 
@@ -105,2 +105,2 @@
           />
-          <span className="font-bold text-lg">MiMo One</span>
+          <span className="font-bold text-lg truncate whitespace-nowrap">MiMo One</span>
         </div>
```

---

### [2026-06-14 19:46:02] A 栏宽度锁定与 B 栏 Header Grid 重构

#### 1. 问题陈述
在极限视口缩放测试中发现，左侧导航栏（A 区）的宽度仍然会被压缩，导致 Logo 标题受到挤压。另外，原有的 B 栏 Header Flex 布局（Left-Center-Right Flex Pattern）在容器尺寸发生极端变化时，由于两侧元素的尺寸在自适应变化，导致中间的 Harri 状态显示胶囊无法保持绝对几何居中。

#### 2. 修补机制
- **锁定 A 栏宽度 (A-Panel Width Lock)**：
  - 移除了 A 区最外层 `aside` 容器的原宽度 `w-64`，重构为 `w-56 shrink-0`，从根本上锁死其物理宽度，从而消除其在 Flex 主体结构下被挤压的隐患。
- **B 栏 Header 重构为 CSS Grid (Absolute Centering)**：
  - 将 Header 容器由 `flex` 替换为 `grid grid-cols-[1fr_auto_1fr] items-center` 布局，使左、中、右三个区域强行占据确定的网格单元。
  - 左侧当前工作区容器配置 `justify-self-start flex items-center min-w-0 overflow-hidden`，使其靠左贴边并自适应截断。
  - 居中状态胶囊容器配置 `justify-self-center`，使其在三栏网格中实现真正的、数学意义上的完美几何绝对居中。
  - 右侧上下文监控容器配置 `justify-self-end flex items-center gap-3`，使其靠右贴边。

---

#### 3. 代码变更对照 (Diff 概要)

```diff
@@ -93,3 +93,3 @@
   return (
     <div className={`flex h-screen w-screen text-sm text-gray-800 ${isDragging ? 'user-select-none' : ''}`}>
       {/* 左侧 A 区 */}
-      <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4">
+      <aside className="w-56 shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col p-4">
@@ -112,9 +112,9 @@
       {/* 中央 B 区 */}
       <main className="flex-1 min-w-[400px] bg-white flex flex-col">
         {/* 顶部状态栏 */}
-        <header className="flex items-center w-full h-12 px-4 border-b border-gray-100 gap-4">
+        <header className="grid grid-cols-[1fr_auto_1fr] items-center w-full h-12 px-4 border-b border-gray-100">
           {/* 左侧：自适应缩略区 */}
-          <div className="flex-1 min-w-0">
+          <div className="justify-self-start flex items-center min-w-0 overflow-hidden">
             <div className="text-sm text-gray-500 truncate whitespace-nowrap">当前工作区: {workspaceName}</div>
           </div>
           
@@ -121,4 +121,4 @@
-          <div className="shrink-0 flex justify-center">
+          <div className="justify-self-center">
             <HarriStateViewer 
               status={harriStatus} 
@@ -128,11 +128,9 @@
           </div>
           
           {/* 右侧：操作区 */}
-          <div className="flex-1 flex justify-end shrink-0">
-            <div className="flex items-center gap-3 text-xs text-gray-500">
-              <span className="whitespace-nowrap">上下文: 4.2k / 128k</span>
-              <button className="px-2 py-1 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer whitespace-nowrap shrink-0">压缩</button>
-            </div>
+          <div className="justify-self-end flex items-center gap-3 text-xs text-gray-500">
+            <span className="whitespace-nowrap">上下文: 4.2k / 128k</span>
+            <button className="px-2 py-1 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer whitespace-nowrap shrink-0">压缩</button>
           </div>
         </header>
```
