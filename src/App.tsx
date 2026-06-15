import { useState, useEffect, useRef } from 'react';
import HarriStateViewer, { HarriStatus } from './components/Harri/HarriStateViewer';
import NapModeOverlay from './components/NapModeOverlay';
import SubagentMonitor from './components/Subagent/SubagentMonitor';
import Sidebar from './components/A-Zone/Sidebar';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAppStore } from './store/useAppStore';
import { scanWorkspace } from './services/fileScanner';
// @ts-ignore
import ReactDiffViewer from 'react-diff-viewer-continued';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const [maxMode, setMaxMode] = useState(false);
  const [harriStatus, setHarriStatus] = useState<HarriStatus>('idle');
  const [inputValue, setInputValue] = useState('');
  const [isNapModeActive, setIsNapModeActive] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('未挂载');
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // 上下文标签和审批卡片状态
  const [contextTags, setContextTags] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [approvalPayload, setApprovalPayload] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAgentId = useAppStore((state) => state.activeAgentId);
  const workspaceFiles = useAppStore((state) => state.workspaceFiles);
  const pendingDiff = useAppStore((state) => state.pendingDiff);
  const currentDiff = pendingDiff;
  const isCallingKernel = useAppStore((state) => state.isCallingKernel);
  const kernelCallingStatus = useAppStore((state) => state.kernelCallingStatus);
  const sessionId = useAppStore((state) => state.sessionId);

  const [activeTab, setActiveTab] = useState<'chat' | 'diff'>('chat');

  const activeAgentIdRef = useRef(activeAgentId);
  useEffect(() => {
    activeAgentIdRef.current = activeAgentId;
  }, [activeAgentId]);

  const mimoTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    const electron = (window as any).electron;
    if (electron && electron.ipcRenderer) {
      const store = useAppStore.getState();
      
      const taskId = store.addTask({
        taskName: 'Mimo CLI 实时交互终端流',
        status: 'running',
        agentName: 'Coder 编译',
        progress: 100
      });
      mimoTaskIdRef.current = taskId;
      store.addTaskLog(taskId, '[GUI Wrapper] 成功接轨 Mimo CLI 控制台，彩色控制码通道已建立。');

      electron.ipcRenderer.invoke('mimo-start-chat-process', { sessionId });

      let idleTimer: any = null;

      const cleanStdoutUnsub = electron.ipcRenderer.on('mimo-process-stdout', ({ text }: { text: string }) => {
        store.addTaskLog(taskId, text);

        const cleanText = text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
        if (cleanText) {
          const currentId = activeAgentIdRef.current;
          setAgentMessages(prev => {
            const currentList = [...(prev[currentId] || [])];
            if (currentList.length > 0) {
              const lastMsg = currentList[currentList.length - 1];
              if (lastMsg.role === 'harri') {
                const updatedMsg = { ...lastMsg, content: lastMsg.content + cleanText };
                const nextList = [...currentList];
                nextList[nextList.length - 1] = updatedMsg;
                return { ...prev, [currentId]: nextList };
              }
            }
            return {
              ...prev,
              [currentId]: [...currentList, { role: 'harri', content: cleanText }]
            };
          });
        }

        setHarriStatus('processing');
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          setHarriStatus('idle');
        }, 2000);
      });

      const cleanStderrUnsub = electron.ipcRenderer.on('mimo-process-stderr', ({ text }: { text: string }) => {
        store.addTaskLog(taskId, `[STDERR] ${text}`);
      });

      const cleanExitUnsub = electron.ipcRenderer.on('mimo-process-exit', ({ code }: { code: number }) => {
        store.addTaskLog(taskId, `[内核提示] mimo 原生进程已退出，Code: ${code}`);
        setHarriStatus('idle');
      });

      return () => {
        if (cleanStdoutUnsub) cleanStdoutUnsub();
        if (cleanStderrUnsub) cleanStderrUnsub();
        if (cleanExitUnsub) cleanExitUnsub();
        if (idleTimer) clearTimeout(idleTimer);
      };
    }
  }, [sessionId]);

  const getActiveAgentName = () => {
    switch (activeAgentId) {
      case 'agent-harri': return 'Harri 中枢';
      case 'agent-coder': return 'Coder 编译';
      case 'agent-explorer': return 'Explorer 检索';
      default: return '未知智能体';
    }
  };
  const activeAgentName = getActiveAgentName();

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

    scanWorkspace();
  }, []);

  const isProcessing = harriStatus === 'processing';
  
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  useEffect(() => {
    const electron = (window as any).electron;
    if (electron && electron.ipcRenderer) {
      const handler = (_event: any, payload: any) => {
        setApprovalPayload(payload);
      };
      electron.ipcRenderer.on('mimo-approval-prompt', handler);
      return () => {
        electron.ipcRenderer.removeListener('mimo-approval-prompt', handler);
      };
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && (lastAt === 0 || /\s/.test(val[lastAt - 1]))) {
      setShowPicker(true);
      setPickerQuery(val.slice(lastAt + 1));
    } else {
      setShowPicker(false);
    }
  };

  const filteredFiles = workspaceFiles.filter(f => f.filePath.toLowerCase().includes(pickerQuery.toLowerCase()));

  const selectFile = (filePath: string) => {
    setContextTags(prev => [...prev, filePath]);
    const atIdx = inputValue.lastIndexOf('@');
    setInputValue(inputValue.slice(0, atIdx) + ' ');
    setShowPicker(false);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const electron = (window as any).electron;
    if (electron && electron.ipcRenderer) {
      for (const path of contextTags) {
        await electron.ipcRenderer.invoke('mimo-add-context', path);
      }
      await electron.ipcRenderer.invoke('send-mimo-input', inputValue);
    }
    setInputValue('');
    setContextTags([]);
  };

  const renderApprovalCard = () => {
    if (!approvalPayload) return null;
    const { id, command, filePath } = approvalPayload;
    const handleApprove = () => {
      const electron = (window as any).electron;
      if (electron && electron.ipcRenderer) {
        electron.ipcRenderer.send(`mimo-approval-response-${id}`, { approved: true });
      }
      setApprovalPayload(null);
    };
    const handleReject = () => {
      const electron = (window as any).electron;
      if (electron && electron.ipcRenderer) {
        electron.ipcRenderer.send(`mimo-approval-response-${id}`, { approved: false });
      }
      setApprovalPayload(null);
    };
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30">
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-lg max-w-md w-full">
          <h3 className="text-lg font-medium mb-2">安全审批请求</h3>
          <p className="mb-2"><strong>命令：</strong>{command}</p>
          {filePath && <p className="mb-2"><strong>文件：</strong>{filePath}</p>}
          <div className="flex justify-end space-x-2">
            <button onClick={handleReject} className="px-3 py-1 bg-red-200 hover:bg-red-300 text-red-800 rounded">拒绝</button>
            <button onClick={handleApprove} className="px-3 py-1 bg-green-200 hover:bg-green-300 text-green-800 rounded">允许</button>
          </div>
        </div>
      </div>
    );
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
        <Sidebar isProcessing={isProcessing} onOpenSettings={() => setIsSettingsOpen(true)} />
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
            {isCallingKernel && (
              <div className="flex justify-start items-center space-x-3 bg-blue-50/40 border border-blue-100/30 rounded-xl p-3.5 max-w-[80%] animate-pulse select-none">
                <div className="flex space-x-1 items-center shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-blue-700 font-mono tracking-wider">[Mimo Code 内核调用中...]</span>
                  <span className="text-[10px] text-blue-500/80 font-mono truncate mt-0.5">{kernelCallingStatus}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </section>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 p-4">
            {currentDiff ? (
              <>
                <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3 shrink-0 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-semibold shrink-0">MUTATION</span>
                    <span className="text-xs font-semibold text-gray-700 font-mono truncate">{currentDiff.fileName}</span>
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
                    oldValue={currentDiff.oldValue}
                    newValue={currentDiff.newValue}
                    splitView={true}
                    leftTitle="修改前 (Original)"
                    rightTitle="修改后 (Modified)"
                    styles={{
                      variables: {
                        light: {
                          diffViewerBackground: '#ffffff',
                          addedBackground: '#e6ffec',
                          addedColor: '#1e8a3a',
                          removedBackground: '#ffebe9',
                          removedColor: '#b30919',
                          wordAddedBackground: '#acf2bd',
                          wordRemovedBackground: '#fdb8c0'
                        }
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
        <footer className="p-4 border-t border-slate-200 bg-gray-50 flex flex-col relative shrink-0">
          {/* 文件选择下拉面板 */}
          {showPicker && filteredFiles.length > 0 && (
            <div className="absolute bottom-[calc(100%+8px)] left-4 right-4 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl z-50 flex flex-col">
              {filteredFiles.map(file => (
                <button
                  key={file.filePath}
                  onClick={() => selectFile(file.filePath)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 text-gray-700 border-b border-slate-100 last:border-b-0 truncate font-mono"
                >
                  {file.filePath}
                </button>
              ))}
            </div>
          )}

          {/* 上下文标签栏 */}
          {contextTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {contextTags.map(tag => (
                <span key={tag} className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-xs font-mono">
                  <span className="truncate max-w-xs">{tag.split('\\').pop() || tag.split('/').pop()}</span>
                  <button 
                    onClick={() => setContextTags(prev => prev.filter(t => t !== tag))}
                    className="text-blue-400 hover:text-red-500 font-bold px-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center w-full gap-2">
            <textarea
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="在此输入... 输入 @ 引用工作区文件"
              rows={1}
              className={`flex-1 p-2 border rounded focus:outline-none resize-none overflow-y-auto ${maxMode ? 'ring-2 ring-blue-400' : 'border-slate-300'}`}
            />
            <label className="flex items-center cursor-pointer select-none whitespace-nowrap shrink-0">
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
              className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium rounded shadow transition-colors whitespace-nowrap shrink-0"
            >
              测试运算
            </button>
          </div>
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

      {/* 系统设置弹窗 */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* 伴我午睡模式全屏遮罩 */}
      {isNapModeActive && (
        <NapModeOverlay 
          onWakeUp={() => {
            setIsNapModeActive(false);
            setHarriStatus('idle');
          }}
        />
      )}

      {/* 审批卡片 */}
      {renderApprovalCard()}
    </div>
  );
}
