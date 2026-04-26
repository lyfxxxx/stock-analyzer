# 市赚率（PRR）估值体系调研文档

> **文档用途**：指导在 Stock Analyzer 应用中实现市赚率估值功能  
> **作者来源**：雪球用户 ericwarn丁宁（ID: 9363345092）  
> **调研日期**：2026-04-22  
> **版本**：v1.0

---

## 目录

1. [概述与核心理念](#1-概述与核心理念)
2. [核心公式体系](#2-核心公式体系)
3. [修正系数 N 与分红调整](#3-修正系数-n-与分红调整)
4. [第二公式：PB/ROE²（周期股专用）](#4-第二公式pbroe²周期股专用)
5. [第三公式：指数与基金估值](#5-第三公式指数与基金估值)
6. [衍生市赚率：回购失真处理](#6-衍生市赚率回购失真处理)
7. [有效区间与适用范围](#7-有效区间与适用范围)
8. [投资决策阈值](#8-投资决策阈值)
9. [行业应用实践](#9-行业应用实践)
10. [案例研究](#10-案例研究)
11. [与其他估值方法的对比](#11-与其他估值方法的对比)
12. [应用实现指南](#12-应用实现指南)
13. [回测与实证](#13-回测与实证)
14. [局限性及注意事项](#14-局限性及注意事项)
15. [参考资料](#15-参考资料)

---

## 1. 概述与核心理念

### 1.1 发明背景

市赚率（Profit Ratio，简称 PR 或 PRR）由雪球用户 **ericwarn丁宁** 在 2011~2015 年间发明。其核心动机是：将巴菲特的估值体系简化为一个可快速心算的指标，解决 P/E、P/B 等传统指标在中国市场的水土不服问题。

> "为了学习巴菲特，我发明了一个叫作'市赚率'的估值参数。" —— ericwarn丁宁

### 1.2 核心理念：40 美分买 1 美元

市赚率的灵魂来自巴菲特的经典投资案例：

- **可口可乐（1988-1989）**：巴菲特连续两年建仓，1988 年市赚率 0.474PR，1989 年 0.326PR，**两年平均约 0.4PR**
- 从此，"用 40 美分买入 1 美元"（40 cents to buy $1）成为巴菲特的口头禅
- 丁宁整理巴菲特 36 个投资案例，发现 **90% 符合市赚率低估标准**

### 1.3 估值哲学

市赚率本质是 **DCF 现金流折现的简化公式**。在特定变量取值下，两者的计算结果十分相近。它将复杂的企业估值简化为两个核心要素：

- **PE（市盈率）**：市场愿意为企业利润支付的价格
- **ROE（净资产收益率）**：企业的真实赚钱能力

当 PE 与 ROE 匹配（PR = 1）时，估值合理；当 PE 低于 ROE 的合理倍数（PR < 1）时，低估；反之高估。

---

## 2. 核心公式体系

### 2.1 第一公式（基础公式）

```
市赚率 (PR) = 市盈率 (PE) / 净资产收益率 (ROE)
```

**数学推导**：

由于 `PE = PB / ROE`（市盈率 = 市净率 / 净资产收益率），因此：

```
PR = (PB / ROE) / ROE = PB / ROE²
```

但注意：当 ROE 以百分比输入时（如 15.88 表示 15.88%），第二公式需调整为：

```
PR = PB × 100 / ROE²
```

这意味着 **当 PR = 1 时，PB = ROE² / 100**，即市净率与 ROE 的平方成正比。

### 2.2 公式变体表达

| 表达形式 | 公式 | 适用场景 |
|---------|------|---------|
| PE 形式 | `PR = PE / ROE` | 常规使用，需已知 PE 和 ROE |
| PB 形式 | `PR = PB × 100 / ROE²` | 周期股、困境反转股（见第 4 节） |
| 指数形式 | `PR = PE² / PB / 100` | 指数基金（见第 5 节） |

### 2.3 参数说明

| 参数 | 含义 | 数据来源 | 单位 |
|------|------|---------|------|
| PE | 市盈率 | 市值 / 净利润 | 倍 |
| ROE | 净资产收益率 | 净利润 / 净资产 | **百分比**（如 15% 输入 15） |
| PB | 市净率 | 市值 / 净资产 | 倍 |
| PR | 市赚率 | 计算值 | 无单位 |

**注意**：ROE 输入百分比数值（15% 输入 15，不是 0.15）。公式中已隐含处理百分比转换，无需额外除以 100。

---

## 3. 修正系数 N 与分红调整

### 3.1 问题背景

市赚率基础公式在分红慷慨的股票（如贵州茅台，股利支付率 50%）上表现良好，但在分红较少的股票（如银行股，股利支付率 30%）上显示为"万年低估"。

这是因为：国企央企无法被收购，投资者只能通过 **股价上涨 + 股利支付** 实现价值回归。分红率低的公司，投资者获得回报的时间更长，理应要求更大的安全边际。

### 3.2 修正公式

```
修正市赚率 (PR) = N × PE / ROE
```

其中：

```
N = 50% / 股利支付率
```

### 3.3 N 系数速查表

| 股利支付率 | 修正系数 N | 典型行业/公司 |
|-----------|-----------|-------------|
| ≥ 50% | 1.0 | 贵州茅台、五粮液、高分红消费股 |
| 40% | 1.25 | 格力电器 |
| 30% | 1.67 | **大多数银行股** |
| ≤ 25% | 2.0 | 成长型银行、科技股 |

**计算示例**：

- 股利支付率 50%：`N = 50% / 50% = 1.0`
- 股利支付率 30%：`N = 50% / 30% = 1.67`
- 股利支付率 25%：`N = 50% / 25% = 2.0`

### 3.4 修正市赚率的本质

修正市赚率 **并非高股息模型**。以 0.5PR（5 折）买入时：

| 公司类型 | ROE | 股利支付率 | 股息率 |
|---------|-----|-----------|--------|
| A（高 ROE） | 30% | 50% | 3.33% |
| B | 25% | 50% | 4.0% |
| C | 25% | 40% | 4.0% |
| D | 20% | 40% | 5.0% |
| E（低 ROE） | 15% | 30% | 6.67% |
| F | 10% | 30% | 10.0% |

观察可见：**高 ROE 企业即便 5 折买入也不呈现高股息，只有低 ROE 企业才呈现高股息**。修正市赚率在买入高 ROE 股票时更接近"股权思维"，在买入低 ROE 股票时更接近"股利思维"。

---

## 4. 第二公式：PB/ROE²（周期股专用）

### 4.1 适用场景

- **周期股**：景气年份 ROE 高、分红多；萧条年份 ROE 低、分红少
- **困境反转股**：当前 PE 失真（亏损或微利），但 PB 相对稳定
- **不能使用修正市赚率的场景**：周期股在景气年份会加大分红，导致修正系数失真

### 4.2 公式

```
PR = PB × 100 / ROE²
```

其中 ROE 使用 **多年平均值**（通常 5 年），而非当年值。

### 4.3 合理 PB 推论

由 `PR = 1`（合理估值）可推导：

```
合理 PB = ROE² / 100
```

**示例**：

- 中石油多年平均 ROE 15.88%
- 合理 PB = 15.88 × 15.88 / 100 = **2.5 倍 PB**
- 巴菲特买入时 PB = 0.96
- PR = 0.96 × 100 / (15.88²) = **0.38PR**（大幅低估）

### 4.4 多年平均 ROE 的计算

```typescript
// 5 年算术平均 ROE
const averageROE = historicalROE.slice(-5).reduce((a, b) => a + b, 0) / 5;

// 或考虑经济周期完整度的加权平均
const weightedAverageROE = /* 根据行业特点调整 */;
```

---

## 5. 第三公式：指数与基金估值

### 5.1 适用场景

- 指数基金（ETF）
- 行业主题基金
- 仅披露 PE 和 PB，没有 ROE 数据时

### 5.2 公式推导

由 `PE = PB / ROE` 可得 `ROE = PB / PE`，代入核心公式：

```
PR = PE / (PB / PE) / 100 = PE² / PB / 100
```

即：

```
PR = PE × PE / PB / 100
```

### 5.3 实践用法

对于红利指数：

- **0.4~0.5PR**：买入区间
- **1.0PR**：卖出区间
- 结合 RSI（< 30 超卖，> 80 超买）和 EXP 均线判断中期买卖点

---

## 6. 衍生市赚率：回购失真处理

### 6.1 问题：负债回购导致 ROE 失真

当公司进行大规模负债回购（如苹果公司），ROE 会因净资产减少而 **人为飙升**，导致市赚率失真失效。

- 苹果 2020 年 ROE 飙升至 **73.69%**
- 苹果 2023 年 ROE 甚至达到 **171.95%**
- 按原始公式计算，PR 完全失真

### 6.2 衍生公式

```
衍生 PR = PE / 真实 ROE = PE / (k × ROA)
```

其中：

- `ROA` = 总资产收益率（不易被回购操纵）
- `k` = ROE / ROA 的历史最小倍数

**苹果案例**：

- 2008 年至今，苹果 ROE 至少是 ROA 的 **1.5 倍**
- 保守估计：真实 ROE = 1.5 × ROA
- 2024 年 3 月：静态 PE = 27.48，静态 ROE = 27.50%
- 衍生 PR = 27.48 / (1.5 × ROA) ≈ **0.666PR**

### 6.3 判断回购失真的一般方法

```typescript
function detectBuybackDistortion(roa: number, roe: number, threshold: number = 2.0): boolean {
  // 如果 ROE/ROA 比值超过历史正常水平，可能存在回购失真
  return (roe / roa) > threshold;
}

function calculateDerivedPR(pe: number, roa: number, historicalROE_ROA_Ratio: number): number {
  const realROE = historicalROE_ROA_Ratio * roa;
  return pe / realROE;
}
```

---

## 7. 有效区间与适用范围

### 7.1 ROE 有效区间

| ROE 范围 | 市赚率有效性 | 说明 |
|---------|------------|------|
| 10% ~ 33% | **强有效** | 与 DCF 结果高度吻合，最适合使用 |
| 33% ~ 50% | **弱有效** | 仍可参考，但需谨慎 |
| > 50% | **失真失效** | ROE 过高，公式失真，需用衍生 PR 或其他方法 |
| < 10% | **失真失效** | ROE 过低，企业盈利能力不足，不适用 |

### 7.2 适用股票类型

| 类型 | 是否适用 | 说明 |
|------|---------|------|
| **高 ROE 价值股**（消费、医药） | ✅ 强适用 | 修正市赚率最佳场景 |
| **银行股** | ✅ 适用（需修正） | 用 N=1.67 修正 |
| **周期股** | ⚠️ 第二公式 | 用多年平均 ROE + PB 公式 |
| **困境反转股** | ⚠️ 第二公式 | 当前 PE 失真，用 PB 公式 |
| **成长股** | ❌ 不适用 | 需留存利润成长，分红不稳定 |
| **科技股** | ❌ 不适用 | 常用回购代替分红，ROE 失真 |
| **指数/ETF** | ✅ 第三公式 | 用 PE²/PB 公式 |

### 7.3 不适用场景的替代方案

| 场景 | 替代估值方法 |
|------|------------|
| 成长股 | PEG 比率（PE / Growth） |
| 科技股 | PS 比率、EV/Revenue |
| 强周期股 | 历史平均 ROE + PB/ROE² |
| REITs | P/FFO、股息率 |
| 亏损企业 | PB、EV/EBITDA |

---

## 8. 投资决策阈值

### 8.1 买卖阈值

| 市场 | 买入区间 | 持有区间 | 高估卖出区间 |
|------|---------|---------|------------|
| **A 股** | 0.4 ~ 0.6 PR | 0.6 ~ 1.0 PR | **≥ 1.0 PR** 越涨越卖 |
| **H 股** | 0.4 ~ 0.6 PR | 0.6 ~ 0.8 PR | **≥ 0.8 PR** 越涨越卖 |
| **美股** | 0.4 ~ 0.6 PR | 0.6 ~ 1.0 PR | ≥ 1.0 PR 越涨越卖 |

**H 股阈值更低的原因**：H 股流动性更差，需预留更大安全边际。

### 8.2 低利率环境调整

在低利率环境下（如 2025 年的中国），折现率降低，合理估值上移：

```
合理估值区间：1.1 ~ 1.4 PR（原 1.0 PR）
```

### 8.3 买入策略：4 折、5 折、6 折

丁宁的核心买入纪律：

- **4 折（0.4PR）**：护城河略差的企业，或极端熊市
- **5 折（0.5PR）**：一般优质企业
- **6 折（0.6PR）**：护城河极佳的企业（如茅台）

> "一只商业模式极佳的股票最低只有 8 折，你会买吗？我的回答是：不买。因为从概率来说，一只股票从 8 折跌到 4 折很常见，但从 4 折跌到 2 折却很罕见。" —— ericwarn丁宁

### 8.4 卖出策略

- **A 股 1.0PR 以上**：越涨越卖，直至清仓
- **H 股 0.8PR 以上**：越涨越卖，直至清仓
- **半仓操作**：高估卖出一半，另一半等待更高估或调仓

---

## 9. 行业应用实践

### 9.1 银行业估值

银行业是修正市赚率最典型的应用场景。

#### 估值分化（2025Q1 数据）

| 板块 | 估值状态 | 典型 PR |
|------|---------|--------|
| **六大行 A 股** | 普遍高估 | ≥ 1.0 PR |
| **六大行 H 股** | 半数高估 | ≥ 0.8 PR |
| **股份行 A 股** | 尚未普遍高估 | ~0.9 PR |
| **股份行 H 股** | 普遍高估 | ≥ 0.8 PR |
| **城商行 A 股** | **价值洼地** | ~0.8 PR |
| **城商行 H 股** | 部分低估 | 0.6 ~ 0.8 PR |

#### 价值洼地示例（2025Q1）

| 银行 | 修正市赚率 | 说明 |
|------|-----------|------|
| 成都银行 | 0.59 PR | 最低估值之一 |
| 江苏银行 | 0.65 PR | |
| 杭州银行 | 0.65 PR | ROE 同比提升 |
| 齐鲁银行 | — | ROE 同比提升 |
| 青岛银行 | — | ROE 同比提升 |
| 常熟银行 | 0.39 PR（原始）/ 0.65 PR（修正） | 成长型农商行 |

#### 银行股特殊处理

1. **拨备覆盖率筛选**：只买拨备覆盖率 300% 以上的银行股
2. **可转债调整**：若银行可转债强赎，摊薄每股利润，估值人为 +0.1PR
3. **ROE < 10% 剔除**：市赚率失真，不纳入统计

### 9.2 消费股估值

消费股（白酒、家电）是市赚率最适用的领域。

| 公司 | 特征 | 买入 PR |
|------|------|--------|
| 贵州茅台 | 高 ROE（30%+）、高分红（50%） | ~0.6 PR |
| 五粮液 | 高 ROE、高分红 | ~0.5 PR |
| 格力电器 | 中等 ROE、中等分红（40%） | ~0.5 PR |
| 美的集团 | 中等 ROE、中等分红 | ~0.5 PR |

### 9.3 保险股估值

2023 年保险股至暗时刻，Q4 单季不亏已算优等生。

- **负债端**：保险业务短期难改善
- **投资端**：小牛市下大幅改善
- **中国太保 H 股**：曾出现 8% 股息率（超过同期石油煤炭股）

### 9.4 能源股估值

以中国海油为例，油价对 ROE 影响显著：

| 国际油价 | 中国海油 ROE | 估值状态 |
|---------|-------------|---------|
| 80 美元 | ~20% | 优秀企业 |
| 70 美元 | ~15% | 良好企业 |
| 60 美元 | ~10% | 平庸企业（警戒线）|

---

## 10. 案例研究

### 10.1 案例一：可口可乐（巴菲特经典）

| 年份 | PE | ROE | PR | 说明 |
|------|-----|------|-----|------|
| 1988 | — | — | **0.474** | 首次建仓 |
| 1989 | — | — | **0.326** | 再次建仓 |
| **平均** | — | — | **0.4** | "40 美分买 1 美元"来源 |

### 10.2 案例二：中国石油（巴菲特买入）

| 指标 | 数值 |
|------|------|
| 多年平均 ROE | 15.88% |
| 买入时 PB | 0.96 |
| PR（第二公式）| 0.96 × 100 / (15.88²) = **0.38 PR** |
| 合理 PB | 15.88² / 100 = **2.5 PB** |

### 10.3 案例三：苹果公司（回购失真）

| 年份 | 操作 | PE | ROE | 衍生 ROE | 衍生 PR |
|------|------|-----|------|---------|--------|
| 2016 | 建仓 | — | — | — | **0.357** |
| 2017 | 加仓 | — | — | — | **0.394** |
| 2020 | 减仓 | ~40 | 73.69% | ~49% | **1.539**（高估） |
| 2022 | 回补 | ~20 | 171.95% | — | **< 0.5**（低估） |
| 2024.3 | 持有 | 27.48 | 27.50% | — | **0.666**（合理） |

### 10.4 案例四：中国海油（周期股）

| 年份 | 背景 | 操作 |
|------|------|------|
| 2020 | 负油价闹剧后，石油煤炭股崩盘 | 买入中国海油 H + 兖矿能源 H，各 1 成仓位 |
| 2022 | 巴菲特重仓西方石油 | 加仓中国海油至第一重仓 |
| 2024-2025 | 油价 60-80 美元波动 | 60 美元为警戒线，提防小概率事件 |

### 10.5 案例五：六大行 H 股（中特估行情）

| 时间节点 | 修正 PR | 后续涨幅 |
|---------|--------|---------|
| 2022 年底（中特估前）| 0.39 ~ 0.53 PR | 35% ~ 91% |
| 2024 年底 | 半数 > 0.8 PR | — |
| 2025Q1 | 半数 > 0.8 PR | 约 25% 空间到 1.0PR |

---

## 11. 与其他估值方法的对比

### 11.1 与 DCF（现金流折现）

| 维度 | 市赚率 | DCF |
|------|--------|-----|
| 复杂度 | 简单，可心算 | 复杂，需预测未来现金流 |
| 输入参数 | PE、ROE | 未来现金流、折现率、增长率 |
| 结果一致性 | ROE 10%~33% 时与 DCF 相近 | 基准方法 |
| 动态性 | 静态（当前数据） | 动态（未来预测） |

**结论**：市赚率是 DCF 的简化版，适合快速筛选；DCF 适合深度分析。

### 11.2 与 PEG（彼得·林奇）

| 维度 | 市赚率 | PEG |
|------|--------|-----|
| 公式 | PR = PE / ROE | PEG = PE / Growth |
| 分母 | ROE（盈利能力） | g（增长率） |
| 适用 | 价值股、稳定盈利 | 成长股 |
| 判断标准 | PR < 1 低估 | PEG < 1 低估 |

**相通之处**：两者都用 PE 作为基础，试图平衡估值与企业特性。

### 11.3 与格雷厄姆价值投资

| 维度 | 市赚率 | 格雷厄姆 |
|------|--------|---------|
| 核心 | ROE + PE | 资产价值 + 安全边际 |
| 安全边标 | PR < 1 | 价格 < 内在价值 |
| 公式 | PR = PE / ROE | V = EPS × (8.5 + 2g) |

**差异**：格雷厄姆更看重资产价值（NCAV），市赚率聚焦盈利能力（ROE）。

### 11.4 与格林布拉特魔法公式

| 维度 | 市赚率 | 魔法公式 |
|------|--------|---------|
| 指标 | 单一比率 | EBIT/EV + ROC 排序 |
| 逻辑 | 高质量（ROE）+ 低估值（PE） | 高回报（ROC）+ 低价（EV/EBIT） |

**相通之处**：都结合盈利能力和估值。

---

## 12. 应用实现指南

### 12.1 数据模型设计

```typescript
// src/types/prr.ts

/**
 * 市赚率计算参数
 */
export interface PRRInputs {
  /** 市盈率 */
  peRatio: number;
  /** 净资产收益率 (百分比，如 15 表示 15%) */
  roe: number;
  /** 市净率 (可选，用于第二公式) */
  pbRatio?: number;
  /** 股利支付率 (百分比，如 30 表示 30%) */
  dividendPayoutRatio?: number;
  /** 总资产收益率 (可选，用于衍生 PR) */
  roa?: number;
  /** 历史 ROE/ROA 比率 (可选，用于衍生 PR) */
  historicalRoeRoaRatio?: number;
}

/**
 * 市赚率计算结果
 */
export interface PRRResult {
  /** 基础市赚率 */
  basePR: number;
  /** 修正市赚率 (如有分红数据) */
  adjustedPR?: number;
  /** 使用的修正系数 */
  adjustmentFactor?: number;
  /** 第二公式市赚率 (周期股) */
  cyclePR?: number;
  /** 衍生市赚率 (回购失真) */
  derivedPR?: number;
  /** 估值状态 */
  valuationStatus: 'undervalued' | 'fair' | 'overvalued' | 'invalid';
  /** 建议操作 */
  suggestion: 'buy' | 'hold' | 'sell' | 'avoid';
}

/**
 * 行业特定的 PRR 阈值配置
 */
export interface PRRThresholds {
  /** 买入上限 */
  buyThreshold: number;
  /** 卖出下限 */
  sellThreshold: number;
  /** 市场类型 */
  market: 'A' | 'H' | 'US';
  /** 行业类型 */
  sector?: string;
}
```

### 12.2 核心计算函数

```typescript
// src/utils/prrCalculator.ts

import { logger } from './logger';
import type { PRRInputs, PRRResult, PRRThresholds } from '@/types/prr';

/**
 * 计算修正系数 N
 * @param dividendPayoutRatio 股利支付率 (百分比)
 */
export function calculateAdjustmentFactor(dividendPayoutRatio: number): number {
  if (dividendPayoutRatio >= 50) {
    return 1.0;
  }
  if (dividendPayoutRatio <= 25) {
    return 2.0;
  }
  // 25% ~ 50% 之间线性计算
  return 50 / dividendPayoutRatio;
}

/**
 * 计算基础市赚率
 * PR = PE / ROE
 */
export function calculateBasePR(peRatio: number, roe: number): number {
  if (roe <= 0) {
    logger.warn('ROE must be positive for PRR calculation');
    return Infinity;
  }
  return peRatio / roe;
}

/**
 * 计算修正市赚率
 * PR = N × PE / ROE
 */
export function calculateAdjustedPR(
  peRatio: number,
  roe: number,
  dividendPayoutRatio: number
): number {
  const n = calculateAdjustmentFactor(dividendPayoutRatio);
  return n * peRatio / roe;
}

/**
 * 计算周期股市赚率（第二公式）
 * PR = PB × 100 / ROE²
 * @param pbRatio 市净率
 * @param averageROE 多年平均 ROE (百分比)
 */
export function calculateCyclePR(pbRatio: number, averageROE: number): number {
  if (averageROE <= 0) {
    logger.warn('Average ROE must be positive for cycle PRR calculation');
    return Infinity;
  }
  return pbRatio * 100 / (averageROE * averageROE);
}

/**
 * 计算指数市赚率（第三公式）
 * PR = PE² / PB / 100
 */
export function calculateIndexPR(peRatio: number, pbRatio: number): number {
  if (pbRatio <= 0) {
    logger.warn('PB must be positive for index PRR calculation');
    return Infinity;
  }
  return (peRatio * peRatio) / pbRatio / 100;
}

/**
 * 计算衍生市赚率（回购失真）
 * PR = PE / (k × ROA)
 */
export function calculateDerivedPR(
  peRatio: number,
  roa: number,
  historicalRoeRoaRatio: number = 1.5
): number {
  const realROE = historicalRoeRoaRatio * roa;
  if (realROE <= 0) {
    logger.warn('Real ROE must be positive for derived PRR calculation');
    return Infinity;
  }
  return peRatio / realROE;
}

/**
 * 检测 ROE 是否可能失真（回购导致）
 */
export function detectROEDistortion(
  roe: number,
  roa: number,
  threshold: number = 2.0
): boolean {
  if (roa <= 0) return false;
  return (roe / roa) > threshold;
}

/**
 * 判断市赚率有效性
 */
export function validatePRRRange(roe: number): {
  valid: boolean;
  strength: 'strong' | 'weak' | 'invalid';
  message: string;
} {
  if (roe >= 10 && roe <= 33) {
    return { valid: true, strength: 'strong', message: 'ROE 在强有效区间' };
  }
  if (roe > 33 && roe <= 50) {
    return { valid: true, strength: 'weak', message: 'ROE 在弱有效区间，需谨慎' };
  }
  if (roe > 50) {
    return { valid: false, strength: 'invalid', message: 'ROE 过高，市赚率可能失真' };
  }
  return { valid: false, strength: 'invalid', message: 'ROE 过低（<10%），市赚率失效' };
}

/**
 * 获取市场默认阈值
 */
export function getDefaultThresholds(market: 'A' | 'H' | 'US'): PRRThresholds {
  const thresholds: Record<string, PRRThresholds> = {
    A: { market: 'A', buyThreshold: 0.6, sellThreshold: 1.0 },
    H: { market: 'H', buyThreshold: 0.6, sellThreshold: 0.8 },
    US: { market: 'US', buyThreshold: 0.6, sellThreshold: 1.0 },
  };
  return thresholds[market];
}

/**
 * 综合计算市赚率
 */
export function calculatePRR(inputs: PRRInputs, market: 'A' | 'H' | 'US' = 'A'): PRRResult {
  const { peRatio, roe, pbRatio, dividendPayoutRatio, roa, historicalRoeRoaRatio } = inputs;
  const thresholds = getDefaultThresholds(market);

  // 1. 验证 ROE 有效性
  const validity = validatePRRRange(roe);

  // 2. 计算基础 PR
  const basePR = calculateBasePR(peRatio, roe);

  let adjustedPR: number | undefined;
  let adjustmentFactor: number | undefined;
  let cyclePR: number | undefined;
  let derivedPR: number | undefined;

  // 3. 计算修正 PR（如有分红数据）
  if (dividendPayoutRatio !== undefined && dividendPayoutRatio > 0) {
    adjustmentFactor = calculateAdjustmentFactor(dividendPayoutRatio);
    adjustedPR = calculateAdjustedPR(peRatio, roe, dividendPayoutRatio);
  }

  // 4. 计算周期 PR（如有 PB 和平均 ROE）
  if (pbRatio !== undefined && pbRatio > 0) {
    // 这里假设传入的 roe 是多年平均值，实际应用中需传入单独参数
    cyclePR = calculateCyclePR(pbRatio, roe);
  }

  // 5. 计算衍生 PR（回购失真检测）
  if (roa !== undefined && roa > 0 && detectROEDistortion(roe, roa)) {
    derivedPR = calculateDerivedPR(peRatio, roa, historicalRoeRoaRatio);
  }

  // 6. 确定估值状态和建议
  const effectivePR = adjustedPR ?? basePR;
  let valuationStatus: PRRResult['valuationStatus'];
  let suggestion: PRRResult['suggestion'];

  if (!validity.valid) {
    valuationStatus = 'invalid';
    suggestion = 'avoid';
  } else if (effectivePR <= thresholds.buyThreshold) {
    valuationStatus = 'undervalued';
    suggestion = 'buy';
  } else if (effectivePR >= thresholds.sellThreshold) {
    valuationStatus = 'overvalued';
    suggestion = 'sell';
  } else {
    valuationStatus = 'fair';
    suggestion = 'hold';
  }

  return {
    basePR,
    adjustedPR,
    adjustmentFactor,
    cyclePR,
    derivedPR,
    valuationStatus,
    suggestion,
  };
}
```

### 12.3 组件集成建议

```vue
<!-- src/components/PRRValuation.vue -->
<template>
  <div class="prr-valuation">
    <h3>市赚率估值</h3>

    <!-- 基础数据输入 -->
    <div class="input-group">
      <label>市盈率 (PE)</label>
      <input v-model.number="inputs.peRatio" type="number" step="0.01" />
    </div>

    <div class="input-group">
      <label>净资产收益率 (ROE %)</label>
      <input v-model.number="inputs.roe" type="number" step="0.01" />
    </div>

    <div class="input-group">
      <label>股利支付率 (%)</label>
      <input v-model.number="inputs.dividendPayoutRatio" type="number" step="0.01" />
    </div>

    <!-- 计算结果展示 -->
    <div v-if="result" class="results">
      <div class="prr-item" :class="result.valuationStatus">
        <span>基础市赚率: {{ formatPRR(result.basePR) }}</span>
      </div>

      <div v-if="result.adjustedPR" class="prr-item" :class="result.valuationStatus">
        <span>修正市赚率: {{ formatPRR(result.adjustedPR) }}</span>
        <small>(修正系数 N = {{ result.adjustmentFactor }})</small>
      </div>

      <div v-if="result.derivedPR" class="prr-item">
        <span>衍生市赚率: {{ formatPRR(result.derivedPR) }}</span>
        <small>(ROE 可能存在回购失真)</small>
      </div>

      <div class="suggestion" :class="result.suggestion">
        {{ suggestionText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { calculatePRR } from '@/utils/prrCalculator';
import type { PRRInputs } from '@/types/prr';

const inputs = reactive<PRRInputs>({
  peRatio: 0,
  roe: 0,
  dividendPayoutRatio: undefined,
});

const result = computed(() => {
  if (inputs.peRatio <= 0 || inputs.roe <= 0) return null;
  return calculatePRR(inputs, 'A');
});

const suggestionText = computed(() => {
  const map = {
    buy: '低估 - 建议买入',
    hold: '合理 - 建议持有',
    sell: '高估 - 建议卖出',
    avoid: '数据异常 - 建议回避',
  };
  return result.value ? map[result.value.suggestion] : '';
});

function formatPRR(value: number): string {
  if (!isFinite(value)) return 'N/A';
  return value.toFixed(3) + ' PR';
}
</script>
```

### 12.4 与现有估值体系集成

在 `src/utils/calculator.ts` 中集成：

```typescript
// src/utils/calculator.ts

import { calculatePRR, calculateAdjustmentFactor } from './prrCalculator';
import type { StockData } from '@/types/stock';

export interface ValuationMetrics {
  valuation1: number | null;  // (市值 - 净现金) / 自由现金流
  valuation2: number | null;  // (市值 - 净现金) / 净利润
  peRatio: number | null;
  currentRatio: number | null;
  /** 新增：市赚率 */
  prr: {
    base: number | null;
    adjusted: number | null;
    adjustmentFactor: number | null;
    status: 'undervalued' | 'fair' | 'overvalued' | 'invalid';
  } | null;
}

export function calculateAllValuations(stock: StockData): ValuationMetrics {
  // ... 现有计算逻辑

  // 新增：市赚率计算
  let prr = null;
  if (stock.peRatio && stock.roe) {
    const prrResult = calculatePRR({
      peRatio: stock.peRatio,
      roe: stock.roe,
      dividendPayoutRatio: stock.dividendPayoutRatio,
    }, stock.market === 'HK' ? 'H' : 'A');

    prr = {
      base: isFinite(prrResult.basePR) ? prrResult.basePR : null,
      adjusted: prrResult.adjustedPR ?? null,
      adjustmentFactor: prrResult.adjustmentFactor ?? null,
      status: prrResult.valuationStatus,
    };
  }

  return {
    valuation1,
    valuation2,
    peRatio,
    currentRatio,
    prr,
  };
}
```

### 12.5 API 数据字段映射

从东方财富 API 获取的数据需映射到 PRR 计算所需字段：

```typescript
// src/api/eastmoney.ts 中扩展数据解析

interface FinancialData {
  // 现有字段
  marketCap: number;      // 市值
  netProfit: number;      // 净利润
  netAssets: number;      // 净资产
  // 新增 PRR 所需字段
  peRatio: number;        // 市盈率
  pbRatio: number;        // 市净率
  roe: number;            // 净资产收益率 (%)
  roa: number;            // 总资产收益率 (%)
  dividendPayoutRatio: number;  // 股利支付率 (%)
}
```

---

## 13. 回测与实证

### 13.1 丁宁实盘业绩

| 时间段 | 市场环境 | 年化收益 |
|--------|---------|---------|
| 2016 ~ 2019 | 牛市偏多 | **20%** |
| 2020 ~ 2024 | 熊市偏多 | **15%** |
| 2016 ~ 2025（10 年）| 完整周期 | **20%** |

雪球组合 "H 股大宗" 实现 **8 年 4 倍**（净值从 1.0 到 4.0）。

### 13.2 关键年份复盘

| 年份 | 市场环境 | 市赚率表现 | 操作 |
|------|---------|-----------|------|
| 2015 | 大牛市 | 被"中巴"忽悠，尝试永久持股 | 高位未卖，交学费 |
| 2016 | 熔断股灾 | 市赚率全面低估 | 增资调仓，全换 4-6 折股票 |
| 2018 | 牛市顶峰 | 半仓股票高估 | 卖出高估，半仓现金迎熊市 |
| 2020 | 茅指数行情 | **市赚率失效一整年** | 高估的涨、低估的跌，收益不到指数一半 |
| 2022 | 中特估前夜 | 六大行 H 股 0.39~0.53 PR | 买入农行 H、邮储 H |
| 2024 | 银行股大涨 | 六大行普遍高估 | 越涨越卖 |
| 2025 | 牛市下半场 | 1PR 附近卖出不少股票 | 一半现金，一半指数基金 |

### 13.3 量化回测结论

根据第三方量化朋友的回测：

- **ROE > 10%** 的稳健高息个股中，市赚率"基本靠谱"
- **红利指数** 上使用：0.4~0.5PR 买入，1PR 卖出，长期有效
- 市赚率对 **个人能力圈要求不高，但对耐心要求极高**

---

## 14. 局限性及注意事项

### 14.1 已知局限性

| 局限性 | 说明 | 应对方法 |
|--------|------|---------|
| **ROE 依赖** | ROE 受会计政策、杠杆率影响 | 结合 ROA、负债率分析 |
| **忽视成长性** | 未明确考虑未来增长率 g | 成长股改用 PEG |
| **周期股失效** | 景气年份 ROE 和分红失真 | 用第二公式（多年平均 ROE）|
| **回购失真** | 负债回购导致 ROE 飙升 | 用衍生 PR（ROA 修正）|
| **科技股不适用** | 常用回购代替分红 | 改用 PS、EV/Revenue |
| **银行股需修正** | 原始公式显示万年低估 | 用 N 系数修正 |
| **短期失效** | 2020 年茅指数行情跑输大盘 | 坚持长期，接受短期无效 |

### 14.2 使用纪律

1. **不买 8 折**：只买 4-6 折，宁可错过不冒险
2. **分散持仓**：低估 + 分散，不把鸡蛋放一个篮子
3. **警惕小概率**：设好警戒线（如油价 60 美元）
4. **越涨越卖**：高估后不幻想，严格执行卖出纪律
5. **熊底调仓**：每逢熊市底部，调仓换股至全面低估

### 14.3 格林布拉特名言

> "价值投资经常短期无效，但却长期有效。前者是后者的保障。"

---

## 15. 参考资料

### 15.1 核心来源（ericwarn丁宁 原文）

| 文章 | 来源 | 关键内容 |
|------|------|---------|
| 8年4倍之后，我明白了一个道理 | [腾讯新闻](https://news.qq.com/rain/a/20240514A06FE300) | 核心方法论、N 系数、个人实盘 |
| 从"市赚率"视角看苹果公司的估值 | [腾讯新闻](https://view.inews.qq.com/a/20240506A05OGH00) | 衍生 PR、回购失真处理 |
| 股权思维向左，股利思维向右 | [腾讯新闻](https://view.inews.qq.com/a/20250127A05A5H00) | 修正市赚率哲学、ABCDEF 模型 |
| 回顾最近10年我所经历的五个牛市 | [腾讯新闻](https://news.qq.com/rain/a/20251102A034LA00) | 10 年复盘、三个公式总结 |
| 2025年一季报收官：34家上市银行股市赚率估值总览 | [腾讯新闻](https://new.qq.com/rain/a/20250503A02Q8300) | 银行业估值实践 |
| 2024年勇夺行业板块涨幅第一：40家上市银行市赚率估值总览 | [新浪财经](http://cj.sina.cn/articles/view/2183570524/8226a45c02701dk66) | 40 家银行估值表 |
| 市赚率双5策略一年半 | [雪球](https://ai.xueqiu.com/9363345092/379456818) | 双 5 策略、N 系数详细逻辑 |

### 15.2 第三方分析

| 文章 | 来源 | 关键内容 |
|------|------|---------|
| 市赚率探讨 | [腾讯新闻](https://news.qq.com/rain/a/20250225A06KHY00) | 最全面的第三方技术分析 |
| 关于市赚率估值法 | [简书](https://www.jianshu.com/p/face5adedccc) | 清晰公式解释、案例 |
| 如何快速识别红利指数买卖点 | [新浪财经](https://finance.sina.com.cn/cj/2026-01-29/doc-inhiyrwf4220883.shtml) | 指数 PR 应用、多维度筛选 |

### 15.3 原始 8 篇雪球文章（WAF 受限，内容已通过镜像获取）

- https://xueqiu.com/9363345092/363868067
- https://xueqiu.com/9363345092/379456818
- https://xueqiu.com/9363345092/265953087
- https://xueqiu.com/9363345092/311274853
- https://xueqiu.com/9363345092/311470518
- https://xueqiu.com/9363345092/311890602
- https://xueqiu.com/9363345092/311973567
- https://xueqiu.com/9363345092/312215356

---

## 附录：快速参考卡

### A. 公式速查

```
基础 PR    = PE / ROE
修正 PR    = N × PE / ROE
周期 PR    = PB × 100 / ROE²
指数 PR    = PE² / PB / 100
衍生 PR    = PE / (k × ROA)

N 系数     = 50% / 股利支付率
合理 PB    = ROE² / 100
```

### B. 阈值速查

| 市场 | 买入 | 卖出 |
|------|------|------|
| A 股 | ≤ 0.6 PR | ≥ 1.0 PR |
| H 股 | ≤ 0.6 PR | ≥ 0.8 PR |

### C. N 系数速查

| 分红率 | N |
|--------|---|
| ≥ 50% | 1.0 |
| 40% | 1.25 |
| 30% | 1.67 |
| ≤ 25% | 2.0 |

### D. 有效区间

```
强有效: 10% ≤ ROE ≤ 33%
弱有效: 33% < ROE ≤ 50%
无效:   ROE > 50% 或 ROE < 10%
```

---

> **免责声明**：本文档仅为研究性技术文档，所引用的投资观点和策略不代表任何投资建议。市赚率估值体系由雪球用户 ericwarn丁宁 提出，文档内容基于公开文章整理。投资有风险，决策需谨慎。
