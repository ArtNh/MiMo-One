# SubagentMonitor 命名空间错误排查与修复手记

---

### [2026-06-15 18:09:00] 修复 SubagentMonitor.tsx 中 NodeJS 命名空间未定义报错

---

## 1. 问题现场
> 在对最近的代码提交进行全局编译审查和构建测试时，IDE 反馈 `src/components/Subagent/SubagentMonitor.tsx` 第 8 行存在 TypeScript 类型定义错误：
`找不到命名空间“NodeJS”。`

---

## 2. 原因分析
- **执行宿主环境割裂**：`NodeJS` 属于 Node.js 运行环境的全局类型命名空间（声明在 `@types/node` 中）。
- **编译上下文缺失**：在基于 Vite + React 的纯浏览器端前端代码中，TypeScript 的 tsconfig 默认未引入 Node.js 环境声明，因而直接使用 `NodeJS.Timeout` 会引发 TS 无法识别的编译中断。
- **返回值真相**：在浏览器环境下，由 `window.setInterval` 返回的定时器 ID 实际上是一个 `number`（数值类型），并非 Node.js 的 `Timeout` 对象。

---

## 3. 修复方案
将第 8 行原泛型引用：
```typescript
const activeIntervals = useRef<NodeJS.Timeout[]>([]);
```
修改重构为屏蔽环境干扰的 `any[]` 类型：
```typescript
const activeIntervals = useRef<any[]>([]);
```

---

## 4. 验证结论
> **构建成功**：
> 修改后再次执行 `npm run build`，Rollup 构建与 TS 静态检查全线变绿通过，彻底清除了该编译报错，保证了打包发布的稳定性。

---
