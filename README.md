# TicketFlow

[![Quality](https://github.com/davidZhang666-bin/TicketFlow/actions/workflows/quality.yml/badge.svg)](https://github.com/davidZhang666-bin/TicketFlow/actions/workflows/quality.yml)

**让每一次相遇，都有一个位置。**

面向讲座、比赛、演出的报名与票务系统。按五个自然日逐步交付，并用真实 PostgreSQL、Redis、并发测试与故障演练验证核心逻辑。

> **当前里程碑：第 1 天，活动管理基础。** 已实现演示登录、活动浏览、运营权限、分时段草稿编辑和发布。预约、支付、超时、候补与退款按[路线图](docs/roadmap.md)在后续日期实现。当前版本不接受真实订单或真实支付。

## 本地启动

需要 **Node.js 24.12+（24.x）、pnpm 11.5.0、Docker Desktop / Docker Engine 与 Compose v2**。Windows 使用 WSL 2 Linux 容器。

    git clone https://github.com/davidZhang666-bin/TicketFlow.git
    cd TicketFlow
    npm install --global pnpm@11.5.0
    pnpm install --frozen-lockfile
    pnpm setup
    pnpm db:migrate
    pnpm db:seed
    pnpm dev

- 前端：http://localhost:5176
- API：http://localhost:3200/api/v1
- OpenAPI：http://localhost:3200/api/docs
- Worker：http://localhost:3202/health/ready

pnpm setup 创建带随机凭据的 .env，启动并等待 PostgreSQL 17、Redis 7.4 健康。重新执行保留已有配置。迁移使用所有者账号，应用账号没有建表权限。

演示密码为 .env 内的 DEMO_PASSWORD，不在网页或仓库里保存固定密码。

| 账号                      | 角色       | 功能                       |
| ------------------------- | ---------- | -------------------------- |
| user@ticketflow.demo      | 用户       | 浏览活动与场次             |
| organizer@ticketflow.demo | 运营       | 创建、编辑和发布自己的活动 |
| other@ticketflow.demo     | 第二位运营 | 验证活动归属隔离           |

种子操作可重复运行，已有账号密码和活动不会被覆盖。演示数据以首次初始化时间生成未来场次；生产环境禁止种子操作。

如果 Docker Desktop 提示 WSL 不可用，在管理员 PowerShell 中运行 wsl --install --no-distribution，按系统提示重启，然后启动 Docker Desktop。容器引擎未就绪时，pnpm setup 会明确失败。

## 全容器启动

先执行 pnpm setup、pnpm db:migrate、pnpm db:seed，然后：

    docker compose up -d --build --wait api worker web

访问 http://localhost:8086 。前端通过同源反向代理访问 API。运行时镜像使用非 root 账号；数据库和 Redis 端口仅绑定本机。

这里的 Compose 用于本地演示。公开部署须启用 HTTPS、设置 COOKIE_SECURE=true 和实际 APP_ORIGIN，配置持久卷、备份与外部密钥管理。

停止容器：pnpm infra:down，数据卷保留。docker compose down --volumes 会删除演示数据，执行前确认不再需要。

## 第一天可以演示什么

1. 浏览讲座、比赛和演出，按分类筛选，查看票价、席位与北京时间场次。
2. 运营登录，创建包含多个时段的活动草稿。
3. 修改草稿并保存，再发布活动；公开页面立即可见。
4. 使用第二位运营账号，验证无法读取或修改他人的草稿。
5. 通过测试验证重复提交、版本冲突和数据库库存守恒约束。

发布后的活动在当前里程碑只读。取消与库存变更会在相应里程碑加入。

## 工程结构

    apps/api/             NestJS HTTP、会话、权限、活动命令
    apps/worker/          独立进程、依赖健康与退出管理
    apps/web/             React 发现页、登录、运营管理和表单
    packages/contracts/   Zod 边界契约、生成的 OpenAPI 客户端类型
    packages/domain/      与框架无关的活动规则
    packages/data/        Kysely、迁移、事务幂等、连接与种子
    migrations/           版本化 SQL、索引与库存约束
    tests/                单元、真实依赖集成、桌面与移动端测试
    docs/                 架构、路线图、逐日进度和验收记录

活动命令使用数据库事务、行锁和 expectedRevision 处理并发修改；同一幂等键携带不同请求会返回 409。发布状态与 Outbox 记录同事务写入；消息投递在第 3 天实现。

所有金额为整数分，数据库时间为 timestamptz，界面使用 Asia/Shanghai。认证使用 HttpOnly 会话 Cookie、数据库内的令牌哈希和写请求 CSRF 校验。

## 质量检查

    pnpm verify                  # 格式、Lint、严格类型、单元测试、生产构建
    pnpm api:check               # 检查 OpenAPI 和生成类型是否同步
    pnpm test:integration        # 新建隔离数据库，运行真实 PostgreSQL / Redis 测试
    pnpm exec playwright install chromium
    pnpm test:e2e                # 桌面与移动端浏览器流程

集成与浏览器测试创建独立临时数据库并在退出时删除，不清空开发数据库。GitHub Actions 另验证完整容器构建与启动。当前测试结果及环境限制见[验收记录](docs/validation.md)。

贡献规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。项目采用 [MIT License](LICENSE)。
