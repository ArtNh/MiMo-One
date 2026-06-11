import React, { useState } from 'react';
import logo from './favicon.png';

export default function App() {
  const [maxMode, setMaxMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
        <header className="p-3 border-b border-slate-200">
          当前任务：<span className="font-medium">空闲</span>
        </header>
        {/* 中间交互区 */}
        <section className="flex-1 p-4 overflow-auto">
          {/* Chat Stream 区域，留白 */}
        </section>
        {/* 底部输入舱 */}
        <footer className="p-4 border-t border-slate-200 bg-gray-50 flex items-center">
          <input
            type="text"
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
            onClick={() => setIsProcessing(!isProcessing)}
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
