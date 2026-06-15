# Mimo Code 官方内核工具链与 Function Calling 协议开发验收报告

---

### [2026-06-15 19:28:00] 验收结果汇总

## 验收概述

我们已完成了 Mimo Code 官方原生内核工具链（Function Calling）及多轮对话状态机架构的全部研发。打通了文件安全物理读写、子进程拉起以及大模型多轮循环调度的全链路闭环，为模型赋予了对工作区的绝对掌控能力。

---

## 核心实现说明

1. **底层物理通道部署**：
   - 在 [main.js](file:///d:/MiMo%20One/electron/main.js) 中完成 `read-workspace-file`（物理读完整文件）与 `write-workspace-file`（物理安全覆写文件）的句柄开发，支持 Path Traversal 防跨域溢出校验。
   - 在 [preload.js](file:///d:/MiMo%20One/electron/preload.js) 中将新通道列入白名单安全暴露。

2. **大模型 Tool Loop 状态机**：
   - 重构 [llmService.ts](file:///d:/MiMo%20One/src/services/llmService.ts) 核心通信机制，声明 `read_workspace_file`、`write_workspace_file` 和 `execute_terminal_command` 三大物理工具。
   - 重写 SSE 流式拦截处理器，当检测到流输出中有 `tool_calls` 碎片时自动合并；在 SSE 结束后触发物理调用并将返回值追加为 `role: tool` 消息。
   - 建立串行执行与 `waitTaskFinished` 定时器轮询机制，阻塞大模型流并等待终端子进程执行结果，随后回传大模型直至多轮重构结束并吐出最终文本。

3. **视觉状态反馈联动**：
   - 拓展 [useAppStore.ts](file:///d:/MiMo%20One/src/store/useAppStore.ts) Zustand 状态，导出 `isCallingKernel` 和 `kernelCallingStatus`。
   - 修改 [App.tsx](file:///d:/MiMo%20One/src/App.tsx) 中间内容舱 B 栏，引入科技感十足的内核调用加载动画块。
   - 实现双端兼容，在 Web 沙箱中对文件更新、任务进程和 Diff 视图均提供无损仿真降级运行支持。

---

## 验证结果

- **代码构建**：成功运行 `npm run build`，零 TS/Vite/Rollup 错误或警告。
- **Git 安全推送**：经 `git remote -v` 验证为 ArtNh 个人资产库，代码已安全推送至远程主分支。
