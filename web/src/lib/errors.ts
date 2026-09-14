/** Map provider/engine errors to short Vietnamese for UI. */
export function toUserError(message: string): string {
  const m = message.trim()
  if (!m) return 'Đã xảy ra lỗi. Thử lại.'
  const lower = m.toLowerCase()
  if (/abort|aborted|dừng/i.test(m)) return 'Đã dừng.'
  if (/did not return json|json/i.test(lower)) return 'Model trả về sai định dạng. Thử lại hoặc đổi model.'
  if (/empty (model )?response|empty answer|model returned empty/i.test(lower)) {
    return 'Model không trả lời được. Thử lại hoặc đổi model.'
  }
  if (/reach clear|confirmed facts required/i.test(lower)) {
    return 'Cần làm rõ thêm trước khi trả lời, hoặc chọn Trả lời với thông tin đã có.'
  }
  if (/api key|unauthorized|401|invalid.*key/i.test(lower)) {
    return 'API key không hợp lệ hoặc hết hạn. Kiểm tra lại kết nối.'
  }
  if (/429|rate limit|quota/i.test(lower)) return 'Model đang giới hạn tốc độ. Đợi giây lát rồi thử lại.'
  if (/timeout|ETIMEDOUT|network|fetch failed|failed to fetch/i.test(lower)) {
    return 'Không kết nối được tới model. Kiểm tra mạng hoặc Ollama.'
  }
  if (/model is required|request text is required/i.test(lower)) {
    return 'Thiếu thông tin yêu cầu hoặc model.'
  }
  // Already Vietnamese / short enough
  if (/[àáạảãâèéẹẻẽêìíòóọỏôơùúưỳýđ]/i.test(m) && m.length < 180) return m
  if (m.length > 160) return `${m.slice(0, 157)}…`
  return m
}
