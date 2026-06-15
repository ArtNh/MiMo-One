import logo from '../../favicon.png';
import { useAppStore } from '../../store/useAppStore';

interface SidebarProps {
  isProcessing: boolean;
  onOpenSettings: () => void;
}

const sidebarData = {
  workspaces: [
    { id: 'ws-1', name: 'MiMo-One-Workspace', active: true }
  ],
  agents: [
    { id: 'agent-harri', name: 'Harri 中枢', active: true },
    { id: 'agent-coder', name: 'Coder 编译', active: false },
    { id: 'agent-explorer', name: 'Explorer 检索', active: false }
  ],
  settings: [
    { id: 'set-system', name: '系统设置' },
    { id: 'set-about', name: '关于中枢' }
  ]
};

export default function Sidebar({ isProcessing, onOpenSettings }: SidebarProps) {
  const activeAgentId = useAppStore((state) => state.activeAgentId);
  const setActiveAgentId = useAppStore((state) => state.setActiveAgentId);
  const setSessionId = useAppStore((state) => state.setSessionId);
  const addTask = useAppStore((state) => state.addTask);

  const handleNewProject = async () => {
    const electron = (window as any).electron;
    if (electron && electron.ipcRenderer) {
      // 1. 在 C 栏创建一个 Mimo CLI 原生初始化的任务卡片
      const taskId = addTask({
        taskName: '物理 Mimo CLI 项目初始化',
        status: 'running',
        agentName: 'Explorer 检索',
        progress: 10
      });
      // 2. 调用主进程执行 mimo init 
      const res = await electron.ipcRenderer.invoke('mimo-init', { taskId });
      if (res && res.success) {
        useAppStore.getState().updateTaskStatus(taskId, 'completed', 100);
      }
    } else {
      // 仿真 Web 环境
      const taskId = addTask({
        taskName: '[仿真] Mimo CLI 项目初始化',
        status: 'running',
        agentName: 'Explorer 检索',
        progress: 10
      });
      setTimeout(() => {
        useAppStore.getState().addTaskLog(taskId, '[仿真] [STDOUT] Created project config template in .mimo/config');
        useAppStore.getState().addTaskLog(taskId, '[仿真] 项目初始化成功！');
        useAppStore.getState().updateTaskStatus(taskId, 'completed', 100);
      }, 1000);
    }
  };

  const handleNewSession = async () => {
    const electron = (window as any).electron;
    if (electron && electron.ipcRenderer) {
      // 1. 调用主进程执行 mimo session new，截获会话 ID
      const res = await electron.ipcRenderer.invoke('mimo-new-session');
      if (res && res.success) {
        setSessionId(res.sessionId);
        // 通过添加日志向 C 监控汇报新会话挂载
        const taskId = addTask({
          taskName: `挂载 Mimo 会话: ${res.sessionId}`,
          status: 'completed',
          agentName: 'Harri 中枢',
          progress: 100
        });
        useAppStore.getState().addTaskLog(taskId, `[内核] 会话 ID ${res.sessionId} 挂载成功！所有 B 栏的 stdin 交互将物理隔离指向该 Session 标识。`);
      }
    } else {
      const simSessionId = `session_sim_${Math.random().toString(36).substr(2, 6)}`;
      setSessionId(simSessionId);
      const taskId = addTask({
        taskName: `[仿真] 挂载 Mimo 会话: ${simSessionId}`,
        status: 'completed',
        agentName: 'Harri 中枢',
        progress: 100
      });
      useAppStore.getState().addTaskLog(taskId, `[仿真] 成功创建并隔离仿真会话空间。`);
    }
  };

  return (
    <aside className="w-full h-full flex flex-col justify-between overflow-hidden text-sm">
      {/* 顶部 Logo 区：强制 shrink-0 锁死不压缩，配置 overflow-visible 防止特效截断 */}
      <div className="flex items-center space-x-2 overflow-visible p-2 border-b border-slate-100 pb-3 mb-4 shrink-0">
        <img 
          src={logo} 
          alt="Logo" 
          className={`w-10 h-10 rounded-full transition-all duration-300 shrink-0 ${
            isProcessing 
              ? 'animate-bristle drop-shadow-[0_0_8px_rgba(37,99,235,0.6)]' 
              : ''
          }`} 
        />
        <div className="flex flex-col min-w-0 overflow-hidden">
          <span className="font-bold text-base truncate whitespace-nowrap text-slate-800">MiMo One</span>
          <span className="text-[10px] text-blue-500 uppercase tracking-widest font-semibold">Active Agent</span>
        </div>
      </div>

      {/* 中间：自适应可滚动工作区与智能体列表区域 */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-6">
        {/* 新增：项目与会话管理 */}
        <div className="px-2 space-y-2 shrink-0">
          <button
            onClick={handleNewProject}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-xs"
          >
            <span>＋</span> 新建项目
          </button>
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-xs"
          >
            <span>＋</span> 新建会话
          </button>
        </div>

        {/* 工作区段 */}
        <div className="px-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">工作区</div>
          {sidebarData.workspaces.map((ws) => (
            <div 
              key={ws.id}
              className={`flex items-center px-3 py-2 rounded-lg border text-xs transition-all cursor-pointer ${
                ws.active 
                  ? 'border-blue-200 bg-blue-50/35 text-blue-700 font-medium' 
                  : 'border-slate-100 bg-transparent text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full mr-2 shrink-0 ${ws.active ? 'bg-blue-500' : 'bg-slate-300'}`} />
              <span className="truncate whitespace-nowrap">{ws.name}</span>
            </div>
          ))}
        </div>

        {/* 智能体导航项 */}
        <div className="px-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">智能体中枢</div>
          <div className="space-y-1.5">
            {sidebarData.agents.map((agent) => {
              const isActive = agent.id === activeAgentId;
              return (
                <div 
                  key={agent.id}
                  onClick={() => setActiveAgentId(agent.id)}
                  className={`flex items-center px-3 py-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                    isActive 
                      ? 'border-blue-300 bg-blue-50 text-blue-700 font-semibold shadow-sm' 
                      : 'border-slate-150 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <span className="truncate whitespace-nowrap">{agent.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部：系统设置（锁死不收缩） */}
      <div className="px-2 pt-4 pb-2 border-t border-slate-100 mt-4 shrink-0">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">配置</div>
        <div className="space-y-1.5">
          {sidebarData.settings.map((set) => (
            <div 
              key={set.id}
              onClick={set.id === 'set-system' ? onOpenSettings : undefined}
              className="flex items-center px-3 py-2 rounded-lg border border-slate-150 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs text-slate-600 transition-all cursor-pointer"
            >
              <span className="truncate whitespace-nowrap">{set.name}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
