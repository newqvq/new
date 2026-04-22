# 星链小铺

基于 `Next.js 16 + Prisma + SQLite` 的虚拟商品交易平台原型，围绕以下链路搭建：

- 用户注册/登录
- USDT 充值单创建与凭证提交
- 充值审核后转平台余额
- 余额下单
- 订单人工处理
- 上下级绑定与充值返佣
- 后台商品、充值、订单、用户管理

## 当前已完成

- 前台首页、商品详情、注册登录、个人中心、充值页、订单页
- 后台概览、商品管理、充值审核、订单处理、用户与返佣页
- 钱包账本模型
- 充值入账幂等键 `entryKey`
- 订单扣款与退款账本
- 充值返佣自动入账
- Prisma 种子数据

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Prisma 6
- SQLite
- Tailwind CSS 4

## 本地启动

1. 安装依赖

```bash
npm install
```

2. 同步数据库结构

```bash
npm run db:push
```

3. 写入种子数据

```bash
npm run db:seed
```

4. 启动开发环境

```bash
npm run dev
```

5. 打开

```text
http://localhost:3000
```

## 默认后台账号

来自本地 `.env`：

- 邮箱：`admin@xinglian.local`
- 密码：`ChangeMe123!`

首次运行后请自行修改。

## 重要业务设计

### 1. 充值安全

- 平台只支持 `USDT`
- 先创建充值单，再提交链上哈希
- 后台审核通过后才会入账
- 钱包流水使用唯一 `entryKey`，避免重复入账

### 2. 余额安全

- 所有金额统一使用整数微单位存储
- 下单时通过钱包版本号做乐观并发控制
- 退款走独立账本记录

### 3. 返佣逻辑

- 注册时绑定上级邀请码
- 充值审核通过后按 `COMMISSION_RATE_BPS` 自动返佣
- 返佣直接写入上级钱包账本

## 环境变量

参考 `.env.example`：

- `DATABASE_URL`
- `AUTH_SECRET`
- `SITE_URL`
- `USDT_TRC20_ADDRESS`
- `USDT_ERC20_ADDRESS`
- `USDT_BEP20_ADDRESS`
- `COMMISSION_RATE_BPS`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## 验证结果

已通过：

- `npm run db:push`
- `npm run db:seed`
- `npm run lint`
- `npm run build`

## 下一步建议

- 接入真实链上监听或第三方 USDT 支付回调
- 增加后台登录密码修改
- 增加工单/售后聊天记录
- 增加图片上传与商品封面管理
- 将数据库切换为 PostgreSQL 用于生产
