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
      investments.value = data.investments
      transactions.value = data.transactions
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
