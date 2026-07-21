interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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

    // 其他请求交给静态资源
    return env.ASSETS.fetch(request)
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
    // 直接用 arrayBuffer 保持原始字节，避免编码转换问题
    const data = await response.arrayBuffer()
    return new Response(data, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json; charset=utf-8',
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
