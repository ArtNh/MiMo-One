const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { registerMimoExecutor } = require('./mimoCoreExecutor');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 850,
    minHeight: 600,
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

  // 注册 Mimo 内核执行桥接器
  registerMimoExecutor(ipcMain, win);

  // 当页面准备就绪时显示窗口，避免白屏
  win.once('ready-to-show', () => {
    win.show();
  });

  // 等待 Vite 开发服务器启动后再加载页面，避免连接被拒绝
  setTimeout(() => {
    win.loadURL(`http://localhost:${process.env.PORT || 5173}`);
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

// 递归文件结构查找器
async function scanDir(dirPath, filesList = []) {
  const fs = require('fs').promises;
  const path = require('path');
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      // 过滤无关目录与大体积索引目录
      if (['node_modules', '.git', 'dist', 'dist-electron'].includes(entry.name)) {
        continue;
      }
      await scanDir(fullPath, filesList);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.md'].includes(ext)) {
        // 返回项目的相对路径（统一使用正斜杠）
        filesList.push(path.relative(process.cwd(), fullPath).replace(/\\/g, '/'));
      }
    }
  }
  return filesList;
}

// 递归扫描工作区文件相对路径
ipcMain.handle('scan-workspace-paths', async () => {
  try {
    const rootPath = process.cwd();
    return await scanDir(rootPath);
  } catch (err) {
    console.error('Scan workspace paths failed:', err);
    throw err;
  }
});

// 读取特定文件的内容摘要（安全限额 1500 字符）
ipcMain.handle('read-file-summary', async (event, relativePath) => {
  const fs = require('fs').promises;
  const path = require('path');
  try {
    // 强制安全防越界校验
    const fullPath = path.resolve(process.cwd(), relativePath);
    if (!fullPath.startsWith(process.cwd())) {
      throw new Error(`Unauthorized file access path: ${relativePath}`);
    }
    const content = await fs.readFile(fullPath, 'utf8');
    const summary = content.length > 1500 ? `${content.substring(0, 1500)}...` : content;
    return {
      summary,
      size: content.length
    };
  } catch (err) {
    console.error(`Read file summary failed for ${relativePath}:`, err);
    throw err;
  }
});


app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
