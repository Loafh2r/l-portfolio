// Cloudflare Pages Function: 代理新浪 K 线 API
// 路由: /sina/*
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  const path = url.pathname.replace(/^\/sina/, '')
  const targetUrl = `https://money.finance.sina.com.cn${path}${url.search}`

  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })

  const data = await response.text()
  return new Response(data, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
