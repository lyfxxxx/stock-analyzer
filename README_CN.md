# 股票分析工具

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5.28-4FC08D?style=flat-square&logo=vue.js" alt="Vue.js">
  <img src="https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-7.3.1-646CFF?style=flat-square&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Pinia-3.0.4-yellow?style=flat-square" alt="Pinia">
  <img src="https://img.shields.io/badge/ECharts-6.0.0-FF6B6B?style=flat-square" alt="ECharts">
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README_CN.md">中文</a>
</p>

---

## 📖 项目简介

**股票分析工具** 是一个基于 Web 的股票估值应用，支持港股和 A 股。提供双数据输入模式（API 自动获取和手动 Excel 上传），帮助投资者快速计算关键财务指标和估值比率。

### ✨ 核心功能

- 🔄 **双数据源** - API 模式（东方财富）或手动模式（Excel 上传）
- 📊 **财务指标** - 市值、净现金、自由现金流、净利润
- 🧮 **估值计算** - (市值 - 净现金) / 自由现金流 和 (市值 - 净现金) / 净利润
- 💱 **多币种** - 港元、人民币、美元，支持实时汇率转换
- 📈 **数据可视化** - 使用 ECharts 生成交互式图表
- 💾 **本地存储** - IndexedDB 持久化数据存储
- 🔄 **自动刷新** - 每日自动更新市值数据
- 📱 **响应式设计** - 移动端友好

---

## 🚀 快速开始

### 环境要求

- **Node.js**: `^20.19.0 || >=22.12.0`
- **包管理器**: npm / yarn / pnpm

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd stock-analyzer

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

应用将在 `http://localhost:5173` 可用

---

## 📊 使用指南

### 添加股票

1. **API 模式**
   - 输入股票代码（如腾讯：`00700`）
   - 选择市场（港股 / A 股）
   - 点击"获取财报数据"自动获取
   - 预览并保存

2. **手动模式**
   - 手动输入股票信息
   - 上传 Excel 文件：
     - **损益表** - 包含净利润数据
     - **资产负债表** - 包含现金和负债数据
     - **现金流量表** - 包含经营现金流和资本支出
   - 生成数据并保存

### 查看分析

- **概览卡片**: 市值、净现金、自由现金流、净利润
- **估值比率**: 两种计算方法，颜色编码结果
  - 绿色: 低估值 (< 10)
  - 橙色: 中等估值 (10-20)
  - 红色: 高估值 (> 20)
- **趋势图表**: 自由现金流和净利润历史趋势
- **数据表格**: 可按年份排序的财务数据

---

## 🏗️ 技术架构

### 技术栈

```
前端框架: Vue 3 (Composition API) + TypeScript
构建工具: Vite
状态管理: Pinia
数据库: IndexedDB (idb wrapper)
图表库: ECharts
HTTP 客户端: 原生 Fetch API
测试框架: Vitest + Vue Test Utils
样式方案: CSS 变量 + Scoped CSS
```

### 项目结构

```
stock-analyzer/
├── src/
│   ├── api/              # API 客户端（东方财富、汇率）
│   │   ├── eastmoney.ts
│   │   ├── financialReportA.ts
│   │   ├── financialReportHK.ts
│   │   └── exchangeRate.ts
│   ├── components/       # Vue 组件
│   │   ├── StockCard.vue      # 股票卡片
│   │   ├── ValuationChart.vue # 估值图表
│   │   ├── ExcelUploader.vue  # Excel 上传
│   │   └── ApiTester.vue      # API 测试
│   ├── composables/      # 组合式函数
│   │   ├── useExcelParser.ts
│   │   └── useFinancialReport.ts
│   ├── db/               # IndexedDB 配置
│   │   └── index.ts
│   ├── stores/           # Pinia 状态管理
│   │   └── stockStore.ts
│   ├── types/            # TypeScript 类型定义
│   ├── utils/            # 工具函数
│   │   ├── calculator.ts      # 财务计算
│   │   ├── excelParser.ts     # Excel 解析
│   │   ├── validator.ts       # 数据验证
│   │   └── rateLimiter.ts     # 限流器
│   ├── views/            # 页面视图
│   │   ├── HomeView.vue       # 首页
│   │   ├── AddStockView.vue   # 添加股票
│   │   └── StockDetailView.vue # 股票详情
│   ├── router/           # Vue Router 路由
│   ├── App.vue
│   └── main.ts
├── public/               # 静态资源
│   └── _redirects        # SPA 路由支持
├── functions/            # Cloudflare Functions（如需要）
└── dist/                 # 构建输出目录
```

