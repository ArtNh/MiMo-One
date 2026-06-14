import React, { useState } from 'react';

export interface SubagentTask {
  id: string;
  taskName: string;
  status: 'pending' | 'running' | 'completed';
  progress: number;
}

const SubagentMonitor: React.FC = () => {
  // 初始化三条模拟的子进程任务数据
  const [tasks] = useState<SubagentTask[]>([
    {
      id: 'task-1',
      taskName: '项目文件树深度遍历解析',
      status: 'completed',
      progress: 100,
    },
    {
      id: 'task-2',
      taskName: '状态管理通信管道可用性分析',
      status: 'running',
      progress: 68,
    },
    {
      id: 'task-3',
      taskName: '安全边界防篡改白名单过滤校验',
      status: 'pending',
      progress: 0,
    },
  ]);

  const renderStatusIndicator = (status: SubagentTask['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        );
      case 'running':
        return (
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-300"></span>
        );
    }
  };

  const getStatusText = (status: SubagentTask['status']) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'running': return '执行中';
      case 'pending': return '排队中';
      default: return '等待';
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col space-y-3 mt-2">
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className="flex flex-col p-3 rounded-lg border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            {/* 上半部分：状态、名字和进度百分比 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2.5">
                {renderStatusIndicator(task.status)}
                <span className="font-medium text-slate-700 text-xs tracking-wider truncate max-w-[180px]">
                  {task.taskName}
                </span>
              </div>
              <span className="text-slate-400 font-mono text-[10px] tracking-wider">
                {task.status === 'completed' ? '100%' : `${task.progress}%`}
              </span>
            </div>

            {/* 下半部分：极简渐变进度条 */}
            <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  task.status === 'completed' 
                    ? 'bg-emerald-400' 
                    : task.status === 'running' 
                    ? 'bg-sky-400' 
                    : 'bg-slate-200'
                }`}
                style={{ width: `${task.progress}%` }}
              ></div>
            </div>
            
            {/* 附加：状态与标识文字 */}
            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 tracking-widest font-light">
              <span>{task.id.toUpperCase()}</span>
              <span>{getStatusText(task.status)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubagentMonitor;
