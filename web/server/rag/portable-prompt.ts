/**
 * Build / validate Unassume portable prompt documents (schema v1.0).
 * See schemas/portable-prompt.schema.json
 */
export type PortableMode = 'verified' | 'passthrough'

export type PortableLabel = 'VERIFIED' | 'UNVERIFIED_PARTIAL' | 'PASSTHROUGH'

export type PortablePromptDocument = {
  schemaVersion: '1.0'
  mode: PortableMode
  label: PortableLabel
  locale: 'vi' | 'en'
  originalRequest: string
  portableText: string
  sections: {
    objective: string
    confirmedRequirements: string[]
    constraints: string[]
    unresolvedItems: string[]
    outputRequirements: string[]
    instructionsToDownstreamAi: string[]
    businessRules?: string[]
    userDecisions?: { topic: string; decision: string }[]
  }
  passthrough?: {
    reason: 'user_explicit_proceed' | 'clarification_exhausted' | 'model_interview_unavailable'
    warning: string
    confirmedFactCount: number
  }
  meta?: {
    intent?: string
    pack?: string | null
    product: 'Unassume'
  }
}

export function labelForMode(mode: PortableMode): PortableLabel {
  return mode === 'passthrough' ? 'UNVERIFIED_PARTIAL' : 'VERIFIED'
}

export function buildPortablePromptDocument(args: {
  mode: PortableMode
  locale: 'vi' | 'en'
  originalRequest: string
  portableText: string
  confirmed: { label: string; value: string }[]
  unresolvedItems?: string[]
  passthroughReason?: PortablePromptDocument['passthrough'] extends infer P
    ? P extends { reason: infer R } ? R : never
    : never
  intent?: string
  pack?: string | null
}): PortablePromptDocument {
  const label = labelForMode(args.mode)
  const warning = args.locale === 'vi'
    ? 'PASSTHROUGH / làm rõ một phần — không bịa yêu cầu còn thiếu; nêu rõ phần mở.'
    : 'PASSTHROUGH / partial clarification — do not invent missing requirements; state open items.'

  const doc: PortablePromptDocument = {
    schemaVersion: '1.0',
    mode: args.mode,
    label,
    locale: args.locale,
    originalRequest: args.originalRequest.trim(),
    portableText: args.portableText.trim(),
    sections: {
      objective: args.originalRequest.trim(),
      confirmedRequirements: args.confirmed.map((f) => `${f.label}: ${f.value}`),
      constraints: [
        args.mode === 'passthrough'
          ? (args.locale === 'vi' ? 'Brief làm rõ một phần.' : 'Partial clarification brief.')
          : (args.locale === 'vi' ? 'Chỉ dùng fact đã xác nhận.' : 'Use confirmed facts only.'),
      ],
      unresolvedItems: args.unresolvedItems?.length
        ? args.unresolvedItems
        : [args.locale === 'vi' ? 'Không có hoặc đã để mở tường minh.' : 'None, or explicitly left open.'],
      outputRequirements: [
        args.locale === 'vi' ? 'Trả lời rõ, có cấu trúc; nêu giả định nếu cần.' : 'Clear structured answer; state assumptions if needed.',
      ],
      instructionsToDownstreamAi: [
        args.locale === 'vi'
          ? 'Chỉ dùng CONFIRMED REQUIREMENTS. Không bịa số liệu/nguồn/side-effect.'
          : 'Use only CONFIRMED REQUIREMENTS. Do not invent figures, sources, or side-effects.',
      ],
    },
    meta: {
      product: 'Unassume',
      intent: args.intent,
      pack: args.pack ?? null,
    },
  }

  if (args.mode === 'passthrough') {
    doc.passthrough = {
      reason: args.passthroughReason ?? 'user_explicit_proceed',
      warning,
      confirmedFactCount: args.confirmed.length,
    }
  }

  return doc
}
