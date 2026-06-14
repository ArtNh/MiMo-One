import logo from '../../favicon.png';
import { useAppStore } from '../../store/useAppStore';

interface SidebarProps {
  isProcessing: boolean;
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

export default function Sidebar({ isProcessing }: SidebarProps) {
  const activeAgentId = useAppStore((state) => state.activeAgentId);
  const setActiveAgentId = useAppStore((state) => state.setActiveAgentId);
  return (
    <aside className="w-full h-full flex flex-col justify-between text-sm">
      {/* 顶部：Logo 与工作区 */}
      <div className="flex flex-col">
        {/* Logo 区：配置 overflow-visible 与 p-2 呼吸空间，防止炸毛动效被截断 */}
        <div className="flex items-center space-x-2 overflow-visible p-2 border-b border-slate-100 pb-3 mb-4">
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

        {/* 工作区段 */}
        <div className="px-2 mb-6">
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

      {/* 底部：系统设置 */}
      <div className="px-2 pb-2">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">配置</div>
        <div className="space-y-1.5">
          {sidebarData.settings.map((set) => (
            <div 
              key={set.id}
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
