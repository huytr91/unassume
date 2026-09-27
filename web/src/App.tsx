import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  clearConnection,
  loadConnection,
  postAnswer,
  postInterview,
  saveConnection,
  testProvider,
  type Connection,
  type Fact,
  type InterviewTurn,
  type ProviderId,
  type VerifiedResult,
} from './lib/api'
import {
  clearPersonalRag,
  getPersonalHints,
  isPersonalRagEnabled,
  recordPersonalAnswers,
  setPersonalRagEnabled,
} from './lib/personal-rag'
import { toUserError } from './lib/errors'
import {
  CLOUD_PROVIDERS,
  KEY_GUIDE_STEPS,
  OLLAMA_GUIDE_STEPS,
  OLLAMA_PROVIDER,
  PROVIDER_BY_ID,
} from './lib/providers-catalog'

type Screen = 'home' | 'interview' | 'result'
type DraftAnswers = Record<string, { choice: string; custom: string; otherOpen: boolean }>

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [connection, setConnection] = useState<Connection | null>(() => loadConnection())
  const [providersOpen, setProvidersOpen] = useState(false)
  const [credentialProvider, setCredentialProvider] = useState<ProviderId | ''>('')
  const [apiKey, setApiKey] = useState('')
  const [rememberKey, setRememberKey] = useState(true)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [pickedModel, setPickedModel] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [request, setRequest] = useState('')
  const [turn, setTurn] = useState<InterviewTurn | null>(null)
  const [confirmed, setConfirmed] = useState<Fact[]>([])
  const [drafts, setDrafts] = useState<DraftAnswers>({})
  const [result, setResult] = useState<VerifiedResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [busyPhase, setBusyPhase] = useState<'idle' | 'interview' | 'answer'>('idle')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [personalOn, setPersonalOn] = useState(() => isPersonalRagEnabled())
  const [resultMode, setResultMode] = useState<'verified' | 'passthrough'>('verified')
  const [clarifyRounds, setClarifyRounds] = useState(0)
  const apiKeyInputRef = useRef<HTMLInputElement>(null)
  const setupRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const otherInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const guide = credentialProvider && credentialProvider !== 'ollama'
    ? PROVIDER_BY_ID[credentialProvider]
    : null

  const canStart = useMemo(
    () => Boolean(connection && request.trim() && connection.model.trim()),
    [connection, request],
  )

  function stopWork() {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
    setBusyPhase('idle')
    setError('Đã dừng.')
  }

  function beginWork(phase: 'interview' | 'answer') {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setBusy(true)
    setBusyPhase(phase)
    setError('')
    return ac
  }

  function endWork() {
    abortRef.current = null
    setBusy(false)
    setBusyPhase('idle')
  }

  function isAbortError(err: unknown) {
    return err instanceof DOMException && err.name === 'AbortError'
      || (err instanceof Error && /aborted|AbortError/i.test(err.message))
  }

  useEffect(() => {
    if (!providersOpen || !credentialProvider) return
    setupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    if (credentialProvider !== 'ollama') {
      window.setTimeout(() => apiKeyInputRef.current?.focus({ preventScroll: true }), 50)
    }
  }, [credentialProvider, providersOpen])

  function openProviders() {
    setCredentialProvider(connection?.provider ?? '')
    setApiKey(connection?.provider === 'ollama' ? '' : connection?.apiKey ?? '')
    setRememberKey(connection?.remember ?? true)
    setAvailableModels(connection?.model ? [connection.model] : [])
    setPickedModel(connection?.model ?? '')
    setConnectionError('')
    setProvidersOpen(true)
  }

  function selectCredentialProvider(id: ProviderId) {
    setCredentialProvider(id)
    setAvailableModels([])
    setPickedModel('')
    setConnectionError('')
    if (id === 'ollama') setApiKey('')
  }

  async function connectProvider() {
    if (!credentialProvider) return
    if (credentialProvider !== 'ollama' && !apiKey.trim()) return
    setConnecting(true)
    setConnectionError('')
    try {
      const data = await testProvider({
        provider: credentialProvider,
        apiKey: credentialProvider === 'ollama' ? 'local' : apiKey.trim(),
      })
      setAvailableModels(data.models)
      setPickedModel(data.model)
    } catch (err) {
      setAvailableModels([])
      setPickedModel('')
      setConnectionError(err instanceof Error ? err.message : 'Không kiểm tra được kết nối')
    } finally {
      setConnecting(false)
    }
  }

  function saveProvider() {
    if (!credentialProvider || !pickedModel) return
    if (credentialProvider !== 'ollama' && !apiKey.trim()) return
    const next: Connection = {
      provider: credentialProvider,
      model: pickedModel,
      apiKey: credentialProvider === 'ollama' ? 'local' : apiKey.trim(),
      remember: rememberKey,
    }
    setConnection(next)
    saveConnection(next)
    setProvidersOpen(false)
  }

  function disconnectProvider() {
    setConnection(null)
    clearConnection()
    sessionStorage.removeItem('unassume.connection.v1')
  }

  async function generateAnswer(
    facts: Fact[],
    active: Connection,
    signal?: AbortSignal,
    mode: 'verified' | 'passthrough' = 'verified',
  ) {
    const out = await postAnswer({
      connection: active,
      request: request.trim(),
      confirmed: facts.length
        ? facts
        : [{ id: 'goal', label: 'Yêu cầu', value: request.trim() }],
      mode,
      signal,
    })
    // Always show the answer. needsMoreInterview only highlights "Tiếp tục làm rõ".
    setResult(out)
    setResultMode(out.mode ?? mode)
    setConfirmed(facts)
    setScreen('result')
  }

  function continueClarifyFromResult() {
    void resumeInterview(confirmed.length
      ? confirmed
      : [{ id: 'goal', label: 'Yêu cầu', value: request.trim() }])
  }

  async function resumeInterview(facts: Fact[]) {
    if (!connection) return
    const ac = beginWork('interview')
    try {
      const next = await postInterview({
        connection,
        request: request.trim(),
        answers: [],
        confirmed: facts,
        personalHints: getPersonalHints(turn?.meta?.intent),
        forceClarify: true,
        signal: ac.signal,
      })
      if (ac.signal.aborted) return
      if (next.status === 'NOT_CLEAR' && next.questions.length === 0) {
        setError('Chưa có câu hỏi tiếp. Thử mô tả thêm yêu cầu rồi bắt đầu lại.')
        return
      }
      setResult(null)
      setTurn(next)
      setConfirmed(next.confirmed.length ? next.confirmed : facts)
      setDrafts(initDrafts(next))
      setClarifyRounds((n) => n + 1)
      setScreen('interview')
    } catch (err) {
      if (isAbortError(err)) return
      setError(toUserError(err instanceof Error ? err.message : 'Không tiếp tục làm rõ được'))
    } finally {
      endWork()
    }
  }

  async function proceedWithConfirmed() {
    if (!connection) return
    if (clarifyRounds < 1 && confirmed.length === 0) return
    const ok = window.confirm(
      'Bạn chưa làm rõ hết. Vẫn trả lời với thông tin hiện có? Phần còn thiếu sẽ không được suy đoán.',
    )
    if (!ok) return
    const ac = beginWork('answer')
    try {
      const facts = confirmed.length
        ? confirmed
        : [{ id: 'goal', label: 'Yêu cầu', value: request.trim() }]
      await generateAnswer(facts, connection, ac.signal, 'passthrough')
    } catch (err) {
      if (isAbortError(err)) return
      setError(toUserError(err instanceof Error ? err.message : 'Không tạo được câu trả lời'))
    } finally {
      endWork()
    }
  }

  async function startClarify() {
    if (!connection) {
      setError('Chưa kết nối model. Hãy kết nối trước.')
      openProviders()
      return
    }
    const ac = beginWork('interview')
    try {
      setClarifyRounds(0)
      setResultMode('verified')
      const next = await postInterview({
        connection,
        request: request.trim(),
        answers: [],
        confirmed: [],
        personalHints: getPersonalHints(),
        signal: ac.signal,
      })
      if (ac.signal.aborted) return
      if (next.status === 'NOT_CLEAR' && next.questions.length === 0) {
        setError('Chưa tạo được câu hỏi làm rõ. Thử lại hoặc đổi model.')
        return
      }
      setTurn(next)
      setConfirmed(next.confirmed)
      setDrafts(initDrafts(next))
      if (next.status === 'CLEAR') {
        setBusyPhase('answer')
        await generateAnswer(next.confirmed, connection, ac.signal)
      } else {
        setScreen('interview')
      }
    } catch (err) {
      if (isAbortError(err)) return
      setError(toUserError(err instanceof Error ? err.message : 'Không làm rõ được yêu cầu'))
    } finally {
      endWork()
    }
  }

  async function submitAnswers() {
    if (!turn || !connection) return
    const answers = turn.questions.map((q) => {
      const d = drafts[q.id] ?? { choice: '', custom: '', otherOpen: false }
      const value = d.custom.trim() || (d.choice === '__other__' ? '' : d.choice.trim())
      return { questionId: q.id, value }
    })
    const missing = answers.filter((a) => !a.value)
    if (missing.length) {
      setError('Hãy chọn một phương án hoặc nhập Phương án khác cho mọi câu hỏi.')
      return
    }

    const ac = beginWork('interview')
    try {
      const next = await postInterview({
        connection,
        request: request.trim(),
        answers,
        confirmed,
        personalHints: getPersonalHints(turn.meta?.intent),
        signal: ac.signal,
      })
      if (ac.signal.aborted) return
      setClarifyRounds((n) => n + 1)
      if (next.status === 'NOT_CLEAR' && next.questions.length === 0) {
        setError('Vẫn cần làm rõ thêm nhưng chưa có câu hỏi tiếp. Có thể chọn Trả lời với thông tin đã có.')
        return
      }
      recordPersonalAnswers({
        intent: next.meta?.intent || turn.meta?.intent,
        answers: answers.map((a) => {
          const d = drafts[a.questionId]
          return {
            slot: a.questionId,
            value: a.value,
            fromOther: Boolean(d?.otherOpen || d?.choice === '__other__'),
          }
        }),
      })
      setTurn(next)
      setConfirmed(next.confirmed)
      setDrafts(initDrafts(next))
      if (next.status === 'CLEAR') {
        setBusyPhase('answer')
        await generateAnswer(next.confirmed, connection, ac.signal)
      } else {
        setScreen('interview')
      }
    } catch (err) {
      if (isAbortError(err)) return
      setError(toUserError(err instanceof Error ? err.message : 'Làm rõ yêu cầu thất bại'))
    } finally {
      endWork()
    }
  }

  function restart() {
    abortRef.current?.abort()
    setTurn(null)
    setConfirmed([])
    setDrafts({})
    setResult(null)
    setError('')
    setBusy(false)
    setBusyPhase('idle')
    setClarifyRounds(0)
    setResultMode('verified')
    setScreen('home')
  }

  function onRequestKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canStart && !busy) void startClarify()
    }
  }

  function onInterviewKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault()
      if (!busy) void submitAnswers()
    }
  }

  async function copyText(label: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    window.setTimeout(() => setCopied(''), 1600)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-name">Unassume</div>
          <div className="brand-tag">Answers without assumptions</div>
        </div>
        <button type="button" className="ghost-btn" onClick={openProviders}>
          {connection ? `${PROVIDER_BY_ID[connection.provider].label} · ${connection.model}` : 'Kết nối model'}
        </button>
      </header>

      {connection ? (
        <div className="connected-bar">
          <span>✓</span>
          <p><b>{PROVIDER_BY_ID[connection.provider].label}</b> · {connection.model}</p>
          <button type="button" onClick={disconnectProvider}>Ngắt kết nối</button>
        </div>
      ) : (
        <div className="connection-warning">
          <span>!</span>
          <p><b>Chưa có model.</b> Kết nối nhà cung cấp để bắt đầu.</p>
          <button type="button" onClick={openProviders}>Kết nối model</button>
        </div>
      )}

      {error ? <div className="error">{error}</div> : null}

      {screen === 'home' ? (
        <section className="hero">
          <h1>Làm rõ yêu cầu trước khi AI trả lời</h1>
          <p>
            Unassume chỉ trả lời theo phần bạn đã xác nhận — không tự bổ sung yêu cầu.
          </p>
          <div className="ask-box">
            <textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={onRequestKeyDown}
              placeholder="Mô tả việc bạn cần… (Enter gửi, Shift+Enter xuống dòng)"
              aria-label="Yêu cầu"
              disabled={busy}
            />
            <div className="cta-row">
              {busy ? (
                <>
                  <button type="button" className="primary-btn" disabled>
                    {busyPhase === 'answer' ? 'Đang soạn câu trả lời…' : 'Đang làm rõ…'}
                  </button>
                  <button type="button" className="ghost-btn stop-btn" onClick={stopWork}>Dừng</button>
                </>
              ) : (
                <button type="button" className="primary-btn" disabled={!canStart} onClick={startClarify}>
                  Bắt đầu
                </button>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {screen === 'interview' && turn ? (
        <>
          <section className="panel" onKeyDown={onInterviewKeyDown}>
            <div className="status-bar">
              <span className={`badge ${turn.status === 'CLEAR' ? 'ok' : 'warn'}`}>
                {turn.status === 'CLEAR' ? 'Đã rõ' : 'Cần làm rõ'}
              </span>
              <div className="progress-track" aria-hidden>
                <div className="progress-fill" style={{ width: `${turn.progress.percentHint}%` }} />
              </div>
              <span className="muted">
                {turn.progress.confirmedCount > 0
                  ? `${turn.progress.confirmedCount} đã ghi nhận`
                  : 'Chưa ghi nhận'}
                {turn.progress.remainingEstimate > 0
                  ? ` · khoảng ${turn.progress.remainingEstimate} câu`
                  : ''}
              </span>
            </div>
            <p className="muted" style={{ marginTop: 0 }}>
              {turn.reasonSummary || 'Chọn phương án hoặc nhập Phương án khác.'}
            </p>

            {busy ? (
              <div className="analyzing-bar">
                <span>{busyPhase === 'answer' ? 'Đang soạn câu trả lời…' : 'Đang kiểm tra…'}</span>
                <button type="button" className="ghost-btn stop-btn" onClick={stopWork}>Dừng</button>
              </div>
            ) : null}

            <div className="interview-table" role="table" aria-label="Bảng làm rõ yêu cầu">
              <div className="interview-head" role="row">
                <span role="columnheader">#</span>
                <span role="columnheader">Câu hỏi</span>
                <span role="columnheader">Phương án</span>
              </div>
              {turn.questions.map((q, index) => {
                const draft = drafts[q.id] ?? { choice: '', custom: '', otherOpen: false }
                const options = [...q.options]
                if (q.allowNotDecided && !options.some((o) => /not decided|chưa quyết định/i.test(o))) {
                  options.push('Chưa quyết định')
                }
                const hasStar = options.some((o) => o.startsWith('★'))
                return (
                  <div className="interview-row" role="row" key={q.id}>
                    <div className="interview-idx" role="cell">{index + 1}</div>
                    <div className="interview-ask" role="cell">
                      {q.label ? <strong>{q.label}</strong> : null}
                      <p>{q.text}</p>
                      {hasStar ? (
                        <small className="star-hint">★ Gợi ý từ lựa chọn bạn từng dùng trên máy này</small>
                      ) : null}
                    </div>
                    <div className="interview-opts" role="cell">
                      <div className="options">
                        {options.map((opt) => (
                          <label className="option" key={opt}>
                            <input
                              type="radio"
                              name={q.id}
                              checked={draft.choice === opt && !draft.otherOpen}
                              disabled={busy}
                              onChange={() =>
                                setDrafts((d) => ({
                                  ...d,
                                  [q.id]: { choice: opt, custom: '', otherOpen: false },
                                }))
                              }
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                        <label className="option other-option">
                          <input
                            type="radio"
                            name={q.id}
                            checked={draft.otherOpen || draft.choice === '__other__'}
                            disabled={busy}
                            onChange={() => {
                              setDrafts((d) => ({
                                ...d,
                                [q.id]: { choice: '__other__', custom: d[q.id]?.custom || '', otherOpen: true },
                              }))
                              window.setTimeout(() => otherInputRefs.current[q.id]?.focus(), 0)
                            }}
                          />
                          <span>Phương án khác</span>
                        </label>
                      </div>
                      {(draft.otherOpen || draft.choice === '__other__' || draft.custom) ? (
                        <input
                          ref={(el) => { otherInputRefs.current[q.id] = el }}
                          className="other-input"
                          value={draft.custom}
                          disabled={busy}
                          placeholder="Gõ phương án của bạn…"
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [q.id]: { choice: '__other__', custom: e.target.value, otherOpen: true },
                            }))
                          }
                        />
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="cta-row" style={{ marginTop: '0.85rem' }}>
              <button type="button" className="primary-btn" disabled={busy} onClick={submitAnswers}>
                {busy ? 'Đang xử lý…' : 'Tiếp tục'}
              </button>
              {(clarifyRounds > 0 || confirmed.length > 0) ? (
                <button type="button" className="ghost-btn" disabled={busy} onClick={proceedWithConfirmed}>
                  Trả lời với thông tin đã có
                </button>
              ) : null}
              <button type="button" className="ghost-btn" disabled={busy} onClick={restart}>Làm lại</button>
            </div>
          </section>
          {confirmed.length > 0 ? (
            <section className="panel">
              <h2>Đã ghi nhận</h2>
              <ul className="facts">
                {confirmed.map((f) => (
                  <li key={f.id}><strong>{f.label}</strong>{f.value}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      {screen === 'result' && result ? (
        <>
          <section className="panel">
            <div className="status-bar">
              <span className={`badge ${resultMode === 'passthrough' || result.needsMoreInterview ? 'warn' : 'ok'}`}>
                {resultMode === 'passthrough'
                  ? 'Làm rõ một phần'
                  : result.needsMoreInterview
                    ? 'Đã trả lời'
                    : 'Đã rõ'}
              </span>
            </div>
            <h2>Câu trả lời</h2>
            <p className="muted" style={{ marginTop: '-0.25rem' }}>
              {result.reasonSummary
                || (resultMode === 'passthrough'
                  ? 'Dựa trên thông tin đã có — phần còn mở được nêu rõ, không suy đoán thêm.'
                  : 'Chỉ dựa trên thông tin đã ghi nhận — phần còn mở được nêu rõ, không bịa thêm.')}
            </p>
            <div className="answer-block">{result.answer}</div>
            <div className="cta-row" style={{ marginTop: '1rem' }}>
              <button type="button" className="primary-btn" onClick={() => copyText('answer', result.answer)}>
                {copied === 'answer' ? 'Đã sao chép' : 'Sao chép câu trả lời'}
              </button>
              <button
                type="button"
                className={result.needsMoreInterview ? 'primary-btn' : 'ghost-btn'}
                disabled={busy}
                onClick={continueClarifyFromResult}
              >
                {result.needsMoreInterview ? 'Làm rõ thêm để cụ thể hơn' : 'Tiếp tục làm rõ'}
              </button>
              <button type="button" className="ghost-btn" onClick={restart}>Yêu cầu mới</button>
            </div>
          </section>

          <section className="panel portable-prompt">
            <h2>Prompt mang đi</h2>
            <p className="muted" style={{ marginTop: '-0.25rem' }}>
              Unassume đã trả lời phía trên. Sao chép prompt bên dưới một lần để hỏi AI/agent khác theo đúng brief đã làm rõ.
            </p>
            <pre className="mono-block">{result.verifiedPrompt}</pre>
            <div className="cta-row" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="primary-btn"
                onClick={() => copyText('prompt', result.verifiedPrompt)}
              >
                {copied === 'prompt' ? 'Đã sao chép' : 'Sao chép prompt'}
              </button>
              {result.portableDocument ? (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => copyText('portable-json', JSON.stringify(result.portableDocument, null, 2))}
                >
                  {copied === 'portable-json' ? 'Đã sao chép' : 'Sao chép JSON schema'}
                </button>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {providersOpen ? (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setProvidersOpen(false)}>
          <div className="provider-modal" role="dialog" aria-modal="true" aria-labelledby="connect-heading">
            <header>
              <div>
                <small>KẾT NỐI MODEL</small>
                <h2 id="connect-heading">Chọn nhà cung cấp</h2>
                <p>OpenRouter (một key, nhiều model) hoặc kết nối trực tiếp / Ollama trên máy.</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setProvidersOpen(false)} aria-label="Đóng">×</button>
            </header>

            <div className="provider-list">
              <div className="router-callout">
                <b>Khuyên dùng OpenRouter</b>
                <span>Một API key cho nhiều model cloud.</span>
                <button type="button" onClick={() => selectCredentialProvider('openrouter')}>Dùng OpenRouter</button>
              </div>

              {CLOUD_PROVIDERS.map((p) => (
                <div className={`provider-row ${credentialProvider === p.id ? 'chosen' : ''}`} key={p.id}>
                  <span className="provider-logo">{p.label[0]}</span>
                  <div>
                    <b>{p.label}</b>
                    <small>{p.blurb} · {p.method}</small>
                  </div>
                  <button type="button" onClick={() => selectCredentialProvider(p.id)}>
                    {connection?.provider === p.id ? 'Kết nối lại' : 'Chọn'}
                  </button>
                </div>
              ))}

              <div className={`provider-row local-row ${credentialProvider === 'ollama' ? 'chosen' : ''}`}>
                <span className="provider-logo">O</span>
                <div>
                  <b>{OLLAMA_PROVIDER.blurb}</b>
                  <small>{OLLAMA_PROVIDER.method}</small>
                </div>
                <button type="button" onClick={() => selectCredentialProvider('ollama')}>
                  {connection?.provider === 'ollama' ? 'Kết nối lại' : 'Thiết lập'}
                </button>
              </div>

              <div ref={setupRef} className="provider-setup-anchor" />

              {credentialProvider === 'ollama' ? (
                <div className="key-guide local-model-guide">
                  <div>
                    <b>Cài model local trong 3 bước</b>
                    <ol>
                      {OLLAMA_GUIDE_STEPS.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                  </div>
                  <div className="key-guide-actions">
                    <a href="https://ollama.com/download" target="_blank" rel="noreferrer">Tải Ollama ↗</a>
                    <a href="https://ollama.com/library/qwen3" target="_blank" rel="noreferrer">Xem Qwen ↗</a>
                  </div>
                  <small>{OLLAMA_PROVIDER.note}</small>
                </div>
              ) : null}

              {guide ? (
                <div className="key-guide">
                  <div>
                    <b>Lấy khóa API {guide.label} trong 3 bước</b>
                    <ol>
                      {KEY_GUIDE_STEPS.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                  </div>
                  <div className="key-guide-actions">
                    <a href={guide.keyUrl} target="_blank" rel="noreferrer">Mở trang tạo key ↗</a>
                    <a href={guide.billingUrl} target="_blank" rel="noreferrer">Billing / credit ↗</a>
                  </div>
                  <small>{guide.note} Không chia sẻ key với người khác.</small>
                </div>
              ) : null}

              {credentialProvider ? (
                <div className="credential-form">
                  {credentialProvider === 'ollama' ? (
                    <>
                      <label>Kết nối Ollama tại đây</label>
                      <div>
                        <button type="button" onClick={connectProvider} disabled={connecting}>
                          {connecting ? 'Đang tìm model…' : 'Tìm model trên máy này'}
                        </button>
                      </div>
                      <small>Không cần API key. Ollama phải đang chạy trên máy.</small>
                    </>
                  ) : (
                    <>
                      <label>API key của {PROVIDER_BY_ID[credentialProvider].label}</label>
                      <div>
                        <input
                          ref={apiKeyInputRef}
                          type="password"
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value)
                            setAvailableModels([])
                            setPickedModel('')
                          }}
                          placeholder="Dán API key vào đây"
                          autoComplete="off"
                        />
                        <button type="button" onClick={connectProvider} disabled={!apiKey.trim() || connecting}>
                          {connecting ? 'Đang kiểm tra…' : 'Kiểm tra khóa'}
                        </button>
                      </div>
                      <small>
                        {rememberKey
                          ? 'Nhớ kết nối: key lưu plaintext trên máy này (localStorage) để khỏi dán lại mỗi lần. Chỉ chạy localhost. Không đưa lên cloud Unassume.'
                          : 'Không nhớ: key chỉ trong tab này; đóng cửa sổ là mất — phải kết nối lại lần sau.'}
                      </small>
                    </>
                  )}

                  <label className="remember-key-toggle">
                    <input type="checkbox" checked={rememberKey} onChange={(e) => setRememberKey(e.target.checked)} />
                    Nhớ kết nối trên trình duyệt này
                  </label>

                  {availableModels.length > 0 ? (
                    <div className="model-picker">
                      <label>Chọn model</label>
                      <select value={pickedModel} onChange={(e) => setPickedModel(e.target.value)}>
                        {availableModels.map((item) => (
                          <option value={item} key={item}>{item}</option>
                        ))}
                      </select>
                      <button type="button" className="save-connect" onClick={saveProvider}>Lưu & kết nối</button>
                    </div>
                  ) : null}

                  {connectionError ? <p className="connection-error">{connectionError}</p> : null}
                </div>
              ) : null}
            </div>

            <footer className="privacy-footer">
              <div className="privacy-block">
                <label className="remember-key-toggle">
                  <input
                    type="checkbox"
                    checked={personalOn}
                    onChange={(e) => {
                      const on = e.target.checked
                      setPersonalOn(on)
                      setPersonalRagEnabled(on)
                    }}
                  />
                  Nhớ lựa chọn trên máy này
                </label>
                <small>
                  Lưu lựa chọn thường dùng trên thiết bị này để gợi ý lần sau. Không gửi lên server.
                </small>
                <button
                  type="button"
                  className="ghost-btn"
                  style={{ marginTop: '0.45rem' }}
                  onClick={() => {
                    clearPersonalRag()
                    setError('')
                  }}
                >
                  Xóa lịch sử gợi ý
                </button>
              </div>
              <div className="modal-footer-row">
                <span>Key chỉ lưu trên trình duyệt của bạn (nếu chọn nhớ kết nối).</span>
                <button type="button" onClick={() => setProvidersOpen(false)}>Đóng</button>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function initDrafts(turn: InterviewTurn): DraftAnswers {
  const next: DraftAnswers = {}
  for (const q of turn.questions) next[q.id] = { choice: '', custom: '', otherOpen: false }
  return next
}
