import { useSettingsStore } from '../store/useSettingsStore';
import { WorkspaceFile } from '../store/useAppStore';
import { eventBus } from '../lib/eventBus';

/**
 * 真实的大语言模型 SSE 流式数据适配器，并内置语义指令拦截路由器
 * @param input 用户发送的原始文本
 * @param workspaceFiles 缓存的本地项目文件实体数组
 * @param onChunk 每次接收到数据增量分块时的回调函数
 * @returns 包含完整应答内容的 Promise
 */
export const fetchAgentResponse = async (
  input: string,
  workspaceFiles?: WorkspaceFile[],
  onChunk?: (chunk: string) => void
): Promise<string> => {
  const settings = useSettingsStore.getState();

  // 1. 如果用户没有配置 apiKey，则启动优雅仿真降级模式
  if (!settings.apiKey) {
    const fallbackText = `[仿真降级提示] 您尚未在左下角【系统设置】中配置 API 访问凭证 (API Key)。系统目前运行于兼容性沙箱。

如果您想要执行指令，可以输入例如“编译代码”或“分析架构”等关键词来触发右侧 C 栏的物理执行器。
当前收到的输入消息为: "${input}"。`;

    let currentIndex = 0;
    const chunkSize = 5;
    return new Promise<string>((resolve) => {
      const interval = setInterval(() => {
        if (currentIndex < fallbackText.length) {
          const chunk = fallbackText.substring(currentIndex, currentIndex + chunkSize);
          if (onChunk) onChunk(chunk);
          currentIndex += chunkSize;
        } else {
          clearInterval(interval);
          resolve(fallbackText);
        }
      }, 40);
    });
  }

  // 2. 存在真实配置，组装 System Prompt 与 User Message 并发起真实流式请求
  const apiBaseUrl = settings.apiBaseUrl.replace(/\/$/, '');
  const url = `${apiBaseUrl}/chat/completions`;
  const defaultModel = settings.defaultModel;

  // 将本地工作区上下文信息注入给 System Prompt 
  const workspaceContext = workspaceFiles && workspaceFiles.length > 0
    ? `目前系统已为您扫描索引了本地项目工作区，共包含以下文件实体以供参考分析：\n${workspaceFiles.map(f => `- 路径: ${f.filePath}, 大小: ${(f.size / 1024).toFixed(2)}KB, 摘要前瞻: ${f.summary.substring(0, 120).trim().replace(/\n/g, ' ')}`).join('\n')}`
    : '本地工作区当前未检测到可索引的 TypeScript 或 Markdown 项目代码文件。';

  const systemPrompt = `你是一个强大的软件开发多智能体协作中枢，名叫 Harri 中枢。
你不仅能与用户直接对话，还能分析用户的意图，自主做决策并通过调用本地的智能体内核来执行本地脚本。

${workspaceContext}

【关键指令路由协议】
当你分析用户的意图，认为需要运行本地指令（例如编译代码、分析架构、执行测试）时，请在你的回复文本中以精确的格式包含以下的执行标记：
[EXECUTE: command]

示例场景：
- 用户要求构建/编译代码：您应该在回复末尾附带：[EXECUTE: npm run build]
- 用户要求分析文件架构：您应该在回复末尾附带：[EXECUTE: mimo-code analyze --workspace .]
- 用户要求运行诊断测试：您应该在回复末尾附带：[EXECUTE: npm test]

请务必注意：一次回复中只能且最多包含一个 [EXECUTE: ...] 标签，且命令必须安全合法。`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input }
        ],
        max_tokens: settings.maxTokens,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('ReadableStream not supported by response body.');
    }

    const decoder = new TextDecoder('utf-8');
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // 保留最后一个可能不完整的行
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleanedLine = line.replace(/^data: /, '').trim();
        if (!cleanedLine || cleanedLine === '[DONE]') continue;

        try {
          const parsed = JSON.parse(cleanedLine);
          const chunkText = parsed.choices?.[0]?.delta?.content || '';
          if (chunkText) {
            fullContent += chunkText;
            if (onChunk) onChunk(chunkText);
          }
        } catch (jsonErr) {
          // 忽略非 JSON 字符行
        }
      }
    }

    // 补全处理 buffer 剩余的最后一部分数据
    if (buffer) {
      const cleanedLine = buffer.replace(/^data: /, '').trim();
      if (cleanedLine && cleanedLine !== '[DONE]') {
        try {
          const parsed = JSON.parse(cleanedLine);
          const chunkText = parsed.choices?.[0]?.delta?.content || '';
          if (chunkText) {
            fullContent += chunkText;
            if (onChunk) onChunk(chunkText);
          }
        } catch (jsonErr) {}
      }
    }

    // 3. 核心指令语义路由解析 (Semantic Command Router)
    // 拦截 [EXECUTE: command] 标签并触发本地动作
    const executeRegex = /\[EXECUTE:\s*([^\]]+)\]/i;
    const match = fullContent.match(executeRegex);
    if (match && match[1]) {
      const rawCommand = match[1].trim();
      const parts = rawCommand.split(/\s+/);
      const command = parts[0];
      const args = parts.slice(1);

      console.log('[指令路由拦截器] 检测到大模型调度请求:', command, args);

      // 通过 eventBus 发送指令类型，让 C 栏开启物理进程
      let type = 'analyze';
      if (command === 'npm' && args.includes('build')) {
        type = 'compile';
      } else if (command === 'npm' && args.includes('test')) {
        type = 'test';
      }

      eventBus.emit('TASK_TRIGGER', { 
        type, 
        description: `由大模型自主决策唤起的指令: ${rawCommand}` 
      });
    }

    return fullContent;

  } catch (err) {
    const errorText = `[连接错误] 无法连接到大模型服务。请检查您的网络及【系统设置】中的 Base URL 配置。\n错误详情: ${err instanceof Error ? err.message : String(err)}`;
    if (onChunk) onChunk(errorText);
    return errorText;
  }
};
