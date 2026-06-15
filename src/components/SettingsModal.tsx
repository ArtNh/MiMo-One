import { useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const settings = useSettingsStore();

  // 挂载受控的本地表单输入状态
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [apiBaseUrl, setApiBaseUrl] = useState(settings.apiBaseUrl);
  const [defaultModel, setDefaultModel] = useState(settings.defaultModel);
  const [maxTokens, setMaxTokens] = useState(settings.maxTokens);
  const [defaultWorkspacePath, setDefaultWorkspacePath] = useState(settings.defaultWorkspacePath);

  // 明暗密文切换状态
  const [showApiKey, setShowApiKey] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    const newSettings = {
      apiKey,
      apiBaseUrl,
      defaultModel,
      maxTokens: Number(maxTokens),
      defaultWorkspacePath
    };
    
    settings.setSettings(newSettings);

    const electron = (window as any).electron;
    if (electron && electron.ipcRenderer) {
      try {
        await electron.ipcRenderer.invoke('save-mimo-config', newSettings);
      } catch (err) {
        console.error('Failed to save configuration physically:', err);
      }
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 select-none">
      <div className="bg-white border border-slate-100 rounded-xl w-[450px] shadow-2xl p-6 flex flex-col space-y-4">
        {/* 头部面板 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <span className="font-semibold text-slate-800 text-sm">系统设置</span>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition-colors text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* 表单体 */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-slate-600">
          {/* API Key */}
          <div className="flex flex-col space-y-1.5">
            <label className="font-bold text-slate-700">API 访问凭证 (API Key)</label>
            <div className="relative flex items-center">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full pl-3 pr-16 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 text-[10px] text-blue-500 hover:text-blue-700 font-semibold cursor-pointer"
              >
                {showApiKey ? '隐藏' : '显示'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">将作为凭证透传给 Mimo Code 子进程，在内核执行中解析模型请求。</p>
          </div>

          {/* API Base URL */}
          <div className="flex flex-col space-y-1.5">
            <label className="font-bold text-slate-700">API 代理端点 (Base URL)</label>
            <input
              type="text"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 font-mono text-xs"
            />
          </div>

          {/* Default Model */}
          <div className="flex flex-col space-y-1.5">
            <label className="font-bold text-slate-700">默认大语言模型 (Model)</label>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white font-mono text-xs cursor-pointer"
            >
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4-turbo">gpt-4-turbo</option>
              <option value="claude-3-5-sonnet">claude-3.5-sonnet</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
            </select>
          </div>

          {/* Max Tokens */}
          <div className="flex flex-col space-y-1.5">
            <label className="font-bold text-slate-700">最大 Tokens 限额 (Max Tokens)</label>
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              placeholder="2048"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 font-mono text-xs"
            />
          </div>

          {/* Workspace Path */}
          <div className="flex flex-col space-y-1.5">
            <label className="font-bold text-slate-700">默认工作区物理路径 (Workspace Path)</label>
            <input
              type="text"
              value={defaultWorkspacePath}
              onChange={(e) => setDefaultWorkspacePath(e.target.value)}
              placeholder="D:/workspace/project"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 font-mono text-xs"
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer text-xs font-semibold"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors cursor-pointer text-xs font-semibold shadow-sm"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
