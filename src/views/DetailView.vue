<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePortfolioStore } from '@/stores/portfolio'
import { fetchSinaKLine } from '@/composables/useSinaFinance'
import { calculatePortfolioResult } from '@/composables/usePortfolioResult'
import { fmtMoney, fmtPct, fmtPrice, fmtDrawdown, fmtDate, profitClass, typeLabel } from '@/utils/format'
import type { PortfolioResult, KLinePoint } from '@/types'

import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { CandlestickChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, MarkLineComponent, DataZoomComponent } from 'echarts/components'

use([CanvasRenderer, CandlestickChart, GridComponent, TooltipComponent, MarkLineComponent, DataZoomComponent])

const route = useRoute()
const router = useRouter()
const store = usePortfolioStore()

const klineData = ref<KLinePoint[]>([])
const result = ref<PortfolioResult | null>(null)
const isLoading = ref(true)

const investment = computed(() => store.investments.find((i) => i.id === route.params.id))
const transactions = computed(() =>
  investment.value ? store.getTransactions(investment.value.id) : [],
)

onMounted(async () => {
  if (!investment.value) return
  try {
    klineData.value = await fetchSinaKLine(investment.value.code, investment.value.market)
    result.value = calculatePortfolioResult(klineData.value, transactions.value)
  } catch (e) {
    console.error('加载数据失败:', e)
  } finally {
    isLoading.value = false
  }
})

// 交易变化时重新计算
watch(() => store.transactions.length, () => {
  if (investment.value && klineData.value.length) {
    result.value = calculatePortfolioResult(klineData.value, transactions.value)
  }
})

// ===== 添加买入记录 =====
const showTxForm = ref(false)
const txPrice = ref('')
const txQuantity = ref('')
const txDate = ref(new Date().toISOString().slice(0, 10))

function addTransaction() {
  const price = parseFloat(txPrice.value)
  const quantity = parseFloat(txQuantity.value)
  if (!price || !quantity || !txDate.value || !investment.value) return
  store.addTransaction({
    investmentId: investment.value.id,
    price,
    quantity,
    date: txDate.value,
  })
  txPrice.value = ''
  txQuantity.value = ''
  txDate.value = new Date().toISOString().slice(0, 10)
  showTxForm.value = false
}

function removeTransaction(txId: string) {
  if (confirm('确定删除这条买入记录？')) {
    store.removeTransaction(txId)
  }
}

const chartOption = computed(() => {
  if (!klineData.value.length) return {}
  const dates = klineData.value.map((k) => k.date)
  const data = klineData.value.map((k) => [k.open, k.close, k.low, k.high])
  const markLines: any[] = []

  if (result.value?.costBasis != null) {
    markLines.push({
      yAxis: result.value.costBasis,
      label: { formatter: `成本 ${result.value.costBasis.toFixed(4)}`, position: 'insideEndTop' },
      lineStyle: { color: '#f59e0b', type: 'dashed' as const, width: 1.5 },
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
        return `<div style="font-size:12px"><b>${p.axisValue}</b><br/>开: ${d[1]} 收: ${d[2]}<br/>低: ${d[3]} 高: ${d[4]}</div>`
      },
    },
    grid: { left: 60, right: 16, top: 16, bottom: 56 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { fontSize: 10, color: '#9ca3af' },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: { fontSize: 10, color: '#9ca3af' },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, start: klineData.value.length > 120 ? 100 - (120 / klineData.value.length) * 100 : 0, end: 100 },
      { type: 'slider', xAxisIndex: 0, height: 20, bottom: 4, borderColor: 'transparent', fillerColor: 'rgba(59,130,246,0.12)', handleStyle: { color: '#3b82f6' }, textStyle: { fontSize: 10 } },
    ],
    series: [{
      type: 'candlestick',
      data,
      itemStyle: { color: '#ef4444', color0: '#10b981', borderColor: '#ef4444', borderColor0: '#10b981' },
      markLine: { symbol: 'none', data: markLines, label: { fontSize: 10 } },
    }],
  }
})
</script>

