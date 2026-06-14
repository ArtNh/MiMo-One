const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../src/favicon.png'),
    show: false,
    backgroundColor: '#f8fafc',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  // 当页面准备就绪时显示窗口，避免白屏
  win.once('ready-to-show', () => {
    win.show();
  });

  // 等待 Vite 开发服务器启动后再加载页面，避免连接被拒绝
  setTimeout(() => {
    win.loadURL(`http://localhost:${process.env.PORT || 5174}`);
  }, 1500);
}

// 监听渲染进程的“触发休眠模式”信号
ipcMain.on('trigger-nap-mode', (event) => {
  console.log('Nap mode activated');
});

// 处理渲染进程获取工作区目录名称的请求
ipcMain.handle('read-local-workspace', async () => {
  const path = require('path');
  return path.basename(process.cwd());
});


app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
