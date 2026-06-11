const { spawn } = require('child_process');
const path = require('path');

// 启动 Vite 开发服务器
const devProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..')
});

// 等待几秒后启动 Electron（假设 Vite 已就绪）
setTimeout(() => {
  const electronProcess = spawn('electron', ['.'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.resolve(__dirname, '..')
  });

  electronProcess.on('close', (code) => {
    console.log('Electron 进程退出，代码:', code);
    // 关闭 Vite 进程
    devProcess.kill();
    process.exit(code);
  });
}, 2000);

// 当 Vite 进程异常退出时，直接退出脚本
devProcess.on('close', (code) => {
  console.log('Vite 开发服务器进程退出，代码:', code);
  process.exit(code);
});
