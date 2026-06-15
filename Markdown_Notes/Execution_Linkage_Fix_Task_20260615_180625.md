# 监控链路修复任务清单

---

### [2026-06-15 18:06:25] 任务清单

- [x] 注入模拟指令触发器：修改 `src/App.tsx` 在 `handleSend` 内派发 `eventBus.emit('TASK_TRIGGER', ...)`
- [x] 订阅状态更新：修改 `src/components/Subagent/SubagentMonitor.tsx` 订阅该事件并驱动状态仿真
- [x] 校验状态一致性，保证 C 栏数据驱动
- [x] 创建调试日志 `Markdown_Notes/Debug_Logs.md`
- [x] 验证编译打包与测试
- [x] 编写 Walkthrough 记录修改并提交 Git 推送
