// Cloudflare Worker для проксирования Hugging Face Space
// ES Modules формат (требуется для Cloudflare Workers)
export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request)
    } catch (error) {
      return new Response(`Worker error: ${error.message}\n\nStack: ${error.stack}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
  }
}

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Используем Kolors VTON Space
  const targetBase = 'https://kwai-kolors-kolors-virtual-try-on.hf.space'
  // const targetBase = 'https://levihsu-ootdiffusion.hf.space' // Закомментировано
  const targetUrl = `${targetBase}${url.pathname}${url.search}${url.hash}`
  
  console.log(`Proxying to: ${targetUrl}`)
  
  try {
    // Проксируем запрос к Hugging Face Space
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': request.headers.get('Accept') || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': request.headers.get('Accept-Language') || 'en-US,en;q=0.9',
        'Referer': targetBase + '/',
        'Origin': targetBase
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'follow'
    })
    
    console.log(`Response status: ${response.status}`)
    
    // Создаем новые заголовки
    const newHeaders = new Headers()
    
    // Копируем все заголовки из ответа, кроме блокирующих
    for (const [key, value] of response.headers.entries()) {
      const lowerKey = key.toLowerCase()
      if (lowerKey !== 'x-frame-options' && 
          lowerKey !== 'content-security-policy' &&
          lowerKey !== 'frame-ancestors') {
        newHeaders.set(key, value)
      }
    }
    
    // Добавляем заголовки, разрешающие встраивание
    newHeaders.set('X-Frame-Options', 'ALLOWALL')
    newHeaders.set('Content-Security-Policy', "frame-ancestors *;")
    newHeaders.set('Access-Control-Allow-Origin', '*')
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD')
    newHeaders.set('Access-Control-Allow-Headers', '*')
    
    // Проверяем тип контента
    const contentType = response.headers.get('content-type') || ''
    
    // Если это HTML, модифицируем его
    if (contentType.includes('text/html')) {
      const html = await response.text()
      
      if (!html || html.length === 0) {
        return new Response('Empty HTML response', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        })
      }
      
      // Удаляем мета-теги, которые блокируют встраивание
      let modifiedHtml = html
        .replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '')
        .replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
        .replace(/frame-ancestors[^;]*;?/gi, '')
      
      // Заменяем абсолютные URL на относительные через прокси
      const spaceDomain = targetBase.replace('https://', '').replace(/\./g, '\\.')
      modifiedHtml = modifiedHtml
        .replace(new RegExp(`href=["']https://${spaceDomain}/`, 'g'), 'href="/')
        .replace(new RegExp(`src=["']https://${spaceDomain}/`, 'g'), 'src="/')
        .replace(new RegExp(`https://${spaceDomain}/`, 'g'), '/')
      
      return new Response(modifiedHtml, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      })
    }
    
    // Для всех остальных файлов (CSS, JS, изображения, API) возвращаем как есть
    const body = await response.arrayBuffer()
    
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    })
    
  } catch (error) {
    console.error('Proxy error:', error.message)
    return new Response(`Proxy error: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
