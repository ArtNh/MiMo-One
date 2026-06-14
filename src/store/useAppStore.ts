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
  addTask: (task: Omit<AgentTask, 'id' | 'logs'>) => void;
  updateTaskStatus: (id: string, status: AgentTask['status'], progress?: number) => void;
  addTaskLog: (id: string, log: string) => void;
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
  addTask: (task) => set((state) => {
    const newTask: AgentTask = {
      ...task,
      id: `task-${Date.now()}`,
      logs: ['Initializing...']
    };
    return { tasks: [newTask, ...state.tasks] };
  }),
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
  }))
}));
