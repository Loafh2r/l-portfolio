<script setup lang="ts">
import { ref } from 'vue'
import { usePortfolioStore } from '@/stores/portfolio'
import { fmtMoney, typeLabel, marketLabel } from '@/utils/format'

const store = usePortfolioStore()

// ===== 买入记录 =====
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

// ===== 导入导出 =====
const importText = ref('')
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

function handleExport() {
  const data = store.exportData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  showMessage('导出成功！', 'success')
}

function handleImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => { importText.value = ev.target?.result as string }
  reader.readAsText(file)
}

function handleImport() {
  try {
    const data = JSON.parse(importText.value)
    store.importData(data)
    importText.value = ''
    showMessage(`导入成功！${data.investments.length} 个产品`, 'success')
  } catch (e) {
    showMessage(`导入失败: ${(e as Error).message}`, 'error')
  }
}

function showMessage(msg: string, type: 'success' | 'error') {
  message.value = msg
  messageType.value = type
  setTimeout(() => { message.value = '' }, 3000)
}
</script>

<template>
  <div class="settings">
    <header class="page-header">
      <h1 class="page-title">管理</h1>
    </header>

    <!-- 消息提示 -->
    <div v-if="message" class="alert" :class="messageType === 'success' ? 'alert-success' : 'alert-error'">
      {{ message }}
    </div>

    <!-- 导入导出 -->
    <div class="card data-section">
      <h2 class="section-title">💾 数据管理</h2>
      <div class="data-actions">
        <button class="btn btn-ghost" @click="handleExport">📤 导出 JSON</button>
        <label class="btn btn-ghost import-label">
          📥 导入 JSON
          <input type="file" accept=".json" @change="handleImportFile" style="display:none" />
        </label>
      </div>
      <textarea v-if="importText" v-model="importText" class="input import-textarea" rows="4" placeholder="或粘贴 JSON..."></textarea>
      <button v-if="importText" class="btn btn-primary btn-sm" style="margin-top:8px" @click="handleImport">确认导入</button>
    </div>

    <div v-if="!store.investments.length" class="empty-state">
      <div class="empty-state-icon">🏦</div>
      <p class="empty-state-text">还没有投资产品</p>
      <p class="empty-state-hint">去「组合」页面添加你的第一个投资</p>
    </div>

    <!-- 投资列表 -->
    <div class="inv-section" v-if="store.investments.length">
      <h2 class="section-title">📂 我的投资 ({{ store.investments.length }})</h2>
      <div class="inv-list">
        <div v-for="inv in store.investments" :key="inv.id" class="card inv-card">
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
              <button class="icon-btn" @click.stop="removeInvestment(inv.id)" title="删除">🗑</button>
              <span class="expand-arrow" :class="{ expanded: expandedInv === inv.id }">›</span>
            </div>
          </div>

          <div v-if="expandedInv === inv.id" class="inv-card-expand">
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
    </div>
  </div>
</template>

<style scoped>
.settings { display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: baseline; }
.page-title { font-size: 24px; font-weight: 700; }
.empty-state-hint { font-size: 13px; color: var(--color-text-muted); margin-top: 4px; }

.inv-section { display: flex; flex-direction: column; gap: 8px; }
.inv-list { display: flex; flex-direction: column; gap: 8px; }
.inv-card { padding: 0; overflow: hidden; }
.inv-card-header { display: flex; align-items: center; padding: 14px 16px; cursor: pointer; transition: background 0.15s; }
.inv-card-header:hover { background: var(--color-bg); }
.inv-card-main { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.inv-card-name-row { display: flex; align-items: center; gap: 8px; }
.inv-card-name { font-size: 15px; font-weight: 600; }
.inv-card-meta { font-size: 12px; color: var(--color-text-muted); font-family: var(--font-mono); }
.inv-card-actions { display: flex; align-items: center; gap: 8px; }
.expand-arrow { font-size: 20px; color: var(--color-text-muted); transition: transform 0.2s; }
.expand-arrow.expanded { transform: rotate(90deg); }
.icon-btn { background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px; opacity: 0.5; transition: opacity 0.15s; }
.icon-btn:hover { opacity: 1; }

.inv-card-expand { border-top: 1px solid var(--color-border); padding: 12px 16px; }
.tx-add-row { margin-bottom: 10px; }
.btn-sm { padding: 6px 14px; font-size: 13px; }
.tx-form { margin-bottom: 12px; display: flex; flex-direction: column; gap: 10px; }
.tx-form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.tx-form-actions { display: flex; justify-content: flex-end; gap: 8px; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 12px; color: var(--color-text-secondary); font-weight: 500; }

.tx-list-compact { display: flex; flex-direction: column; }
.tx-item-compact { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--color-border); font-size: 13px; }
.tx-item-compact:last-child { border-bottom: none; }
.tx-compact-date { font-family: var(--font-mono); color: var(--color-text-secondary); min-width: 82px; }
.tx-compact-price { font-family: var(--font-mono); font-weight: 500; min-width: 60px; }
.tx-compact-qty { color: var(--color-text-muted); min-width: 60px; }
.tx-compact-total { flex: 1; text-align: right; font-family: var(--font-mono); font-weight: 500; }
.icon-btn-sm { background: none; border: none; cursor: pointer; font-size: 14px; color: var(--color-text-muted); padding: 2px 4px; opacity: 0.5; }
.icon-btn-sm:hover { opacity: 1; color: var(--color-profit); }
.tx-empty { font-size: 13px; color: var(--color-text-muted); padding: 8px 0; }

.data-section { display: flex; flex-direction: column; gap: 10px; }
.data-actions { display: flex; gap: 8px; }
.import-label { cursor: pointer; }
.import-textarea { font-family: 'Consolas', monospace; font-size: 12px; resize: vertical; }

.alert { padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; }
.alert-success { background: var(--color-loss-bg); color: var(--color-loss); }
.alert-error { background: var(--color-profit-bg); color: var(--color-profit); }
</style>
