export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'qwen'
  | 'kimi'
  | 'openrouter'
  | 'ollama'

export type ProviderMeta = {
  id: ProviderId
  label: string
  blurb: string
  method: string
  recommended?: boolean
  local?: boolean
  defaultModel: string
  keyUrl?: string
  billingUrl?: string
  note: string
}

/** Cloud providers in Userward order (OpenRouter last in list + recommended callout). */
export const CLOUD_PROVIDERS: ProviderMeta[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    blurb: 'GPT models',
    method: 'API key',
    defaultModel: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    billingUrl: 'https://platform.openai.com/settings/organization/billing/overview',
    note: 'ChatGPT Plus/Pro không bao gồm credit API; billing API là riêng.',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    blurb: 'Claude models',
    method: 'API key',
    defaultModel: 'claude-3-5-haiku-latest',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    billingUrl: 'https://console.anthropic.com/settings/billing',
    note: 'Gói Claude chat và Claude API được tính phí riêng.',
  },
  {
    id: 'google',
    label: 'Google',
    blurb: 'Gemini models',
    method: 'API key',
    defaultModel: 'gemini-2.0-flash',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    billingUrl: 'https://console.cloud.google.com/billing',
    note: 'Tạo key trong Google AI Studio; billing được quản lý bằng Google Cloud project.',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    blurb: 'DeepSeek Chat & Reasoner',
    method: 'API key',
    defaultModel: 'deepseek-chat',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    billingUrl: 'https://platform.deepseek.com/top_up',
    note: 'DeepSeek API dùng số dư trả trước trên Open Platform.',
  },
  {
    id: 'qwen',
    label: 'Qwen',
    blurb: 'Alibaba Cloud Model Studio',
    method: 'DashScope key',
    defaultModel: 'qwen-plus',
    keyUrl: 'https://modelstudio.console.alibabacloud.com/?tab=dashboard#/api-key',
    billingUrl: 'https://billing-cost.console.alibabacloud.com/',
    note: 'Tạo Model Studio API key đúng region; app dùng endpoint quốc tế.',
  },
  {
    id: 'kimi',
    label: 'Kimi',
    blurb: 'Moonshot AI models',
    method: 'API key',
    defaultModel: 'moonshot-v1-auto',
    keyUrl: 'https://platform.moonshot.ai/console/api-keys',
    billingUrl: 'https://platform.moonshot.ai/console/info',
    note: 'Kimi chat subscription và Moonshot API là hai dịch vụ thanh toán riêng.',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    blurb: 'Nhiều nhà cung cấp qua một key',
    method: 'Khuyên dùng',
    recommended: true,
    defaultModel: 'openai/gpt-4o-mini',
    keyUrl: 'https://openrouter.ai/keys',
    billingUrl: 'https://openrouter.ai/settings/credits',
    note: 'Khóa thường bắt đầu bằng sk-or-v1-.',
  },
]

export const OLLAMA_PROVIDER: ProviderMeta = {
  id: 'ollama',
  label: 'Ollama',
  blurb: 'Ollama · Model chạy trên máy này',
  method: 'Không cần API key',
  local: true,
  defaultModel: 'qwen3:8b',
  note: 'Unassume chỉ nối http://127.0.0.1:11434. Không gửi request ra ngoài máy.',
}

export const PROVIDERS = [...CLOUD_PROVIDERS, OLLAMA_PROVIDER]

export const PROVIDER_BY_ID = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<ProviderId, ProviderMeta>

export const KEY_GUIDE_STEPS = [
  'Mở trang chính thức bằng nút bên dưới và đăng nhập.',
  'Tạo key mới và đặt tên tùy ý; nên chọn tên giúp bạn dễ nhận biết key này, rồi sao chép.',
  'Quay lại đây, dán khóa và nhấn “Kiểm tra khóa”.',
] as const

export const OLLAMA_GUIDE_STEPS = [
  'Tải Ollama và cài trên máy.',
  'Chạy ollama run qwen3:8b (máy yếu dùng qwen3:4b).',
  'Quay lại đây và nhấn “Tìm model trên máy này”.',
] as const
