import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { eventBus } from '../../lib/eventBus';
import { executeMimoCommand } from '../../services/mimoCoreExecutor';

const SubagentMonitor: React.FC = () => {
  const tasks = useAppStore((state) => state.tasks);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const activeIntervals = useRef<any[]>([]);

  useEffect(() => {
    const handleTaskTrigger = (data: { type: string; description: string }) => {
      console.log('SubagentMonitor received TASK_TRIGGER data:', data);
      let agentName = 'Harri 中枢';
      let taskName = '常规指令分析';
      
      let command = 'mimo-code';
      let args: string[] = [];

      if (data.type === 'compile') {
        agentName = 'Coder 编译';
        taskName = '编译代码';
        command = 'npm';
        args = ['run', 'build'];
      } else if (data.type === 'analyze') {
        agentName = 'Explorer 检索';
        taskName = '分析项目架构';
        command = 'mimo-code';
        args = ['analyze', '--workspace', '.'];
      } else if (data.type === 'test') {
        agentName = 'Tester 诊断';
        taskName = '测试用例诊断';
        command = 'npm';
        args = ['test'];
      }

      const store = useAppStore.getState();
      
      // 添加新任务到 Zustand store并获取其新 ID
      const taskId = store.addTask({
        agentName,
        taskName,
        status: 'running',
        progress: 0
      });

      // 初始化日志
      store.addTaskLog(taskId, `[系统] 监听到 TASK_TRIGGER 事件，类型: ${data.type}`);
      store.addTaskLog(taskId, `[系统] 启动底层原生子进程，参数: ${command} ${args.join(' ')}`);

      // 调用桥接核心执行器
      executeMimoCommand(taskId, command, args);
    };

    eventBus.on('TASK_TRIGGER', handleTaskTrigger);

    // 订阅主进程发送的原生终端日志流与状态变更
    const electron = (window as any).electron;
    let unsubscribeLog: (() => void) | undefined;
    let unsubscribeStatus: (() => void) | undefined;

    if (electron && electron.ipcRenderer && electron.ipcRenderer.on) {
      unsubscribeLog = electron.ipcRenderer.on('mimo-log', (data: { taskId: string; log: string }) => {
        useAppStore.getState().addTaskLog(data.taskId, data.log);
      });

      unsubscribeStatus = electron.ipcRenderer.on('mimo-status', (data: { taskId: string; status: any; exitCode: number | null }) => {
        const store = useAppStore.getState();
        if (data.status === 'completed') {
          store.updateTaskStatus(data.taskId, 'completed', 100);
        } else if (data.status === 'failed') {
          store.updateTaskStatus(data.taskId, 'failed');
          store.addTaskLog(data.taskId, `[系统] 内核进程执行失败，Exit Code: ${data.exitCode}`);
        }
      });
    }

    return () => {
      eventBus.off('TASK_TRIGGER', handleTaskTrigger);
      if (unsubscribeLog) unsubscribeLog();
      if (unsubscribeStatus) unsubscribeStatus();
    };
  }, []);

  // 实时状态更新调试日志打印
  useEffect(() => {
    console.log('Subagent component rendering with tasks:', tasks);
  }, [tasks]);

  const toggleExpand = (id: string) => {
    setExpandedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderStatusIndicator = (status: 'pending' | 'running' | 'completed' | 'failed') => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-20"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
        );
      case 'running':
        return (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-300"></span>
        );
    }
  };

  const getStatusText = (status: 'pending' | 'running' | 'completed' | 'failed') => {
    switch (status) {
      case 'completed': return '已完成';
      case 'running': return '执行中';
      case 'failed': return '已失败';
      case 'pending': return '排队中';
      default: return '等待';
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col space-y-2 mt-2">
        {tasks.map((task) => (
          <div 
            key={task.id} 
            onClick={() => toggleExpand(task.id)}
            className="flex flex-col p-3 border border-gray-100 rounded-lg bg-transparent mb-2 cursor-pointer hover:border-gray-300 hover:bg-gray-50/50 transition-all select-none"
          >
            {/* 上半部分：状态、名字和进度百分比 */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2">
                {renderStatusIndicator(task.status)}
                <span className="text-sm text-gray-700 truncate max-w-[200px]">
                  {task.taskName}
                </span>
              </div>
              <span className="text-gray-400 font-mono text-xs">
                {task.status === 'completed' ? '100%' : `${task.progress}%`}
              </span>
            </div>

            {/* 中半部分：极简扁平化进度条 */}
            <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden mb-2.5">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  task.status === 'completed' 
                    ? 'bg-emerald-400' 
                    : task.status === 'running' 
                    ? 'bg-blue-400' 
                    : 'bg-gray-200'
                }`}
                style={{ width: `${task.progress}%` }}
              ></div>
            </div>
            
            {/* 下半部分：状态与标识文字 */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="truncate max-w-[120px]">{task.id.toUpperCase()}</span>
              <span>{getStatusText(task.status)}</span>
            </div>

            {/* 日志输出区域：仅在 expandedTasks[task.id] 为真时渲染展示 */}
            {expandedTasks[task.id] && task.logs && task.logs.length > 0 && (
              <div className="mt-2.5 p-2 bg-gray-50/30 rounded text-[10px] font-mono text-gray-400 border border-gray-100/50 max-h-24 overflow-y-auto space-y-1">
                {task.logs.map((log, logIdx) => (
                  <div key={logIdx} className="truncate">{`> ${log}`}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubagentMonitor;
