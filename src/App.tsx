import { useState } from 'react';
import logo from './favicon.png';
import HarriStateViewer, { HarriStatus } from './components/Harri/HarriStateViewer';

export default function App() {
  const [maxMode, setMaxMode] = useState(false);
  const [harriStatus, setHarriStatus] = useState<HarriStatus>('idle');
  const [inputValue, setInputValue] = useState('');

  const isProcessing = harriStatus === 'processing';

  const handleSend = () => {
    if (!inputValue.trim()) return;
    setHarriStatus('processing');
    setInputValue('');

    // 模拟消息发送的网络延迟（Promise 异步链）
    new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000);
    }).finally(() => {
      setHarriStatus('idle');
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="flex h-screen w-screen text-sm text-gray-800">
      {/* 左侧 A 区 */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4">
        <div className="flex items-center space-x-2 mb-4">
          <img 
            src={logo} 
            alt="Logo" 
            className={`w-12 h-12 rounded-full transition-all duration-300 ${
              isProcessing 
                ? 'animate-bristle drop-shadow-[0_0_8px_rgba(37,99,235,0.6)]' 
                : ''
            }`} 
          />
          <span className="font-bold text-lg">MiMo One</span>
        </div>
        {/* 预留记忆进度条位置 */}
        <div className="flex-1"></div>
      </aside>

      {/* 中央 B 区 */}
      <main className="flex-1 bg-white flex flex-col">
        {/* 顶部状态栏 */}
        <header className="relative flex items-center justify-between w-full h-12 px-4 border-b border-gray-100">
          <div className="text-sm text-gray-500">当前工作区: 未挂载</div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <HarriStateViewer status={harriStatus} />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>上下文: 4.2k / 128k</span>
            <button className="px-2 py-1 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer">压缩</button>
          </div>
        </header>
        {/* 中间交互区 */}
        <section className="flex-1 p-4 overflow-auto">
          {/* Chat Stream 区域，留白 */}
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
          <label className="ml-4 flex items-center cursor-pointer select-none">
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
            className="ml-4 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium rounded shadow transition-colors"
          >
            测试运算
          </button>
        </footer>
      </main>

      {/* 右侧 C 区 */}
      <aside className="w-96 bg-slate-50 border-l border-slate-200 p-4">
        <h2 className="font-semibold text-lg mb-2">Subagent 监控</h2>
        {/* 监控内容留空 */}
      </aside>
    </div>
  );
}
