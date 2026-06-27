const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

// Словарь автоисправления моделей. Если сайт шлет левое имя, меняем на то, что ждет SmartAPI
const modelMapping = {
  "claude-sonnet": "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
  "gpt-4": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  "deepseek": "deepseek-chat",
  "deepseek-chat": "deepseek-chat"
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/proxy" && request.method === "POST") {
      return await handleProxyRequest(request);
    }

    if (url.pathname === "/api/v1/messages" && request.method === "POST") {
      return await handleIndexApiRequest(request);
    }

    try {
      return await env.ASSETS.fetch(request);
    } catch (assetsError) {
      return new Response("Файл не найден", { status: 404 });
    }
  },
};

async function handleProxyRequest(request) {
  try {
    const requestData = await request.json();
    let targetUrl = requestData.target_url;
    
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
      
      // КРИТИЧЕСКИЙ БЛОК: Исправляем имя модели из интерфейса сайта под стандарты API
      if (parsedBody.model) {
        const modelKey = parsedBody.model.toLowerCase().trim();
        if (modelMapping[modelKey]) {
          parsedBody.model = modelMapping[modelKey];
        }
      } else {
        parsedBody.model = "deepseek-chat"; // Модель по умолчанию, если сайт ничего не передал
      }
      
      bodyStr = JSON.stringify(parsedBody);
    }

    // Отправляем запрос на SmartAPI
    const response = await fetch(targetUrl, { method, headers, body: bodyStr });
    
    // Копируем заголовки ответа и добавляем CORS-разрешения
    const responseHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }
    responseHeaders.delete("content-encoding"); // Отключаем принудительное сжатие Cloudflare

    // Возвращаем оригинальный поток (stream) напрямую в браузер без искажения структуры JSON
    return new Response(response.body, {
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

async function handleIndexApiRequest(request) {
  try {
    const bodyText = await request.text();
    const targetUrl = "https://smartapi.shop/backend/v1/messages";

    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
      if (!["host", "cf-connecting-ip", "cf-ray", "x-forwarded-for"].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    }

    const xApiKey = request.headers.get("x-api-key");
    if (xApiKey && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${xApiKey}`);
    }

    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    let modifiedBodyText = bodyText;
    try {
      let parsedBody = JSON.parse(bodyText);
      if (parsedBody.model) {
        const modelKey = parsedBody.model.toLowerCase().trim();
        if (modelMapping[modelKey]) {
          parsedBody.model = modelMapping[modelKey];
        }
      }
      modifiedBodyText = JSON.stringify(parsedBody);
    } catch(e) {}

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: headers,
      body: modifiedBodyText,
    });

    const responseHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }
    responseHeaders.delete("content-encoding");

    return new Response(response.body, {
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
