<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePortfolioStore } from '@/stores/portfolio'
import { fetchSinaKLine } from '@/composables/useSinaFinance'
import { calculatePortfolioResult } from '@/composables/usePortfolioResult'
import type { PortfolioResult } from '@/types'

const router = useRouter()
const store = usePortfolioStore()

// 每个投资的计算结果
const results = ref<Record<string, PortfolioResult | null>>({})
const loading = ref<Record<string, boolean>>({})

// 为单个投资加载数据
async function loadInvestment(id: string) {
  const inv = store.investments.find((i) => i.id === id)
  if (!inv) return

  const txs = store.getTransactions(id)
  if (!txs.length) {
    results.value[id] = null
    return
  }

  loading.value[id] = true
  try {
    const kline = await fetchSinaKLine(inv.code, inv.market)
    results.value[id] = calculatePortfolioResult(kline, txs)
  } catch (e) {
    console.error(`加载 ${inv.name} 数据失败:`, e)
    results.value[id] = null
  } finally {
    loading.value[id] = false
  }
}

// 加载所有投资数据
async function loadAll() {
  await Promise.all(store.investments.map((inv) => loadInvestment(inv.id)))
}

onMounted(loadAll)

// 汇总数据
const summary = computed(() => {
  let totalCost = 0
  let currentValue = 0
  let hasData = false

  for (const id of Object.keys(results.value)) {
    const r = results.value[id]
    if (r?.totalCost != null && r?.currentValue != null) {
      totalCost += r.totalCost
      currentValue += r.currentValue
      hasData = true
    }
  }

  if (!hasData) return null

  const profit = currentValue - totalCost
  const profitRate = totalCost > 0 ? profit / totalCost : 0

  return { totalCost, currentValue, profit, profitRate }
})

// 格式化
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

function profitClass(v: number | null | undefined): string {
  if (v == null) return 'text-neutral'
  return v > 0 ? 'text-profit' : v < 0 ? 'text-loss' : 'text-neutral'
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { stock: '股票', etf: 'ETF', fund: '基金' }
  return map[type] || type
}

function goDetail(id: string) {
  router.push(`/detail/${id}`)
}
</script>

