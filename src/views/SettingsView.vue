<script setup lang="ts">
import { ref } from 'vue'
import { usePortfolioStore } from '@/stores/portfolio'
import { searchProduct } from '@/composables/useEastMoney'

const store = usePortfolioStore()

// ===== 添加投资 =====
const showAddForm = ref(false)
const searchKeyword = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)

// 手动填写
const manualMode = ref(false)
const newCode = ref('')
const newName = ref('')
const newType = ref<'stock' | 'etf' | 'fund'>('etf')
const newMarket = ref(1) // 1=上海

// 搜索
async function handleSearch() {
  if (!searchKeyword.value.trim()) return
  isSearching.value = true
  try {
    const res = await searchProduct(searchKeyword.value.trim())
    // 东方财富返回格式处理
    if (res?.result?.length) {
      searchResults.value = res.result.map((item: any) => ({
        code: item.code || item.Code,
        name: item.name || item.Name,
        type: guessType(item.type || item.securityTypeName || ''),
        market: guessMarket(item.code || item.Code, item.market || item.Market),
      }))
    } else if (Array.isArray(res)) {
      searchResults.value = res.map((item: any) => ({
        code: item.code || item.Code,
        name: item.name || item.Name,
        type: guessType(item.type || ''),
        market: guessMarket(item.code || item.Code, item.market || ''),
      }))
    } else {
      searchResults.value = []
    }
  } catch (e) {
    console.error('搜索失败:', e)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

function guessType(raw: string): 'stock' | 'etf' | 'fund' {
  const s = raw.toLowerCase()
  if (s.includes('etf')) return 'etf'
  if (s.includes('基金') || s.includes('fund')) return 'fund'
  return 'stock'
}

function guessMarket(code: string, raw?: any): number {
  if (raw === 1 || raw === '1') return 1
  if (raw === 0 || raw === '0') return 0
  // 通过代码推断
  if (code?.startsWith('6') || code?.startsWith('5')) return 1 // 上海
  return 0 // 深圳
}

function selectSearchResult(item: any) {
  newCode.value = item.code
  newName.value = item.name
  newType.value = item.type
  newMarket.value = item.market
  searchResults.value = []
  searchKeyword.value = ''
  manualMode.value = true
}

function addInvestment() {
  if (!newCode.value || !newName.value) return

  store.addInvestment({
    code: newCode.value,
    name: newName.value,
    type: newType.value,
    market: newMarket.value,
  })

  // 重置
  newCode.value = ''
  newName.value = ''
  newType.value = 'etf'
  newMarket.value = 1
  showAddForm.value = false
  manualMode.value = false
}

function removeInvestment(id: string) {
  if (confirm('确定删除该投资及其所有买入记录？')) {
    store.removeInvestment(id)
  }
}

// ===== 添加买入记录 =====
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

  store.addTransaction({
    investmentId: invId,
    price,
    quantity,
    date: txDate.value,
  })

  // 重置
  txPrice.value = ''
  txQuantity.value = ''
  activeTxForm.value = null
}

function removeTransaction(txId: string) {
  store.removeTransaction(txId)
}

// 展开/收起交易列表
const expandedInv = ref<string | null>(null)
function toggleExpand(invId: string) {
  expandedInv.value = expandedInv.value === invId ? null : invId
}

function getTxCount(invId: string): number {
  return store.getTransactions(invId).length
}

function getTxList(invId: string) {
  return store.getTransactions(invId).sort((a, b) => b.date.localeCompare(a.date))
}

function fmtMoney(v: number): string {
  return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { stock: '股票', etf: 'ETF', fund: '基金' }
  return map[type] || type
}

function marketLabel(market: number): string {
  return market === 1 ? '上海' : '深圳'
}
</script>

<template>
  <div class="settings">
    <header class="page-header">
      <h1 class="page-title">设置</h1>
    </header>

    <!-- 添加投资按钮 -->
    <button
      v-if="!showAddForm"
      class="btn btn-primary add-btn"
      @click="showAddForm = true"
    >
      ＋ 添加投资
    </button>

    <!-- 添加投资表单 -->
    <div v-if="showAddForm" class="card add-form">
      <div class="form-header">
        <h2 class="section-title">添加投资</h2>
        <button class="close-btn" @click="showAddForm = false; manualMode = false; searchResults = []">✕</button>
      </div>

      <!-- 搜索模式 -->
      <template v-if="!manualMode">
        <div class="search-row">
          <input
            v-model="searchKeyword"
            class="input"
            placeholder="输入代码或名称搜索…"
            @keyup.enter="handleSearch"
          />
          <button class="btn btn-ghost" @click="handleSearch" :disabled="isSearching">
            {{ isSearching ? '…' : '搜索' }}
          </button>
        </div>

        <!-- 搜索结果 -->
        <div v-if="searchResults.length" class="search-results">
          <div
            v-for="(item, idx) in searchResults.slice(0, 8)"
            :key="idx"
            class="search-result-item"
            @click="selectSearchResult(item)"
          >
            <span class="search-result-name">{{ item.name }}</span>
            <span class="search-result-code">{{ item.code }}</span>
            <span class="tag" :class="`tag-${item.type}`">{{ typeLabel(item.type) }}</span>
          </div>
        </div>

        <div v-if="searchKeyword && !searchResults.length && !isSearching" class="search-empty">
          未找到结果，
          <a href="#" @click.prevent="manualMode = true">手动输入</a>
        </div>

        <div v-if="!searchKeyword" class="search-hint">
          <a href="#" @click.prevent="manualMode = true">或者手动输入代码</a>
        </div>
      </template>

      <!-- 手动输入模式 -->
      <template v-else>
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
          <button class="btn btn-primary" @click="addInvestment" :disabled="!newCode || !newName">
            添加
          </button>
        </div>
      </template>
    </div>

    <!-- 投资列表 -->
    <div class="inv-section" v-if="store.investments.length">
      <h2 class="section-title">📂 我的投资 ({{ store.investments.length }})</h2>

      <div class="inv-list">
        <div v-for="inv in store.investments" :key="inv.id" class="card inv-card">
          <!-- 投资信息行 -->
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
            <div class="inv-card-actions">
              <button class="icon-btn danger" @click.stop="removeInvestment(inv.id)" title="删除投资">
                🗑
              </button>
              <span class="expand-arrow" :class="{ expanded: expandedInv === inv.id }">›</span>
            </div>
          </div>

          <!-- 展开的交易区域 -->
          <div v-if="expandedInv === inv.id" class="inv-card-expand">
            <!-- 添加交易按钮/表单 -->
            <div v-if="activeTxForm !== inv.id" class="tx-add-row">
              <button class="btn btn-ghost btn-sm" @click="toggleTxForm(inv.id)">
                ＋ 添加买入记录
              </button>
            </div>

            <div v-else class="tx-form">
              <div class="tx-form-grid">
                <div class="form-field">
                  <label class="form-label">买入价格</label>
                  <input v-model="txPrice" class="input" type="number" step="0.001" placeholder="0.000" />
                </div>
                <div class="form-field">
                  <label class="form-label">买入份额</label>
                  <input v-model="txQuantity" class="input" type="number" step="1" placeholder="0" />
                </div>
                <div class="form-field">
                  <label class="form-label">买入日期</label>
                  <input v-model="txDate" class="input" type="date" />
                </div>
              </div>
              <div class="tx-form-actions">
                <button class="btn btn-ghost btn-sm" @click="activeTxForm = null">取消</button>
                <button
                  class="btn btn-primary btn-sm"
                  @click="addTransaction(inv.id)"
                  :disabled="!txPrice || !txQuantity || !txDate"
                >
                  确认添加
                </button>
              </div>
            </div>

            <!-- 交易列表 -->
            <div class="tx-list-compact">
              <div
                v-for="tx in getTxList(inv.id)"
                :key="tx.id"
                class="tx-item-compact"
              >
                <span class="tx-compact-date">{{ tx.date }}</span>
                <span class="tx-compact-price">{{ tx.price.toFixed(4) }}</span>
                <span class="tx-compact-qty">× {{ tx.quantity }}</span>
                <span class="tx-compact-total">{{ fmtMoney(tx.price * tx.quantity) }}</span>
                <button class="icon-btn-sm danger" @click="removeTransaction(tx.id)">✕</button>
              </div>
              <div v-if="!getTxCount(inv.id)" class="tx-empty">暂无买入记录</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!store.investments.length && !showAddForm" class="empty-state">
      <div class="empty-state-icon">🏦</div>
      <p class="empty-state-text">还没有投资产品</p>
      <p class="empty-state-hint">点击上方按钮添加你的第一个投资</p>
    </div>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: baseline;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
}

