# Mimo Code 原生内核集成与进程隔离策略规范

---

### [2026-06-15 18:52:00] 内核集成与安全策略

## 内核集成架构概述

为了赋予系统本地多智能体代码编译、工程检索以及真实用例诊断的能力，我们在 Electron 主进程中集成了原生的 Mimo Code 核心调度器。

> 本集成遵循 Electron 沙箱隔离的最佳实践：渲染进程仅负责状态驱动与 UI 展现，任何物理子进程（spawn）的唤起和执行监控都必须在主进程沙箱中严格受控地执行。

---

## 进程调度拓扑结构 (Process Topology)

系统通过底层的 IPC 管道作为控制流与数据流的唯一桥梁。具体拓扑结构设计如下：

```mermaid
graph TD
    A["B区中央舱 (Renderer UI)"] -- "1. 触发 TASK_TRIGGER" --> B["C区监控 (SubagentMonitor)"]
    B -- "2. ipcRenderer.invoke('run-mimo-command')" --> C["Electron 主进程 (Main Process)"]
    C -- "3. child_process.spawn(command, args)" --> D["Mimo 内核 / NPM 子进程 (Subprocess)"]
    D -- "4. stdout / stderr (数据流)" --> C
    C -- "5. sender.send('mimo-log')" --> B
    D -- "6. 退出 Exit Code" --> C
    C -- "7. sender.send('mimo-status')" --> B
    B -- "8. 状态与日志流式追加" --> E["Zustand Store (AppState)"]
```

---

## 安全隔离与防御策略 (Security Sandbox Policy)

为了防止恶意指令注入以及资源死锁，设计中强制实装了四重安全隔离屏障：

### 1. 进程权限彻底解耦 (Privilege Separation)
- **渲染器沙箱化**：前端渲染进程锁死在沙箱内部，`nodeIntegration` 设为 `false`，`contextIsolation` 设为 `true`。渲染层无法直接调用 Node.js 原生的 `child_process` 模块，消除了外部代码通过对话舱控制主机的潜在风险。
- **IPC 管道白名单**：在预加载层（`preload.js`）仅向外暴露特定且经过消毒的 `'run-mimo-command'` 和 `'kill-mimo-command'` 方法。

---

### 2. 60秒硬性超时断路器 (Timeout Circuit Breaker)
- **死锁防护**：子进程在启动时会注册一个全局的硬性超时定时器（60,000 毫秒）。
  
> **断路器熔断逻辑**：若进程执行时间超出 60 秒限额，主进程执行引擎将通过 `SIGKILL` 强行击毙该子进程，回收系统文件句柄，并将前端状态置为 `failed`，彻底预防因第三方指令阻塞导致的进程死锁与内存积压。

---

### 3. 系统环境变量安全注入 (Secure Env Propagation)
- **透传继承**：主进程通过 `env: { ...process.env }` 将当前会话的环境变量注入到子进程中。
- **密钥安全防泄漏**：大模型 API 密钥（如 `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`）在进程启动时由操作系统内存直接向下注入，前端不存留任何明文的密钥文件，防范本地凭证刺探风险。

---

### 4. 退出码精确状态映射 (Exit Code Mapping)
- **正常退出 (0)**：将任务状态变更为 `completed` (已完成)，并将进度百分比强制推至 100%。
- **异常退出 (非 0)**：将任务状态变更为 `failed` (已失败)，同时将退出码记录在终端日志中，为开发人员提供精确的诊断支撑。