<template>
  <div class="detail">
    <header class="detail-header">
      <button class="back-btn" @click="router.push('/')">‹</button>
      <div class="header-info" v-if="investment">
        <div class="header-name-row">
          <h1 class="header-name">{{ investment.name }}</h1>
          <span class="tag" :class="`tag-${investment.type}`">{{ typeLabel(investment.type) }}</span>
        </div>
        <span class="header-code">{{ investment.code }}</span>
      </div>
    </header>

    <!-- 加载中 -->
    <div v-if="isLoading" class="loading-state">
      <div class="card"><div class="skeleton" style="width:100px;height:36px;margin-bottom:8px"></div><div class="skeleton" style="width:60px;height:14px"></div></div>
      <div class="card"><div class="skeleton" style="width:100%;height:200px"></div></div>
    </div>

    <!-- 无数据 -->
    <div v-else-if="!result" class="empty-state">
      <div class="empty-state-icon">📉</div>
      <p class="empty-state-text">暂无可分析的数据</p>
      <p class="empty-state-hint" v-if="!transactions.length">请先在管理中添加买入记录</p>
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
          <span>现价 {{ fmtPrice(result.currentPrice) }}</span>
        </div>
      </div>

      <!-- K 线图 -->
      <div class="card chart-card">
        <h2 class="section-title">📈 K 线走势</h2>
        <div class="chart-wrapper">
          <v-chart :option="chartOption" autoresize class="chart" />
        </div>
      </div>

      <!-- 盈利回撤 -->
      <div class="card">
        <h2 class="section-title">📊 盈利回撤</h2>

        <!-- 当前状态行 -->
        <div class="current-status" v-if="result.currentPrice != null">
          <div class="current-status-item">
            <span class="current-status-label">当前价格</span>
            <span class="current-status-value">{{ fmtPrice(result.currentPrice) }}</span>
          </div>
          <div class="current-status-item">
            <span class="current-status-label">当前收益率</span>
            <span class="current-status-value" :class="profitClass(result.currentProfitRate)">
              {{ fmtPct(result.currentProfitRate) }}
            </span>
          </div>
          <div class="current-status-item">
            <span class="current-status-label">盈亏</span>
            <span class="current-status-value" :class="profitClass(result.currentProfitRate)">
              {{ result.currentValue != null && result.totalCost != null
                ? `${(result.currentValue - result.totalCost) >= 0 ? '+' : ''}${fmtMoney(result.currentValue - result.totalCost)}`
                : '--' }}
            </span>
          </div>
        </div>

        <template v-if="result.buildMaxProfit != null && result.buildMaxProfit <= 0">
          <div class="no-profit-notice">
            <span>⚠️</span>
            <span>建仓后从未盈利，最大盈利率 <b>{{ fmtPct(result.buildMaxProfit) }}</b></span>
          </div>
        </template>

        <template v-else>
          <div class="metric-grid">
            <div class="metric-item">
              <span class="metric-label">建仓后最大盈利</span>
              <span class="metric-value text-profit">{{ fmtPct(result.buildMaxProfit) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">当前盈利回撤</span>
              <span class="metric-value text-loss">
                {{ fmtDrawdown(result.currentProfitDrawdown) }}
              </span>
            </div>
            <div class="metric-item">
              <span class="metric-label">建仓后最高</span>
              <span class="metric-value text-profit">
                {{ fmtPrice(result.maxValue) }}
                <span class="metric-pct">{{ result.costBasis ? fmtPct((result.maxValue! - result.costBasis) / result.costBasis) : '' }}</span>
              </span>
              <span class="metric-date">{{ fmtDate(result.maxValueDate) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">建仓后最低</span>
              <span class="metric-value text-loss">
                {{ fmtPrice(result.minValue) }}
                <span class="metric-pct">{{ result.costBasis ? fmtPct((result.minValue! - result.costBasis) / result.costBasis) : '' }}</span>
              </span>
              <span class="metric-date">{{ fmtDate(result.minValueDate) }}</span>
            </div>
          </div>

          <div class="profit-drawdown-max" v-if="result.maxProfitDrawdown != null">
            <div class="profit-drawdown-max-header">
              <span class="metric-label">历史最大盈利回撤</span>
              <span class="tag tag-loss">{{ fmtDrawdown(result.maxProfitDrawdown) }}</span>
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

      <!-- 持仓概览 -->
      <div class="card">
        <h2 class="section-title">💰 持仓概览</h2>
        <div class="metric-grid">
          <div class="metric-item">
            <span class="metric-label">总投入</span>
            <span class="metric-value">{{ fmtMoney(result.totalCost) }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">当前市值</span>
            <span class="metric-value" :class="profitClass(result.currentProfitRate)">
              {{ fmtMoney(result.currentValue) }}
            </span>
          </div>
          <div class="metric-item">
            <span class="metric-label">持仓份额</span>
            <span class="metric-value">{{ result.totalShares?.toLocaleString() ?? '--' }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">成本价</span>
            <span class="metric-value">{{ fmtPrice(result.costBasis) }}</span>
          </div>
        </div>
      </div>

      <!-- 买入记录 -->
      <div class="card">
        <div class="tx-header">
          <h2 class="section-title" style="margin:0">📋 买入记录 ({{ transactions.length }})</h2>
          <button class="btn btn-ghost btn-sm" @click="showTxForm = !showTxForm">
            {{ showTxForm ? '取消' : '＋ 添加' }}
          </button>
        </div>

        <!-- 添加表单 -->
        <div v-if="showTxForm" class="tx-form">
          <div class="tx-form-grid">
            <div class="form-field">
              <label class="form-label">价格</label>
              <input v-model="txPrice" class="input" type="number" step="0.001" placeholder="0.000" />
            </div>
            <div class="form-field">
              <label class="form-label">份额</label>
              <input v-model="txQuantity" class="input" type="number" step="1" placeholder="0" />
            </div>
            <div class="form-field">
              <label class="form-label">日期</label>
              <input v-model="txDate" class="input" type="date" />
            </div>
          </div>
          <button class="btn btn-primary btn-sm" style="align-self:flex-end" @click="addTransaction" :disabled="!txPrice || !txQuantity || !txDate">确认添加</button>
        </div>

        <!-- 记录列表 -->
        <div class="tx-list">
          <div v-for="tx in [...transactions].sort((a, b) => b.date.localeCompare(a.date))" :key="tx.id" class="tx-item">
            <div class="tx-date">{{ tx.date }}</div>
            <div class="tx-info">
              <span class="tx-price">{{ fmtPrice(tx.price) }}</span>
              <span class="tx-qty">× {{ tx.quantity }}</span>
            </div>
            <div class="tx-total">{{ fmtMoney(tx.price * tx.quantity) }}</div>
            <button class="tx-del-btn" @click="removeTransaction(tx.id)">✕</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail { display: flex; flex-direction: column; gap: 14px; }

.detail-header { display: flex; align-items: center; gap: 8px; }
.back-btn { background: none; border: none; font-size: 28px; color: var(--color-text-secondary); cursor: pointer; padding: 4px 8px; line-height: 1; }
.header-info { flex: 1; }
.header-name-row { display: flex; align-items: center; gap: 8px; }
.header-name { font-size: 20px; font-weight: 700; }
.header-code { font-size: 13px; color: var(--color-text-muted); font-family: var(--font-mono); }

.loading-state { display: flex; flex-direction: column; gap: 14px; }

/* Profit Banner */
.profit-banner { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; border: none; text-align: center; }
.profit-banner-main { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.profit-banner-rate { font-size: 36px; font-weight: 700; font-family: var(--font-mono); line-height: 1.2; }
.profit-banner-rate.text-profit { color: #f87171; }
.profit-banner-rate.text-loss { color: #34d399; }
.profit-banner-rate.text-neutral { color: #fff; }
.profit-banner-label { font-size: 13px; opacity: 0.6; }
.profit-banner-sub { display: flex; justify-content: center; gap: 24px; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 13px; opacity: 0.6; font-family: var(--font-mono); }

.metric-date { font-size: 11px; color: var(--color-text-muted); }
.metric-pct { font-size: 11px; font-weight: 500; opacity: 0.8; margin-left: 4px; }
.metric-value-sm { font-size: 13px; font-weight: 600; font-family: var(--font-mono); }

/* Current status bar */
.current-status { display: flex; justify-content: space-around; padding: 12px 0; margin-bottom: 12px; background: var(--color-bg); border-radius: var(--radius-sm); }
.current-status-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.current-status-label { font-size: 11px; color: var(--color-text-muted); }
.current-status-value { font-size: 15px; font-weight: 700; font-family: var(--font-mono); }

/* Drawdown period */
.drawdown-period { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 10px 0 0; border-top: 1px solid var(--color-border); margin-top: 10px; }
.drawdown-period-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.drawdown-period-arrow { font-size: 16px; color: var(--color-text-muted); }

.no-profit-notice { display: flex; align-items: center; gap: 8px; padding: 12px; background: var(--color-warning-bg); border-radius: var(--radius-sm); font-size: 13px; color: var(--color-text-secondary); }

.profit-drawdown-max { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-border); }
.profit-drawdown-max-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }

.chart-card { padding: 16px 8px; }
.chart-wrapper { width: 100%; height: 320px; }
.chart { width: 100%; height: 100%; }

/* Transaction */
.tx-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.tx-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; padding: 12px; background: var(--color-bg); border-radius: var(--radius-sm); }
.tx-form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 12px; color: var(--color-text-secondary); font-weight: 500; }
.btn-sm { padding: 6px 14px; font-size: 13px; }

.tx-list { display: flex; flex-direction: column; }
.tx-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
.tx-item:last-child { border-bottom: none; }
.tx-date { font-size: 13px; color: var(--color-text-secondary); font-family: var(--font-mono); width: 82px; flex-shrink: 0; }
.tx-info { flex: 1; display: flex; gap: 6px; align-items: center; min-width: 0; }
.tx-price { font-size: 14px; font-weight: 600; font-family: var(--font-mono); width: 72px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; }
.tx-qty { font-size: 12px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; }
.tx-total { font-size: 14px; font-weight: 600; font-family: var(--font-mono); text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.tx-del-btn { background: none; border: none; font-size: 12px; color: var(--color-text-muted); cursor: pointer; padding: 4px 6px; margin-left: 8px; opacity: 0.4; transition: opacity 0.15s; }
.tx-del-btn:hover { opacity: 1; color: var(--color-profit); }
.empty-state-hint { font-size: 13px; color: var(--color-text-muted); margin-top: 4px; }
</style>
