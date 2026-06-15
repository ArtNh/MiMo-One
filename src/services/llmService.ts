import { useSettingsStore } from '../store/useSettingsStore';
import { WorkspaceFile, useAppStore } from '../store/useAppStore';
import { executeMimoCommand } from './mimoCoreExecutor';
import { scanWorkspace } from './fileScanner';

// 检查是否处于 Electron 桌面端环境
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).electron?.ipcRenderer;
};

// 兼容性的仿真读取工具，在浏览器沙箱下提供支持
const readMockOrStateFile = async (filePath: string): Promise<string> => {
  const store = useAppStore.getState();
  // 1. 尝试从 Zustand 的缓存文件中找
  const file = store.workspaceFiles.find(f => f.filePath === filePath);
  if (file) {
    return file.summary; // 虽然是 summary，但作为 mock 读取足够了
  }
  // 2. 预设一些最常见的文件供仿真环境调优
  const defaultMockContents: Record<string, string> = {
    'package.json': `{
  "name": "mimo-one",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "dev:desktop": "node scripts/start-electron.js",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0"
  }
}`,
    'src/App.tsx': `import { useState } from 'react';\nexport default function App() {\n  return <div>MiMo One Platform</div>;\n}`
  };
  return defaultMockContents[filePath] || `// [Mock File] ${filePath}\n// 这是一个仿真空文件节点，在桌面端中可读取物理真实文件。`;
};

// 在 Web 沙箱下等待任务卡片运行结束的通用方法，完美兼容 Electron 真实退出与 Web 仿真器
const waitTaskFinished = (taskId: string): Promise<string[]> => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const task = useAppStore.getState().tasks.find(t => t.id === taskId);
      if (task && (task.status === 'completed' || task.status === 'failed')) {
        clearInterval(interval);
        resolve(task.logs);
      }
    }, 500);
  });
};

