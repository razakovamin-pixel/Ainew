// Настройки безопасности CORS для работы с любого устройства
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
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
      return new Response("Файл не найден на сервере", { status: 404 });
    }
  },
};

// Универсальный парсер, который превращает любой ответ ИИ в понятный для сайта формат
function buildUniversalResponse(responseBody, responseStatus, responseHeaders) {
  let aiText = "";
  let cleanBody = responseBody.trim();

  if (cleanBody.startsWith("{")) {
    try {
      const json = JSON.parse(cleanBody);
      if (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) {
        aiText = json.choices[0].message.content;
      } else if (json.content && Array.isArray(json.content) && json.content[0] && json.content[0].text) {
        aiText = json.content[0].text;
      } else if (json.content && typeof json.content === 'string') {
        aiText = json.content;
      } else if (json.text) {
        aiText = json.text;
      } else if (json.reply) {
        aiText = json.reply;
      } else if (json.response) {
        aiText = json.response;
      } else if (json.error) {
        aiText = `Ошибка ИИ: ${typeof json.error === 'object' ? JSON.stringify(json.error) : json.error}`;
      } else {
        aiText = cleanBody;
      }
    } catch (e) {
      aiText = cleanBody;
    }
  } else {
    // Если прилетел поток (stream), склеиваем его по строчкам
    let extracted = [];
    const lines = cleanBody.split('\n');
    for (const line of lines) {
      let trimmedLine = line.trim();
      if (trimmedLine.startsWith('data:')) {
        const dataStr = trimmedLine.slice(5).trim();
        if (dataStr === '[DONE]') continue;
        try {
          const dataJson = JSON.parse(dataStr);
          if (dataJson.choices && dataJson.choices[0] && dataJson.choices[0].delta && dataJson.choices[0].delta.content) {
            extracted.push(dataJson.choices[0].delta.content);
          } else if (dataJson.text) {
            extracted.push(dataJson.text);
          } else if (dataJson.content) {
            extracted.push(dataJson.content);
          }
        } catch(err) { }
      }
    }
    if (extracted.length > 0) {
      aiText = extracted.join('');
    } else {
      aiText = cleanBody.replace(/^event:\s*\w+\s*/i, '').replace(/^data:\s*/i, '');
    }
  }

  // Упаковываем текст во ВСЕ известные форматы одновременно
  const universalResponse = {
    text: aiText,
    reply: aiText,
    response: aiText,
    content: aiText,
    message: aiText,
    messages: [{ text: aiText, content: aiText, role: "assistant" }],
    choices: [{ message: { content: aiText }, delta: { content: aiText } }]
  };

  return new Response(JSON.stringify(universalResponse), {
    status: responseStatus,
    headers: responseHeaders,
  });
}

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
      if (targetUrl.includes("smartapi.shop") && !parsedBody.model) {
        parsedBody.model = "deepseek-v4-flash";
      }
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

    return buildUniversalResponse(responseBody, response.status, responseHeaders);

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
    let parsedBody = JSON.parse(bodyText);

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
    responseHeaders.set("content-type", "application/json");

    return buildUniversalResponse(responseBody, response.status, responseHeaders);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
}
