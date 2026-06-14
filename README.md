# MiMo One

![License](https://img.shields.io/badge/License-MIT-blue.svg) ![Version](https://img.shields.io/badge/version-0.0.0-green.svg)

> 小米 MiMo Code 的全功能可视化桌面端，致力于将硬核的纯终端多智能体调度，转化为直观、可控的现代桌面工作流。

---

## 项目简介

MiMo One 是一款专为高效计算与协作而生的现代桌面端应用。它在 Web 视图与原生系统环境间寻求完美的融合，以极客的理性和专业的美学设计，为多智能体调度系统提供纯粹且专注的可视化平台。

---

## 核心特性

本项目拥有以下三大核心 UI 模块，旨在重构工作流范式：

> **1. 记忆与进化控制台**
> 位于界面左侧，可视化展示 Project Memory 与 Archival Memory 的演进过程。引入带有呼吸动效的 The Dream State（睡眠进化）设计，呈现数据与记忆的生命力。
> **2. 多模式执行台**
> 占据核心中央区域，构建带卡片折叠逻辑的对话流。特设「Max Mode（全托管模式）」超级输入舱，支持一键开启边缘泛蓝光反馈，提供沉浸式的极客级托管体验。
> **3. 智能体监控抽屉**
> 位于界面右侧，实时监控 Subagent 任务树的运行状态，并提供文件变更的 Diff 热预览，确保一切底层操作处于绝对透明与可控之中。

---

## 技术架构

追求极速构建与原生体验的现代技术栈：

- **核心框架**：Electron + React 18 + Vite
- **开发语言**：TypeScript
- **视觉系统**：Tailwind CSS (纯净 Light Mode 浅色主题)

---

## 快速启动

> 确保本地环境中已配置最新的 Node.js 运行环境。

克隆仓库后，请按以下步骤启动本地开发环境：

```bash
# 1. 安装项目依赖
npm install

# 2. 启动桌面端调试环境（自动拉起 Vite 服务与 Electron 主进程）
npm run dev:desktop
```

---

## 许可与参与

本项目遵循 MIT 协议。如果您有兴趣参与构建，请务必仔细阅读 `CONTRIBUTING.md` 中的开发红线规则，并遵守 `CODE_OF_CONDUCT.md` 所倡导的极客交流准则。
