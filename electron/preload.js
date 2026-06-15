const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => {
      // 允许的 IPC 通道白名单
      const validChannels = ['trigger-nap-mode'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    invoke: (channel, data) => {
      // 允许的 IPC 双向通信白名单
      const validChannels = [
        'read-local-workspace', 
        'scan-workspace-paths', 
        'read-file-summary',
        'read-workspace-file',
        'write-workspace-file',
        'run-mimo-command',
        'kill-mimo-command'
      ];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
      }
      return Promise.reject(new Error(`Unauthorized IPC invoke channel: ${channel}`));
    },
    // 支持订阅来自主进程的日志与状态回传事件
    on: (channel, callback) => {
      const validChannels = ['mimo-log', 'mimo-status'];
      if (validChannels.includes(channel)) {
        const subscription = (event, ...args) => callback(...args);
        ipcRenderer.on(channel, subscription);
        // 返回取消订阅的闭包，便于前端 React useEffect 清理
        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      }
    }
  }
});
