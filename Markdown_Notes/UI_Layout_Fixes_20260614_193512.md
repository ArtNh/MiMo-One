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
