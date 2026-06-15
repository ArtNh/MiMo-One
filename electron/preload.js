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
      const validChannels = ['read-local-workspace', 'scan-workspace-paths', 'read-file-summary'];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
      }
      return Promise.reject(new Error(`Unauthorized IPC invoke channel: ${channel}`));
    }
  }
});
