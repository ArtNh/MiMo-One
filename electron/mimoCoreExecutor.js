const { spawn } = require('child_process');

// 映射任务 ID 到其活跃的子进程，用于随时中止与回收
const activeProcesses = new Map();

/**
 * 注册 Mimo 内核执行监听器
 * @param {import('electron').IpcMain} ipcMain 
 * @param {import('electron').BrowserWindow} mainWindow 
 */
function registerMimoExecutor(ipcMain, mainWindow) {
  // 运行 Mimo 指令通道
  ipcMain.handle('run-mimo-command', async (event, { taskId, command, args }) => {
    if (!taskId || !command) {
      return { success: false, error: 'Missing taskId or command' };
    }

    const timeoutDuration = 60000; // 60 秒超时断路器限制
    let isTerminated = false;
    const sender = event.sender;

    // 安全回传日志
    const sendLog = (text) => {
      if (!isTerminated && !mainWindow.isDestroyed()) {
        sender.send('mimo-log', { taskId, log: text });
      }
    };

    // 安全回传状态与退出事件
    const sendStatus = (status, exitCode = null) => {
      if (!isTerminated && !mainWindow.isDestroyed()) {
        sender.send('mimo-status', { taskId, status, exitCode });
      }
    };

    sendLog(`[内核] 正在拉起 Mimo Code 原生内核，指令: ${command} ${args.join(' ')}`);

    try {
      // 启动子进程，继承当前环境变量（含 API 密钥等）并允许 Shell 执行以保障兼容性
      const child = spawn(command, args, {
        env: {
          ...process.env
        },
        shell: true
      });

      activeProcesses.set(taskId, child);

      // 超时断路保护
      const timeoutTimer = setTimeout(() => {
        if (activeProcesses.has(taskId)) {
          sendLog(`[内核警报] 进程执行时间已达到 ${timeoutDuration / 1000} 秒硬性限额，触发断路器强行终止。`);
          child.kill('SIGKILL');
          activeProcesses.delete(taskId);
          isTerminated = true;
          sendStatus('failed', -1);
        }
      }, timeoutDuration);

      // stdout 数据管道重定向
      child.stdout.on('data', (data) => {
        const lines = data.toString().split(/\r?\n/);
        lines.forEach(line => {
          if (line.trim()) {
            sendLog(`[STDOUT] ${line}`);
          }
        });
      });

      // stderr 错误管道重定向
      child.stderr.on('data', (data) => {
        const lines = data.toString().split(/\r?\n/);
        lines.forEach(line => {
          if (line.trim()) {
            sendLog(`[STDERR] ${line}`);
          }
        });
      });

      // 监听子进程错误状态（如指令找不到）
      child.on('error', (err) => {
        clearTimeout(timeoutTimer);
        activeProcesses.delete(taskId);
        sendLog(`[内核错误] 唤起子进程失败，原因: ${err.message}`);
        sendStatus('failed', -2);
      });

      // 监听进程退出事件
      child.on('exit', (code) => {
        clearTimeout(timeoutTimer);
        activeProcesses.delete(taskId);

        if (isTerminated) return;

        sendLog(`[内核] 内核进程退出，Exit Code: ${code}`);
        if (code === 0) {
          sendStatus('completed', 0);
        } else {
          sendStatus('failed', code);
        }
      });

      return { success: true };
    } catch (err) {
      console.error('Spawn mimo command process failed:', err);
      sendLog(`[内核异常] 启动失败: ${err instanceof Error ? err.message : String(err)}`);
      sendStatus('failed', -3);
      return { success: false, error: String(err) };
    }
  });

  // 强行终止 Mimo 指令通道
  ipcMain.handle('kill-mimo-command', async (event, { taskId }) => {
    if (activeProcesses.has(taskId)) {
      const child = activeProcesses.get(taskId);
      child.kill('SIGKILL');
      activeProcesses.delete(taskId);
      return { success: true };
    }
    return { success: false, error: 'Process not active' };
  });
}

module.exports = { registerMimoExecutor };
