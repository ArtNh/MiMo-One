import { useState, useEffect } from 'react';
import logo from './favicon.png';
import HarriStateViewer, { HarriStatus } from './components/Harri/HarriStateViewer';
import NapModeOverlay from './components/NapModeOverlay';
import SubagentMonitor from './components/Subagent/SubagentMonitor';
import { fetchAgentResponse } from './services/llmService';

export default function App() {
  const [maxMode, setMaxMode] = useState(false);
  const [harriStatus, setHarriStatus] = useState<HarriStatus>('idle');
  const [inputValue, setInputValue] = useState('');
  const [isNapModeActive, setIsNapModeActive] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('未挂载');
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isDragging, setIsDragging] = useState(false);

  // 监听鼠标移动与释放事件以调节右侧面板大小
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      let newWidth = window.innerWidth - e.clientX;
      if (newWidth < 250) newWidth = 250;
      if (newWidth > 600) newWidth = 600;
      setRightPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // 初始化获取本地工作区名称
  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const electron = (window as any).electron;
        if (electron && electron.ipcRenderer) {
          const wsName = await electron.ipcRenderer.invoke('read-local-workspace');
          if (wsName) {
            setWorkspaceName(wsName);
          }
        }
      } catch (err) {
        console.error('获取工作区名称异常:', err);
      }
    };
    fetchWorkspace();
  }, []);

  const isProcessing = harriStatus === 'processing';
  const [messages, setMessages] = useState<{ role: 'harri' | 'user'; content: string }[]>([
    { role: 'harri', content: '你好，我是 Harri，你的多智能体协作中枢。今天有什么我可以帮你的？' }
  ]);

  const handleSend = () => {
    const message = inputValue.trim();
    if (!message) return;
    setHarriStatus('processing');
    setInputValue('');

    // 追加用户发送的消息气泡
    setMessages(prev => [...prev, { role: 'user', content: message }]);

    fetchAgentResponse(message)
      .then((res) => {
        // 追加 Harri 回应的消息气泡
        setMessages(prev => [...prev, { role: 'harri', content: res }]);
      })
      .catch((err) => {
        console.error('LLM 请求异常:', err);
      })
      .finally(() => {
        setHarriStatus('idle');
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className={`flex h-screen w-screen text-sm text-gray-800 ${isDragging ? 'user-select-none' : ''}`}>
      {/* 左侧 A 区 */}
      <aside className="w-56 shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col p-4">
        <div className="flex items-center space-x-2 mb-4 overflow-hidden">
          <img 
            src={logo} 
            alt="Logo" 
            className={`w-12 h-12 rounded-full transition-all duration-300 ${
              isProcessing 
                ? 'animate-bristle drop-shadow-[0_0_8px_rgba(37,99,235,0.6)]' 
                : ''
            }`} 
          />
          <span className="font-bold text-lg truncate whitespace-nowrap">MiMo One</span>
        </div>
        {/* 预留记忆进度条位置 */}
        <div className="flex-1"></div>
      </aside>

      {/* 中央 B 区 */}
      <main className="flex-1 min-w-[400px] bg-white flex flex-col">
        {/* 顶部状态栏 */}
        <header className="grid grid-cols-[1fr_auto_1fr] items-center w-full h-12 px-4 border-b border-gray-100">
          {/* 左侧：自适应缩略区 */}
          <div className="justify-self-start flex items-center min-w-0 overflow-hidden">
            <div className="text-sm text-gray-500 truncate whitespace-nowrap">当前工作区: {workspaceName}</div>
          </div>
          
          {/* 居中：状态显示胶囊 */}
          <div className="justify-self-center">
            <HarriStateViewer 
              status={harriStatus} 
              onClick={() => {
                setIsNapModeActive(true);
                setHarriStatus('sleeping');
              }}
            />
          </div>
          
          {/* 右侧：操作区 */}
          <div className="justify-self-end flex items-center gap-3 text-xs text-gray-500">
            <span className="whitespace-nowrap">上下文: 4.2k / 128k</span>
            <button className="px-2 py-1 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer whitespace-nowrap shrink-0">压缩</button>
          </div>
        </header>
        {/* 中间交互区 */}
        <section className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[70%] p-3.5 rounded-2xl border shadow-sm text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'rounded-tr-none bg-blue-50 border-blue-100/50 text-blue-700' 
                    : 'rounded-tl-none bg-gray-50 border-gray-100/50 text-gray-700'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </section>
        {/* 底部输入舱 */}
        <footer className="p-4 border-t border-slate-200 bg-gray-50 flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="在此输入..."
            className={`flex-1 p-2 border rounded focus:outline-none ${maxMode ? 'ring-2 ring-blue-400' : 'border-slate-300'}`}
          />
          <label className="ml-4 flex items-center cursor-pointer select-none whitespace-nowrap shrink-0">
            <input
              type="checkbox"
              className="mr-1"
              checked={maxMode}
              onChange={() => setMaxMode(!maxMode)}
            />
            Max Mode
          </label>
          <button
            onClick={() => {
              setHarriStatus(prev => prev === 'processing' ? 'idle' : 'processing');
            }}
            className="ml-4 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium rounded shadow transition-colors whitespace-nowrap shrink-0"
          >
            测试运算
          </button>
        </footer>
      </main>

      {/* 可拖拽分割线 Resizer */}
      <div 
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        className="w-1 cursor-col-resize bg-gray-100 hover:bg-blue-400 active:bg-blue-500 transition-colors z-10 shrink-0"
      />

      {/* 右侧 C 区 */}
      <aside 
        style={{ width: rightPanelWidth }}
        className="shrink-0 bg-slate-50 border-l border-slate-200 p-4"
      >
        <h2 className="font-semibold text-lg mb-2">Subagent 监控</h2>
        <SubagentMonitor />
      </aside>

      {/* 伴我午睡模式全屏遮罩 */}
      {isNapModeActive && (
        <NapModeOverlay 
          onWakeUp={() => {
            setIsNapModeActive(false);
            setHarriStatus('idle');
          }}
        />
      )}
    </div>
  );
}
