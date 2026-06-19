### [2026-06-19 16:14:00] 项目运行配置更新

> 已在根目录新增 `vite.web.config.ts`，用于在不加载 `src/vendor`（Electron/desktop 包）以及 `node_modules` 的情况下，仅启动前端 UI 开发服务器。
>
> 主要内容：
>- 使用 `@vitejs/plugin-react`。
>- `optimizeDeps.exclude` 与 `resolve.alias` 防止 Vite 解析 vendor 包。
>- `build.rollupOptions.external` 将 `src/vendor` 标记为外部依赖。
>
> 同时在 `package.json` 中保留原有 `dev` 脚本（仍使用 `vite`），可新增脚本 `dev:web` 指向 `vite --config vite.web.config.ts`（后续可自行添加）。
>
> 已将新文件与修改的 `vitest.config.ts` 暂存，准备提交。
