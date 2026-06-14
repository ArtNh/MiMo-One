# 智能代理数据流管道 (Data Pipeline) 规范说明

> **管道概述**
> 本文档定义了 MiMo One 前端用户输入、状态管理与 LLM 核心服务类（llmService）之间的数据传递管道规范与异步流转逻辑。

---

## 1. 核心服务接口

### 1.1 `fetchAgentResponse` 模拟获取智能代理响应
- **文件位置**：`src/services/llmService.ts`
- **输入参数**：`input: string`（用户在交互舱输入的原始指令文本）
- **返回类型**：`Promise<string>`
- **模拟机制**：通过 `setTimeout` 引入 2 秒的网络物理延迟，返回带输入回显的模拟流式文本数据，供渲染层进行状态机与动画测定：
  ```typescript
  export const fetchAgentResponse = (input: string): Promise<string> => {
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(`[Mock Response] 收到您的消息: "${input}"。Harri 状态正常，已顺利完成计算流分析。`);
      }, 2000);
    });
  };
  ```

---

## 2. 状态机联调与流转逻辑

### 2.1 交互舱输入拦截与清空
- **输入截获**：用户在中央 B 区底部的输入框中输入内容并按下 `Enter` 键时，拦截事件并提取文本。
- **发送动作**：
  - 调用 `setHarriStatus('processing')`，立刻将全局 Harri 状态推进为搬砖/处理中，此时顶部状态胶囊同步播放呼吸脉宽动画。
  - 清空输入框内容 `setInputValue('')`，防止多次重复提交。
  - 调用 `fetchAgentResponse(message)` 服务启动异步计算管道。

### 2.2 状态归档生命周期
- **响应流生命周期**：
  - **请求开始**：状态切换为 `processing`（搬砖中）。
  - **请求响应完毕 (Promise.finally)**：状态自动恢复复位为 `idle`（随时待命）。
  ```typescript
  fetchAgentResponse(message)
    .then((res) => {
      console.log('LLM 响应:', res);
    })
    .catch((err) => {
      console.error('LLM 请求异常:', err);
    })
    .finally(() => {
      setHarriStatus('idle'); // 无论成功与否，复位状态为 idle
    });
  ```

---

> **数据管道结论**
> 本管道设计实现了视图呈现（B区中央舱）与业务计算（LLM API服务类）的彻底解耦。预留了标准的异步数据接收流定义，便于在后续开发中无缝对接生产环境下的真实 OpenAI / Gemini 文本生成 API 接口。
