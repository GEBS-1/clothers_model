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
  
  // Список альтернативных Space'ов (пробуем по очереди)
  // Временно используем только OOTDiffusion, так как Kolors VTON имеет сильную блокировку
  const spaces = [
    'https://levihsu-ootdiffusion.hf.space'
    // 'https://kwai-kolors-kolors-virtual-try-on.hf.space' // Закомментировано - сильная блокировка
  ]
  
  // Для статических файлов (assets, CSS, JS) пробуем все Space'ы параллельно
  const isStaticFile = url.pathname.startsWith('/assets/') || 
                       url.pathname.endsWith('.js') || 
                       url.pathname.endsWith('.css') ||
                       url.pathname.endsWith('.png') ||
                       url.pathname.endsWith('.jpg') ||
                       url.pathname.endsWith('.svg') ||
                       url.pathname.endsWith('.woff') ||
                       url.pathname.endsWith('.woff2')
  
  let finalResponse = null
  
  // Пробуем каждый Space по очереди
  for (let i = 0; i < spaces.length; i++) {
    const targetBase = spaces[i]
    const targetUrl = `${targetBase}${url.pathname}${url.search}${url.hash}`
    
    console.log(`Trying Space ${i + 1}/${spaces.length}:`, targetBase, `Path: ${url.pathname}`)
  
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
      
      console.log(`Space ${i + 1} response status:`, response.status)
      
      // Если получили ошибку (4xx, 5xx), пробуем следующий Space
      if (response.status >= 400) {
        // Читаем тело ответа для диагностики
        const errorText = await response.text().catch(() => '')
        console.log(`Space ${i + 1} failed with status ${response.status}, error: ${errorText.substring(0, 200)}`)
        
        // Если это ошибка "Token and remote not found", Space недоступен
        if (errorText.includes('Token and remote not found') || errorText.includes('error')) {
          console.log(`Space ${i + 1} is unavailable (Token/remote error), trying next...`)
          if (i < spaces.length - 1) {
            continue // Пробуем следующий Space
          }
          // Если это последний Space, возвращаем понятную ошибку
          return new Response(JSON.stringify({
            error: 'Space Unavailable',
            message: 'Hugging Face Space is currently unavailable. Please try opening it directly in a new tab.',
            directUrl: spaces[i]
          }), {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          })
        }
        
        if (i < spaces.length - 1) {
          continue // Пробуем следующий Space
        }
        // Если это последний Space, все равно возвращаем ответ
      }
      
      // Для статических файлов сразу возвращаем, не проверяя дальше
      if (isStaticFile && response.status === 200) {
        console.log(`Static file found on Space ${i + 1}, returning immediately`)
        const body = await response.arrayBuffer()
        const newHeaders = new Headers(response.headers)
        newHeaders.delete('X-Frame-Options')
        newHeaders.delete('Content-Security-Policy')
        newHeaders.set('Access-Control-Allow-Origin', '*')
        newHeaders.set('Cache-Control', 'public, max-age=3600')
        return new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        })
      }
    
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
        if (i < spaces.length - 1) {
          console.log(`Space ${i + 1} returned empty HTML, trying next...`)
          continue
        }
        return new Response('Empty HTML response from target', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        })
      }
      
      // Удаляем мета-теги, которые блокируют встраивание
      html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '')
      html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
      
      // Удаляем frame-ancestors из CSP в script тегах
      html = html.replace(/frame-ancestors[^;]*;?/gi, '')
      
      // Заменяем абсолютные URL на относительные через прокси для всех Space'ов
      for (const space of spaces) {
        const spaceDomain = space.replace('https://', '').replace(/\./g, '\\.')
        html = html.replace(new RegExp(`href=["']https://${spaceDomain}/`, 'g'), 'href="/')
        html = html.replace(new RegExp(`src=["']https://${spaceDomain}/`, 'g'), 'src="/')
        html = html.replace(new RegExp(`https://${spaceDomain}/`, 'g'), '/')
      }
      
      finalResponse = new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      })
      break // Успешно получили HTML, выходим из цикла
    }
    
      // Для всех остальных файлов (CSS, JS, изображения, API) возвращаем как есть
      const body = await response.arrayBuffer()
      
      finalResponse = new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      })
      break // Успешно получили файл, выходим из цикла
      
    } catch (error) {
      console.error(`Error with Space ${i + 1}:`, error.message)
      // Если это не последний Space, пробуем следующий
      if (i < spaces.length - 1) {
        console.log(`Space ${i + 1} failed, trying next...`)
        continue
      }
      // Если это последний Space, возвращаем ошибку
      return new Response(`Proxy error: All spaces failed. Last error: ${error.message}\n\nStack: ${error.stack}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
  }
  
  // Если получили ответ, возвращаем его
  if (finalResponse) {
    return finalResponse
  }
  
  // Если дошли сюда, значит все Space'ы не сработали
  return new Response('All Hugging Face Spaces are unavailable', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' }
  })
}

