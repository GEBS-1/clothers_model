// Smooth scroll to form
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Проверка загрузки iframe и fallback при ошибке
// Hugging Face блокирует встраивание через X-Frame-Options/CSP
window.addEventListener('load', () => {
  const iframe = document.getElementById('vton-iframe');
  const fallback = document.getElementById('iframe-fallback');
  const loading = document.getElementById('iframe-loading');
  const controls = document.getElementById('iframe-controls');
  const status = document.getElementById('space-status');
  const btnReload = document.getElementById('btn-reload');
  
  if (!iframe || !fallback || !loading || !controls || !status) {
    console.error('Не найдены необходимые элементы');
    return;
  }
  
  console.log('🔍 Начинаем проверку iframe...');
  console.log('📍 URL iframe:', iframe.src);
  console.log('ℹ️ Используем OOTDiffusion (levihsu-ootdiffusion.hf.space)');
  
  let isBlocked = false;
  let checkCount = 0;
  const maxChecks = 5;
  let loadTimeout;
  
  const hideLoading = () => {
    if (loading) {
      loading.style.display = 'none';
    }
  };
  
  const showControls = () => {
    if (controls) {
      controls.style.display = 'block';
    }
  };
  
  const showIframe = () => {
    if (iframe) {
      iframe.style.display = 'block';
    }
    hideLoading();
    showControls();
  };
  
  const showFallback = () => {
    if (fallback) {
      fallback.style.display = 'flex';
    }
    hideLoading();
    if (controls) {
      controls.style.display = 'none';
    }
  };
  
  const updateStatus = (text, className = '') => {
    if (status) {
      status.textContent = text;
      status.className = 'space-status ' + className;
    }
    // Также обновляем текст загрузки для большей ясности
    const loadingText = document.getElementById('loading-status-text');
    if (loadingText) {
      if (text.includes('Загрузка') || text.includes('Подключение')) {
        loadingText.textContent = text.replace(/[🔄✅❌]/g, '').trim();
      } else if (text.includes('загружена')) {
        loadingText.textContent = 'Готово!';
      } else if (text.includes('не удалось') || text.includes('недоступен')) {
        loadingText.textContent = 'Space недоступен';
      }
    }
  };
  
  const checkIframe = () => {
    checkCount++;
    
    // Проверяем, загрузился ли iframe по другим признакам
    // Не пытаемся читать document (это всегда SecurityError для cross-origin)
    
    // Проверяем, что iframe видим и имеет размеры
    const iframeRect = iframe.getBoundingClientRect();
    const isVisible = iframeRect.width > 0 && iframeRect.height > 0;
    
    // Если iframe видим, считаем что загрузился (даже если контент еще грузится)
    if (isVisible) {
      // Iframe загружен и видим
      if (!isBlocked) {
        console.log('✅ Iframe видим, считаем загруженным!');
        updateStatus('✅ Виртуальная примерка загружена', 'success');
        showIframe();
        return true;
      }
      return true;
    } else {
      // Еще загружается
      console.log(`⚠️ Iframe проверка ${checkCount}/${maxChecks}: загрузка... (visible: ${isVisible})`);
      updateStatus(`🔄 Загрузка ${checkCount}/${maxChecks}...`, '');
      
      if (checkCount >= maxChecks && !isBlocked) {
        console.log('❌ Iframe не загрузился за отведенное время, показываем fallback');
        updateStatus('❌ Не удалось загрузить', 'error');
        isBlocked = true;
        showFallback();
      }
      return false;
    }
  };
  
  // Кнопка перезагрузки
  if (btnReload) {
    btnReload.addEventListener('click', () => {
      console.log('🔄 Перезагрузка iframe...');
      isBlocked = false;
      checkCount = 0;
      if (iframe) {
        iframe.src = iframe.src; // Перезагружаем
      }
      if (loading) {
        loading.style.display = 'flex';
      }
      if (fallback) {
        fallback.style.display = 'none';
      }
      updateStatus('🔄 Перезагрузка...', '');
    });
  }
  
  // Проверяем сразу
  updateStatus('🔄 Подключение к виртуальной примерке...', '');
  
  // Показываем iframe сразу (он скрыт по умолчанию)
  iframe.style.display = 'block';
  
  // Проверяем каждые 1.5 секунды (быстрее)
  let checkInterval = setInterval(() => {
    if (checkIframe() || checkCount >= maxChecks) {
      clearInterval(checkInterval);
    }
  }, 1500);
  
  // Останавливаем проверку через 10 секунд (быстрее показываем fallback)
  setTimeout(() => {
    clearInterval(checkInterval);
    if (!isBlocked && checkCount < maxChecks) {
      // Финальная проверка - если iframe видим, считаем что загрузился
      const iframeRect = iframe.getBoundingClientRect();
      if (iframeRect.width > 0 && iframeRect.height > 0) {
        console.log('✅ Iframe видим, считаем загруженным');
        updateStatus('✅ Виртуальная примерка загружена', 'success');
        showIframe();
      } else {
        console.log('❌ Iframe не видим, показываем fallback');
        updateStatus('❌ Space недоступен или заблокирован', 'error');
        showFallback();
      }
    }
  }, 10000);
  
  // Также слушаем событие ошибки загрузки
  iframe.addEventListener('error', (e) => {
    console.log('❌ Iframe error event:', e);
    if (!isBlocked) {
      isBlocked = true;
      updateStatus('❌ Ошибка загрузки', 'error');
      showFallback();
    }
  });
  
  // Проверяем по событию load
  let loadEventFired = false;
  iframe.addEventListener('load', () => {
    console.log('📥 Iframe load event сработал');
    loadEventFired = true;
    clearTimeout(loadTimeout);
    // Даем время на полную загрузку контента
    setTimeout(() => {
      if (checkIframe()) {
        clearInterval(checkInterval);
      }
    }, 3000);
  });
  
  // Если load событие не сработало за 8 секунд, предупреждаем и показываем кнопки
  setTimeout(() => {
    if (!loadEventFired && !isBlocked) {
      console.log('⚠️ Iframe load event не сработал за 8 секунд');
      updateStatus('⚠️ Долгая загрузка... Попробуйте открыть напрямую', '');
      // Показываем кнопки управления раньше
      if (controls) {
        controls.style.display = 'block';
      }
    }
  }, 8000);
  
  // Проверяем доступность Space напрямую (для диагностики)
  fetch('https://levihsu-ootdiffusion.hf.space/', { method: 'HEAD', mode: 'no-cors' })
    .then(() => {
      console.log('✅ Space доступен напрямую');
    })
    .catch(() => {
      console.log('⚠️ Space может быть недоступен');
      updateStatus('⚠️ Space может быть недоступен', '');
    });
});

