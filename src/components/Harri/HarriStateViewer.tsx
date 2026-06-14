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
interface HarriStateViewerProps {
  status?: HarriStatus;
}

const HarriStateViewer: React.FC<HarriStateViewerProps> = ({ status: propStatus }) => {
  const [internalStatus, setInternalStatus] = useState<HarriStatus>(HarriStatusEnum.Sleeping);

  // 仅在没有传入外部 status 时，才启用内部的循环演示
  useEffect(() => {
    if (propStatus !== undefined) return;

    const cycle = setInterval(() => {
      setInternalStatus(prev => {
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
  }, [propStatus]);

  const currentStatus = propStatus !== undefined ? propStatus : internalStatus;

  const renderContent = () => {
    switch (currentStatus) {
      case HarriStatusEnum.Sleeping:
        return (
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full border shadow-sm transition-colors duration-300 bg-gray-100 border-gray-200 text-gray-500 animate-pulse">
            💤 Zzz... (Harri 正在休眠)
          </div>
        );
      case HarriStatusEnum.Processing:
        return (
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full border shadow-sm transition-colors duration-300 bg-blue-50 border-blue-200 text-blue-600 animate-pulse">
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
    <div className="flex items-center justify-center whitespace-nowrap">
      {renderContent()}
    </div>
  );
};

export default HarriStateViewer;
