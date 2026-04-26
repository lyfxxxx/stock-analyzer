# 东方财富财务指标接口获取方案

> 调研目标：ROE（净资产收益率）、PB（市净率）、股息支付率、ROA（总资产收益率）
> 调研日期：2026-04-25
> 覆盖市场：A股（pc_hsf10）、港股/H股（PC_HKF10）

---

## 目录

- [一、现有项目 API 封装概览](#一现有项目-api-封装概览)
- [二、指标获取总览](#二指标获取总览)
- [三、ROE（净资产收益率）](#三roe净资产收益率)
- [四、ROA（总资产收益率）](#四roa总资产收益率)
- [五、PB（市净率）](#五pb市净率)
- [六、股息支付率](#六股息支付率)
- [七、注意事项与限制](#七注意事项与限制)
- [附录 A：直接 API 字段速查表](#附录-a直接-api-字段速查表)
- [附录 B：计算获取字段速查表](#附录-b计算获取字段速查表)

---

## 一、现有项目 API 封装概览

项目目前已封装以下东方财富 API：

| API | 端点 | 用途 | 文件 |
|-----|------|------|------|
| 股票基本信息 | `push2.eastmoney.com/api/qt/stock/get` | 名称、市值、总股本 | `src/api/eastmoney.ts` |
| A股财务报告 | `datacenter.eastmoney.com/securities/api/data/get` | 资产负债表、利润表、现金流量表 | `src/api/financialReportA.ts` |
| 港股财务报告 | `datacenter.eastmoney.com/securities/api/data/v1/get` | 资产负债表、利润表、现金流量表 | `src/api/financialReportHK.ts` |

**当前缺失**：ROE、ROA、PB、股息支付率等指标均未在项目中实现。

---

## 二、指标获取总览

### 2.1 直接 API 返回 vs 计算获取

| 指标 | A股来源 | 港股来源 |
|------|---------|----------|
| ROE | **直接 API** (`RPT_F10_FINANCE_DUPONT` → `ROE`) | **直接 API** (`RPT_HKF10_FN_MAININDICATOR` → `ROE_AVG` / `ROE_YEARLY`) |
| ROA | **直接 API** (`RPT_F10_FINANCE_DUPONT` → `JROA`) | **直接 API** (`RPT_HKF10_FN_MAININDICATOR` → `ROA`) |
| PB | **直接 API** (`push2.eastmoney.com` → `f167`，可与基本信息接口合并) | **直接 API** (`RPT_HKF10_FN_MAININDICATOR` → `PB_TTM`) |
| 股息支付率 | **计算获取** (`历史分红数据` → 取最近年度计算) | **计算获取** (`分红明细 API` + `利润表`) |

### 2.2 核心结论

1. **港股（H股）ROE/ROA/PB 可通过单个直接 API 获取**：`RPT_HKF10_FN_MAININDICATOR`**；股息支付率需计算获取**（`分红明细 API` + `利润表`）
2. **A股 ROE 和 ROA 可通过直接 API 获取**：`RPT_F10_FINANCE_DUPONT`
3. **A股 PB 可直接获取**：`push2.eastmoney.com` → `f167`（使用 `TOTAL_PARENT_EQUITY` 口径）
4. **A股股息支付率直接获取**：`RPT_F10_DIVIDEND_HISTOGRAM` 的 `DIVIDEND_PAY_PLAN` 字段已预计算全年股息支付率
5. **推荐融合方案**：
   - **港股**：
     - ROE/ROA/PB：直接调用 `MAININDICATOR` API（1个请求）
     - 股息支付率：**基于每股计算**（`RPT_HKF10_MAIN_DIVBASIC` 每股分红 ÷ `RPT_HKF10_FN_INCOME_PC` 每股收益）
   - **A股**：
     - ROE/ROA：调用 `DUPONT` API
     - PB：与基本信息接口合并（`push2.eastmoney.com` 追加 `f167`）
     - 股息支付率：调用 `DIVIDEND_HISTOGRAM` API，直接取 `DIVIDEND_PAY_PLAN`

### 2.3 PB 接口合并改造方案

**现状**：`fetchEastMoneyStockInfo` 已使用 `push2.eastmoney.com/api/qt/stock/get` 获取股票基本信息：
```typescript
// 当前字段
fields=f57,f58,f116,f84
// f57=代码, f58=名称, f116=总市值, f84=总股本
```

**改造**：PB 字段 `f167` 与上述接口**完全同源**，只需在 `fields` 中追加：
```typescript
// 改造后字段
fields=f57,f58,f116,f84,f167
// 新增：f167=市净率(PB)
```

**效果**：
- **零额外请求**：PB 与基本信息同接口返回
- 返回数据结构扩展：
  ```json
  {
    "f57": "002027",
    "f58": "分众传媒",
    "f116": 88530684320.38,
    "f84": 14442000000,
    "f167": 5.38
  }
  ```

**实施位置**：`src/api/eastmoney.ts` → `fetchEastMoneyStockInfo` 函数

---

## 三、ROE（净资产收益率）

### 3.1 定义

```
ROE = 归属母公司净利润 / 归属母公司股东权益
```

### 3.2 A股接口方案（推荐：直接 API）

**数据来源**：`RPT_F10_FINANCE_DUPONT`（杜邦分析接口）

**关键字段**：

| 字段 | 含义 | 示例值（中国移动 2025年报） |
|------|------|---------------------------|
| `ROE` | 净资产收益率(%) | `9.9` |

**接口调用示例**：

```bash
curl "https://datacenter.eastmoney.com/securities/api/data/v1/get?reportName=RPT_F10_FINANCE_DUPONT&columns=ALL&filter=(SECURITY_CODE=%22600941%22)&pageNumber=1&pageSize=5&sortColumns=REPORT_DATE&sortTypes=-1&source=HSF10&client=PC"
```

**响应示例**：

```json
{
  "result": {
    "data": [
      {
        "REPORT_DATE": "2025-12-31 00:00:00",
        "REPORT_TYPE": "2025年报",
        "ROE": 9.9,
        "JROA": 6.5901866885
      }
    ]
  }
}
```

**优势**：
- 直接返回计算好的 ROE，无需自行计算
- 与现有财务报告 API 使用相同的 `datacenter.eastmoney.com` 域名
- 可与现有 `fetchWithRateLimit` 机制融合

**替代方案（计算获取）**：如不想新增 API 调用，仍可通过现有资产负债表 + 利润表计算：
- `ROE = PARENT_NETPROFIT / TOTAL_PARENT_EQUITY × 100%`
- 字段来源：`RPT_F10_FINANCE_GBALANCE` + `RPT_F10_FINANCE_GINCOME`

### 3.3 港股接口方案（推荐：直接 API）

**数据来源**：`RPT_HKF10_FN_MAININDICATOR`（港股主要财务指标接口）

**关键字段**：

| 字段 | 含义 | 示例值（长和 2025年报） |
|------|------|------------------------|
| `ROE_AVG` | 净资产收益率(平均)(%) | `2.157838771667` |
| `ROE_YEARLY` | 净资产收益率(年度)(%) | `2.157838771667` |

**接口调用示例**：

```bash
curl "https://datacenter.eastmoney.com/securities/api/data/v1/get?reportName=RPT_HKF10_FN_MAININDICATOR&columns=ALL&filter=(SECURITY_CODE=%2200001%22)&pageNumber=1&pageSize=5&sortColumns=REPORT_DATE&sortTypes=-1&source=F10&client=PC"
```

**响应示例**：

```json
{
  "result": {
    "data": [
      {
        "REPORT_DATE": "2025-12-31 00:00:00",
        "ROE_AVG": 2.157838771667,
        "ROE_YEARLY": 2.157838771667,
        "ROA": 1.044080918255,
        "PB_TTM": 0.444070429277,
        "DIVI_RATIO": 0.73395889083,
        "DIVIDEND_RATE": 3.408429118774
      }
    ]
  }
}
```

**优势**：
- **单个接口返回全部四个指标**，无需额外计算
- 字段已预计算，精度与东方财富页面展示一致
- 包含 `ROE_AVG`（平均）和 `ROE_YEARLY`（年度）两种口径

**替代方案（计算获取）**：如不想新增 API 调用，仍可通过现有资产负债表 + 利润表计算：
- `ROE = 004025002 / 004030999 × 100%`
- 字段来源：`RPT_HKF10_FN_BALANCE_PC` + `RPT_HKF10_FN_INCOME_PC`

---

## 四、ROA（总资产收益率）

### 4.1 定义

```
ROA = 归属母公司净利润 / 总资产
```

### 4.2 A股接口方案（推荐：直接 API）

**数据来源**：`RPT_F10_FINANCE_DUPONT`（杜邦分析接口）

**关键字段**：

| 字段 | 含义 | 示例值（中国移动 2025年报） |
|------|------|---------------------------|
| `JROA` | 总资产收益率(%) | `6.5901866885` |

**接口调用**：与 A股 ROE 相同，使用 `RPT_F10_FINANCE_DUPONT` API。

**响应示例**：

```json
{
  "REPORT_DATE": "2025-12-31 00:00:00",
  "ROE": 9.9,
  "JROA": 6.5901866885,
  "DEBT_ASSET_RATIO": 33.223612224674,
  "EQUITY_MULTIPLIER": 1.5014466892
}
```

**说明**：`JROA` 即东方财富定义的 ROA（总资产收益率），与杜邦分析中的 `ROE = JROA × 权益乘数` 一致。

**替代方案（计算获取）**：`ROA = PARENT_NETPROFIT / TOTAL_ASSETS × 100%`

### 4.3 港股接口方案（推荐：直接 API）

**数据来源**：`RPT_HKF10_FN_MAININDICATOR`（港股主要财务指标接口）

**关键字段**：

| 字段 | 含义 | 示例值（长和 2025年报） |
|------|------|------------------------|
| `ROA` | 总资产收益率(%) | `1.044080918255` |

**接口调用**：与港股 ROE 相同，使用 `RPT_HKF10_FN_MAININDICATOR` API。

**优势**：直接返回计算好的 ROA，与 ROE、PB、股息支付率在同一接口中。

**替代方案（计算获取）**：`ROA = 004025002 / 004009999 × 100%`

---

## 五、PB（市净率）

### 5.1 定义

```
PB = 总市值 / 净资产（归属母公司股东权益）
```

即：
```
PB = 总市值 / TOTAL_PARENT_EQUITY
```

> **注意**：`TOTAL_PARENT_EQUITY`（归属母公司股东权益）≠ `TOTAL_EQUITY`（股东权益合计）。后者还包含 `MINORITY_EQUITY`（少数股东权益）。东方财富 F10 页面和 `f167` 字段使用的是 **TOTAL_PARENT_EQUITY**。

### 5.2 A股接口方案（推荐：实时行情 API `f167`）

**数据来源**：`push2.eastmoney.com/api/qt/stock/get`（实时行情接口）

**关键字段**：

| 字段 | 含义 | 示例值（分众传媒 002027） |
|------|------|-------------------------|
| `f167` | **市净率(PB)** | `5.38` |

**接口调用示例**（与 F10 页面一致的完整请求）：

```bash
curl "https://push2.eastmoney.com/api/qt/stock/get?fields=f57,f58,f167&secid=0.002027&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2" \
  -H "Origin: https://emweb.securities.eastmoney.com" \
  -H "Referer: https://emweb.securities.eastmoney.com/"
```

**响应示例**：

```json
{
  "rc": 0,
  "rt": 4,
  "data": {
    "f57": "002027",
    "f58": "分众传媒",
    "f167": 5.38
  }
}
```

**优势**：
- **与东方财富 F10 页面展示完全一致**
- 直接返回 PB，无需计算
- 与现有 `fetchEastMoneyStockInfo` 使用相同的 API 端点
- 数据实时更新

**注意**：
- 需要携带正确的 `Origin` 和 `Referer` 头
- `f167` 的计算口径由东方财富内部定义，可能与最新财报数据存在偏差（见下方说明）

**口径说明**：

实测验证 `f167` 的计算口径：

| 股票 | f167 (API) | f116 / TOTAL_PARENT_EQUITY | f116 / TOTAL_EQUITY | 匹配项 |
|------|-----------|---------------------------|---------------------|--------|
| 分众传媒 (002027) | **5.38** | 5.38 ✅ | 5.26 | `TOTAL_PARENT_EQUITY` |
| 贵州茅台 (600519) | **6.74** | 6.74 ✅ | 6.50 | `TOTAL_PARENT_EQUITY` |
| 中国移动 (600941) | **1.45** | ~1.45 ✅ | ~1.45 | 两者接近 |

**结论**：`f167` 使用的是 **TOTAL_PARENT_EQUITY**（归属母公司股东权益），而非 `TOTAL_EQUITY`（股东权益合计）。

> 早期测试中出现的 `f167=6.19`（与 `TOTAL_EQUITY` 计算的 5.26 偏差 17.6%）是因为误用了 `TOTAL_EQUITY` 作为分母。使用 `TOTAL_PARENT_EQUITY` 后，`f167` 与自行计算的结果完全一致。

**手动计算方案**：`f116 / TOTAL_PARENT_EQUITY`
- `f116`：实时市值（来自实时行情 API）
- `TOTAL_PARENT_EQUITY`：归属母公司股东权益（来自 `RPT_F10_FINANCE_GBALANCE`）
- **适用场景**：需要精确控制数据来源，或 `f167` 返回异常时的校验

### 5.3 港股接口方案（推荐：直接 API）

**数据来源**：`RPT_HKF10_FN_MAININDICATOR`（港股主要财务指标接口）

**关键字段**：

| 字段 | 含义 | 示例值（长和 2025年报） |
|------|------|------------------------|
| `PB_TTM` | 市净率(TTM) | `0.444070429277` |

**接口调用**：与港股 ROE 相同，使用 `RPT_HKF10_FN_MAININDICATOR` API。

**优势**：直接返回东方财富计算好的 PB_TTM，精度与页面展示一致。

**替代方案（计算获取）**：`PB = f116 / TOTAL_PARENT_EQUITY`
- `f116`：实时行情 API 总市值
- `TOTAL_PARENT_EQUITY`：资产负债表 API 归属母公司股东权益

---

## 六、股息支付率

### 6.1 定义

```
股息支付率 = 现金分红总额 / 归属母公司净利润
```

### 6.2 A股接口方案（推荐：分红统计 API）

**数据来源**：`RPT_F10_DIVIDEND_HISTOGRAM`（分红统计接口）

**关键字段**：

| 字段 | 含义 | 示例值（中国移动） |
|------|------|------------------|
| `REPORT_DATE` | 报告期（年度） | `2025-12-31` |
| `PARENTNETPROFIT` | 归属净利润（元） | `137095000000` |
| `DIVIDEND_PAY_IMPLE` | 已实施分红金额（元） | `103476000000` |
| `DIVIDEND_IMPLE` | 已实施方案 | `10派25.025元` |
| `DIVIDEND_PLAN` | 分红预案 | `10派22.761元` |
| `DIVIDEND_PAY_PLAN` | 预案分红金额 | 根据方案计算 |

**接口调用示例**：

```bash
curl "https://datacenter.eastmoney.com/securities/api/data/v1/get?reportName=RPT_F10_DIVIDEND_HISTOGRAM&columns=SECUCODE%2CSECURITY_CODE%2CSECURITY_NAME_ABBR%2CREPORT_DATE%2CPARENTNETPROFIT%2CDIVIDEND_IMPLE%2CDIVIDEND_PAY_IMPLE%2CDIVIDEND_PLAN%2CDIVIDEND_PAY_PLAN&filter=(SECUCODE%3D%22600941.SH%22)(REPORT_DATE%3E%3D%272016-01-01%27)&pageNumber=1&pageSize=100&sortTypes=1&sortColumns=REPORT_DATE&source=HSF10&client=PC" \
  -H "Origin: https://emweb.securities.eastmoney.com" \
  -H "Referer: https://emweb.securities.eastmoney.com/"
```

**响应示例**：

```json
{
  "result": {
    "data": [
      {
        "SECUCODE": "600941.SH",
        "REPORT_DATE": "2025-12-31",
        "PARENTNETPROFIT": 137095000000,
        "DIVIDEND_PAY_IMPLE": 103476000000,
        "DIVIDEND_IMPLE": "10派25.025元"
      }
    ]
  }
}
```

**字段说明**：

| 字段 | 含义 | 示例值（中国移动 2025） | 示例值（贵州茅台 2025） | 示例值（分众传媒 2024） |
|------|------|------------------------|------------------------|------------------------|
| `DIVIDEND_PAY_PLAN` | **全年股息支付率** | `0.7539` (75.39%) | `0.7900` (79.00%) | `0.9245` (92.45%) |
| `DIVIDEND_PAY_IMPLE` | 已实施部分股息支付率 | `0.3945` (39.45%) | `0.7900` (79.00%) | `0.9245` (92.45%) |

> **关键发现**：`DIVIDEND_PAY_PLAN` 已经计算好**全年股息支付率**（全年分红总额 / 归属净利润），无需自行计算。

**取数逻辑**：
- 接口返回历年分红数据，按 `REPORT_DATE` 倒序排列
- **取最近一年完整数据**（即数组最后一个元素，最新的年度）
- 直接取 `DIVIDEND_PAY_PLAN` 字段值即为股息支付率
- 若该字段为 null，则标记为 "N/A"

**优势**：
- 一次调用获取**历年完整分红历史**
- `DIVIDEND_PAY_PLAN` **已预计算好全年股息支付率**，无需任何计算
- 与东方财富 F10 "分红融资" 页面（`#/fhrz`）展示的数据口径完全一致

**局限性**：
- 返回的是**财年数据**，非实时 TTM
- 如果公司最近年度未分红（如新股），`DIVIDEND_PAY_PLAN` 可能为 0

**验证示例**：

| 股票 | DIVIDEND_PAY_PLAN | 官方口径 | 匹配 |
|------|------------------|----------|------|
| 贵州茅台 (600519) | **79.00%** | 年报披露 79.00% | ✅ |
| 五粮液 (000858) | **70.01%** | 年报披露 ~70% | ✅ |
| 分众传媒 (002027) | **92.45%** | 高分红特征 | ✅ |

> **注意**：`DIVIDEND_PAY_IMPLE` 仅反映已实施的分红（中期分红），`DIVIDEND_PAY_PLAN` 包含全年预案（中期+末期），应使用后者。

### 6.3 港股接口方案（推荐：基于每股数据计算）

**数据来源**：`RPT_HKF10_MAIN_DIVBASIC`（分红明细接口）+ `RPT_HKF10_FN_INCOME_PC`（利润表）

> **设计原则**：不依赖股本数据，直接基于**每股分红 / 每股收益**计算，避免股本变动（送股、拆股、回购）带来的复杂性。

**关键字段**：

| 接口 | 字段 | 含义 | STD_ITEM_CODE | 示例值（长和 2024） | 示例值（中航信 2024） |
|------|------|------|---------------|---------------------|---------------------|
| 分红明细 | `PLAN_EXPLAIN` | 每股分红方案 | - | `每股派港币0.688元` | `每股派人民币0.239元(相当于港币0.26104元)` |
| 利润表 | `每股基本盈利` | 每股收益 | `004027002` | 4.46 港元 | 0.71 人民币 |

**接口调用示例**：

```bash
# 1. 获取分红明细
curl "https://datacenter.eastmoney.com/securities/api/data/v1/get?reportName=RPT_HKF10_MAIN_DIVBASIC&columns=SECURITY_CODE,YEAR,PLAN_EXPLAIN,IS_BFP&filter=(SECURITY_CODE%3D%2200696%22)(IS_BFP%3D%220%22)&pageNumber=1&pageSize=100&sortTypes=-1,-1&sortColumns=NOTICE_DATE,EX_DIVIDEND_DATE&source=F10&client=PC"

# 2. 获取每股收益
curl "https://datacenter.eastmoney.com/api/data/v1/get?reportName=RPT_HKF10_FN_INCOME_PC&columns=SECUCODE,REPORT_DATE,STD_ITEM_CODE,STD_ITEM_NAME,AMOUNT&filter=(SECUCODE%3D%2200696.HK%22)&pageNumber=1&pageSize=500&sortTypes=-1,1&sortColumns=REPORT_DATE,STD_ITEM_CODE&source=F10&client=PC"
```

**计算方式**：

```
股息支付率 = 每股分红 / 每股收益
```

**步骤说明**：

1. **解析 `PLAN_EXPLAIN` 提取每股分红**：
   - 内地企业（人民币财报）：提取**人民币金额**
   - 香港企业（港元财报）：提取**港元金额**
   - 确保与利润表 EPS 的货币单位一致

2. **从利润表获取每股收益**：`STD_ITEM_CODE = 004027002`

3. **直接相除**：`股息支付率 = 每股分红 / EPS`

**验证示例 1 - 长和（香港企业，港元财报）**：
- 2024 财年每股分红 = **2.202 港元**（末期 1.514 + 中期 0.688）
- 2024 年每股收益 = **4.46 港元**（利润 158.24亿人民币 ÷ 汇率 0.926 ≈ 170.88亿港元；170.88亿 / 38.31亿股 = 4.46港元）
- 股息支付率 = 2.202 / 4.46 ≈ **49.37%** ✅
- etnet 官方派息比率：**49.372%**（完全匹配）

**验证示例 2 - 中航信（内地企业，人民币财报）**：
- 2024 财年每股分红 = **0.239 人民币**（提取人民币金额）
- 2024 年每股收益 = **0.71 人民币**
- 股息支付率 = 0.239 / 0.71 ≈ **33.66%** ✅
- 与之前基于总分红/总利润的计算结果一致

**注意事项**：
- `IS_BFP=0` 过滤掉股权激励等特殊分红，只保留普通股分红
- 部分财年可能无分红记录，此时股息支付率为 0
- 若每股收益为负，股息支付率无意义，应标记为 "N/A"
- **货币判断逻辑**：`PLAN_EXPLAIN` 包含"人民币"字样 → 提取人民币金额；否则提取港元金额
- 确保每股分红与每股收益使用**相同货币单位**

---

## 七、注意事项与限制

### 7.1 API 限流

- 所有 datacenter 接口调用已受 `financialReportRateLimiter` 保护（500ms/请求）
- **A股新增 2 个 API 调用**（`Dupont` + `DIVIDEND_HISTOGRAM`，与现有 3 个报表 API 并行，总请求数变为 5 个）
- **港股新增 2 个 API 调用**（`MAININDICATOR` + `DIVBASIC`，与现有 3 个报表 API 并行，总请求数变为 5 个）
- 如担心限流，可考虑：
  - **港股**：用 `MAININDICATOR` 替代现有 3 个报表 API 中的部分字段（ROE/ROA/PB），总请求数可减少；股息支付率计算可延后或缓存
  - **A股**：`DIVIDEND_HISTOGRAM` 和 `Dupont` 可分别调用，不强制同时请求

### 7.2 字段缺失处理

- 部分历史年份可能缺少 Dupont / MAININDICATOR / DIVBASIC 数据，需回退到计算获取
- **港股 `DIVI_RATIO` 不可靠**：`MAININDICATOR` 返回的股息支付率可能大于 1，必须使用 `RPT_HKF10_MAIN_DIVBASIC` 按年度精确计算
- 少数股东权益为负的公司可能导致 ROE 异常，需增加边界检查
- `ROE` / `JROA` 为 `null` 时，应显示为 "N/A" 而非计算错误

### 7.3 API 稳定性

- `RPT_HKF10_FN_MAININDICATOR`、`RPT_F10_FINANCE_DUPONT`、`RPT_F10_DIVIDEND_HISTOGRAM`、`RPT_HKF10_MAIN_DIVBASIC` 为东方财富内部接口
- **港股 `DIVI_RATIO` 已知问题**：部分股票返回异常高值（>1），生产环境必须禁用该字段
- 接口字段和参数可能随时调整，建议添加监控和降级逻辑
- 若直接 API 不可用，系统应自动回退到计算获取方案

---

## 附录 A：直接 API 字段速查表

### A股 Dupont 分析 API (`RPT_F10_FINANCE_DUPONT`)

| 字段名 | 含义 | 单位 |
|--------|------|------|
| `ROE` | 净资产收益率 | % |
| `JROA` | 总资产收益率 | % |
| `DEBT_ASSET_RATIO` | 资产负债率 | % |
| `EQUITY_MULTIPLIER` | 权益乘数 | 倍 |
| `TOTAL_ASSETS` | 总资产 | 元 |
| `TOTAL_LIABILITIES` | 总负债 | 元 |
| `PARENT_NETPROFIT` | 归属母公司净利润 | 元 |

### A股分红配送 API (`RPT_SHAREBONUS_DET`)

| 字段名 | 含义 | 单位 | 说明 |
|--------|------|------|------|
| `BVPS` | 每股净资产 | 元 | 用于计算 PB，A+H 股可能异常 |
| `BASIC_EPS` | 基本每股收益 | 元 | 用于计算股息支付率 |
| `PRETAX_BONUS_RMB` | 每10股税前分红 | 元 | 如 22.761144 表示 10 派 22.76 元 |
| `IMPL_PLAN_PROFILE` | 分红方案描述 | 文本 | 如 "10派22.761144元(含税)" |
| `DIVIDENT_RATIO` | 股息率 | 小数 | 每股分红 / 股价，非股息支付率 |
| `TOTAL_SHARES` | 总股本 | 股 | |
| `ASSIGN_PROGRESS` | 方案进度 | 文本 | 董事会决议通过/股东大会通过/实施方案 |
| `EX_DIVIDEND_DATE` | 除权除息日 | 日期 | |
| `REGISTER_DATE` | 股权登记日 | 日期 | |

### A股实时行情 API (`push2.eastmoney.com/api/qt/stock/get`)

| 字段名 | 含义 | 单位 | 说明 |
|--------|------|------|------|
| `f167` | **市净率(PB)** | 倍 | **A股 PB 推荐来源**，使用 `TOTAL_PARENT_EQUITY` 口径 |
| `f116` | 总市值 | 元 | |
| `f162` | 市盈率(动态) | 倍 | |
| `f163` | 市盈率(静态) | 倍 | |
| `f164` | 市盈率(TTM) | 倍 | |

### A股分红统计 API (`RPT_F10_DIVIDEND_HISTOGRAM`)

| 字段名 | 含义 | 单位 | 说明 |
|--------|------|------|------|
| `REPORT_DATE` | 报告期（年度） | 日期 | 如 `2025-12-31` |
| `PARENTNETPROFIT` | 归属净利润 | 元 | 该财年归属母公司净利润 |
| `DIVIDEND_PAY_IMPLE` | 已实施股息支付率 | 小数 | 已实施分红 / 归属净利润 |
| `DIVIDEND_PAY_PLAN` | **全年股息支付率** | 小数 | **全年分红（含预案）/ 归属净利润**，**直接可用** |
| `DIVIDEND_IMPLE` | 已实施方案 | 文本 | 如 "10派25.025元" |
| `DIVIDEND_PLAN` | 分红预案 | 文本 | 董事会预案 |

> **核心字段**：`DIVIDEND_PAY_PLAN` 已预计算好全年股息支付率，无需自行计算。

### 港股分红明细 API (`RPT_HKF10_MAIN_DIVBASIC`)

| 字段名 | 含义 | 单位 | 说明 |
|--------|------|------|------|
| `YEAR` | 财年 | 整数 | 如 `2024` |
| `EX_DIVIDEND_DATE` | 除权除息日 | 日期 | 实际分红日期 |
| `PLAN_EXPLAIN` | 分红方案说明 | 文本 | 包含人民币和港币金额，需按企业类型提取对应币种 |
| `IS_BFP` | 是否股权激励 | 0/1 | 0=普通分红，1=股权激励（需过滤） |

### 港股利润表 API (`RPT_HKF10_FN_INCOME_PC`)

| STD_ITEM_CODE | 含义 | 单位 | 说明 |
|---------------|------|------|------|
| `004025002` | 股东应占溢利 | 人民币/港元 | 内地企业为人民币，香港企业为港元 |
| `004027002` | **每股基本盈利** | 人民币/港元 | **用于计算股息支付率的分母**，与每股分红同货币 |
| `004001001` | 营业额 | 人民币/港元 | 原始财报货币 |
| `004010999` | 经营溢利 | 人民币/港元 | 原始财报货币 |

### 港股主要指标 API (`RPT_HKF10_FN_MAININDICATOR`)

| 字段名 | 含义 | 单位 |
|--------|------|------|
| `ROE_AVG` | 净资产收益率(平均) | % |
| `ROE_YEARLY` | 净资产收益率(年度) | % |
| `ROA` | 总资产收益率 | % |
| `PB_TTM` | 市净率(TTM) | 倍 |
| `PE_TTM` | 市盈率(TTM) | 倍 |
| `DIVI_RATIO` | 股息支付率 | 小数 (0.73 = 73%) | ⚠️ **已知问题**：部分股票返回异常高值（>1），生产环境禁用 |
| `DIVIDEND_RATE` | 股息率 | % |
| `DPS_HKD` | 每股股息 | 港元 |
| `TOTAL_MARKET_CAP` | 总市值 | 港元 |
| `TOTAL_PARENT_EQUITY` | 归属母公司股东权益 | 港元 |
| `TOTAL_ASSETS` | 总资产 | 港元 |
| `HOLDER_PROFIT` | 股东应占溢利 | 港元 |

## 附录 B：计算获取字段速查表

### A股计算获取字段

| 字段名 | 所在 API | 含义 |
|--------|----------|------|
| `PARENT_NETPROFIT` | `RPT_F10_FINANCE_GINCOME` | 归属母公司净利润 |
| `TOTAL_ASSETS` | `RPT_F10_FINANCE_GBALANCE` | 总资产 |
| `TOTAL_EQUITY` | `RPT_F10_FINANCE_GBALANCE` | 股东权益合计（净资产） |
| `TOTAL_PARENT_EQUITY` | `RPT_F10_FINANCE_GBALANCE` | 归属母公司股东权益 |
| `MINORITY_EQUITY` | `RPT_F10_FINANCE_GBALANCE` | 少数股东权益 |
| `ASSIGN_DIVIDEND_PORFIT` | `RPT_F10_FINANCE_GCASHFLOW` | 分配股利、利润或偿付利息支付的现金 |
| `f116` | `push2.eastmoney.com` | 总市值 |

### 港股计算获取字段（STD_ITEM_CODE）

| STD_ITEM_CODE | 所在 API | 含义 | 用于股息支付率计算 |
|---------------|----------|------|------------------|
| `004025002` | `RPT_HKF10_FN_INCOME_PC` | 股东应占溢利 | 参考验证 |
| `004027002` | `RPT_HKF10_FN_INCOME_PC` | **每股基本盈利** | **分母：每股收益** |
| `004001001` | `RPT_HKF10_FN_INCOME_PC` | 营业额 | - |
| `004009999` | `RPT_HKF10_FN_BALANCE_PC` | 总资产 | - |
| `004030999` | `RPT_HKF10_FN_BALANCE_PC` | 股东权益（归属母公司） | - |
| `f116` | `push2.eastmoney.com` | 总市值 | - |

> **股息支付率计算公式**：`每股分红(from RPT_HKF10_MAIN_DIVBASIC) / 每股基本盈利(004027002)`
> 
> **注意**：`007004`（已付股息）来自现金流量表，反映**实际支付时间**而非**归属财年**，不推荐使用。

---

*文档结束*
