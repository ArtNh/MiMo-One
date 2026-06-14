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

---

### [2026-06-14 19:52:33] 对话输入管道与 Markdown 渲染实装

#### 1. 对话数据结构 (Interface)
在 B 栏（中央交互舱）中，对话流的消息对象声明结构如下：
```typescript
interface Message {
  role: 'harri' | 'user';
  content: string;
}
```

#### 2. Markdown 富文本渲染与代码高亮策略
- **富文本渲染**：当消息的 `role === 'harri'` 时，前端放弃纯文本直接输出，改用 `<ReactMarkdown>` 解析其 AST 树。通过引入 `remark-gfm` 支持增强型 Markdown 语法（如表格、删除线等）。
- **代码高亮**：在 ReactMarkdown 组件的 `components.code` 自定义节点解析中，截获语言标识符（如 `language-typescript`），调用 `react-syntax-highlighter` (使用 `vscDarkPlus` 主题) 将代码块渲染为具有深色高亮主题的容器。
- **排版微调**：使用 Tailwind 提供的 `prose prose-slate max-w-none` 类名修饰，自动优化富文本渲染时的行高与列表边距。

#### 3. 输入管道与自动滚动锚定
- **输入框重构 (Textarea)**：将输入节点改为 `textarea` 标签，配置 `rows={1}` 和 `resize-none`。
- **回车拦截**：在 `onKeyDown` 中监听 `Enter`，若未按下 `Shift` 键，执行 `preventDefault()` 并直接触发 `handleSend()` 动作；若按下 `Shift+Enter` 则执行默认的换行。
- **自动滚动锚定**：在对话容器最底部声明 `<div ref={messagesEndRef} />`。在 `useEffect` 中监听 `messages` 变化，触发 `messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })` 确保最新对话气泡总是处于视窗焦点。

