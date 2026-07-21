/**
 * JSONP 请求封装
 * 东方财富部分接口在生产环境不支持 CORS，但支持 JSONP
 * 开发环境用 Vite proxy，JSONP 作为生产环境的兜底方案
 */

export function jsonp<T = any>(url: string, callbackParam = 'cb'): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `__jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const separator = url.includes('?') ? '&' : '?'
    const fullUrl = `${url}${separator}${callbackParam}=${callbackName}`

    const script = document.createElement('script')
    script.src = fullUrl

    // 【关键改动】用 let 声明一个定时器变量，初始为 null
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    // 【关键改动】定义 cleanup，在里面直接判断 timeoutId 是否存在
    // 由于闭包，cleanup 始终能访问到外层的 timeoutId
    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script)
      delete (window as any)[callbackName]
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    // 挂载全局回调
    ;(window as any)[callbackName] = (data: T) => {
      cleanup()
      resolve(data)
    }

    script.onerror = () => {
      cleanup()
      reject(new Error(`JSONP request failed: ${url}`))
    }

    // 设置超时（30秒），把返回值赋给 timeoutId
    timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error(`JSONP request timeout: ${url}`))
    }, 30000)

    document.head.appendChild(script)
  })
}
