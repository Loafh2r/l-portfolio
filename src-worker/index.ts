export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // 代理: 东方财富搜索
    if (url.pathname === '/api/search') {
      return proxyFetch(
        `https://searchapi.eastmoney.com/api/suggest/get${url.search}`,
      )
    }

    // 代理: 新浪 K 线
    if (url.pathname.startsWith('/sina/')) {
      const path = url.pathname.replace(/^\/sina/, '')
      return proxyFetch(
        `https://money.finance.sina.com.cn${path}${url.search}`,
      )
    }

    // 其他请求由 assets 处理（静态文件）
    return new Response(null, { status: 404 })
  },
}

async function proxyFetch(targetUrl: string): Promise<Response> {
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    const data = await response.text()
    return new Response(data, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
