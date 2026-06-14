import React from 'react';

interface NapModeOverlayProps {
  onWakeUp: () => void;
}

const NapModeOverlay: React.FC<NapModeOverlayProps> = ({ onWakeUp }) => {
  return (
    <div 
      onDoubleClick={onWakeUp}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md transition-opacity duration-700 select-none cursor-pointer"
      title="双击退出午睡模式"
    >
      <div className="relative flex flex-col items-center justify-center space-y-6">
        {/* Harri 深度睡眠视觉元素 (呼吸月亮与流光光晕效果) */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full bg-blue-500/10 blur-xl animate-pulse duration-[3000ms]"></div>
          <div className="absolute w-16 h-16 rounded-full bg-indigo-500/15 blur-lg animate-pulse duration-[2000ms]"></div>
          
          <div className="relative text-5xl filter drop-shadow-[0_0_15px_rgba(147,197,253,0.3)] animate-pulse duration-[4000ms]">
            🌙
          </div>
        </div>

        {/* 提示文案 */}
        <div className="flex flex-col items-center space-y-2">
          <span className="text-slate-300 text-lg tracking-widest font-light animate-pulse duration-[2500ms]">
            沉浸专注中...
          </span>
          <span className="text-slate-500 text-xs tracking-wider">
            双击任意区域唤醒
          </span>
        </div>
      </div>
    </div>
  );
};

export default NapModeOverlay;