// Intersection Observer for fade-in animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
  const animateElements = document.querySelectorAll('.card, .stat, .demo-image, .chart-container');
  animateElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
  });

  // Показать поле "Другое" для тарифа
  const pricingSelect = document.getElementById('pricing');
  const pricingOtherGroup = document.getElementById('pricing-other-group');
  
  if (pricingSelect && pricingOtherGroup) {
    pricingSelect.addEventListener('change', () => {
      if (pricingSelect.value === 'Другое') {
        pricingOtherGroup.style.display = 'block';
      } else {
        pricingOtherGroup.style.display = 'none';
        const pricingOtherInput = document.getElementById('pricing-other');
        if (pricingOtherInput) {
          pricingOtherInput.value = '';
        }
      }
    });
  }
});

// Form submission
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) {
    console.warn('Form not found');
    return;
  }
  
  const messageDiv = document.getElementById('form-message');
  const submitBtn = form.querySelector('.btn-submit');
  const btnText = submitBtn?.querySelector('.btn-text');
  const btnLoading = submitBtn?.querySelector('.btn-loading');
  
  if (!submitBtn || !btnText || !btnLoading || !messageDiv) {
    console.warn('Form elements not found');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Disable button
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    messageDiv.style.display = 'none';
    
    // Get form data
    const pricingEl = document.getElementById('pricing');
    const pricingOtherEl = document.getElementById('pricing-other');
    const pricingOther = pricingOtherEl ? pricingOtherEl.value : '';
    const pricingValue = pricingEl && pricingEl.value === 'Другое' 
      ? `Другое: ${pricingOther || 'не указано'}` 
      : (pricingEl ? pricingEl.value : '');
    
    // Проверяем наличие всех обязательных полей
    const requiredFields = {
      name: document.getElementById('name'),
      phone: document.getElementById('phone'),
      returns: document.getElementById('returns'),
      questions: document.getElementById('questions'),
      solutionInterest: document.getElementById('solution-interest'),
      pilotReady: document.getElementById('pilot-ready'),
      pricing: pricingEl,
      pricingModel: document.getElementById('pricing-model'),
      currentSolution: document.getElementById('current-solution'),
      timeline: document.getElementById('timeline')
    };
    
    // Проверяем, что все обязательные поля заполнены
    for (const [key, field] of Object.entries(requiredFields)) {
      if (!field || !field.value) {
        messageDiv.className = 'form-message error';
        messageDiv.textContent = `❌ Пожалуйста, заполните все обязательные поля (${key})`;
        messageDiv.style.display = 'block';
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        return;
      }
    }
    
    const formData = {
      name: requiredFields.name.value,
      email: document.getElementById('email')?.value || 'Не указан',
      phone: requiredFields.phone.value,
      website: document.getElementById('website')?.value || 'Не указан',
      // Блок 1: Боль
      returns: requiredFields.returns.value,
      questions: requiredFields.questions.value,
      // Блок 2: Интерес
      solutionInterest: requiredFields.solutionInterest.value,
      pilotReady: requiredFields.pilotReady.value,
      // Блок 3: Деньги
      pricing: pricingValue,
      pricingModel: requiredFields.pricingModel.value,
      // Блок 4: Конкуренты и сроки
      currentSolution: requiredFields.currentSolution.value,
      timeline: requiredFields.timeline.value,
      timestamp: new Date().toLocaleString('ru-RU')
    };
    
    try {
      // Option 1: EmailJS (нужно настроить)
      // await sendViaEmailJS(formData);
      
      // Option 2: Telegram Bot (проще, бесплатно)
      await sendViaTelegram(formData);
      
      // Success
      messageDiv.className = 'form-message success';
      messageDiv.textContent = '✅ Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в ближайшее время.';
      messageDiv.style.display = 'block';
      form.reset();
      
      // Scroll to message
      messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
    } catch (error) {
      console.error('Form error:', error);
      messageDiv.className = 'form-message error';
      
      // Более понятное сообщение для пользователя
      let errorText = '❌ Ошибка отправки. Попробуйте ещё раз позже.';
      if (error.message.includes('chat not found') || error.message.includes('Chat ID')) {
        errorText = '❌ Ошибка настройки сервера. Свяжитесь с администратором.';
      }
      
      messageDiv.textContent = errorText;
      messageDiv.style.display = 'block';
    } finally {
      // Enable button
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
    }
  });
});

