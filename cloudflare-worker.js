// Cloudflare Worker для проксирования Hugging Face Space
// Размести этот код в Cloudflare Workers (бесплатно)
// 
// ИНСТРУКЦИЯ:
// 1. Зарегистрируйся на https://dash.cloudflare.com (бесплатно)
// 2. Создай новый Worker
// 3. Вставь этот код
// 4. Сохрани и разверни
// 5. Скопируй URL Worker (типа: your-worker.workers.dev)
// 6. Замени URL в index.html на этот прокси URL

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Базовый URL Hugging Face Space
  const targetBase = 'https://kwai-kolors-kolors-virtual-try-on.hf.space'
  const targetUrl = `${targetBase}${url.pathname}${url.search}${url.hash}`
  
  try {
    // Проксируем запрос к Hugging Face Space
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
        'Accept': request.headers.get('Accept') || '*/*',
        'Accept-Language': request.headers.get('Accept-Language') || 'en-US,en;q=0.9',
        'Referer': targetBase + '/',
        'Origin': targetBase
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null
    })
    
    // Создаем новые заголовки
    const newHeaders = new Headers()
    
    // Копируем все заголовки из ответа
    for (const [key, value] of response.headers.entries()) {
      // Пропускаем заголовки, которые блокируют встраивание
      if (key.toLowerCase() === 'x-frame-options' || 
          key.toLowerCase() === 'content-security-policy' ||
          key.toLowerCase() === 'frame-ancestors') {
        continue
      }
      newHeaders.set(key, value)
    }
    
    // Добавляем заголовки, разрешающие встраивание
    newHeaders.set('X-Frame-Options', 'ALLOWALL')
    newHeaders.set('Content-Security-Policy', "frame-ancestors *;")
    newHeaders.set('Access-Control-Allow-Origin', '*')
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD')
    newHeaders.set('Access-Control-Allow-Headers', '*')
    newHeaders.set('Access-Control-Allow-Credentials', 'true')
    
    // Если это HTML, модифицируем его
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/html')) {
      let html = await response.text()
      
      // Удаляем мета-теги, которые блокируют встраивание
      html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '')
      html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
      
      // Заменяем абсолютные URL на относительные через прокси
      html = html.replace(/href=["']https:\/\/kwai-kolors-kolors-virtual-try-on\.hf\.space\//g, 'href="/')
      html = html.replace(/src=["']https:\/\/kwai-kolors-kolors-virtual-try-on\.hf\.space\//g, 'src="/')
      
      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      })
    }
    
    // Для всех остальных файлов (CSS, JS, изображения, API) возвращаем как есть
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    })
    
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

