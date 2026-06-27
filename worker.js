// Настройки CORS для бесперебойной работы с любого устройства
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

// Список поддерживаемых моделей SmartAPI
const modelMapping = {
  "opus-4.6": "opus-4.6",
  "opus-4.7": "opus-4.7",
  "opus-4.8": "opus-4.8",
  "sonnet-4.6": "sonnet-4.6",

  "deepseek-v4-flash": "deepseek-v4-flash",
  "deepseek-v4-pro": "deepseek-v4-pro",

  "glm-5.1": "glm-5.1",

  "gpt-5.4": "gpt-5.4",
  "gpt-5.5": "gpt-5.5",

  "mimo-v2.5": "mimo-v2.5",
  "mimo-v2.5-pro": "mimo-v2.5-pro",

  "minimax-m3": "minimax-m3"
};

// Модель по умолчанию
const DEFAULT_MODEL = "deepseek-v4-flash";

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
      
      // Настройка модели
      if (parsedBody.model) {
        const modelKey = parsedBody.model.trim();
        if (modelMapping[modelKey]) {
          parsedBody.model = modelMapping[modelKey];
        } else {
          parsedBody.model = DEFAULT_MODEL;
        }
      } else {
        parsedBody.model = DEFAULT_MODEL;
      }
      
      // КРИТИЧЕСКИЙ ФИКС: Жестко запрещаем стриминг для этого эндпоинта
      parsedBody.stream = false;
      
      bodyStr = JSON.stringify(parsedBody);
    }

    const response = await fetch(targetUrl, { method, headers, body: bodyStr });
    const responseBody = await response.text();
    
    const responseHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }
    responseHeaders.delete("content-encoding");
    responseHeaders.set("content-type", "application/json");

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

async function handleIndexApiRequest(request) {
  try {
    const bodyText = await request.text();
    const targetUrl = "https://smartapi.shop/backend/v1/chat/completions"; // Перенаправляем на стандартный чат-эндпоинт OpenAI

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
      
      // Приводим структуру Anthropic (system отдельно) к стандарту OpenAI/SmartAPI
      let openAiMessages = [];
      if (parsedBody.system) {
        openAiMessages.push({ role: "system", content: parsedBody.system });
      }
      if (parsedBody.messages && Array.isArray(parsedBody.messages)) {
        openAiMessages.push(...parsedBody.messages);
      }

      let newBody = {
        messages: openAiMessages,
        max_tokens: parsedBody.max_tokens || 1000,
        stream: false // КРИТИЧЕСКИЙ ФИКС: Принудительно отключаем стриминг
      };

      if (parsedBody.model) {
        const modelKey = parsedBody.model.trim();
        if (modelMapping[modelKey]) {
          newBody.model = modelMapping[modelKey];
        } else {
          newBody.model = DEFAULT_MODEL;
        }
      } else {
        newBody.model = DEFAULT_MODEL;
      }
      
      modifiedBodyText = JSON.stringify(newBody);
    } catch(e) {}

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: headers,
      body: modifiedBodyText,
    });

    const responseBody = await response.text();
    
    const responseHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }
    responseHeaders.delete("content-encoding");
    responseHeaders.set("content-type", "application/json");

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
