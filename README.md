# Stock Analyzer

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

## 📖 Overview

**Stock Analyzer** is a web-based stock valuation tool that supports both Hong Kong stocks (HK) and A-shares. It provides dual data input modes (API automatic fetching and manual Excel upload) to help investors quickly calculate key financial metrics and valuation ratios.

### ✨ Key Features

- 🔄 **Dual Data Sources** - API mode (East Money) or Manual mode (Excel upload)
- 📊 **Financial Metrics** - Market cap, Net cash, Free cash flow, Net profit
- 🧮 **Valuation Ratios** - (Market Cap - Net Cash) / FCF & Net Profit
- 💱 **Multi-Currency** - HKD, CNY, USD with real-time exchange rates
- 📈 **Data Visualization** - Interactive charts using ECharts
- 💾 **Local Storage** - IndexedDB for persistent data storage
- 🔄 **Auto Refresh** - Daily automatic market cap updates
- 📱 **Responsive** - Mobile-friendly design

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `^20.19.0 || >=22.12.0`
- **Package Manager**: npm / yarn / pnpm

### Installation

```bash
# Clone repository
git clone <repository-url>
cd stock-analyzer

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 📊 Usage Guide

### Adding a Stock

1. **API Mode**
   - Enter stock code (e.g., `00700` for Tencent)
   - Select market (HK / A-share)
   - Click "Get Financial Data" to auto-fetch
   - Review preview and save

2. **Manual Mode**
   - Enter stock information manually
   - Upload Excel files:
     - **Income Statement** (损益表)
     - **Balance Sheet** (资产负债表)
     - **Cash Flow Statement** (现金流量表)
   - Generate data and save

### Viewing Analysis

- **Overview Cards**: Market cap, Net cash, Free cash flow, Net profit
- **Valuation Ratios**: Two calculation methods with color-coded results
  - Green: Low valuation (< 10)
  - Orange: Medium valuation (10-20)
  - Red: High valuation (> 20)
- **Trend Charts**: Historical FCF and profit trends using ECharts
- **Data Table**: Sortable yearly financial data

---

## 🏗️ Architecture

### Tech Stack

```
Frontend: Vue 3 (Composition API) + TypeScript
Build Tool: Vite
State Management: Pinia
Database: IndexedDB (idb wrapper)
Charts: ECharts
HTTP Client: Native Fetch API
Testing: Vitest + Vue Test Utils
Styling: CSS Variables + Scoped CSS
```

### Project Structure

```
stock-analyzer/
├── src/
│   ├── api/              # API clients (East Money, Exchange rates)
│   │   ├── eastmoney.ts
│   │   ├── financialReportA.ts
│   │   ├── financialReportHK.ts
│   │   └── exchangeRate.ts
│   ├── components/       # Vue components
│   │   ├── StockCard.vue
│   │   ├── ValuationChart.vue
│   │   ├── ExcelUploader.vue
│   │   └── ApiTester.vue
│   ├── composables/      # Composition functions
│   │   ├── useExcelParser.ts
│   │   └── useFinancialReport.ts
│   ├── db/               # IndexedDB configuration
│   │   └── index.ts
│   ├── stores/           # Pinia stores
│   │   └── stockStore.ts
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   │   ├── calculator.ts
│   │   ├── excelParser.ts
│   │   ├── validator.ts
│   │   └── rateLimiter.ts
│   ├── views/            # Page views
│   │   ├── HomeView.vue
│   │   ├── AddStockView.vue
│   │   └── StockDetailView.vue
│   ├── router/           # Vue Router
│   ├── App.vue
│   └── main.ts
├── public/               # Static assets
│   └── _redirects        # SPA routing support
├── functions/            # Cloudflare Functions (if needed)
└── dist/                 # Build output
```

---

## 🧮 Calculation Methods

### Financial Metrics

```
Net Cash = Cash and Equivalents - Short-term Debt - Long-term Debt
Free Cash Flow = Operating Cash Flow - Capital Expenditure
```

### Valuation Ratios

```
Valuation 1 = (Market Cap - Net Cash) / Free Cash Flow
Valuation 2 = (Market Cap - Net Cash) / Net Profit
```

**Notes**:
- Valuation 1 shows "N/A" when Free Cash Flow is negative
- A-shares are converted to HKD equivalent for unified comparison
- Projected data (from quarterly reports) is marked with a "预测" badge
- Currency conversion uses real-time exchange rates from open.er-api.com

---

## 🌐 API Integration

### Data Sources

#### East Money API
- **Stock Info**: `https://push2.eastmoney.com/api/qt/stock/get`
  - Supports both HK stocks (116.xxx) and A-shares (0.xxx / 1.xxx)
  - Returns: Stock name, Market cap, Real-time price
  
- **A-Share Financial Reports**: `https://datacenter.eastmoney.com/securities/api/data/get`
  - Balance Sheet, Income Statement, Cash Flow
  - Up to 30 years of historical data
  
- **HK Stock Financial Reports**: `https://datacenter.eastmoney.com/api/data/v1/get`
  - Similar data structure for Hong Kong stocks

