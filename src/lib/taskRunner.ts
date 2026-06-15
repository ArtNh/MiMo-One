import { useAppStore } from '../store/useAppStore';

/**
 * TaskRunner - 模拟智能体任务异步执行引擎
 */
export class TaskRunner {
  /**
   * 启动一个异步模拟任务
   * @param agentId 智能体 ID (例如: 'agent-coder')
   * @param taskDescription 任务的原始文本描述 (例如: '编译代码')
   */
  static runTask(agentId: string, taskDescription: string): void {
    let agentName = 'Harri 中枢';
    if (agentId === 'agent-coder') {
      agentName = 'Coder 编译';
    } else if (agentId === 'agent-explorer') {
      agentName = 'Explorer 检索';
    }

    const taskName = taskDescription.length > 20 
      ? `${taskDescription.substring(0, 18)}...` 
      : taskDescription;

    // 向全局状态添加任务并获取自动生成的唯一任务 ID
    const taskId = useAppStore.getState().addTask({
      agentName,
      taskName,
      status: 'running',
      progress: 0
    });

    const store = useAppStore.getState();

    // 记录初始日志
    store.addTaskLog(taskId, `[系统] 任务已成功挂载并指派给智能体 [${agentName}]`);
    store.addTaskLog(taskId, `[系统] 执行指令详情: "${taskDescription}"`);

    let currentProgress = 0;
    
    const interval = setInterval(() => {
      // 每次随机增加 10% - 20%
      const increment = Math.floor(Math.random() * 11) + 10;
      currentProgress += increment;

      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        
        // 更新任务状态为已完成
        useAppStore.getState().updateTaskStatus(taskId, 'completed', 100);
        useAppStore.getState().addTaskLog(taskId, `[${agentName}] 任务逻辑处理全部完成。`);
      } else {
        // 更新任务进度与状态
        useAppStore.getState().updateTaskStatus(taskId, 'running', currentProgress);
        useAppStore.getState().addTaskLog(taskId, `[${agentName}] 模块分析中... 当前进度: ${currentProgress}%`);
      }
    }, 800);
  }
}
