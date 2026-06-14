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
          <div className="text-gray-500 italic animate-pulse">
            Zzz...（Harri 正在休眠）
          </div>
        );
      case HarriStatusEnum.Processing:
        return <div className="text-blue-600">Harri 正在处理任务</div>;
      case HarriStatusEnum.Idle:
        return <div className="text-green-600">Harri 空闲待命</div>;
      default:
        return null;
    }
  };

  return (
    <section className="p-2 border-b border-slate-200 bg-gray-50">
      <h3 className="text-sm font-medium mb-1">Harri 状态</h3>
      {renderContent()}
    </section>
  );
};

export default HarriStateViewer;