---

## 🧮 计算方法

### 财务指标

```
净现金 = 货币资金 + 交易性金融资产 - 短期借款 - 长期借款
自由现金流 = 经营活动现金流净额 - 资本支出
```

### 估值比率

```
估值1 = (市值 - 净现金) / 自由现金流
估值2 = (市值 - 净现金) / 净利润
```

**说明**:
- 当自由现金流为负数时，估值1显示 "N/A"
- A 股数据会转换为港元等值，便于统一比较
- 预测数据（来自季报）会标记"预测"标签
- 汇率转换使用 open.er-api.com 的实时汇率

---

## 🌐 API 集成

### 数据来源

#### 东方财富 API
- **股票信息**: `https://push2.eastmoney.com/api/qt/stock/get`
  - 支持港股（116.xxx）和 A 股（0.xxx / 1.xxx）
  - 返回：股票名称、市值、实时价格
  
- **A 股财报**: `https://datacenter.eastmoney.com/securities/api/data/get`
  - 资产负债表、利润表、现金流量表
  - 最多 30 年历史数据
  
- **港股财报**: `https://datacenter.eastmoney.com/api/data/v1/get`
  - 港股类似的财务数据结构

#### 汇率 API
- **提供商**: `https://open.er-api.com/v6/latest/HKD`
- **备用汇率**: 美元: 7.75, 人民币: 1.10
- **缓存时长**: localStorage 中保存 24 小时

### 限流保护

- API 调用限流（每 500ms 1 个请求）防止被封
- 自动重试机制，最多重试 1 次
- 重试耗尽后自动切换到手动模式
- 使用 Referer 头伪装以兼容东方财富 API

---

## 🧪 测试

```bash
# 运行单元测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 以监听模式运行测试
npm run test:watch
```

### 测试覆盖

- **工具函数**: 计算器、Excel 解析器、验证器
- **API 模块**: 东方财富集成、汇率获取
- **组件**: Vue 组件单元测试

---

## 🚀 部署

### Cloudflare Pages（推荐）

1. **准备仓库**
   ```bash
   git add .
   git commit -m "准备部署"
   git push origin main
   ```

2. **配置 Cloudflare Pages**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 进入 **Pages** → **创建项目**
   - **连接 Git**: 选择你的 GitHub 仓库
   - **构建设置**:
     ```
     构建命令: npm run build
     构建输出目录: dist
     ```
   - **环境变量**（可选）:
     - 基本功能无需环境变量

3. **部署**
   - 点击"保存并部署"
   - 等待构建完成
   - 访问 `https://<项目名称>.pages.dev`

### 手动部署

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 构建生产包
npm run build

