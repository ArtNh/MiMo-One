# 跨进程系统 I/O 与 IPC 通道设计规范说明

> **规范概述**
> 本文档定义了 MiMo One 项目中通过 Electron IPC 进行跨进程本地文件系统 I/O 读取的安全机制、接口规范以及状态渲染流程。

---

## 1. 跨进程 I/O 通道定义

### 1.1 `read-local-workspace` (双向读取本地工作区)
- **事件模式**：双向异步调用 (Request-Response)
- **渲染进程 (Renderer)**：`src/App.tsx`
- **主进程监听 (Main)**：`electron/main.js` 中的 `ipcMain.handle` 处理器
- **功能描述**：在前端 React 初始化挂载时发起双向调用，安全获取当前项目在宿主系统中的根目录名。

---

## 2. 安全过滤与通信实现

### 2.1 安全暴露沙箱接口 (`preload.js`)
前端不能直接访问 Node.js 原生模块。通过 contextBridge 的 exposeInMainWorld 接口实现多通道安全管控：
- **双向 invoke 方法暴露**：允许通过 promise 的形式进行异步状态流转，只放行在白名单内的安全通道。
- **白名单机制**：
  ```javascript
  invoke: (channel, data) => {
    const validChannels = ['read-local-workspace'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    return Promise.reject(new Error(`Unauthorized IPC invoke channel: ${channel}`));
  }
  ```

### 2.2 主进程系统调用与解析 (`main.js`)
主进程具有完整的 Node.js 跨平台文件系统和路径解析能力。通过 `ipcMain.handle` 注册工作区读取事件：
- **目录解析逻辑**：使用原生的 path 模块解析当前运行进程的 cwd basemane，作为工作区挂载结果返回。
- **处理器注册**：
  ```javascript
  ipcMain.handle('read-local-workspace', async () => {
    const path = require('path');
    return path.basename(process.cwd());
  });
  ```

### 2.3 前端视图挂载与渲染 (`App.tsx`)
- **生命周期挂载**：在 App 组件的 `useEffect` 中，一旦组件挂载完成立即发起跨进程调用。
- **数据流挂载**：
  ```typescript
  const [workspaceName, setWorkspaceName] = useState('未挂载');

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const electron = (window as any).electron;
        if (electron && electron.ipcRenderer) {
          const wsName = await electron.ipcRenderer.invoke('read-local-workspace');
          if (wsName) {
            setWorkspaceName(wsName);
          }
        }
      } catch (err) {
        console.error('获取工作区名称异常:', err);
      }
    };
    fetchWorkspace();
  }, []);
  ```
- **视图动态更新**：利用 React 状态自动更新 Header 组件中“当前工作区”节点的文本。

---

> **系统 I/O 安全结论**
> 本接口通过沙箱隔离和通道白名单机制，在极高安全性的前提下打通了 Electron 的系统级跨进程读取能力，完成了工作区挂载的基本骨架搭建。
