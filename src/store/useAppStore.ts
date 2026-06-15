import { create } from 'zustand';

export interface AgentTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  logs: string[];
  agentName: string;
  taskName: string;
  progress: number;
}

export interface WorkspaceFile {
  filePath: string;
  summary: string;
  size: number;
}

export interface CodeDiff {
  fileName: string;
  oldValue: string;
  newValue: string;
}

interface AppState {
  tasks: AgentTask[];
  activeAgentId: string;
  workspaceFiles: WorkspaceFile[];
  addTask: (task: Omit<AgentTask, 'id' | 'logs'> & { id?: string }) => string;
  updateTaskStatus: (id: string, status: AgentTask['status'], progress?: number) => void;
  addTaskLog: (id: string, log: string) => void;
  setActiveAgentId: (id: string) => void;
  simulateTaskProgress: (taskId: string) => void;
  setWorkspaceFiles: (files: WorkspaceFile[]) => void;
  pendingDiff: CodeDiff | null;
  setPendingDiff: (diff: CodeDiff | null) => void;
  isCallingKernel: boolean;
  kernelCallingStatus: string;
  setIsCallingKernel: (isCalling: boolean, status?: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isCallingKernel: false,
  kernelCallingStatus: '',
  setIsCallingKernel: (isCalling, status = '') => set({ isCallingKernel: isCalling, kernelCallingStatus: status }),
  tasks: [
    {
      id: 'task-01',
      taskName: '检索本地索引库',
      status: 'completed',
      progress: 100,
      agentName: 'Explorer 检索',
      logs: ['Task started', 'Indexed 4.2k files', 'Finished']
    },
    {
      id: 'task-02',
      taskName: '生成代码片段',
      status: 'running',
      progress: 45,
      agentName: 'Coder 编译',
      logs: ['Task started', 'Compiling templates...']
    },
    {
      id: 'task-03',
      taskName: '测试用例诊断',
      status: 'pending',
      progress: 0,
      agentName: 'Tester 诊断',
      logs: ['Waiting in queue']
    }
  ],
  activeAgentId: 'agent-harri',
  addTask: (task) => {
    const taskId = task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    set((state) => {
      const newTask: AgentTask = {
        ...task,
        id: taskId,
        logs: ['Initializing...']
      };
      return { tasks: [newTask, ...state.tasks] };
    });
    return taskId;
  },
  updateTaskStatus: (id, status, progress) => set((state) => ({
    tasks: state.tasks.map((t) => 
      t.id === id 
        ? { ...t, status, progress: progress !== undefined ? progress : t.progress } 
        : t
    )
  })),
  addTaskLog: (id, log) => set((state) => ({
    tasks: state.tasks.map((t) => 
      t.id === id 
        ? { ...t, logs: [...t.logs, log] } 
        : t
    )
  })),
  setActiveAgentId: (id) => set({ activeAgentId: id }),
  simulateTaskProgress: (taskId) => {
    let currentProgress = 0;
    const task = useAppStore.getState().tasks.find(t => t.id === taskId);
    if (task) {
      currentProgress = task.progress;
    }

    const interval = setInterval(() => {
      const increment = Math.floor(Math.random() * 11) + 5; // 5% - 15%
      currentProgress += increment;

      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        useAppStore.getState().updateTaskStatus(taskId, 'completed', 100);
        useAppStore.getState().addTaskLog(taskId, '[模拟器] 进度已达到 100%，仿真测试完成。');
      } else {
        useAppStore.getState().updateTaskStatus(taskId, 'running', currentProgress);
        useAppStore.getState().addTaskLog(taskId, `[模拟器] 进度更新为 ${currentProgress}%`);
      }
    }, 500);
  },
  workspaceFiles: [],
  setWorkspaceFiles: (files) => set({ workspaceFiles: files }),
  pendingDiff: {
    fileName: 'src/components/A-Zone/Sidebar.tsx',
    oldValue: `export default function Sidebar({ isProcessing }: SidebarProps) {\n  return (\n    <aside className="w-full h-full flex flex-col justify-between text-sm">\n      {/* 顶部：Logo 与工作区 */}\n      <div className="flex flex-col">\n        <div className="flex items-center space-x-2 p-2 pb-3 mb-4">\n          <img src={logo} alt="Logo" className="w-10 h-10" />\n          <div className="flex flex-col">\n            <span className="font-bold">MiMo One</span>\n          </div>\n        </div>\n      </div>\n    </aside>\n  );\n}`,
    newValue: `export default function Sidebar({ isProcessing }: SidebarProps) {\n  return (\n    <aside className="w-full h-full flex flex-col justify-between overflow-hidden text-sm">\n      {/* 顶部 Logo 区：强制 shrink-0 锁死不压缩 */}\n      <div className="flex items-center space-x-2 p-2 pb-3 mb-4 shrink-0">\n        <img src={logo} alt="Logo" className="w-10 h-10 shrink-0" />\n        <div className="flex flex-col shrink-0">\n          <span className="font-bold">MiMo One</span>\n          <span className="text-[10px] text-blue-500 uppercase font-semibold">Active Agent</span>\n        </div>\n      </div>\n    </aside>\n  );\n}`
  },
  setPendingDiff: (diff) => set({ pendingDiff: diff })
}));
