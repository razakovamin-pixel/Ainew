// CORS (Cross-Origin Resource Sharing) — это настройки безопасности. 
// Они разрешают твоему сайту свободно общаться с сервером Cloudflare с любого устройства.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Обработка OPTIONS-запросов. Браузеры всегда сначала отправляют такой пустой запрос, 
    // чтобы проверить разрешения безопасности (CORS). Мы сразу одобряем его.
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 2. Универсальный прокси-маршрут по твоему ТЗ
    if (url.pathname === "/proxy" && request.method === "POST") {
      return await handleProxyRequest(request);
    }

    // 3. Автоматический перехват старых запросов от твоего index.html
    if (url.pathname === "/api/v1/messages" && request.method === "POST") {
      return await handleIndexApiRequest(request);
    }

    // 4. Если это обычный запрос (открытие сайта, загрузка файлов .json), 
    // отдаем файлы из папки public через системную привязку ASSETS
    try {
      return await env.ASSETS.fetch(request);
    } catch (assetsError) {
      return new Response("Файл не найден на сервере", { status: 404 });
    }
  },
};

// Функция для универсального прокси (/proxy)
async function handleProxyRequest(request) {
  try {
    const requestData = await request.json();
    let targetUrl = requestData.target_url;
    
    // Если адрес назначения не передан, направляем по умолчанию на SmartAPI
    if (!targetUrl || targetUrl.startsWith("/")) {
      const cleanPath = targetUrl ? targetUrl : "/chat/completions";
      targetUrl = `https://smartapi.shop/backend/v1${cleanPath}`;
    }

    const method = requestData.method || "POST";
    const incomingHeaders = requestData.headers || {};
    
    const headers = new Headers();
    for (const [key, value] of Object.entries(incomingHeaders)) {
      headers.set(key, value);
    }
    
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    let bodyStr = null;
    if (requestData.body) {
      let parsedBody = typeof requestData.body === "string" ? JSON.parse(requestData.body) : requestData.body;
      
      // Если запрос идет к SmartAPI и модель пустая — ставим дефолтную deepseek-v4-flash
      if (targetUrl.includes("smartapi.shop") && !parsedBody.model) {
        parsedBody.model = "deepseek-v4-flash";
      }
      
      // ВЫКЛЮЧАЕМ СТРИМИНГ ЖЕСТКО
      parsedBody.stream = false;
      
      bodyStr = JSON.stringify(parsedBody);
    }

    const response = await fetch(targetUrl, {
      method: method,
      headers: headers,
      body: bodyStr,
    });

    const responseBody = await response.text();
    const responseHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }
    // Удаляем заголовок сжатия, чтобы Cloudflare сам заново оптимизировал текст без ошибок
    responseHeaders.delete("content-encoding");

    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
}

// Функция для незаметной поддержки текущего index.html (/api/v1/messages)
async function handleIndexApiRequest(request) {
  try {
    const bodyText = await request.text();
    let parsedBody = JSON.parse(bodyText);

    // ВЫКЛЮЧАЕМ СТРИМИНГ ЖЕСТКО ДЛЯ СТАРОГО ИНТЕРФЕЙСА
    parsedBody.stream = false;

    // Перенаправляем на официальный шлюз SmartAPI для обработки структуры сообщений
    const targetUrl = "https://smartapi.shop/backend/v1/messages";

    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
      // Пропускаем служебные заголовки самой платформы Cloudflare, чтобы не путать SmartAPI
      if (!["host", "cf-connecting-ip", "cf-ray", "x-forwarded-for"].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    }

    // Берем секретный ключ, который отправляет твой сайт
    const xApiKey = request.headers.get("x-api-key");
    if (xApiKey && !headers.has("authorization")) {
      // Дублируем его стандартным методом Bearer на случай жестких проверок в SmartAPI
      headers.set("authorization", `Bearer ${xApiKey}`);
    }

    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(parsedBody),
    });

    const responseBody = await response.text();
    const responseHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }
    responseHeaders.delete("content-encoding");

    return new Response(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
}
