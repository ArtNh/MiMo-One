# Electron 生产环境构建管道与打包优化实施计划

---

### [2026-06-15 19:31:00] 实施计划草案

## 实施目标

配置标准的桌面端打包引擎（Electron Builder），并打通物理打包的前期校验与路径保护。确保打包后应用在生产环境下，能通过 `process.resourcesPath` 动态映射随包分发的 Mimo Code CLI 内核，规避打包后因文件路径发生变化而导致子进程调用失效的缺陷。

---

## User Review Required

> [!IMPORTANT]
> **资源路径与沙箱安全**：
> - 生产环境下 `app.isPackaged` 为真时，子进程拉起的指令名 `mimo-code` 将自动被重定向为随包打包的绝对路径 `${process.resourcesPath}/bin/mimo-code`。
> - 在构建前，必须安装 `electron-builder` 依赖，并加入打包构建所需的 `electron-builder.json`。

---

## Proposed Changes

### 打包引擎配置与依赖配置

#### [MODIFY] [package.json](file:///d:/MiMo%20One/package.json)
- 在 `devDependencies` 中安装 `"electron-builder"`。
- 在 `scripts` 中新增构建指令 `"build:desktop"`，将 Vite 前端资源编译、Electron 主进程编译与桌面端打包流程串联：`"build:desktop": "npm run build && electron-builder"`。

#### [NEW] [electron-builder.json](file:///d:/MiMo%20One/electron-builder.json)
- 配置 `appId`, `productName`, `directories.output: "dist-build"`。
- 使用 `extraResources` 将根目录下的 `bin` 文件夹打包到应用资源文件夹（`resources/bin`）中。
- 分别配置 `win` 和 `mac` 的打包格式。

---

### CLI 物理路径保护

#### [MODIFY] [mimoCoreExecutor.js](file:///d:/MiMo%20One/electron/mimoCoreExecutor.js)
- 引入 `const { app } = require('electron')` 模块。
- 拦截子进程拉起命令：若 `command` 匹配为 `mimo-code` 或 `mimo-code.exe` 且检测到 `app.isPackaged` 为真，则重映射执行路径至 `process.resourcesPath` 下 of 随包二进制内核，实现生产环境免配 path 运行。

---

### 占位资源与中文文档

- 新建 `bin/` 文件夹并置入空文件以防打包器报错。
- 编写 `Markdown_Notes/生产构建与分发指南.md` 详细指导分发和构建。

---

## Verification Plan

### Automated Tests
- 编译并打包前测试：`npm run build`。

### Manual Verification
- 验证 `electron-builder.json` 配置项的 JSON 语法是否完全正确。
- 查看 `mimoCoreExecutor.js` 在导入 `app` 时是否存在模块冲突。
