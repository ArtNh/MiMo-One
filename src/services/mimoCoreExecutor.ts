import { useAppStore } from '../store/useAppStore';

/**
 * 检查当前是否处于 Electron 桌面端物理环境
 */
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).electron?.ipcRenderer;
};

/**
 * 唤起底层 Mimo Code 原生内核，或在非 Electron 浏览器沙箱下优雅模拟退化
 * @param taskId 全局任务 C 栏对应的任务 ID
 * @param command 可执行程序名（如 mimo-code, git, node 等）
 * @param args 指令参数参数数组
 */
export const executeMimoCommand = async (
  taskId: string,
  command: string,
  args: string[]
): Promise<void> => {
  const store = useAppStore.getState();

  if (isElectron()) {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('run-mimo-command', {
        taskId,
        command,
        args
      });
      if (!result.success) {
        store.addTaskLog(taskId, `[内核错误] 唤起失败，原因: ${result.error}`);
        store.updateTaskStatus(taskId, 'failed');
      }
    } catch (err) {
      store.addTaskLog(taskId, `[内核异常] 通信失败: ${err instanceof Error ? err.message : String(err)}`);
      store.updateTaskStatus(taskId, 'failed');
    }
  } else {
    // 浏览器优雅仿真降级模式
    store.addTaskLog(taskId, `[仿真] 检测到 Web 环境，优雅仿真运行: "${command} ${args.join(' ')}"`);
    
    let progress = 0;
    const mockInterval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        clearInterval(mockInterval);
        store.updateTaskStatus(taskId, 'completed', 100);
        store.addTaskLog(taskId, '[仿真] [STDOUT] Mimo Core Execution Finished successfully.');
        store.addTaskLog(taskId, '[仿真] 模拟内核命令执行完毕。');
      } else {
        store.updateTaskStatus(taskId, 'running', progress);
        store.addTaskLog(taskId, `[仿真] [STDOUT] Loading AST modules and scanning code trees... (${progress}%)`);
      }
    }, 500);
  }
};
