# 验收记录

日期：2026-10-23，北京时间。

## 本机

环境：Windows 11、Node.js 24.12.0、pnpm 11.5.0。

- 已通过：16项单元测试、格式、严格类型检查、Lint、生产构建和OpenAPI契约漂移检查。
- Docker Desktop已安装；宿主尚未启用WSL，Docker引擎不能启动。
- 本机真实依赖集成测试、浏览器端到端和完整容器启动尚未执行。
- 不使用内存数据库或模拟Redis替代真实依赖验收。

## GitHub Linux CI

已通过：[完整验收运行](https://github.com/davidZhang666-bin/TicketFlow/actions/runs/39901131023)，验证提交3cbd714，耗时2分22秒。运行环境为Ubuntu24.04、Node.js24.12.0。

1. 格式、Lint、类型、16项单元测试、生产构建和API契约漂移。
2. PostgreSQL17、Redis7.4真实容器，SQL迁移和可重复种子。
3. 每次新建隔离测试数据库，11项集成测试并清理；包含并发幂等、版本冲突、所有者隔离、库存约束及请求体边界。
4. Chromium桌面与移动端共6项测试，覆盖活动浏览、创建、修改、发布和账号切换隔离。
5. 全部服务镜像构建、非root启动、依赖就绪和HTTP冒烟。PostgreSQL、Redis、API、Worker、Nginx均成功运行，迁移容器正常退出。

截图位于screenshots目录，来自真实服务的Playwright运行。当前没有任何压力测试结论；上述并发命令测试不等同于预约吞吐量测试。

## 尚未开始

预约并发、付款竞态、候补公平性与吞吐量压测按对应日期实现，目前没有可报告的性能数字。
