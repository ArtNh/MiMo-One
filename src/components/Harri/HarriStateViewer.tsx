import React, { useState, useEffect } from 'react';

// Harri 运行状态类型定义
export type HarriStatus = 'sleeping' | 'processing' | 'idle';

// 状态枚举（便于扩展）
export const HarriStatusEnum = {
  Sleeping: 'sleeping' as HarriStatus,
  Processing: 'processing' as HarriStatus,
  Idle: 'idle' as HarriStatus,
};

/**
 * HarriStateViewer 组件
 * - 显示当前 Harri 的运行状态
 * - 默认状态为 "sleeping"
 * - 在 "sleeping" 状态下使用淡入淡出的动画占位
 */
const HarriStateViewer: React.FC = () => {
  const [status, setStatus] = useState<HarriStatus>(HarriStatusEnum.Sleeping);

  // 示例：每 10 秒在 three 状态间循环（实际业务中由外部事件驱动）
  useEffect(() => {
    const cycle = setInterval(() => {
      setStatus(prev => {
        switch (prev) {
          case HarriStatusEnum.Sleeping:
            return HarriStatusEnum.Processing;
          case HarriStatusEnum.Processing:
            return HarriStatusEnum.Idle;
          default:
            return HarriStatusEnum.Sleeping;
        }
      });
    }, 10000);
    return () => clearInterval(cycle);
  }, []);

  const renderContent = () => {
    switch (status) {
      case HarriStatusEnum.Sleeping:
        return (
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-full border shadow-sm transition-all duration-500 bg-gray-50/50 border-transparent text-gray-400 animate-pulse">
            💤 Zzz...
          </div>
        );
      case HarriStatusEnum.Processing:
        return (
        <div className="inline-flex items-center justify-center px-4 py-2 rounded-full border shadow-sm transition-all duration-500 bg-blue-50 border-blue-200 text-blue-600 animate-bounce">
          ✍️ 揉揉眼睛，正在搬砖...
        </div>
      );
      case HarriStatusEnum.Idle:
        return (
        <div className="inline-flex items-center justify-center px-4 py-2 rounded-full border shadow-sm transition-all duration-500 bg-emerald-50 border-emerald-200 text-emerald-800">
          ☕ 刚睡醒，随时待命
        </div>
      );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center p-2">
      
      {renderContent()}
    </div>
  );
};

export default HarriStateViewer;