#### Exchange Rate API
- **Provider**: `https://open.er-api.com/v6/latest/HKD`
- **Fallback Rates**: USD: 7.75, CNY: 1.10
- **Cache Duration**: 24 hours in localStorage

### Rate Limiting

- API calls are rate-limited (1 request per 500ms) to prevent blocking
- Automatic retry mechanism with max 1 retry
- Fallback to manual mode after retry exhaustion
- Referer header spoofing for East Money API compatibility

---

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

- **Utils**: Calculator, Excel parser, Validator
- **API**: East Money integration, Exchange rates
- **Components**: Vue component unit tests

---

## 🚀 Deployment

### Cloudflare Pages (Recommended)

1. **Prepare Repository**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Configure Cloudflare Pages**
   - Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to **Pages** → **Create a project**
   - **Connect to Git**: Select your GitHub repository
   - **Build Settings**:
     ```
     Build command: npm run build
     Build output directory: dist
     ```
   - **Environment Variables** (optional):
     - None required for basic functionality

3. **Deploy**
   - Click "Save and Deploy"
   - Wait for build to complete
   - Access your site at `https://<project-name>.pages.dev`

### Manual Deployment

```bash
# Install Wrangler CLI
npm install -g wrangler

# Build production bundle
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist
```

### SPA Routing Configuration

The `public/_redirects` file ensures proper client-side routing:
```
/*    /index.html   200
```

---

## 📁 Supported Excel Format

### Required Files

Upload 3 Excel files (`.xlsx`, `.xls`, or `.csv`) with the following columns:

#### 1. Income Statement (损益表)
| Column Name (Chinese) | Description |
|----------------------|-------------|
| 归属于母公司股东的净利润 | Parent Net Profit |
| 报告期 | Report Date |

#### 2. Balance Sheet (资产负债表)
| Column Name (Chinese) | Description |
|----------------------|-------------|
| 货币资金 | Cash and Equivalents |
| 交易性金融资产 | Trading Financial Assets |
| 短期借款 | Short-term Loans |
| 长期借款 | Long-term Loans |
| 报告期 | Report Date |

#### 3. Cash Flow Statement (现金流量表)
| Column Name (Chinese) | Description |
|----------------------|-------------|
| 经营活动产生的现金流量净额 | Operating Cash Flow |
| 购建固定资产、无形资产和其他长期资产支付的现金 | Capital Expenditure |
| 报告期 | Report Date |

### Data Processing

- Automatic column detection and mapping
- Multi-sheet support (scans all sheets)
- Date parsing (various formats supported)
- Unit conversion (handles 万元, 亿元, etc.)
- Missing data handling with validation

---

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start Vite dev server with HMR
npm run preview          # Preview production build locally

# Building
npm run build            # Full build with type checking
npm run build-only       # Build without type checking
npm run type-check       # Run TypeScript compiler

# Testing
npm run test             # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Linting
npm run lint             # Run ESLint (if configured)
```

### Development Guidelines

1. **Components**: Use Composition API with `<script setup>`
2. **Styling**: Use CSS variables from `App.vue` for consistency
3. **State**: Use Pinia stores for global state management
4. **API Calls**: Use rate limiter for external API calls
5. **Types**: Define types in `src/types/` directory
6. **Utils**: Place reusable logic in `src/utils/`

### Project Configuration

#### TypeScript
- Strict mode enabled
- Path alias: `@/` maps to `src/`
- Vue type support via `vue-tsc`

#### Vite
- Port: 5173 (default)
- HMR enabled
- Proxy support available (if needed)

---

## 📋 Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | Recommended |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support |

**Requirements**:
- IndexedDB support (for data persistence)
- ES2020+ JavaScript support
- CSS Grid and Flexbox

---

## 🔧 Troubleshooting

### Common Issues

#### API Connection Failed
- Check internet connection
- Verify East Money API is accessible
- Switch to Manual mode if API is unavailable

#### Excel Upload Failed
- Ensure file format is .xlsx, .xls, or .csv
- Check that required columns are present
- Verify data is in expected format

#### Data Not Persisting
- Check browser supports IndexedDB
- Clear browser data and retry
- Check browser storage quotas

### CORS Issues

If deploying to Cloudflare Pages and experiencing CORS errors:

1. **Check API Availability**: East Money API may block non-Chinese IPs
2. **Use Cloudflare Functions**: Create proxy functions in `functions/` directory
3. **Fallback to Manual Mode**: Always available regardless of API status

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Contribution Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- [Vue.js](https://vuejs.org/) - Progressive JavaScript Framework
- [ECharts](https://echarts.apache.org/) - Powerful Charting Library
- [Pinia](https://pinia.vuejs.org/) - Intuitive Store for Vue.js
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- [East Money](https://www.eastmoney.com/) - Financial Data Provider
- [Open Exchange Rates](https://open.er-api.com/) - Currency exchange rate API

---

<p align="center">
  Made with ❤️ for value investors
</p>
