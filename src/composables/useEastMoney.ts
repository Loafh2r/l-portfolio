import { jsonp } from '@/utils/jsonp'

const isDev = import.meta.env.DEV

/** 搜索结果项 */
export interface SearchResultItem {
  code: string
  name: string
  type: 'stock' | 'etf' | 'fund'
  market: number
}

/**
 * 搜索金融产品（东方财富 suggest API）
 */
export async function searchProduct(keyword: string): Promise<SearchResultItem[]> {
  const params = `input=${encodeURIComponent(keyword)}&type=14&count=20`

  let data: any

  if (isDev) {
    const res = await fetch(`/api/search?${params}`)
    data = await res.json()
  } else {
    data = await jsonp(
      `https://searchapi.eastmoney.com/api/suggest/get?${params}&cb=cb`,
      'cb',
    )
  }

  const list = data?.QuotationCodeTable?.Data
  if (!Array.isArray(list)) return []

  return list.map((item: any) => ({
    code: item.Code,
    name: item.Name,
    type: mapProductType(item.SecurityTypeName ?? '', item.Name ?? '', item.Code ?? ''),
    market: parseInt(item.MktNum) || 0,
  }))
}

function mapProductType(typeName: string, name: string, code: string): 'stock' | 'etf' | 'fund' {
  // 场内 ETF 代码特征优先
  if (/^(51|15|16)\d{4}$/.test(code)) return 'etf'
  if (name.includes('ETF') || typeName.includes('ETF')) return 'etf'
  if (typeName.includes('基金')) return 'fund'
  return 'stock'
}
