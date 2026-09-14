export type ProviderId =
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'qwen'
  | 'kimi'
  | 'ollama'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

type ChatArgs = {
  provider: ProviderId
  apiKey: string
  model: string
  messages: ChatMessage[]
  temperature?: number
  signal?: AbortSignal
}

const OPENAI_COMPAT: Record<Exclude<ProviderId, 'anthropic' | 'google'>, string> = {
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  deepseek: 'https://api.deepseek.com',
  qwen: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  kimi: 'https://api.moonshot.ai/v1',
  ollama: 'http://127.0.0.1:11434/v1',
}

export async function chatCompletion(args: ChatArgs): Promise<string> {
  switch (args.provider) {
    case 'anthropic':
      return anthropicChat(args)
    case 'google':
      return googleChat(args)
    case 'openrouter':
      return openAiCompatibleChat({
        ...args,
        baseUrl: OPENAI_COMPAT.openrouter,
        extraHeaders: {
          'HTTP-Referer': 'http://127.0.0.1:3500',
          'X-Title': 'Unassume',
        },
      })
    case 'ollama':
      return openAiCompatibleChat({
        ...args,
        apiKey: args.apiKey || 'ollama',
        baseUrl: OPENAI_COMPAT.ollama,
      })
    case 'deepseek':
    case 'qwen':
    case 'kimi':
    case 'openai':
      return openAiCompatibleChat({
        ...args,
        baseUrl: OPENAI_COMPAT[args.provider],
      })
    default:
      return openAiCompatibleChat({
        ...args,
        baseUrl: OPENAI_COMPAT.openai,
      })
  }
}

async function openAiCompatibleChat(args: ChatArgs & {
  baseUrl: string
  extraHeaders?: Record<string, string>
}): Promise<string> {
  const response = await fetch(`${args.baseUrl}/chat/completions`, {
    method: 'POST',
    signal: args.signal,
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
      ...(args.extraHeaders ?? {}),
    },
    body: JSON.stringify({
      model: args.model,
      temperature: args.temperature ?? 0.2,
      messages: args.messages,
    }),
  })

  const data = (await response.json()) as {
    error?: { message?: string }
    choices?: { message?: { content?: string } }[]
  }

  if (!response.ok) {
    throw new Error(data.error?.message || `Provider error ${response.status}`)
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Empty model response')
  return content
}

async function anthropicChat(args: ChatArgs): Promise<string> {
  const system = args.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
  const messages = args.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: args.signal,
    headers: {
      'x-api-key': args.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: 4096,
      temperature: args.temperature ?? 0.2,
      system: system || undefined,
      messages,
    }),
  })

  const data = (await response.json()) as {
    error?: { message?: string }
    content?: { type: string; text?: string }[]
  }

  if (!response.ok) {
    throw new Error(data.error?.message || `Anthropic error ${response.status}`)
  }

  const text = data.content?.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n').trim()
  if (!text) throw new Error('Empty Anthropic response')
  return text
}

async function googleChat(args: ChatArgs): Promise<string> {
  const system = args.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
  const contents = args.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent?key=${encodeURIComponent(args.apiKey)}`

  const response = await fetch(url, {
    method: 'POST',
    signal: args.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: { temperature: args.temperature ?? 0.2 },
    }),
  })

  const data = (await response.json()) as {
    error?: { message?: string }
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }

  if (!response.ok) {
    throw new Error(data.error?.message || `Google error ${response.status}`)
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim()
  if (!text) throw new Error('Empty Google response')
  return text
}
