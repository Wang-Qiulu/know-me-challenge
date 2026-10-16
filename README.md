# 懂我挑战（Know Me Challenge）

> 一款面向朋友、闺蜜和情侣的轻量熟人社交答题 Web 产品。
> 移动端优先，无需注册，分享即参与。

## 产品定位

创建者发布 5 道个性化单选题并设置自己的真实答案，朋友通过分享链接参与答题，最终形成「创建 → 邀请 → 答题 → 揭晓 → 分享 → 再创建」的传播闭环。

## 仓库内容

- [`需求文档.md`](./需求文档.md) — 产品 PRD（V1.0）
- [`执行计划.md`](./执行计划.md) — 12 个阶段的分阶段开发计划
- [`apps/web/`](./apps/web) — React + TypeScript 前端（Vite + Tailwind + shadcn/ui）

## 技术栈

- 前端：React 18 + TypeScript + Vite 6 + Tailwind CSS + shadcn/ui 风格组件
- 路由：React Router 7
- 后端：Supabase（Postgres + RLS + Edge Functions）— 阶段 1 接入
- 包管理：pnpm 10（monorepo workspace）
- 代码质量：ESLint 9（flat config）+ Prettier + Husky pre-commit
- 部署：Vercel（前端）+ Supabase Cloud（后端）

## 本地开发

### 环境要求

- Node.js >= 20
- pnpm >= 10（推荐通过 Corepack 启用：`corepack enable`）

### 启动步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量（Supabase 项目，阶段 1 后才会有真实值）
cp apps/web/.env.example apps/web/.env.local
# 然后填入 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY

# 3. 启动 web 子包
pnpm dev

# 4. 浏览器访问
# http://localhost:5173
```

### 常用命令

```bash
pnpm dev               # 启动前端（vite dev）
pnpm build             # 类型检查 + 生产构建
pnpm preview           # 本地预览生产构建产物
pnpm lint              # ESLint 检查
pnpm typecheck         # TypeScript 类型检查
pnpm format            # Prettier 格式化
pnpm format:check      # 仅检查格式
```

## 目录结构

```
know-me-challenge/
├── apps/
│   └── web/                  # 前端
│       ├── src/
│       │   ├── routes/        # 路由页面（Home/Create/Quiz/Result/...）
│       │   ├── components/
│       │   │   ├── ui/        # shadcn 风格基础组件
│       │   │   └── layout/    # 布局组件
│       │   ├── lib/           # supabase / utils / track
│       │   ├── hooks/
│       │   ├── types/
│       │   ├── App.tsx        # 路由配置
│       │   ├── main.tsx       # 入口
│       │   └── index.css      # Tailwind + shadcn 主题变量
│       ├── public/
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── eslint.config.js
│       └── .env.example
├── .husky/                    # pre-commit
├── .gitignore
├── .prettierrc.json
├── .prettierignore
├── .npmrc
├── package.json               # workspace root
├── pnpm-workspace.yaml
├── 需求文档.md
├── 执行计划.md
└── README.md
```

## 阶段进度

- [x] **阶段 0** — 项目初始化与脚手架 ✅
- [ ] 阶段 1 — Supabase 数据层 + RLS + Edge Functions
- [ ] 阶段 2 — 创建挑战主流程
- [ ] 阶段 3 — 邀请链接 + 匿名身份
- [ ] 阶段 4 — 答题 + 服务端计分
- [ ] 阶段 5 — 成绩页 + 分享卡
- [ ] 阶段 6 — 排行榜
- [ ] 阶段 7 — 管理链接 + 挑战生命周期
- [ ] 阶段 8 — 传播闭环 + 埋点
- [ ] 阶段 9 — 响应式 + 移动端打磨
- [ ] 阶段 10 — P1 体验增强
- [ ] 阶段 11 — 部署与上线验收

完整任务清单见 [`执行计划.md`](./执行计划.md)。

## 许可

仅供学习和产品验证使用。
