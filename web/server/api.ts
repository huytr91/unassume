import type { IncomingMessage, ServerResponse } from 'node:http'
import { compileVerifiedAnswer, runInterviewTurn } from './declare-engine.ts'
import { testProviderConnection } from './provider-test.ts'
import type { ProviderId } from './providers.ts'
import { chatCompletion } from './providers.ts'

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) throw new Error('Empty request body')
  return JSON.parse(raw) as T
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

type ApiBody = {
  provider?: ProviderId
  apiKey?: string
  model?: string
  request?: string
  answers?: { questionId: string; value: string }[]
  confirmed?: { id: string; label: string; value: string }[]
  personalHints?: { slot: string; value: string; count: number }[]
  mode?: 'verified' | 'passthrough'
  forceClarify?: boolean
}

function requestSignal(req: IncomingMessage): AbortSignal {
  const ac = new AbortController()
  const abort = () => ac.abort()
  req.once('aborted', abort)
  req.once('close', () => {
    if (!req.complete) ac.abort()
  })
  return ac.signal
}

function requireConnection(body: ApiBody) {
  const provider = body.provider ?? 'openrouter'
  const model = (body.model ?? '').trim()
  const apiKey = (body.apiKey ?? '').trim()
  if (!model) throw Object.assign(new Error('Chưa chọn model.'), { status: 400 })
  if (provider !== 'ollama' && !apiKey) {
    throw Object.assign(new Error('Cần API key (BYOK). Key không lưu trên server.'), { status: 400 })
  }
  return { provider, model, apiKey: provider === 'ollama' ? apiKey || 'ollama' : apiKey }
}

export async function handleDeclareApi(req: IncomingMessage, res: ServerResponse) {
  const url = req.url?.split('?')[0] ?? ''

  if (req.method === 'GET' && url === '/api/health') {
    return sendJson(res, 200, { ok: true, product: 'Unassume', port: 3500 })
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = await readJson<ApiBody>(req)

    if (url === '/api/providers/test') {
      const provider = body.provider
      if (!provider) return sendJson(res, 400, { error: 'Provider hoặc API key không hợp lệ.' })
      const result = await testProviderConnection(provider, body.apiKey ?? '')
      return sendJson(res, 200, result)
    }

    if (url === '/api/interview') {
      const request = (body.request ?? '').trim()
      if (!request) return sendJson(res, 400, { error: 'Vui lòng nhập yêu cầu.' })
      const { provider, model, apiKey } = requireConnection(body)
      const signal = requestSignal(req)
      const turn = await runInterviewTurn({
        provider,
        apiKey,
        model,
        request,
        answers: body.answers ?? [],
        confirmed: body.confirmed ?? [],
        personalHints: body.personalHints ?? [],
        forceClarify: Boolean(body.forceClarify),
        chat: chatCompletion,
        signal,
      })
      return sendJson(res, 200, turn)
    }

    if (url === '/api/answer') {
      const request = (body.request ?? '').trim()
      if (!request) return sendJson(res, 400, { error: 'Vui lòng nhập yêu cầu.' })
      const mode = body.mode === 'passthrough' ? 'passthrough' : 'verified'
      let confirmed = body.confirmed ?? []
      if (!confirmed.length) {
        if (mode !== 'passthrough') {
          return sendJson(res, 400, {
            error: 'Cần làm rõ thêm trước khi trả lời, hoặc chọn Trả lời với thông tin đã có.',
          })
        }
        // Explicit proceed with original goal only
        confirmed = [{ id: 'goal', label: 'Yêu cầu', value: request }]
      }
      const { provider, model, apiKey } = requireConnection(body)
      const signal = requestSignal(req)
      const result = await compileVerifiedAnswer({
        provider,
        apiKey,
        model,
        request,
        confirmed,
        mode,
        chat: chatCompletion,
        signal,
      })
      return sendJson(res, 200, result)
    }

    return sendJson(res, 404, { error: 'Not found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: number }).status) || 500
      : 500
    const code = typeof error === 'object' && error && 'code' in error
      ? String((error as { code: string }).code)
      : undefined
    return sendJson(res, status, code ? { error: message, code } : { error: message })
  }
}
