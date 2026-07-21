import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Investment, Transaction } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export const usePortfolioStore = defineStore('portfolio', () => {
  // 状态
  const investments = ref<Investment[]>([])
  const transactions = ref<Transaction[]>([])

  // 根据投资 ID 获取买入记录
  function getTransactions(investmentId: string) {
    return transactions.value.filter((t) => t.investmentId === investmentId)
  }

  // 添加投资 从用户在网页中输入的结果中，抽取需要的变量赋值到新的Investment变量中
  function addInvestment(investment: Omit<Investment, 'id' | 'createdAt'>) {
    const newInvestment: Investment = {
      ...investment,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    }
    investments.value.push(newInvestment)
    return newInvestment
  }

  // 删除投资
  function removeInvestment(id: string) {
    investments.value = investments.value.filter((i) => i.id !== id)
    transactions.value = transactions.value.filter((t) => t.investmentId !== id)
  }

  // 添加买入记录
  function addTransaction(transaction: Omit<Transaction, 'id'>) {
    const newTransaction: Transaction = {
      ...transaction,
      id: uuidv4(),
    }
    transactions.value.push(newTransaction)
    return newTransaction
  }

  // 删除买入记录
  function removeTransaction(id: string) {
    transactions.value = transactions.value.filter((t) => t.id !== id)
  }

  return {
    investments,
    transactions,
    getTransactions,
    addInvestment,
    removeInvestment,
    addTransaction,
    removeTransaction,
  }
})