/**
 * 真实的大语言模型 SSE 流式数据适配器，并内置 Mimo Code 官方 Function Calling 工具链
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
  const store = useAppStore.getState();

  // 1. 如果用户没有配置 apiKey，则启动优雅仿真降级模式
  if (!settings.apiKey) {
    const fallbackText = `[仿真降级提示] 您尚未在左下角【系统设置】中配置 API 访问凭证 (API Key)。系统目前运行于兼容性沙箱。

如果您的指令需要操作物理工作区，可以配置真实的 API Key 来唤起内核。
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

  // 2. 存在真实配置，组装基础参数
  const apiBaseUrl = settings.apiBaseUrl.replace(/\/$/, '');
  const url = `${apiBaseUrl}/chat/completions`;
  const defaultModel = settings.defaultModel;

  const workspaceContext = workspaceFiles && workspaceFiles.length > 0
    ? `目前系统已为您扫描索引了本地项目工作区，共包含以下文件实体以供参考分析：\n${workspaceFiles.map(f => `- 路径: ${f.filePath}, 大小: ${(f.size / 1024).toFixed(2)}KB, 摘要前瞻: ${f.summary.substring(0, 120).trim().replace(/\n/g, ' ')}`).join('\n')}`
    : '本地工作区当前未检测到可索引的 TypeScript 或 Markdown 项目代码文件。';

  const systemPrompt = `你是一个强大的软件开发多智能体协作中枢，名叫 Harri 中枢。
你不仅能与用户直接对话，还能自主做决策，通过调用系统提供的工具（read_workspace_file, write_workspace_file, execute_terminal_command）对本地的工作区项目进行读取、修改与编译测试。

${workspaceContext}

请尽量使用工具来自动帮用户完成他们的诉求，而非干瘪地向用户提供口头指示。`;

  // 初始化多轮对话消息栈
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: input }
  ];

  // 定义 Mimo Code 的核心工具链规范
  const tools = [
    {
      type: 'function',
      function: {
        name: 'read_workspace_file',
        description: '读取工作区中特定文件的完整文本内容。',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '待读取的文件相对工作区根目录的路径，例如 src/App.tsx'
            }
          },
          required: ['path']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'write_workspace_file',
        description: '创建或修改工作区中某个相对路径的文件的内容。写入完毕后，前端界面会提供直观的 Git Diff 差异对比看板。',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '需要写入的文件相对路径，例如 src/components/SettingsModal.tsx'
            },
            content: {
              type: 'string',
              description: '需要写入的完整新文件文本内容。请传入完整的代码，不要使用省略号。'
            }
          },
          required: ['path', 'content']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'execute_terminal_command',
        description: '在工作区的本地终端派生子进程，并运行命令，支持获取 stdout/stderr 结果。你可以用来执行测试(npm run test)、构建(npm run build)或依赖分析等。',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: '待执行的终端完整命令行，例如 npm run build'
            }
          },
          required: ['command']
        }
      }
    }
  ];

  let loopCount = 0;
  const maxLoops = 8; // 允许的最大工具调用递归层数，防死循环
  let finalContent = '';

  while (loopCount < maxLoops) {
    loopCount++;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: defaultModel,
          messages: messages,
          max_tokens: settings.maxTokens,
          stream: true,
          tools: tools
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
      let currentContent = '';
      let buffer = '';

      // 用于拼接流式输出的 tool_calls
      const currentToolCalls: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanedLine = line.replace(/^data: /, '').trim();
          if (!cleanedLine || cleanedLine === '[DONE]') continue;

          try {
            const parsed = JSON.parse(cleanedLine);
            const choice = parsed.choices?.[0];
            const delta = choice?.delta;

            // 1. 处理流式输出的普通文本
            const chunkText = delta?.content || '';
            if (chunkText) {
              currentContent += chunkText;
              finalContent += chunkText;
              if (onChunk) onChunk(chunkText);
            }

            // 2. 处理流式输出的 Tool Calls 碎片
            const tcs = delta?.tool_calls;
            if (tcs && Array.isArray(tcs)) {
              tcs.forEach((tc: any) => {
                const idx = tc.index;
                if (!currentToolCalls[idx]) {
                  currentToolCalls[idx] = {
                    id: tc.id || '',
                    type: tc.type || 'function',
                    function: {
                      name: tc.function?.name || '',
                      arguments: ''
                    }
                  };
                }
                if (tc.id) currentToolCalls[idx].id = tc.id;
                if (tc.function?.name) currentToolCalls[idx].function.name = tc.function.name;
                if (tc.function?.arguments) {
                  currentToolCalls[idx].function.arguments += tc.function.arguments;
                }
              });
            }
          } catch (jsonErr) {
            // 忽略非 JSON 行
          }
        }
      }

      // 剩余 buffer 解析
      if (buffer) {
        const cleanedLine = buffer.replace(/^data: /, '').trim();
        if (cleanedLine && cleanedLine !== '[DONE]') {
          try {
            const parsed = JSON.parse(cleanedLine);
            const choice = parsed.choices?.[0];
            const delta = choice?.delta;

            const chunkText = delta?.content || '';
            if (chunkText) {
              currentContent += chunkText;
              finalContent += chunkText;
              if (onChunk) onChunk(chunkText);
            }

            const tcs = delta?.tool_calls;
            if (tcs && Array.isArray(tcs)) {
              tcs.forEach((tc: any) => {
                const idx = tc.index;
                if (!currentToolCalls[idx]) {
                  currentToolCalls[idx] = {
                    id: tc.id || '',
                    type: tc.type || 'function',
                    function: {
                      name: tc.function?.name || '',
                      arguments: ''
                    }
                  };
                }
                if (tc.id) currentToolCalls[idx].id = tc.id;
                if (tc.function?.name) currentToolCalls[idx].function.name = tc.function.name;
                if (tc.function?.arguments) {
                  currentToolCalls[idx].function.arguments += tc.function.arguments;
                }
              });
            }
          } catch (jsonErr) {}
        }
      }

      // 过滤掉非法的 Tool Call 并做标准化组装
      const validToolCalls = currentToolCalls.filter(tc => tc && tc.id && tc.function?.name);

      if (validToolCalls.length === 0) {
        // 大模型没有选择调用工具，直接吐出完整内容，结束多轮循环
        break;
      }

      // 大模型发出了工具调用信号
      // 1. 将 assistant 消息（含 tool_calls）追加到对话历史中
      messages.push({
        role: 'assistant',
        content: currentContent || null,
        tool_calls: validToolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        }))
      });

      // 2. 触发中央面板工具执行状态提示
      store.setIsCallingKernel(true, `正在物理调用 ${validToolCalls.length} 个内核工具...`);

      // 3. 串行/并行执行这些工具
      for (const tc of validToolCalls) {
        const toolName = tc.function.name;
        let toolArgs: any = {};
        try {
          toolArgs = JSON.parse(tc.function.arguments || '{}');
        } catch (argErr) {
          console.error('[Function Call Parse Error]', argErr);
        }

        console.log(`[Mimo Code 工具调用拦截] 执行 ${toolName}, 参数:`, toolArgs);

        let executionResult = '';

        if (toolName === 'read_workspace_file') {
          const relativePath = toolArgs.path || '';
          store.setIsCallingKernel(true, `正在读取物理文件: ${relativePath}`);
          if (isElectron()) {
            try {
              executionResult = await (window as any).electron.ipcRenderer.invoke('read-workspace-file', relativePath);
            } catch (err: any) {
              executionResult = `[错误] 读取文件失败: ${err.message}`;
            }
          } else {
            executionResult = await readMockOrStateFile(relativePath);
          }
        } 
        else if (toolName === 'write_workspace_file') {
          const relativePath = toolArgs.path || '';
          const newContent = toolArgs.content || '';
          store.setIsCallingKernel(true, `正在物理写入文件: ${relativePath}`);

          // 先读取旧内容以生成 Git Diff 对比
          let oldContent = '';
          if (isElectron()) {
            try {
              oldContent = await (window as any).electron.ipcRenderer.invoke('read-workspace-file', relativePath);
            } catch (err) {
              // 文件可能本不存在
              oldContent = '';
            }
          } else {
            oldContent = await readMockOrStateFile(relativePath);
          }

          let success = false;
          if (isElectron()) {
            const res = await (window as any).electron.ipcRenderer.invoke('write-workspace-file', {
              relativePath,
              content: newContent
            });
            success = res.success;
          } else {
            // Web 仿真沙箱更新
            const currentFiles = store.workspaceFiles;
            const foundIndex = currentFiles.findIndex(f => f.filePath === relativePath);
            let nextFiles = [...currentFiles];
            if (foundIndex !== -1) {
              nextFiles[foundIndex] = {
                filePath: relativePath,
                size: newContent.length,
                summary: newContent.substring(0, 1500)
              };
            } else {
              nextFiles.push({
                filePath: relativePath,
                size: newContent.length,
                summary: newContent.substring(0, 1500)
              });
            }
            store.setWorkspaceFiles(nextFiles);
            success = true;
          }

          if (success) {
            // 将 Diff 信息更新到 Store，驱动中央 B 区的 Diff Viewer 激活并高亮
            store.setPendingDiff({
              fileName: relativePath,
              oldValue: oldContent,
              newValue: newContent
            });
            // 触发文件树异步刷新扫描
            scanWorkspace();
            executionResult = JSON.stringify({ success: true, message: `Successfully modified ${relativePath}` });
          } else {
            executionResult = JSON.stringify({ success: false, message: `Failed to write file ${relativePath}` });
          }
        } 
        else if (toolName === 'execute_terminal_command') {
          const commandStr = toolArgs.command || '';
          store.setIsCallingKernel(true, `终端运行: ${commandStr}`);

          const parts = commandStr.trim().split(/\s+/);
          const cmd = parts[0];
          const cmdArgs = parts.slice(1);

          // 添加任务到 C 栏监控
          const taskId = store.addTask({
            taskName: `执行终端命令: ${commandStr}`,
            status: 'running',
            agentName: 'Coder 编译',
            progress: 0
          });

          // 拉起物理/仿真子进程
          executeMimoCommand(taskId, cmd, cmdArgs);

          // 阻塞并异步等待其执行完毕，获取全部 logs
          const logs = await waitTaskFinished(taskId);
          executionResult = logs.join('\n');
        }

        // 把工具的真实响应喂回大模型
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: toolName,
          content: executionResult
        });
      }

      // 关闭工具调用动画状态
      store.setIsCallingKernel(false);

      // 向前端流中插入分段标志，确保用户能够及时感知到物理引擎已被流式执行
      const loopFinishedNotice = `\n\n> **[Mimo Code 内核物理操作已执行，正在准备后续应答...]**\n\n`;
      finalContent += loopFinishedNotice;
      if (onChunk) onChunk(loopFinishedNotice);

    } catch (err: any) {
      store.setIsCallingKernel(false);
      const errorText = `[连接错误] 无法连接到大模型服务。请检查您的网络及【系统设置】中的 Base URL 配置。\n错误详情: ${err.message}`;
      if (onChunk) onChunk(errorText);
      return errorText;
    }
  }

  return finalContent;
};