// Telegram Bot отправка (бесплатно, неограниченно)
async function sendViaTelegram(data) {
  // ⚠️ ЗАМЕНИТЕ на ваш Telegram Bot Token и Chat ID
  const BOT_TOKEN = '8279465582:AAHBjnR9zkWx6k8MA3bXpESeb17C__Rtdn4'; // Получить у @BotFather
  const CHAT_ID = '5814732025'; // Ваш Telegram ID (узнать у @userinfobot)
  
  if (BOT_TOKEN === 'YOUR_BOT_TOKEN' || CHAT_ID === 'YOUR_CHAT_ID') {
    throw new Error('Настройте Telegram Bot (см. инструкцию в README)');
  }
  
  const message = `
🎯 <b>Новая заявка с лендинга Virtual Try-On</b>

👤 <b>Контакты:</b>
Имя: ${data.name}
Email: ${data.email}
Телефон: ${data.phone}
Сайт: ${data.website}

📊 <b>Блок 1: Боль</b>
% возвратов: ${data.returns}
Вопросы клиентов: ${data.questions}

💡 <b>Блок 2: Интерес</b>
Интерес к решению: ${data.solutionInterest}
Готовность к пилоту: ${data.pilotReady}

💰 <b>Блок 3: Деньги</b>
Тариф: ${data.pricing}
Модель оплаты: ${data.pricingModel}

📅 <b>Блок 4: Сроки</b>
Используют сейчас: ${data.currentSolution}
Планируют внедрять: ${data.timeline}

🕐 <b>Время:</b> ${data.timestamp}
  `.trim();
  
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    })
  });
  
  if (!response.ok) {
    let errorData;
    let errorMessage;
    
    try {
      errorData = await response.json();
      errorMessage = `Telegram API error: ${JSON.stringify(errorData)}`;
      
      // Более понятные сообщения об ошибках
      if (errorData.error_code === 400 && errorData.description?.includes('chat not found')) {
        errorMessage = 'Ошибка: Chat ID не найден. Убедись, что:\n1. Chat ID правильный (проверь через @userinfobot)\n2. Ты написал боту /start (найди бота в Telegram и отправь команду)';
      } else if (errorData.error_code === 401) {
        errorMessage = 'Ошибка: Неверный токен бота. Проверь BOT_TOKEN в script.js';
      }
    } catch (e) {
      // Если ответ не JSON, используем текст ошибки
      const errorText = await response.text().catch(() => 'Unknown error');
      errorMessage = `Telegram API error: ${response.status} ${response.statusText} - ${errorText}`;
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}

// EmailJS отправка (альтернатива, если нужен email)
async function sendViaEmailJS(data) {
  // ⚠️ Нужно подключить EmailJS библиотеку и настроить
  // 1. Зарегистрируйтесь на https://www.emailjs.com/
  // 2. Создайте email template
  // 3. Получите Public Key, Service ID, Template ID
  // 4. Раскомментируйте скрипт в index.html
  
  if (typeof emailjs === 'undefined') {
    throw new Error('EmailJS не подключен. См. инструкцию в README');
  }
  
  const templateParams = {
    from_name: data.name,
    from_email: data.email,
    phone: data.phone,
    website: data.website,
    message: data.message,
    interest: data.interest,
    timestamp: data.timestamp
  };
  
  return emailjs.send(
    'YOUR_SERVICE_ID',  // Замените
    'YOUR_TEMPLATE_ID', // Замените
    templateParams,
    'YOUR_PUBLIC_KEY'   // Замените
  );
}

