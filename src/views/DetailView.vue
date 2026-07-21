<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePortfolioStore } from '@/stores/portfolio'
import { fetchSinaKLine } from '@/composables/useSinaFinance'
import { calculatePortfolioResult } from '@/composables/usePortfolioResult'
import type { PortfolioResult, KLinePoint } from '@/types'

import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { CandlestickChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  DataZoomComponent,
} from 'echarts/components'

use([
  CanvasRenderer,
  CandlestickChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  DataZoomComponent,
])

const route = useRoute()
const router = useRouter()
const store = usePortfolioStore()

const klineData = ref<KLinePoint[]>([])
const result = ref<PortfolioResult | null>(null)
const isLoading = ref(true)

const investment = computed(() =>
  store.investments.find((i) => i.id === route.params.id),
)

const transactions = computed(() =>
  investment.value
    ? store.getTransactions(investment.value.id)
    : [],
)

onMounted(async () => {
  if (!investment.value) return
  try {
    klineData.value = await fetchSinaKLine(
      investment.value.code,
      investment.value.market,
    )
    result.value = calculatePortfolioResult(
      klineData.value,
      transactions.value,
    )
  } catch (e) {
    console.error('加载数据失败:', e)
  } finally {
    isLoading.value = false
  }
})

// ===== 格式化函数 =====
function fmtMoney(v: number | null | undefined): string {
  if (v == null) return '--'
  return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '--'
  const pct = (v * 100).toFixed(2)
  return `${v >= 0 ? '+' : ''}${pct}%`
}

function fmtPrice(v: number | null | undefined): string {
  if (v == null) return '--'
  return v.toFixed(4)
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return '--'
  return v
}

function profitClass(v: number | null | undefined): string {
  if (v == null) return 'text-neutral'
  return v > 0 ? 'text-profit' : v < 0 ? 'text-loss' : 'text-neutral'
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { stock: '股票', etf: 'ETF', fund: '基金' }
  return map[type] || type
}

// ===== ECharts 配置 =====
const chartOption = computed(() => {
  if (!klineData.value.length) return {}

  const dates = klineData.value.map((k) => k.date)
  // ECharts candlestick: [open, close, low, high]
  const data = klineData.value.map((k) => [k.open, k.close, k.low, k.high])

  const markLines: any[] = []

  // 成本线
  if (result.value?.costBasis != null) {
    markLines.push({
      yAxis: result.value.costBasis,
      label: { formatter: `成本 ${result.value.costBasis.toFixed(2)}`, position: 'insideEndTop' },
      lineStyle: { color: '#f59e0b', type: 'dashed' as const, width: 1.5 },
    })
  }

  // 最高价标记
  if (result.value?.maxValue != null) {
    markLines.push({
      yAxis: result.value.maxValue,
      label: { formatter: `最高 ${result.value.maxValue.toFixed(2)}`, position: 'insideEndTop' },
      lineStyle: { color: '#e74c3c', type: 'dotted' as const, width: 1 },
    })
  }

  return {
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        const p = params[0]
        if (!p) return ''
        const d = p.data
        return `<div style="font-size:12px">
          <b>${p.axisValue}</b><br/>
          开: ${d[1]} 收: ${d[2]}<br/>
          低: ${d[3]} 高: ${d[4]}
        </div>`
      },
    },
    grid: {
      left: 60,
      right: 16,
      top: 16,
      bottom: 56,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        fontSize: 10,
        color: '#9ca3af',
      },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: {
        fontSize: 10,
        color: '#9ca3af',
      },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        start: klineData.value.length > 120 ? 100 - (120 / klineData.value.length) * 100 : 0,
        end: 100,
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 20,
        bottom: 4,
        borderColor: 'transparent',
        fillerColor: 'rgba(59,130,246,0.12)',
        handleStyle: { color: '#3b82f6' },
        textStyle: { fontSize: 10 },
      },
    ],
    series: [
      {
        type: 'candlestick',
        data,
        itemStyle: {
          color: '#ef4444',        // 阳线填充（涨）
          color0: '#10b981',       // 阴线填充（跌）
          borderColor: '#ef4444',
          borderColor0: '#10b981',
        },
        markLine: {
          symbol: 'none',
          data: markLines,
          label: { fontSize: 10 },
        },
      },
    ],
  }
})

function goBack() {
  router.push('/')
}
</script>

