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

// Iframe больше не используется - заменен на карточку с кнопкой
// из-за X-Frame-Options / CSP блокировки со стороны Hugging Face

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
  
  pricingSelect.addEventListener('change', () => {
    if (pricingSelect.value === 'Другое') {
      pricingOtherGroup.style.display = 'block';
    } else {
      pricingOtherGroup.style.display = 'none';
      document.getElementById('pricing-other').value = '';
    }
  });
});

// Form submission
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const messageDiv = document.getElementById('form-message');
  const submitBtn = form.querySelector('.btn-submit');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Disable button
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    messageDiv.style.display = 'none';
    
    // Get form data
    const pricingOther = document.getElementById('pricing-other').value;
    const pricingValue = document.getElementById('pricing').value === 'Другое' 
      ? `Другое: ${pricingOther || 'не указано'}` 
      : document.getElementById('pricing').value;
    
    const formData = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value || 'Не указан',
      phone: document.getElementById('phone').value,
      website: document.getElementById('website').value || 'Не указан',
      // Блок 1: Боль
      returns: document.getElementById('returns').value,
      questions: document.getElementById('questions').value,
      // Блок 2: Интерес
      solutionInterest: document.getElementById('solution-interest').value,
      pilotReady: document.getElementById('pilot-ready').value,
      // Блок 3: Деньги
      pricing: pricingValue,
      pricingModel: document.getElementById('pricing-model').value,
      // Блок 4: Конкуренты и сроки
      currentSolution: document.getElementById('current-solution').value,
      timeline: document.getElementById('timeline').value,
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
    const errorData = await response.json();
    let errorMessage = `Telegram API error: ${JSON.stringify(errorData)}`;
    
    // Более понятные сообщения об ошибках
    if (errorData.error_code === 400 && errorData.description?.includes('chat not found')) {
      errorMessage = 'Ошибка: Chat ID не найден. Убедись, что:\n1. Chat ID правильный (проверь через @userinfobot)\n2. Ты написал боту /start (найди бота в Telegram и отправь команду)';
    } else if (errorData.error_code === 401) {
      errorMessage = 'Ошибка: Неверный токен бота. Проверь BOT_TOKEN в script.js';
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

