# План интеграции OOTDiffusion

## Вариант 1: Использовать готовый Hugging Face Space (рекомендуется)

### Шаги:
1. Найти публичный Space с OOTDiffusion на Hugging Face
2. Проверить, что API доступен (`api_open=True`)
3. Обновить `SPACE_BASE` в `script.js` на URL найденного Space
4. Проверить формат API (может отличаться от Kolors)

### Изменения в коде:
- Минимальные: только URL в `script.js`
- Возможно: адаптация формата запроса под OOTDiffusion API

---

## Вариант 2: Создать свой Space с OOTDiffusion

### Шаги:
1. Клонировать репозиторий OOTDiffusion
2. Создать `app.py` с Gradio интерфейсом
3. Загрузить на Hugging Face Space
4. Включить API (`api_open=True`)
5. Подключить наш wrapper

### Структура app.py для OOTDiffusion:
```python
import gradio as gr
from run.run_ootd import process_images

def tryon(person_img, garment_img, scale=2.0, sample=4):
    # Вызов OOTDiffusion inference
    result = process_images(
        model_path=person_img,
        cloth_path=garment_img,
        scale=scale,
        sample=sample
    )
    return result

with gr.Blocks() as demo:
    person = gr.Image(label="Person image", type="numpy")
    garment = gr.Image(label="Garment image", type="numpy")
    output = gr.Image(label="Result")
    
    btn = gr.Button("Try On")
    btn.click(fn=tryon, inputs=[person, garment], outputs=output)

demo.queue(api_open=True).launch()
```

---

## Вариант 3: Локальный запуск + API сервер

### Шаги:
1. Установить OOTDiffusion локально
2. Создать простой Flask/FastAPI сервер
3. Подключить наш wrapper к локальному серверу

### Преимущества:
- Полный контроль
- Не зависит от Hugging Face
- Можно деплоить на свой сервер

---

## Текущий статус

✅ Wrapper готов к работе
⏳ Нужно найти/создать Space с OOTDiffusion
⏳ Адаптировать формат запроса (если отличается)

## Следующие шаги

1. Проверить, есть ли готовый Space с OOTDiffusion
2. Если нет - создать свой Space или запустить локально
3. Адаптировать wrapper под формат API OOTDiffusion

