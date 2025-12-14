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
  
  // Базовый URL Hugging Face Space
  const targetBase = 'https://kwai-kolors-kolors-virtual-try-on.hf.space'
  const targetUrl = `${targetBase}${url.pathname}${url.search}${url.hash}`
  
  // Логирование для отладки
  console.log('Proxying request to:', targetUrl)
  
  try {
    // Проксируем запрос к Hugging Face Space
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': request.headers.get('Accept') || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': request.headers.get('Accept-Language') || 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': targetBase + '/',
        'Origin': targetBase,
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'follow'
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
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
    console.log('Content-Type:', contentType)
    
    if (contentType.includes('text/html')) {
      let html = await response.text()
      console.log('HTML length:', html.length)
      
      if (!html || html.length === 0) {
        return new Response('Empty HTML response from target', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        })
      }
      
      // Удаляем мета-теги, которые блокируют встраивание
      html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '')
      html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
      
      // Заменяем абсолютные URL на относительные через прокси
      html = html.replace(/href=["']https:\/\/kwai-kolors-kolors-virtual-try-on\.hf\.space\//g, 'href="/')
      html = html.replace(/src=["']https:\/\/kwai-kolors-kolors-virtual-try-on\.hf\.space\//g, 'src="/')
      
      // Также заменяем в JavaScript коде
      html = html.replace(/https:\/\/kwai-kolors-kolors-virtual-try-on\.hf\.space\//g, '/')
      
      return new Response(html, {
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
    console.error('Error in handleRequest:', error)
    return new Response(`Proxy error: ${error.message}\n\nStack: ${error.stack}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

