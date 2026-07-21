<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePortfolioStore } from '@/stores/portfolio'
import { fetchSinaKLine } from '@/composables/useSinaFinance'
import { calculatePortfolioResult } from '@/composables/usePortfolioResult'
import { searchProduct, type SearchResultItem } from '@/composables/useEastMoney'
import { fmtMoney, fmtPct, profitClass, typeLabel, marketLabel } from '@/utils/format'
import type { PortfolioResult } from '@/types'

const router = useRouter()
const store = usePortfolioStore()

const results = ref<Record<string, PortfolioResult | null>>({})
const loading = ref<Record<string, boolean>>({})

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
    console.error(`加载 ${inv.name} 失败:`, e)
    results.value[id] = null
  } finally {
    loading.value[id] = false
  }
}

async function loadAll() {
  await Promise.all(store.investments.map((inv) => loadInvestment(inv.id)))
}

onMounted(loadAll)
watch(() => store.transactions.length, () => { loadAll() })
watch(() => store.investments.length, () => { loadAll() })

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

// ===== 添加投资 =====
const showAddForm = ref(false)
const searchKeyword = ref('')
const searchResults = ref<SearchResultItem[]>([])
const isSearching = ref(false)
const manualMode = ref(false)
const newCode = ref('')
const newName = ref('')
const newType = ref<'stock' | 'etf' | 'fund'>('etf')
const newMarket = ref(1)
const duplicateNotice = ref('')