<template>
  <div class="home">
    <!-- 页面标题 -->
    <header class="page-header">
      <h1 class="page-title">我的组合</h1>
      <span class="page-subtitle">{{ store.investments.length }} 个投资</span>
    </header>

    <!-- 空状态 -->
    <div v-if="!store.investments.length" class="empty-state">
      <div class="empty-state-icon">📭</div>
      <p class="empty-state-text">还没有投资记录</p>
      <p class="empty-state-hint">去「设置」页面添加你的第一个投资吧</p>
    </div>

    <template v-else>
      <!-- 汇总卡片 -->
      <div v-if="summary" class="card summary-card">
        <div class="summary-row">
          <div class="summary-main">
            <span class="summary-label">总市值</span>
            <span class="summary-value" :class="profitClass(summary.profit)">
              {{ fmtMoney(summary.currentValue) }}
            </span>
          </div>
          <div class="summary-badge" :class="summary.profitRate >= 0 ? 'tag-profit' : 'tag-loss'">
            {{ fmtPct(summary.profitRate) }}
          </div>
        </div>
        <div class="summary-details">
          <span>总投入 {{ fmtMoney(summary.totalCost) }}</span>
          <span :class="profitClass(summary.profit)">
            {{ summary.profit >= 0 ? '+' : '' }}{{ fmtMoney(summary.profit) }}
          </span>
        </div>
      </div>

      <!-- 投资列表 -->
      <div class="invest-list">
        <div
          v-for="inv in store.investments"
          :key="inv.id"
          class="card invest-card"
          @click="goDetail(inv.id)"
        >
          <!-- 加载中 -->
          <div v-if="loading[inv.id]" class="invest-card-loading">
            <div class="invest-header">
              <div class="skeleton" style="width: 120px; height: 18px"></div>
              <div class="skeleton" style="width: 50px; height: 16px"></div>
            </div>
            <div class="skeleton" style="width: 80px; height: 28px; margin-top: 8px"></div>
          </div>

          <!-- 有数据 -->
          <template v-else-if="results[inv.id]">
            <div class="invest-header">
              <div class="invest-name-row">
                <span class="invest-name">{{ inv.name }}</span>
                <span class="tag" :class="`tag-${inv.type}`">{{ typeLabel(inv.type) }}</span>
              </div>
              <span class="invest-code">{{ inv.code }}</span>
            </div>

            <div class="invest-body">
              <div class="invest-profit">
                <span
                  class="profit-rate"
                  :class="profitClass(results[inv.id]!.currentProfitRate)"
                >
                  {{ fmtPct(results[inv.id]!.currentProfitRate) }}
                </span>
                <span class="profit-label">收益率</span>
              </div>

              <div class="invest-metrics">
                <div class="invest-metric">
                  <span class="invest-metric-label">市值</span>
                  <span class="invest-metric-value">
                    {{ fmtPrice(results[inv.id]!.currentValue) }}
                  </span>
                </div>
                <div class="invest-metric">
                  <span class="invest-metric-label">成本</span>
                  <span class="invest-metric-value">
                    {{ fmtPrice(results[inv.id]!.costBasis) }}
                  </span>
                </div>
                <div class="invest-metric">
                  <span class="invest-metric-label">最大回撤</span>
                  <span class="invest-metric-value text-loss">
                    {{ results[inv.id]!.maxDrawdown != null
                      ? `-${(results[inv.id]!.maxDrawdown! * 100).toFixed(1)}%`
                      : '--' }}
                  </span>
                </div>
              </div>
            </div>
          </template>

          <!-- 无交易记录 -->
          <template v-else>
            <div class="invest-header">
              <div class="invest-name-row">
                <span class="invest-name">{{ inv.name }}</span>
                <span class="tag" :class="`tag-${inv.type}`">{{ typeLabel(inv.type) }}</span>
              </div>
              <span class="invest-code">{{ inv.code }}</span>
            </div>
            <div class="invest-empty">暂无买入记录</div>
          </template>

          <div class="invest-arrow">›</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-muted);
}

.empty-state-hint {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

/* Summary Card */
.summary-card {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: #fff;
  border: none;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-label {
  font-size: 13px;
  opacity: 0.7;
}

.summary-value {
  font-size: 26px;
  font-weight: 700;
  font-family: var(--font-mono);
}

.summary-value.text-profit {
  color: #f87171;
}

.summary-value.text-loss {
  color: #34d399;
}

.summary-value.text-neutral {
  color: #fff;
}

.summary-badge {
  padding: 6px 14px;
  border-radius: 99px;
  font-size: 15px;
  font-weight: 600;
  font-family: var(--font-mono);
}

.summary-badge.tag-profit {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}

.summary-badge.tag-loss {
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
}

.summary-details {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 13px;
  opacity: 0.7;
}

.summary-details .text-profit {
  color: #f87171;
  opacity: 1;
}

.summary-details .text-loss {
  color: #34d399;
  opacity: 1;
}

/* Investment List */
.invest-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.invest-card {
  position: relative;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  padding-right: 32px;
}

.invest-card:active {
  transform: scale(0.98);
}

.invest-card:hover {
  box-shadow: var(--shadow-md);
}

.invest-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: var(--color-text-muted);
}

.invest-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.invest-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invest-name {
  font-size: 16px;
  font-weight: 600;
}

.invest-code {
  font-size: 13px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.invest-body {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 12px;
}

.invest-profit {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 90px;
}

.profit-rate {
  font-size: 24px;
  font-weight: 700;
  font-family: var(--font-mono);
  line-height: 1.2;
}

.profit-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.invest-metrics {
  display: flex;
  gap: 16px;
  flex: 1;
}

.invest-metric {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.invest-metric-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.invest-metric-value {
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-mono);
}

.invest-empty {
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.invest-card-loading {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Type tags */
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
</style>
