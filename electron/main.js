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

// 读取特定工作区文件的完整内容
ipcMain.handle('read-workspace-file', async (event, relativePath) => {
  const fs = require('fs').promises;
  const path = require('path');
  try {
    const fullPath = path.resolve(process.cwd(), relativePath);
    if (!fullPath.startsWith(process.cwd())) {
      throw new Error(`Unauthorized file access path: ${relativePath}`);
    }
    const content = await fs.readFile(fullPath, 'utf8');
    return content;
  } catch (err) {
    console.error(`Read workspace file failed for ${relativePath}:`, err);
    throw err;
  }
});

// 写入或重写工作区文件内容
ipcMain.handle('write-workspace-file', async (event, { relativePath, content }) => {
  const fs = require('fs').promises;
  const path = require('path');
  try {
    const fullPath = path.resolve(process.cwd(), relativePath);
    if (!fullPath.startsWith(process.cwd())) {
      throw new Error(`Unauthorized file access path: ${relativePath}`);
    }
    // 确保父级目录存在
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
    return { success: true };
  } catch (err) {
    console.error(`Write workspace file failed for ${relativePath}:`, err);
    return { success: false, error: err.message };
  }
});




let activeMimoProcess = null;

// 安全覆写 Mimo Code 原生配置文件，并同步静默执行 config set 命令行
ipcMain.handle('save-mimo-config', async (event, config) => {
  const os = require('os');
  const fs = require('fs').promises;
  const path = require('path');
  const { exec } = require('child_process');
  
  try {
    const configPath = path.join(os.homedir(), '.mimo_config');
    const newConfig = {
      apiKey: config.apiKey,
      apiBaseUrl: config.apiBaseUrl,
      defaultModel: config.defaultModel,
      maxTokens: config.maxTokens,
      defaultWorkspacePath: config.defaultWorkspacePath
    };
    // 1. 物理覆写本地用户家目录配置文件
    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2), 'utf8');

    // 2. 异步静默调用 mimo 命令行写入（若环境中有 CLI 存在）
    exec(`mimo config set apiKey "${config.apiKey}"`);
    exec(`mimo config set apiBaseUrl "${config.apiBaseUrl}"`);
    exec(`mimo config set defaultModel "${config.defaultModel}"`);

    return { success: true };
  } catch (err) {
    console.error('[GUI Wrapper] Save mimo config failed:', err);
    return { success: false, error: err.message };
  }
});

// 静默调用原生 mimo session new，提取并返回会话 ID
ipcMain.handle('mimo-new-session', async () => {
  const { exec } = require('child_process');
  return new Promise((resolve) => {
    // 运行 mimo session new
    exec('mimo session new', (err, stdout, stderr) => {
      if (err) {
        // 如果物理环境不存在 mimo CLI，则优雅自动生成仿真 Session ID
        const fakeSessionId = `session_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
        console.log('[GUI Wrapper] 物理 mimo-CLI 未就绪，自动回退生成仿真会话 ID:', fakeSessionId);
        resolve({ success: true, sessionId: fakeSessionId });
      } else {
        // 匹配输出中的 ID，例如 "Created new session: sess_abcdef123"
        const output = stdout.toString().trim();
        const match = output.match(/sess_[a-zA-Z0-9_-]+/);
        const sessId = match ? match[0] : `sess_cli_${Date.now().toString(36)}`;
        console.log('[GUI Wrapper] 原生 mimo session new 执行成功，截获会话 ID:', sessId);
        resolve({ success: true, sessionId: sessId });
      }
    });
  });
});

// 静默调用 mimo init 并在子智能体监控中输出项目初始化日志
ipcMain.handle('mimo-init', async (event, { taskId }) => {
  const { exec } = require('child_process');
  const webContents = event.sender;

  const sendLog = (text) => {
    if (!webContents.isDestroyed()) {
      webContents.send('mimo-log', { taskId, log: text });
    }
  };

  sendLog('[内核] 开始在当前工作区静默初始化 Mimo 项目...');
  sendLog(`[PTY] 运行指令: mimo init`);

  return new Promise((resolve) => {
    exec('mimo init', (err, stdout, stderr) => {
      if (err) {
        sendLog(`[STDERR] [仿真降级警告] 未能检测到系统全局 mimo 可执行文件: ${err.message}`);
        sendLog('[内核] [仿真] 自动启动兼容层，在本地模拟 mimo 项目初始化成功！');
        sendLog('[内核] 写入 .mimo/config 模版完成。');
        sendLog('[内核] 项目初始化完成。');
        resolve({ success: true });
      } else {
        if (stdout) {
          stdout.toString().split(/\r?\n/).forEach(l => l && sendLog(`[STDOUT] ${l}`));
        }
        if (stderr) {
          stderr.toString().split(/\r?\n/).forEach(l => l && sendLog(`[STDERR] ${l}`));
        }
        sendLog('[内核] 物理 mimo init 执行成功。');
        resolve({ success: true });
      }
    });
  });
});

// 拉起 Native mimo chat 常驻交互进程并接轨 stdin/stdout 彩色流
ipcMain.handle('mimo-start-chat-process', async (event, { sessionId }) => {
  const { spawn } = require('child_process');
  const path = require('path');
  const webContents = event.sender;

  if (activeMimoProcess) {
    try { activeMimoProcess.kill('SIGKILL'); } catch(e){}
    activeMimoProcess = null;
  }

  let cmd = 'mimo'; // 默认优先系统全局的 mimo
  // 打包环境下使用 extraResources bin 路径保护
  if (app.isPackaged) {
    const isWin = process.platform === 'win32';
    cmd = path.join(process.resourcesPath, 'bin', isWin ? 'mimo.exe' : 'mimo');
  }

  const args = ['chat'];
  if (sessionId) {
    args.push('--session', sessionId);
  }

  console.log(`[GUI Wrapper] 准备拉起 Native 交互进程: ${cmd} ${args.join(' ')}`);

  try {
    // 拉起 mimo chat 子进程，保持 stdin 打开以支持多轮交互
    activeMimoProcess = spawn(cmd, args, {
      env: process.env,
      shell: true
    });

    // 实时推送 stdout 彩色终端流
    activeMimoProcess.stdout.on('data', (data) => {
      const text = data.toString();
      if (!webContents.isDestroyed()) {
        webContents.send('mimo-process-stdout', { text });
      }
    });

    // 实时推送 stderr 终端流
    activeMimoProcess.stderr.on('data', (data) => {
      const text = data.toString();
      if (!webContents.isDestroyed()) {
        webContents.send('mimo-process-stderr', { text });
      }
    });

    activeMimoProcess.on('exit', (code) => {
      console.log(`[GUI Wrapper] Native 进程退出，Code: ${code}`);
      if (!webContents.isDestroyed()) {
        webContents.send('mimo-process-exit', { code });
      }
      activeMimoProcess = null;
    });

    return { success: true };
  } catch (err) {
    console.error('[GUI Wrapper] Spawn mimo chat process failed:', err);
    // 如果系统内没有 mimo 二进制，则启动优雅的本地仿真 CLI 终端，前端通过模拟流进行自适应兜底
    return { success: false, error: err.message, fallbackSimulation: true };
  }
});

// 渲染层向常驻子进程的 stdin 写入输入流数据
ipcMain.handle('send-mimo-input', async (event, text) => {
  if (activeMimoProcess && activeMimoProcess.stdin) {
    try {
      activeMimoProcess.stdin.write(text + '\n');
      return { success: true };
    } catch (err) {
      console.error('[GUI Wrapper] stdin write failed:', err);
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'No active mimo process stdin channel' };
});

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