<template>
  <div class="detail">
    <!-- 返回按钮 + 标题 -->
    <header class="detail-header">
      <button class="back-btn" @click="goBack">‹</button>
      <div class="header-info" v-if="investment">
        <div class="header-name-row">
          <h1 class="header-name">{{ investment.name }}</h1>
          <span class="tag" :class="`tag-${investment.type}`">
            {{ typeLabel(investment.type) }}
          </span>
        </div>
        <span class="header-code">{{ investment.code }}</span>
      </div>
    </header>

    <!-- 加载中 -->
    <div v-if="isLoading" class="loading-state">
      <div class="card">
        <div class="skeleton" style="width: 100px; height: 36px; margin-bottom: 8px"></div>
        <div class="skeleton" style="width: 60px; height: 14px"></div>
      </div>
      <div class="card">
        <div class="skeleton" style="width: 100%; height: 200px"></div>
      </div>
    </div>

    <!-- 无数据 -->
    <div v-else-if="!result" class="empty-state">
      <div class="empty-state-icon">📉</div>
      <p class="empty-state-text">暂无可分析的数据</p>
      <p class="empty-state-hint" v-if="!transactions.length">请先在设置中添加买入记录</p>
    </div>

    <!-- 有数据 -->
    <template v-else>
      <!-- 收益率大卡片 -->
      <div class="card profit-banner">
        <div class="profit-banner-main">
          <span class="profit-banner-rate" :class="profitClass(result.currentProfitRate)">
            {{ fmtPct(result.currentProfitRate) }}
          </span>
          <span class="profit-banner-label">当前收益率</span>
        </div>
        <div class="profit-banner-sub">
          <span>成本 {{ fmtPrice(result.costBasis) }}</span>
          <span>现价 {{ fmtPrice(result.currentValue) }}</span>
        </div>
      </div>

      <!-- 基础数据 -->
      <div class="card">
        <h2 class="section-title">💰 基础数据</h2>
        <div class="metric-grid">
          <div class="metric-item">
            <span class="metric-label">总投入</span>
            <span class="metric-value">{{ fmtMoney(result.totalCost) }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">当前市值</span>
            <span class="metric-value" :class="profitClass((result.currentValue ?? 0) - (result.totalCost ?? 0))">
              {{ fmtMoney(result.currentValue) }}
            </span>
          </div>
          <div class="metric-item">
            <span class="metric-label">最高市值</span>
            <span class="metric-value text-profit">{{ fmtMoney(result.maxValue) }}</span>
            <span class="metric-date">{{ fmtDate(result.maxValueDate) }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">最低市值</span>
            <span class="metric-value text-loss">{{ fmtMoney(result.minValue) }}</span>
            <span class="metric-date">{{ fmtDate(result.minValueDate) }}</span>
          </div>
        </div>
      </div>

      <!-- 回撤分析 -->
      <div class="card">
        <h2 class="section-title">📉 回撤分析</h2>
        <div class="drawdown-highlight">
          <div class="drawdown-highlight-value text-loss">
            {{ result.maxDrawdown != null ? `-${(result.maxDrawdown * 100).toFixed(2)}%` : '--' }}
          </div>
          <div class="drawdown-highlight-label">最大回撤</div>
        </div>
        <div class="drawdown-period" v-if="result.maxDrawdownStart && result.maxDrawdownEnd">
          <div class="drawdown-period-item">
            <span class="metric-label">峰值</span>
            <span class="metric-value-sm">{{ fmtDate(result.maxDrawdownStart) }}</span>
          </div>
          <span class="drawdown-period-arrow">→</span>
          <div class="drawdown-period-item">
            <span class="metric-label">谷底</span>
            <span class="metric-value-sm">{{ fmtDate(result.maxDrawdownEnd) }}</span>
          </div>
        </div>
      </div>

      <!-- 盈利回撤 -->
      <div class="card">
        <h2 class="section-title">📊 盈利回撤</h2>

        <!-- 从未盈利的情况 -->
        <template v-if="result.buildMaxProfit != null && result.buildMaxProfit <= 0">
          <div class="no-profit-notice">
            <span class="no-profit-icon">⚠️</span>
            <span>建仓后从未盈利，最大盈利率为 <b>{{ fmtPct(result.buildMaxProfit) }}</b></span>
          </div>
        </template>

        <!-- 有盈利数据 -->
        <template v-else>
          <div class="metric-grid">
            <div class="metric-item">
              <span class="metric-label">建仓后最大盈利率</span>
              <span class="metric-value text-profit">
                {{ fmtPct(result.buildMaxProfit) }}
              </span>
            </div>
            <div class="metric-item">
              <span class="metric-label">当前盈利回撤</span>
              <span class="metric-value text-loss">
                {{ result.currentProfitDrawdown != null
                  ? `-${(result.currentProfitDrawdown * 100).toFixed(2)}%`
                  : '--' }}
              </span>
            </div>
          </div>

          <div class="profit-drawdown-max" v-if="result.maxProfitDrawdown != null">
            <div class="profit-drawdown-max-header">
              <span class="metric-label">历史最大盈利回撤</span>
              <span class="tag tag-loss">
                -{{ (result.maxProfitDrawdown * 100).toFixed(2) }}%
              </span>
            </div>
            <div class="drawdown-period" v-if="result.profitDrawdownStart && result.profitDrawdownEnd">
              <div class="drawdown-period-item">
                <span class="metric-label">峰值</span>
                <span class="metric-value-sm">{{ fmtDate(result.profitDrawdownStart) }}</span>
              </div>
              <span class="drawdown-period-arrow">→</span>
              <div class="drawdown-period-item">
                <span class="metric-label">谷底</span>
                <span class="metric-value-sm">{{ fmtDate(result.profitDrawdownEnd) }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- K 线图 -->
      <div class="card chart-card">
        <h2 class="section-title">📈 K 线走势</h2>
        <div class="chart-wrapper">
          <v-chart :option="chartOption" autoresize class="chart" />
        </div>
      </div>

      <!-- 买入记录 -->
      <div class="card">
        <h2 class="section-title">📋 买入记录 ({{ transactions.length }})</h2>
        <div class="tx-list">
          <div
            v-for="tx in transactions.sort((a, b) => b.date.localeCompare(a.date))"
            :key="tx.id"
            class="tx-item"
          >
            <div class="tx-date">{{ tx.date }}</div>
            <div class="tx-info">
              <span class="tx-price">{{ fmtPrice(tx.price) }}</span>
              <span class="tx-qty">× {{ tx.quantity }}</span>
            </div>
            <div class="tx-total">{{ fmtMoney(tx.price * tx.quantity) }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Header */
.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
}

.header-info {
  flex: 1;
}

.header-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-name {
  font-size: 20px;
  font-weight: 700;
}

.header-code {
  font-size: 13px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.tag-stock {
  background: #ede9fe;
  color: #7c3aed;
}

.tag-etf {
  background: #e0f2fe;
  color: #0284c7;
}

.tag-fund {
  background: #fef3c7;
  color: #d97706;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Profit Banner */
.profit-banner {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: #fff;
  border: none;
  text-align: center;
}

.profit-banner-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.profit-banner-rate {
  font-size: 36px;
  font-weight: 700;
  font-family: var(--font-mono);
  line-height: 1.2;
}

.profit-banner-rate.text-profit {
  color: #f87171;
}

.profit-banner-rate.text-loss {
  color: #34d399;
}

.profit-banner-rate.text-neutral {
  color: #fff;
}

.profit-banner-label {
  font-size: 13px;
  opacity: 0.6;
}

.profit-banner-sub {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 13px;
  opacity: 0.6;
  font-family: var(--font-mono);
}

/* Metric date */
.metric-date {
  font-size: 11px;
  color: var(--color-text-muted);
}

.metric-value-sm {
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-mono);
}

/* Drawdown */
.drawdown-highlight {
  text-align: center;
  padding: 12px 0;
}

.drawdown-highlight-value {
  font-size: 32px;
  font-weight: 700;
  font-family: var(--font-mono);
}

.drawdown-highlight-label {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.drawdown-period {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 0 0;
  border-top: 1px solid var(--color-border);
  margin-top: 10px;
}

.drawdown-period-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.drawdown-period-arrow {
  font-size: 16px;
  color: var(--color-text-muted);
}

/* No profit notice */
.no-profit-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--color-warning-bg);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.no-profit-icon {
  font-size: 18px;
}

/* Profit drawdown max section */
.profit-drawdown-max {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.profit-drawdown-max-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

/* Chart */
.chart-card {
  padding: 16px 8px;
}

.chart-wrapper {
  width: 100%;
  height: 320px;
}

.chart {
  width: 100%;
  height: 100%;
}

/* Transaction list */
.tx-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tx-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}

.tx-item:last-child {
  border-bottom: none;
}

.tx-date {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  min-width: 90px;
}

.tx-info {
  flex: 1;
  display: flex;
  gap: 8px;
  align-items: center;
}

.tx-price {
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-mono);
}

.tx-qty {
  font-size: 12px;
  color: var(--color-text-muted);
}

.tx-total {
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-mono);
  text-align: right;
}

.empty-state-hint {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 4px;
}
</style>
