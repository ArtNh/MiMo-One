import { useState, useEffect, useRef } from 'react';
import HarriStateViewer, { HarriStatus } from './components/Harri/HarriStateViewer';
import NapModeOverlay from './components/NapModeOverlay';
import SubagentMonitor from './components/Subagent/SubagentMonitor';
import Sidebar from './components/A-Zone/Sidebar';
import { fetchAgentResponse } from './services/llmService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAppStore } from './store/useAppStore';
import { eventBus } from './lib/eventBus';
import { scanWorkspace } from './services/fileScanner';
// @ts-ignore
import ReactDiffViewer from 'react-diff-viewer-continued';

export default function App() {
  const [maxMode, setMaxMode] = useState(false);
  const [harriStatus, setHarriStatus] = useState<HarriStatus>('idle');
  const [inputValue, setInputValue] = useState('');
  const [isNapModeActive, setIsNapModeActive] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('未挂载');
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAgentId = useAppStore((state) => state.activeAgentId);
  const workspaceFiles = useAppStore((state) => state.workspaceFiles);
  const pendingDiff = useAppStore((state) => state.pendingDiff);

  const [activeTab, setActiveTab] = useState<'chat' | 'diff'>('chat');

  // 映射当前智能体名称
  const getActiveAgentName = () => {
    switch (activeAgentId) {
      case 'agent-harri': return 'Harri 中枢';
      case 'agent-coder': return 'Coder 编译';
      case 'agent-explorer': return 'Explorer 检索';
      default: return '未知智能体';
    }
  };
  const activeAgentName = getActiveAgentName();

  // 监听鼠标移动与释放事件以调节右侧面板大小
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      let newWidth = window.innerWidth - e.clientX;
      if (newWidth < 250) newWidth = 250;
      if (newWidth > 600) newWidth = 600;
      setRightPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // 初始化获取本地工作区名称并执行扫描与索引构建
  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const electron = (window as any).electron;
        if (electron && electron.ipcRenderer) {
          const wsName = await electron.ipcRenderer.invoke('read-local-workspace');
          if (wsName) {
            setWorkspaceName(wsName);
          }
        }
      } catch (err) {
        console.error('获取工作区名称异常:', err);
      }
    };
    fetchWorkspace();

    // 初始化时触发工作区文件扫描与索引构建
    scanWorkspace();
  }, []);

  const isProcessing = harriStatus === 'processing';
  
  // 按 agentId 隔离的消息队列
  const [agentMessages, setAgentMessages] = useState<Record<string, { role: 'harri' | 'user'; content: string }[]>>({
    'agent-harri': [
      { role: 'harri', content: '你好，我是 Harri，你的多智能体协作中枢。今天有什么我可以帮你的？' }
    ],
    'agent-coder': [
      { role: 'harri', content: '你好，我是 Coder 编译智能体。我可以帮你进行代码编译、构建和依赖检查。' }
    ],
    'agent-explorer': [
      { role: 'harri', content: '你好，我是 Explorer 检索智能体。我可以帮你进行全库索引、文件检索和语义检索。' }
    ]
  });

  const currentMessages = agentMessages[activeAgentId] || [];

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  const handleSend = () => {
    const message = inputValue.trim();
    if (!message) return;
    setHarriStatus('processing');
    setInputValue('');

    // 追加用户发送的消息气泡
    setAgentMessages(prev => ({
      ...prev,
      [activeAgentId]: [...(prev[activeAgentId] || []), { role: 'user', content: message }]
    }));

    // 检测指令关键词并触发 TASK_TRIGGER 事件传递给 C 栏
    console.log('App.tsx handleSend message:', message);
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('编译') || lowerMsg.includes('构建') || lowerMsg.includes('生成') || lowerMsg.includes('compile') || lowerMsg.includes('build')) {
      console.log('App.tsx emitting TASK_TRIGGER with type: compile');
      eventBus.emit('TASK_TRIGGER', { type: 'compile', description: message });
    } else if (lowerMsg.includes('分析') || lowerMsg.includes('检索') || lowerMsg.includes('搜索') || lowerMsg.includes('定位') || lowerMsg.includes('analyze') || lowerMsg.includes('search')) {
      console.log('App.tsx emitting TASK_TRIGGER with type: analyze');
      eventBus.emit('TASK_TRIGGER', { type: 'analyze', description: message });
    } else if (lowerMsg.includes('测试') || lowerMsg.includes('诊断') || lowerMsg.includes('test') || lowerMsg.includes('diagnose')) {
      console.log('App.tsx emitting TASK_TRIGGER with type: test');
      eventBus.emit('TASK_TRIGGER', { type: 'test', description: message });
    }

    const isMimoAction = lowerMsg.includes('编译') || lowerMsg.includes('构建') || lowerMsg.includes('生成') || 
                         lowerMsg.includes('分析') || lowerMsg.includes('检索') || lowerMsg.includes('搜索') || 
                         lowerMsg.includes('测试') || lowerMsg.includes('诊断') ||
                         lowerMsg.includes('compile') || lowerMsg.includes('build') || 
                         lowerMsg.includes('analyze') || lowerMsg.includes('search') ||
                         lowerMsg.includes('test');

    if (isMimoAction) {
      // 停止调用 mock LLM 服务，交由本地原生内核进程处理
      setTimeout(() => {
        let command = 'mimo-code';
        let args: string[] = [];
        if (lowerMsg.includes('编译') || lowerMsg.includes('构建') || lowerMsg.includes('compile') || lowerMsg.includes('build')) {
          command = 'npm';
          args = ['run', 'build'];
        } else if (lowerMsg.includes('分析') || lowerMsg.includes('检索') || lowerMsg.includes('search') || lowerMsg.includes('analyze')) {
          command = 'mimo-code';
          args = ['analyze', '--workspace', '.'];
        } else if (lowerMsg.includes('测试') || lowerMsg.includes('诊断') || lowerMsg.includes('test')) {
          command = 'npm';
          args = ['test'];
        }

        setAgentMessages(prev => ({
          ...prev,
          [activeAgentId]: [...(prev[activeAgentId] || []), { 
            role: 'harri', 
            content: `[内核接管] 已为您停用模拟大模型数据。本次指令 "${message}" 已由多智能体调度内核转换为本地物理指令参数并派发执行：

\`\`\`bash
$ ${command} ${args.join(' ')}
\`\`\`

> **内核调度成功**：子进程已流式唤起。有关进程的流式控制台日志（stdout/stderr）以及退出状态（Exit Code），请在右侧 **C 栏 (Subagent 监控)** 中展开对应卡片进行实时追踪。` 
          }]
        }));
        setHarriStatus('idle');
      }, 600);
    } else {
      // 常规闲聊保留 Mock LLM 服务
      fetchAgentResponse(message, workspaceFiles)
        .then((res) => {
          // 追加回应的消息气泡
          setAgentMessages(prev => ({
            ...prev,
            [activeAgentId]: [...(prev[activeAgentId] || []), { role: 'harri', content: res }]
          }));
        })
        .catch((err) => {
          console.error('LLM 请求异常:', err);
        })
        .finally(() => {
          setHarriStatus('idle');
        });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden text-sm text-gray-800 ${isDragging ? 'user-select-none' : ''}`}>
      {/* 左侧 A 区 */}
      <aside className="w-56 shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col p-4 h-full justify-between overflow-hidden">
        <Sidebar isProcessing={isProcessing} />
      </aside>

      {/* 中央 B 区 */}
      <main className="flex-1 min-w-[400px] bg-white flex flex-col">
        {/* 顶部状态栏 */}
        <header className="grid grid-cols-[1fr_auto_1fr] items-center w-full h-12 px-4 border-b border-gray-100">
          {/* 左侧：自适应缩略区 */}
          <div className="justify-self-start flex items-center min-w-0 overflow-hidden gap-2">
            <span className="text-xs text-gray-500 truncate whitespace-nowrap">工作区: {workspaceName}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
            <span className="text-xs text-blue-600 font-semibold truncate whitespace-nowrap">已连接: {activeAgentName}</span>
          </div>
          
          {/* 居中：状态显示胶囊 */}
          <div className="justify-self-center">
            <HarriStateViewer 
              status={harriStatus} 
              onClick={() => {
                setIsNapModeActive(true);
                setHarriStatus('sleeping');
              }}
            />
          </div>
          
          {/* 右侧：操作区 */}
          <div className="justify-self-end flex items-center gap-3 text-xs text-gray-500">
            <span className="whitespace-nowrap">上下文: 4.2k / 128k</span>
            <button className="px-2 py-1 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer whitespace-nowrap shrink-0">压缩</button>
          </div>
        </header>

        {/* B区多维标签页 */}
        <div className="flex border-b border-gray-100 px-6 bg-slate-50/50 shrink-0 select-none">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'border-blue-500 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            对话流
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'diff'
                ? 'border-blue-500 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            代码变更对比
            {pendingDiff && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* 中间内容区域：有条件渲染对话流或 Diff 差异比对器 */}
        {activeTab === 'chat' ? (
          <section className="flex-1 overflow-y-auto p-6 space-y-6">
            {currentMessages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[70%] p-3.5 rounded-2xl border shadow-sm text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'rounded-tr-none bg-blue-50 border-blue-100/50 text-blue-700' 
                      : 'rounded-tl-none bg-gray-50 border-gray-100/50 text-gray-700 prose prose-slate max-w-none'
                  }`}
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          const inline = !match;
                          const { ref, ...rest } = props as any;
                          return !inline ? (
                            <SyntaxHighlighter
                              style={vscDarkPlus as any}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{
                                margin: '0.75rem 0',
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.825rem',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                backgroundColor: '#1e1e1e'
                              }}
                              {...rest}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code 
                              className="bg-slate-100 dark:bg-slate-800 text-blue-600 px-1.5 py-0.5 rounded font-mono text-xs font-semibold" 
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </section>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 p-4">
            {pendingDiff ? (
              <>
                <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3 shrink-0 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-semibold shrink-0">MUTATION</span>
                    <span className="text-xs font-semibold text-gray-700 font-mono truncate">{pendingDiff.fileName}</span>
                  </div>
                  <button 
                    onClick={() => useAppStore.getState().setPendingDiff(null)}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer shrink-0"
                  >
                    清除审查
                  </button>
                </div>
                <div className="flex-1 overflow-auto border border-gray-200 rounded-lg bg-white shadow-sm font-mono text-xs">
                  <ReactDiffViewer
                    oldValue={pendingDiff.oldValue}
                    newValue={pendingDiff.newValue}
                    splitView={true}
                    leftTitle="修改前 (Original)"
                    rightTitle="修改后 (Modified)"
                    styles={{
                      variables: {
                        diffViewerBackground: '#ffffff',
                        addedBackground: '#e6ffec',
                        addedColor: '#1e8a3a',
                        removedBackground: '#ffebe9',
                        removedColor: '#b30919',
                        wordAddedBackground: '#acf2bd',
                        wordRemovedBackground: '#fdb8c0'
                      }
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30 text-gray-400 p-8 select-none">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-500">暂无待审查的代码变更</p>
                <p className="text-xs text-gray-400 mt-1">当 Mimo Code 内核在后台修改本地文件时，会在此流式生成差异对比</p>
              </div>
            )}
          </div>
        )}
        {/* 底部输入舱 */}
        <footer className="p-4 border-t border-slate-200 bg-gray-50 flex items-center">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="在此输入..."
            rows={1}
            className={`flex-1 p-2 border rounded focus:outline-none resize-none overflow-y-auto ${maxMode ? 'ring-2 ring-blue-400' : 'border-slate-300'}`}
          />
          <label className="ml-4 flex items-center cursor-pointer select-none whitespace-nowrap shrink-0">
            <input
              type="checkbox"
              className="mr-1"
              checked={maxMode}
              onChange={() => setMaxMode(!maxMode)}
            />
            Max Mode
          </label>
          <button
            onClick={() => {
              setHarriStatus(prev => prev === 'processing' ? 'idle' : 'processing');
            }}
            className="ml-4 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium rounded shadow transition-colors whitespace-nowrap shrink-0"
          >
            测试运算
          </button>
        </footer>
      </main>

      {/* 可拖拽分割线 Resizer */}
      <div 
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        className="w-1 cursor-col-resize bg-gray-100 hover:bg-blue-400 active:bg-blue-500 transition-colors z-10 shrink-0"
      />

      {/* 右侧 C 区 */}
      <aside 
        style={{ width: rightPanelWidth }}
        className="shrink-0 bg-slate-50 border-l border-slate-200 p-4 flex flex-col h-full overflow-hidden"
      >
        <h2 className="font-semibold text-lg mb-2 shrink-0">Subagent 监控</h2>
        <div className="flex-1 overflow-y-auto pr-1">
          <SubagentMonitor />
        </div>
      </aside>

      {/* 伴我午睡模式全屏遮罩 */}
      {isNapModeActive && (
        <NapModeOverlay 
          onWakeUp={() => {
            setIsNapModeActive(false);
            setHarriStatus('idle');
          }}
        />
      )}
    </div>
  );
}
