/** 搜索结果项 */
export interface SearchResultItem {
  code: string
  name: string
  type: 'stock' | 'etf' | 'fund'
  market: number
}

/**
 * 搜索金融产品（通过代理，开发走 Vite proxy，生产走 Cloudflare Worker）
 */
export async function searchProduct(keyword: string): Promise<SearchResultItem[]> {
  const params = `input=${encodeURIComponent(keyword)}&type=14&count=20`
  const res = await fetch(`/api/search?${params}`)

  if (!res.ok) {
    throw new Error(`搜索请求失败: HTTP ${res.status}`)
  }

  const data = await res.json()
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
  if (/^(51|15|16)\d{4}$/.test(code)) return 'etf'
  if (name.includes('ETF') || typeName.includes('ETF')) return 'etf'
  if (typeName.includes('基金')) return 'fund'
  return 'stock'
}
