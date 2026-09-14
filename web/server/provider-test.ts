import type { ProviderId } from './providers.ts'

const OPENAI_COMPAT: Partial<Record<ProviderId, string>> = {
  deepseek: 'https://api.deepseek.com',
  qwen: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  kimi: 'https://api.moonshot.ai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
}

const isInteractiveTextModel = (id: string) =>
  Boolean(id) && !/(?:^|[/:._-])(?:batch|embedding|embed|moderation|rerank|audio|realtime|transcrib|speech|tts|image|vision-only)(?:$|[/:._-])/i.test(id)

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 15_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchOllamaTags() {
  let lastError: unknown
  for (const url of ['http://127.0.0.1:11434/api/tags', 'http://localhost:11434/api/tags']) {
    try {
      return await fetchWithTimeout(url, {}, 15_000)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

function pickDefault(provider: ProviderId, ids: string[]): string {
  const preferred: Partial<Record<ProviderId, string[]>> = {
    openai: ['gpt-5.2', 'gpt-5.1', 'gpt-5', 'gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4o'],
    anthropic: [],
    google: [],
    deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat'],
    qwen: ['qwen-plus', 'qwen-turbo'],
    kimi: ['kimi-k2.5', 'kimi-k2', 'moonshot-v1-auto'],
    openrouter: ['openrouter/auto', 'openai/gpt-4o-mini'],
    ollama: [],
  }

  if (provider === 'ollama') return ids.find((x) => /qwen/i.test(x)) || ids[0] || ''
  if (provider === 'anthropic') return ids.find((x) => x.includes('sonnet')) || ids[0] || ''
  if (provider === 'google') return ids.find((x) => x.includes('flash')) || ids[0] || ''
  if (provider === 'openai') {
    return preferred.openai?.find((x) => ids.includes(x))
      || ids.find((x) => /^gpt-(?!.*(?:audio|realtime|transcribe|image|search))/.test(x))
      || ''
  }
  return preferred[provider]?.find((x) => ids.includes(x))
    || ids.find((x) => /deepseek|qwen|kimi|moonshot|:free/.test(x))
    || ids[0]
    || ''
}

export type ProviderTestResult = {
  ok: true
  provider: ProviderId
  model: string
  models: string[]
}

export async function testProviderConnection(provider: ProviderId, apiKey: string): Promise<ProviderTestResult> {
  const cleanKey = apiKey.trim()
  if (provider !== 'ollama' && !cleanKey) {
    throw Object.assign(new Error('Provider hoặc API key không hợp lệ.'), { status: 400 })
  }

  let response: Response

  try {
    if (provider === 'ollama') {
      response = await fetchOllamaTags()
    } else if (provider === 'openai') {
      response = await fetchWithTimeout('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${cleanKey}` },
      })
    } else if (provider === 'anthropic') {
      response = await fetchWithTimeout('https://api.anthropic.com/v1/models?limit=100', {
        headers: { 'x-api-key': cleanKey, 'anthropic-version': '2023-06-01' },
      })
    } else if (provider === 'google') {
      response = await fetchWithTimeout('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': cleanKey },
      })
    } else if (provider === 'openrouter') {
      const keyResponse = await fetchWithTimeout('https://openrouter.ai/api/v1/key', {
        headers: { Authorization: `Bearer ${cleanKey}` },
      })
      const keyRaw = await keyResponse.text()
      let keyData: { error?: { message?: string } } = {}
      try {
        keyData = keyRaw ? JSON.parse(keyRaw) : {}
      } catch {
        throw Object.assign(
          new Error(`OpenRouter đang trả phản hồi không hợp lệ (HTTP ${keyResponse.status || 502}).`),
          { status: 502 },
        )
      }
      if (!keyResponse.ok) {
        const message = keyResponse.status === 401
          ? 'API key OpenRouter không hợp lệ, đã hết hạn hoặc bị vô hiệu hóa.'
          : keyData.error?.message || `OpenRouter từ chối kiểm tra key (HTTP ${keyResponse.status}).`
        throw Object.assign(new Error(message), {
          status: keyResponse.status === 429 ? 429 : keyResponse.status === 401 ? 401 : 502,
        })
      }
      response = await fetchWithTimeout('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${cleanKey}` },
      })
    } else if (OPENAI_COMPAT[provider]) {
      response = await fetchWithTimeout(`${OPENAI_COMPAT[provider]}/models`, {
        headers: { Authorization: `Bearer ${cleanKey}` },
      })
    } else {
      throw Object.assign(new Error('Provider chưa được hỗ trợ.'), { status: 400 })
    }
  } catch (error) {
    if (typeof error === 'object' && error && 'status' in error) throw error
    const message = error instanceof Error ? error.message : String(error)
    if (provider === 'ollama' || /11434|econnrefused|abort/i.test(message)) {
      throw Object.assign(
        new Error('Ollama chưa chạy hoặc không kết nối được tới 127.0.0.1:11434. Hãy mở Ollama rồi thử lại.'),
        { status: 503, code: 'ollama_not_running' },
      )
    }
    throw Object.assign(new Error(message || 'Không kiểm tra được kết nối.'), { status: 502 })
  }

  const rawResponse = await response.text()
  let data: {
    data?: Array<{ id?: string }>
    models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>
    error?: { message?: string }
  } = {}
  try {
    data = rawResponse ? JSON.parse(rawResponse) : {}
  } catch {
    throw Object.assign(
      new Error(`${provider} đang gặp lỗi dịch vụ tạm thời (HTTP ${response.status || 502}).`),
      { status: 502 },
    )
  }

  if (!response.ok) {
    if (provider === 'ollama') {
      throw Object.assign(
        new Error(data.error?.message || `Ollama từ chối yêu cầu (HTTP ${response.status}).`),
        { status: response.status >= 500 ? 502 : response.status, code: 'ollama_http_error' },
      )
    }
    throw Object.assign(
      new Error(data.error?.message || 'API key không hợp lệ hoặc tài khoản chưa có quyền truy cập.'),
      { status: response.status === 429 ? 429 : 401 },
    )
  }

  let models: string[] = []
  if (provider === 'ollama') {
    models = (data.models || []).map((x) => x.name || '').filter(Boolean)
  } else if (provider === 'google') {
    models = (data.models || [])
      .filter((x) => x.supportedGenerationMethods?.includes('generateContent'))
      .map((x) => x.name?.replace('models/', '') || '')
      .filter(Boolean)
  } else {
    models = (data.data || []).map((x) => x.id || '').filter(isInteractiveTextModel)
  }

  models = [...new Set(models)].slice(0, 300)
  const model = pickDefault(provider, models)
  if (!model) {
    if (provider === 'ollama') {
      throw Object.assign(
        new Error('Ollama đang chạy nhưng chưa có model. Chạy ollama run qwen3:8b rồi thử lại.'),
        { status: 422, code: 'ollama_no_models' },
      )
    }
    throw Object.assign(
      new Error('Đăng nhập hợp lệ nhưng không tìm thấy model tạo văn bản khả dụng.'),
      { status: 422 },
    )
  }

  return { ok: true, provider, model, models }
}
