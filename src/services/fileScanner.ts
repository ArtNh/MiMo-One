import { useAppStore, WorkspaceFile } from '../store/useAppStore';

// 定义浏览器环境下的仿真 Mock 工作区数据
const mockFiles: WorkspaceFile[] = [
  { filePath: 'src/App.tsx', summary: '// MiMo One Main Application Entry with Layout and Chat Panels. Manages communication and layout split...', size: 4210 },
  { filePath: 'src/main.tsx', summary: 'import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\nimport "./index.css";...', size: 540 },
  { filePath: 'src/store/useAppStore.ts', summary: 'import { create } from "zustand";\n// State management for tasks, agent active status, and workspace index cache...', size: 3229 },
  { filePath: 'electron/main.js', summary: 'const { app, BrowserWindow, ipcMain } = require("electron");\n// Electron main process setup including scan-workspace-paths and read-file-summary...', size: 3268 },
  { filePath: 'Markdown_Notes/System_IPC.md', summary: '# System IPC Protocol Specification and Event Documentation for multi-panel sync...', size: 2925 }
];

/**
 * 判断当前是否处于 Electron 桌面端环境
 */
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).electron?.ipcRenderer;
};

/**
 * 递归扫描本地工作区并同步 C 栏子智能体监控进度
 */
export const scanWorkspace = async (): Promise<void> => {
  const store = useAppStore.getState();

  // 1. 在任务池中添加“索引本地工作区”任务
  const taskId = store.addTask({
    taskName: '索引本地工作区',
    status: 'running',
    progress: 0,
    agentName: 'Explorer 检索'
  });

  store.addTaskLog(taskId, '开始扫描工作区项目目录...');

  if (isElectron()) {
    try {
      // 2. 调用主进程接口获取所有符合条件的 TypeScript 与 Markdown 相对路径
      const paths: string[] = await (window as any).electron.ipcRenderer.invoke('scan-workspace-paths');
      const total = paths.length;

      if (total === 0) {
        store.addTaskLog(taskId, '未在工作区中找到符合条件的文件 (.ts, .tsx, .md)。');
        store.updateTaskStatus(taskId, 'completed', 100);
        store.setWorkspaceFiles([]);
        return;
      }

      store.addTaskLog(taskId, `找到 ${total} 个待扫描的文件，开始流式读取并提取摘要...`);

      const loadedFiles: WorkspaceFile[] = [];

      // 3. 循环批量读取各个文件的摘要与大小
      for (let i = 0; i < total; i++) {
        const filePath = paths[i];
        try {
          const result = await (window as any).electron.ipcRenderer.invoke('read-file-summary', filePath);
          loadedFiles.push({
            filePath,
            summary: result.summary,
            size: result.size
          });

          // 计算进度百分比并更新全局状态与日志
          const progress = Math.floor(((i + 1) / total) * 100);
          store.updateTaskStatus(taskId, 'running', progress);
          store.addTaskLog(taskId, `读取文件: ${filePath} (${(result.size / 1024).toFixed(2)} KB)`);
        } catch (fileErr) {
          console.error(`Error reading summary for ${filePath}:`, fileErr);
          store.addTaskLog(taskId, `读取文件失败: ${filePath}`);
        }
        
        // 增加 30 毫秒的小延时，以在视觉上体现精美的流式加载效果
        await new Promise((resolve) => setTimeout(resolve, 30));
      }

      // 4. 更新全局状态，置入真实的扫描文件列表
      store.setWorkspaceFiles(loadedFiles);
      store.updateTaskStatus(taskId, 'completed', 100);
      store.addTaskLog(taskId, `工作区索引构建成功！共计导入 ${loadedFiles.length} 个文件实体。`);

    } catch (err) {
      console.error('Scan workspace files failed:', err);
      store.addTaskLog(taskId, `扫描失败: ${err instanceof Error ? err.message : String(err)}`);
      store.updateTaskStatus(taskId, 'pending', 0);
    }
  } else {
    // 5. 优雅降级：非 Electron 桌面端（浏览器 Web 端）优雅仿真退化
    store.addTaskLog(taskId, '检测到非 Electron 浏览器环境，已触发兼容模式，开始注入 Mock 工作区上下文。');

    let currentIndex = 0;
    const total = mockFiles.length;

    const runMockInterval = () => {
      if (currentIndex < total) {
        const file = mockFiles[currentIndex];
        const progress = Math.floor(((currentIndex + 1) / total) * 100);

        store.updateTaskStatus(taskId, 'running', progress);
        store.addTaskLog(taskId, `[仿真] 读取文件: ${file.filePath} (${(file.size / 1024).toFixed(2)} KB)`);

        currentIndex++;
        setTimeout(runMockInterval, 400); // 400ms 仿真递进一次
      } else {
        store.setWorkspaceFiles(mockFiles);
        store.updateTaskStatus(taskId, 'completed', 100);
        store.addTaskLog(taskId, '工作区索引构建成功！[仿真] 共计导入 5 个 Mock 节点。');
      }
    };

    setTimeout(runMockInterval, 400);
  }
};
