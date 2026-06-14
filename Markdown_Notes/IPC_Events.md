# Electron 进程间通信 (IPC) 事件规范

> **概述**
> 本文档记录了 MiMo One 项目中前端渲染进程 (Renderer) 与桌面主进程 (Main Process) 之间的 IPC 通讯通道定义、数据流流转逻辑及具体回调处理。

---

## 1. IPC 通道定义

### 1.1 `trigger-nap-mode` (前端触发休眠模式)
- **发送源 (Renderer)**：`src/components/Harri/HarriStateViewer.tsx` 状态胶囊容器
- **接收源 (Main)**：`electron/main.js` 主进程
- **通信模式**：单向通知 (Fire-and-Forget)
- **触发媒介**：用户使用鼠标左键点击 Header 中央的状态胶囊

---

## 2. 具体实现架构

### 2.1 预加载暴露 (preload.js)
为防止前端渲染进程直接接触 Node.js API，通过 contextBridge 安全沙箱将特定的 IPC 发送机制暴露至前端：
- **安全过滤**：预加载脚本内部设置了通信通道白名单，非白名单内的通道将被静默拒绝。
- **暴露代码**：
  ```javascript
  const { contextBridge, ipcRenderer } = require('electron');

  contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
      send: (channel, data) => {
        const validChannels = ['trigger-nap-mode'];
        if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, data);
        }
      }
    }
  });
  ```

### 2.2 前端事件绑定 (Renderer)
- 增加了 `cursor-pointer` 样式类用作视觉引导，表明该胶囊可以进行点击交互。
- 绑定 `onClick` 事件劫持器，通过沙箱中的 API 向主进程通信：
  ```typescript
  const handleContainerClick = () => {
    if (typeof window !== 'undefined') {
      const electron = (window as any).electron;
      if (electron && electron.ipcRenderer) {
        electron.ipcRenderer.send('trigger-nap-mode');
      }
    }
  };
  ```

### 2.3 主进程拦截回调 (Main Process)
在主进程中注册事件拦截器。一旦捕获到渲染进程的 `trigger-nap-mode` 发射，立即执行预设回调：
- **回调逻辑**：主进程接收该通知，执行相应的模式切换（当前为 Console 日志记录）：
  ```javascript
  ipcMain.on('trigger-nap-mode', (event) => {
    console.log('Nap mode activated');
  });
  ```

---

> **架构结论**
> 本通道的建立完全遵守了 Electron 最新的 contextIsolation 与 contextBridge 安全设计规范，隔绝了渲染层与系统级底层 API 的直接接触，实现了安全的高内聚通信架构。