# 部署到 Cloudflare Pages
wrangler pages deploy dist
```

### SPA 路由配置

`public/_redirects` 文件确保客户端路由正常工作：
```
/*    /index.html   200
```

---

## 📁 支持的 Excel 格式

### 必需文件

上传 3 个 Excel 文件（`.xlsx`、`.xls` 或 `.csv`），包含以下列：

#### 1. 损益表
| 中文列名 | 说明 |
|---------|------|
| 归属于母公司股东的净利润 | 净利润 |
| 报告期 | 报告日期 |

#### 2. 资产负债表
| 中文列名 | 说明 |
|---------|------|
| 货币资金 | 现金和等价物 |
| 交易性金融资产 | 交易性金融资产 |
| 短期借款 | 短期负债 |
| 长期借款 | 长期负债 |
| 报告期 | 报告日期 |

#### 3. 现金流量表
| 中文列名 | 说明 |
|---------|------|
| 经营活动产生的现金流量净额 | 经营现金流 |
| 购建固定资产、无形资产和其他长期资产支付的现金 | 资本支出 |
| 报告期 | 报告日期 |

### 数据处理

- 自动列检测和映射
- 多工作表支持（扫描所有工作表）
- 日期解析（支持多种格式）
- 单位转换（处理 万元、亿元 等）
- 缺失数据处理与验证

---

## 🛠️ 开发

### 可用命令

```bash
# 开发
npm run dev              # 启动 Vite 开发服务器（支持热更新）
npm run preview          # 本地预览生产构建

# 构建
npm run build            # 完整构建（含类型检查）
npm run build-only       # 仅构建（跳过类型检查）
npm run type-check       # 运行 TypeScript 编译器

# 测试
npm run test             # 运行所有测试
npm run test:watch       # 监听模式运行测试
npm run test:coverage    # 生成覆盖率报告

# 代码检查
npm run lint             # 运行 ESLint（如已配置）
```

### 开发规范

1. **组件**: 使用 Composition API 和 `<script setup>` 语法
2. **样式**: 使用 `App.vue` 中定义的 CSS 变量保持一致性
3. **状态**: 使用 Pinia stores 管理全局状态
4. **API 调用**: 外部 API 调用使用限流器
5. **类型**: 在 `src/types/` 目录定义类型
6. **工具**: 可复用逻辑放在 `src/utils/`

### 项目配置

#### TypeScript
- 启用严格模式
- 路径别名: `@/` 映射到 `src/`
- 通过 `vue-tsc` 支持 Vue 类型

#### Vite
- 端口: 5173（默认）
- 启用 HMR（热模块替换）
- 支持代理配置（如需要）

---

## 📋 浏览器兼容性

| 浏览器 | 最低版本 | 说明 |
|---------|---------|------|
| Chrome | 90+ | 推荐使用 |
| Firefox | 88+ | 完全支持 |
| Safari | 14+ | 完全支持 |
| Edge | 90+ | 完全支持 |

**要求**:
- 支持 IndexedDB（用于数据持久化）
- 支持 ES2020+ JavaScript
- 支持 CSS Grid 和 Flexbox

---

## 🔧 故障排除

### 常见问题

#### API 连接失败
- 检查网络连接
- 确认东方财富 API 可访问
- 如 API 不可用，切换到手动模式

#### Excel 上传失败
- 确保文件格式为 .xlsx、.xls 或 .csv
- 检查是否包含必需的列
- 验证数据格式是否正确

#### 数据未持久化
- 检查浏览器是否支持 IndexedDB
- 清除浏览器数据后重试
- 检查浏览器存储配额

### CORS 问题

如果部署到 Cloudflare Pages 后遇到 CORS 错误：

1. **检查 API 可用性**: 东方财富 API 可能会屏蔽非中国 IP
2. **使用 Cloudflare Functions**: 在 `functions/` 目录创建代理函数
3. **切换到手动模式**: 无论 API 状态如何，手动模式始终可用

---

## 🤝 贡献

欢迎贡献！请按以下步骤操作：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/新功能`)
3. 提交更改 (`git commit -m '添加新功能'`)
4. 推送到分支 (`git push origin feature/新功能`)
5. 创建 Pull Request

### 贡献规范

- 遵循现有代码风格
- 为新功能添加测试
- 根据需要更新文档
- 提交 PR 前确保所有测试通过

---

## 📄 许可证

MIT 许可证 - 详情见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [ECharts](https://echarts.apache.org/) - 强大的图表库
- [Pinia](https://pinia.vuejs.org/) - 直观的 Vue.js 状态管理
- [Vite](https://vitejs.dev/) - 下一代前端工具链
- [东方财富](https://www.eastmoney.com/) - 金融数据提供商
- [Open Exchange Rates](https://open.er-api.com/) - 汇率 API

---

<p align="center">
  为价值投资者打造 ❤️
</p>
