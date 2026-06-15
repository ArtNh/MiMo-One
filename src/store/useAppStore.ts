import { create } from 'zustand';

export interface AgentTask {
  id: string;
  status: 'pending' | 'running' | 'completed';
  logs: string[];
  agentName: string;
  taskName: string;
  progress: number;
}

interface AppState {
  tasks: AgentTask[];
  activeAgentId: string;
  addTask: (task: Omit<AgentTask, 'id' | 'logs'> & { id?: string }) => string;
  updateTaskStatus: (id: string, status: AgentTask['status'], progress?: number) => void;
  addTaskLog: (id: string, log: string) => void;
  setActiveAgentId: (id: string) => void;
  simulateTaskProgress: (taskId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
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
  }
}));