async function handleSearch() {
  if (!searchKeyword.value.trim()) return
  isSearching.value = true
  try {
    searchResults.value = await searchProduct(searchKeyword.value.trim())
  } catch (e) {
    console.error('搜索失败:', e)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

function selectSearchResult(item: SearchResultItem) {
  newCode.value = item.code
  newName.value = item.name
  newType.value = item.type
  newMarket.value = item.market
  searchResults.value = []
  searchKeyword.value = ''
  manualMode.value = true

  // 检查重复
  const existing = store.investments.find((inv) => inv.code === item.code)
  if (existing) {
    duplicateNotice.value = `「${existing.name}」已存在，将添加买入记录到现有投资`
  } else {
    duplicateNotice.value = ''
  }
}

function addInvestment() {
  if (!newCode.value || !newName.value) return

  // 检查是否重复
  const existing = store.investments.find((inv) => inv.code === newCode.value)
  if (existing) {
    // 已有此产品，展开交易表单
    resetAddForm()
    expandedInv.value = existing.id
    toggleTxForm(existing.id)
    return
  }

  store.addInvestment({ code: newCode.value, name: newName.value, type: newType.value, market: newMarket.value })
  resetAddForm()
}

function resetAddForm() {
  newCode.value = ''
  newName.value = ''
  newType.value = 'etf'
  newMarket.value = 1
  showAddForm.value = false
  manualMode.value = false
  searchResults.value = []
  searchKeyword.value = ''
  duplicateNotice.value = ''
}

// ===== 投资卡片展开/交易管理 =====
const expandedInv = ref<string | null>(null)

function toggleExpand(invId: string) {
  expandedInv.value = expandedInv.value === invId ? null : invId
}

function goDetail(id: string) {
  router.push(`/detail/${id}`)
}

// 交易表单
const activeTxForm = ref<string | null>(null)
const txPrice = ref('')
const txQuantity = ref('')
const txDate = ref(new Date().toISOString().slice(0, 10))

function toggleTxForm(invId: string) {
  if (activeTxForm.value === invId) {
    activeTxForm.value = null
  } else {
    activeTxForm.value = invId
    txPrice.value = ''
    txQuantity.value = ''
    txDate.value = new Date().toISOString().slice(0, 10)
  }
}

function addTransaction(invId: string) {
  const price = parseFloat(txPrice.value)
  const quantity = parseFloat(txQuantity.value)
  if (!price || !quantity || !txDate.value) return
  store.addTransaction({ investmentId: invId, price, quantity, date: txDate.value })
  txPrice.value = ''
  txQuantity.value = ''
  activeTxForm.value = null
}

function removeTransaction(txId: string) {
  store.removeTransaction(txId)
}

function removeInvestment(id: string) {
  if (confirm('确定删除该投资及其所有买入记录？')) {
    store.removeInvestment(id)
  }
}

function getTxCount(invId: string): number {
  return store.getTransactions(invId).length
}

function getTxList(invId: string) {
  return store.getTransactions(invId).sort((a, b) => b.date.localeCompare(a.date))
}
</script>

<template>
  <div class="home">
    <header class="page-header">
      <h1 class="page-title">我的组合</h1>
      <span class="page-subtitle">{{ store.investments.length }} 个投资</span>
    </header>

    <!-- 添加投资按钮 -->
    <button v-if="!showAddForm" class="btn btn-primary add-btn" @click="showAddForm = true">
      ＋ 添加买入
    </button>

    <!-- 添加投资表单 -->
    <div v-if="showAddForm" class="card add-form">
      <div class="form-header">
        <h2 class="section-title" style="margin:0">添加买入</h2>
        <button class="close-btn" @click="resetAddForm">✕</button>
      </div>

      <template v-if="!manualMode">
        <div class="search-row">
          <input v-model="searchKeyword" class="input" placeholder="输入代码或名称搜索…" @keyup.enter="handleSearch" />
          <button class="btn btn-ghost" @click="handleSearch" :disabled="isSearching">
            {{ isSearching ? '…' : '搜索' }}
          </button>
        </div>

        <div v-if="searchResults.length" class="search-results">
          <div v-for="(item, idx) in searchResults.slice(0, 8)" :key="idx" class="search-result-item" @click="selectSearchResult(item)">
            <span class="search-result-name">{{ item.name }}</span>
            <span class="search-result-code">{{ item.code }}</span>
            <span class="tag" :class="`tag-${item.type}`">{{ typeLabel(item.type) }}</span>
          </div>
        </div>

        <div v-if="searchKeyword && !searchResults.length && !isSearching" class="search-empty">
          未找到结果，<a href="#" @click.prevent="manualMode = true">手动输入</a>
        </div>
        <div v-if="!searchKeyword" class="search-hint">
          <a href="#" @click.prevent="manualMode = true">或者手动输入代码</a>
        </div>
      </template>

      <template v-else>
        <!-- 重复提示 -->
        <div v-if="duplicateNotice" class="duplicate-notice">
          ⚡ {{ duplicateNotice }}
        </div>

        <template v-if="!duplicateNotice">
          <div class="form-grid">
            <div class="form-field">
              <label class="form-label">代码</label>
              <input v-model="newCode" class="input" placeholder="如 510300" />
            </div>
            <div class="form-field">
              <label class="form-label">名称</label>
              <input v-model="newName" class="input" placeholder="如 沪深300ETF" />
            </div>
            <div class="form-field">
              <label class="form-label">类型</label>
              <select v-model="newType" class="input">
                <option value="stock">股票</option>
                <option value="etf">ETF</option>
                <option value="fund">基金</option>
              </select>
            </div>
            <div class="form-field">
              <label class="form-label">市场</label>
              <select v-model="newMarket" class="input">
                <option :value="1">上海</option>
                <option :value="0">深圳</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-ghost" @click="manualMode = false; searchResults = []">返回搜索</button>
            <button class="btn btn-primary" @click="addInvestment" :disabled="!newCode || !newName">添加</button>
          </div>
        </template>

        <template v-else>
          <div class="form-actions">
            <button class="btn btn-ghost" @click="resetAddForm">取消</button>
            <button class="btn btn-primary" @click="addInvestment">去添加买入记录</button>
          </div>
        </template>
      </template>
    </div>

    <!-- 空状态 -->
    <div v-if="!store.investments.length && !showAddForm" class="empty-state">
      <div class="empty-state-icon">📭</div>
      <p class="empty-state-text">还没有投资记录</p>
      <p class="empty-state-hint">点击上方按钮添加你的第一个投资</p>
    </div>

    <template v-if="store.investments.length">
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
          <span>投入 {{ fmtMoney(summary.totalCost) }}</span>
          <span :class="profitClass(summary.profit)">
            {{ summary.profit >= 0 ? '+' : '' }}{{ fmtMoney(summary.profit) }}
          </span>
        </div>
      </div>

      <!-- 投资列表 -->
      <div class="invest-list">
        <div v-for="inv in store.investments" :key="inv.id" class="card inv-card">
          <!-- 卡片头部：点击展开 -->
          <div class="inv-card-header" @click="toggleExpand(inv.id)">
            <div class="inv-card-main">
              <div class="inv-card-name-row">
                <span class="inv-card-name">{{ inv.name }}</span>
                <span class="tag" :class="`tag-${inv.type}`">{{ typeLabel(inv.type) }}</span>
              </div>
              <div class="inv-card-meta">
                {{ inv.code }} · {{ marketLabel(inv.market) }} · {{ getTxCount(inv.id) }} 笔买入
              </div>
            </div>
            <div class="inv-card-right">
              <template v-if="results[inv.id]">
                <span class="inv-card-rate" :class="profitClass(results[inv.id]!.currentProfitRate)">
                  {{ fmtPct(results[inv.id]!.currentProfitRate) }}
                </span>
              </template>
              <span class="expand-arrow" :class="{ expanded: expandedInv === inv.id }">›</span>
            </div>
          </div>

          <!-- 展开区域 -->
          <div v-if="expandedInv === inv.id" class="inv-card-expand">
            <!-- 快捷操作 -->
            <div class="inv-expand-actions">
              <button class="btn btn-ghost btn-sm" @click="goDetail(inv.id)">📊 查看详情</button>
              <button class="icon-btn" @click="removeInvestment(inv.id)" title="删除">🗑</button>
            </div>

            <!-- 添加交易 -->
            <div v-if="activeTxForm !== inv.id" class="tx-add-row">
              <button class="btn btn-ghost btn-sm" @click="toggleTxForm(inv.id)">＋ 添加买入记录</button>
            </div>

            <div v-else class="tx-form">
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
              <div class="tx-form-actions">
                <button class="btn btn-ghost btn-sm" @click="activeTxForm = null">取消</button>
                <button class="btn btn-primary btn-sm" @click="addTransaction(inv.id)" :disabled="!txPrice || !txQuantity || !txDate">确认添加</button>
              </div>
            </div>

            <!-- 交易列表 -->
            <div class="tx-list-compact">
              <div v-for="tx in getTxList(inv.id)" :key="tx.id" class="tx-item-compact">
                <span class="tx-compact-date">{{ tx.date }}</span>
                <span class="tx-compact-price">{{ tx.price.toFixed(4) }}</span>
                <span class="tx-compact-qty">× {{ tx.quantity }}</span>
                <span class="tx-compact-total">{{ fmtMoney(tx.price * tx.quantity) }}</span>
                <button class="icon-btn-sm" @click="removeTransaction(tx.id)">✕</button>
              </div>
              <div v-if="!getTxCount(inv.id)" class="tx-empty">暂无买入记录</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.home { display: flex; flex-direction: column; gap: 16px; }

.page-header { display: flex; align-items: baseline; gap: 8px; }
.page-title { font-size: 24px; font-weight: 700; }
.page-subtitle { font-size: 14px; color: var(--color-text-muted); }

.add-btn { width: 100%; padding: 14px; font-size: 16px; border-radius: var(--radius-md); }

/* Add Form */
.add-form { display: flex; flex-direction: column; gap: 14px; }
.form-header { display: flex; justify-content: space-between; align-items: center; }
.close-btn { background: none; border: none; font-size: 18px; color: var(--color-text-muted); cursor: pointer; padding: 4px 8px; }
.search-row { display: flex; gap: 8px; }
.search-results { display: flex; flex-direction: column; border: 1px solid var(--color-border); border-radius: var(--radius-sm); overflow: hidden; max-height: 280px; overflow-y: auto; }
.search-result-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; border-bottom: 1px solid var(--color-border); transition: background 0.15s; }
.search-result-item:last-child { border-bottom: none; }
.search-result-item:hover { background: var(--color-bg); }
.search-result-name { font-weight: 500; flex: 1; }
.search-result-code { font-family: var(--font-mono); font-size: 13px; color: var(--color-text-muted); }
.search-empty, .search-hint { font-size: 13px; color: var(--color-text-muted); text-align: center; padding: 8px; }
.search-empty a, .search-hint a { color: var(--color-primary); text-decoration: none; }

.duplicate-notice { padding: 10px 14px; background: var(--color-warning-bg); color: var(--color-warning); border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 12px; color: var(--color-text-secondary); font-weight: 500; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; }

.empty-state-hint { font-size: 13px; color: var(--color-text-muted); margin-top: 4px; }

/* Summary */
.summary-card { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; border: none; }
.summary-row { display: flex; justify-content: space-between; align-items: center; }
.summary-main { display: flex; flex-direction: column; gap: 2px; }
.summary-label { font-size: 13px; opacity: 0.7; }
.summary-value { font-size: 26px; font-weight: 700; font-family: var(--font-mono); }
.summary-value.text-profit { color: #f87171; }
.summary-value.text-loss { color: #34d399; }
.summary-value.text-neutral { color: #fff; }
.summary-badge { padding: 6px 14px; border-radius: 99px; font-size: 15px; font-weight: 600; font-family: var(--font-mono); }
.summary-badge.tag-profit { background: rgba(248,113,113,0.15); color: #f87171; }
.summary-badge.tag-loss { background: rgba(52,211,153,0.15); color: #34d399; }
.summary-details { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 13px; opacity: 0.7; }
.summary-details .text-profit { color: #f87171; opacity: 1; }
.summary-details .text-loss { color: #34d399; opacity: 1; }

/* Invest Card */
.invest-list { display: flex; flex-direction: column; gap: 8px; }
.inv-card { padding: 0; overflow: hidden; }
.inv-card-header { display: flex; align-items: center; padding: 14px 16px; cursor: pointer; transition: background 0.15s; }
.inv-card-header:hover { background: var(--color-bg); }
.inv-card-main { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.inv-card-name-row { display: flex; align-items: center; gap: 8px; }
.inv-card-name { font-size: 15px; font-weight: 600; }
.inv-card-meta { font-size: 12px; color: var(--color-text-muted); font-family: var(--font-mono); }
.inv-card-right { display: flex; align-items: center; gap: 8px; }
.inv-card-rate { font-size: 15px; font-weight: 700; font-family: var(--font-mono); }
.expand-arrow { font-size: 20px; color: var(--color-text-muted); transition: transform 0.2s; }
.expand-arrow.expanded { transform: rotate(90deg); }

.inv-card-expand { border-top: 1px solid var(--color-border); padding: 12px 16px; }
.inv-expand-actions { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.icon-btn { background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px; opacity: 0.5; transition: opacity 0.15s; }
.icon-btn:hover { opacity: 1; }

.tx-add-row { margin-bottom: 10px; }
.btn-sm { padding: 6px 14px; font-size: 13px; }
.tx-form { margin-bottom: 12px; display: flex; flex-direction: column; gap: 10px; padding: 10px; background: var(--color-bg); border-radius: var(--radius-sm); }
.tx-form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.tx-form-actions { display: flex; justify-content: flex-end; gap: 8px; }

.tx-list-compact { display: flex; flex-direction: column; }
.tx-item-compact { display: flex; align-items: center; gap: 6px; padding: 8px 0; border-bottom: 1px solid var(--color-border); font-size: 13px; }
.tx-item-compact:last-child { border-bottom: none; }
.tx-compact-date { font-family: var(--font-mono); color: var(--color-text-secondary); width: 82px; flex-shrink: 0; }
.tx-compact-price { font-family: var(--font-mono); font-weight: 500; width: 72px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; }
.tx-compact-qty { color: var(--color-text-muted); width: 80px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tx-compact-total { flex: 1; text-align: right; font-family: var(--font-mono); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.icon-btn-sm { background: none; border: none; cursor: pointer; font-size: 14px; color: var(--color-text-muted); padding: 2px 4px; opacity: 0.5; }
.icon-btn-sm:hover { opacity: 1; color: var(--color-profit); }
.tx-empty { font-size: 13px; color: var(--color-text-muted); padding: 8px 0; }
</style>