/* Add button */
.add-btn {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  border-radius: var(--radius-md);
}

/* Add Form */
.add-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-header .section-title {
  margin-bottom: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px 8px;
}

.search-row {
  display: flex;
  gap: 8px;
}

.search-results {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  max-height: 280px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
  transition: background 0.15s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: var(--color-bg);
}

.search-result-name {
  font-weight: 500;
  flex: 1;
}

.search-result-code {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-text-muted);
}

.search-empty,
.search-hint {
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
  padding: 8px;
}

.search-empty a,
.search-hint a {
  color: var(--color-primary);
  text-decoration: none;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Investment List */
.inv-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inv-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inv-card {
  padding: 0;
  overflow: hidden;
}

.inv-card-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.inv-card-header:hover {
  background: var(--color-bg);
}

.inv-card-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inv-card-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inv-card-name {
  font-size: 15px;
  font-weight: 600;
}

.inv-card-meta {
  font-size: 12px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.inv-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-arrow {
  font-size: 20px;
  color: var(--color-text-muted);
  transition: transform 0.2s;
}

.expand-arrow.expanded {
  transform: rotate(90deg);
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.icon-btn:hover {
  opacity: 1;
}

/* Expanded area */
.inv-card-expand {
  border-top: 1px solid var(--color-border);
  padding: 12px 16px;
}

.tx-add-row {
  margin-bottom: 10px;
}

.btn-sm {
  padding: 6px 14px;
  font-size: 13px;
}

.tx-form {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tx-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.tx-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Transaction list compact */
.tx-list-compact {
  display: flex;
  flex-direction: column;
}

.tx-item-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 13px;
}

.tx-item-compact:last-child {
  border-bottom: none;
}

.tx-compact-date {
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
  min-width: 82px;
}

.tx-compact-price {
  font-family: var(--font-mono);
  font-weight: 500;
  min-width: 60px;
}

.tx-compact-qty {
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  min-width: 60px;
}

.tx-compact-total {
  font-family: var(--font-mono);
  font-weight: 600;
  flex: 1;
  text-align: right;
}

.icon-btn-sm {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-muted);
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}

.icon-btn-sm:hover {
  color: var(--color-loss);
  background: var(--color-loss-bg);
}

.tx-empty {
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
  padding: 16px 0;
}

.empty-state-hint {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 4px;
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
