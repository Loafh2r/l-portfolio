import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Investment, Transaction, ExportData } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export const usePortfolioStore = defineStore(
  'portfolio',
  () => {
    const investments = ref<Investment[]>([])
    const transactions = ref<Transaction[]>([])

    function getTransactions(investmentId: string) {
      return transactions.value.filter((t) => t.investmentId === investmentId)
    }

    function addInvestment(investment: Omit<Investment, 'id' | 'createdAt'>) {
      const newInvestment: Investment = {
        ...investment,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      }
      investments.value.push(newInvestment)
      return newInvestment
    }

    function removeInvestment(id: string) {
      investments.value = investments.value.filter((i) => i.id !== id)
      transactions.value = transactions.value.filter((t) => t.investmentId !== id)
    }

    function addTransaction(transaction: Omit<Transaction, 'id'>) {
      const newTransaction: Transaction = {
        ...transaction,
        id: uuidv4(),
      }
      transactions.value.push(newTransaction)
      return newTransaction
    }

    function removeTransaction(id: string) {
      transactions.value = transactions.value.filter((t) => t.id !== id)
    }

    function exportData(): ExportData {
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        investments: investments.value,
        transactions: transactions.value,
      }
    }

    function importData(data: ExportData) {
      if (data.version !== 1) throw new Error(`不支持的数据版本: ${data.version}`)

      // 旧 ID → 新 ID 映射
      const idMap = new Map<string, string>()
      let addedInv = 0
      let addedTx = 0

      for (const inv of data.investments) {
        // 按代码查找是否已存在
        const existing = investments.value.find((i) => i.code === inv.code)
        if (existing) {
          // 已存在：映射旧 ID → 现有 ID
          idMap.set(inv.id, existing.id)
        } else {
          // 不存在：新建投资
          const newInv = addInvestment({
            code: inv.code,
            name: inv.name,
            type: inv.type,
            market: inv.market,
          })
          idMap.set(inv.id, newInv.id)
          addedInv++
        }
      }

      for (const tx of data.transactions) {
        const mappedInvId = idMap.get(tx.investmentId)
        if (!mappedInvId) continue

        // 检查是否重复（同投资、同日期、同价格、同份额）
        const isDuplicate = transactions.value.some(
          (t) =>
            t.investmentId === mappedInvId &&
            t.date === tx.date &&
            t.price === tx.price &&
            t.quantity === tx.quantity,
        )

        if (!isDuplicate) {
          addTransaction({
            investmentId: mappedInvId,
            price: tx.price,
            quantity: tx.quantity,
            date: tx.date,
          })
          addedTx++
        }
      }

      return { addedInv, addedTx }
    }

    function clearAll() {
      investments.value = []
      transactions.value = []
    }

    return {
      investments,
      transactions,
      getTransactions,
      addInvestment,
      removeInvestment,
      addTransaction,
      removeTransaction,
      exportData,
      importData,
      clearAll,
    }
  },
  {
    persist: true,
  },
)
