const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => {
      // 允许的 IPC 通道白名单
      const validChannels = ['trigger-nap-mode'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    }
  }
});
