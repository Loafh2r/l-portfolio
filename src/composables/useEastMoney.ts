import { jsonp } from '@/utils/jsonp'

// 判断是否开发环境（Vite 代理可用）
const isDev = import.meta.env.DEV

/**
 * 搜索金融产品
 * @param keyword - 搜索关键词（代码或名称）
 */
export async function searchProduct(keyword: string) {
  const url = isDev
    ? '/api/search/api'
    : 'https://searchadapter.eastmoney.com/api/search'

  const params = new URLSearchParams({
    type: 'all',
    keyword,
  })

  const fullUrl = `${url}?${params.toString()}`

  if (isDev) {
    const response = await fetch(fullUrl)
    return response.json()
  } else {
    return jsonp(fullUrl, 'cb')
  }
}
