import { WorkspaceFile } from '../store/useAppStore';

/**
 * fetchAgentResponse
 * 获取智能代理响应的接口函数，支持注入本地文件系统上下文感知
 * @param input 用户发送的原始文本
 * @param workspaceFiles 缓存的本地项目文件实体数组
 * @returns 包含流式应答结果的 Promise
 */
export const fetchAgentResponse = (
  input: string,
  workspaceFiles?: WorkspaceFile[]
): Promise<string> => {
  return new Promise<string>((resolve) => {
    // 模拟 1.5 秒的响应延迟以展示处理状态
    setTimeout(() => {
      const hasWorkspace = workspaceFiles && workspaceFiles.length > 0;
      const isWorkspaceQuery = /分析|代码|结构|文件|架构|scan|workspace/i.test(input);

      if (isWorkspaceQuery && hasWorkspace) {
        const fileCount = workspaceFiles.length;
        const fileListMarkdown = workspaceFiles
          .map((f) => `- \`${f.filePath}\` (${(f.size / 1024).toFixed(2)} KB)\n  > 摘要前瞻: *${f.summary.substring(0, 90).trim().replace(/\n/g, ' ')}...*`)
          .join('\n');

        resolve(`[Explorer 检索] 收到您的指令 "${input}"。已深度扫描并载入本地工作区，目前检索到 **${fileCount}** 个符合条件的代码与资源节点：

### 📁 项目结构拓扑

${fileListMarkdown}

---

> **上下文分析完成**：我们已为智能体 Harri 自动建立全量上下文链路。您可以根据以上显示的文件，要求我进行详细的架构拆解或逻辑分析。`);
      } else {
        resolve(`[Mock Response] 收到您的消息: "${input}"。Harri 状态正常，已顺利完成计算流分析。`);
      }
    }, 1500);
  });
};
