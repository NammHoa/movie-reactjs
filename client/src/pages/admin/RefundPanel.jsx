import { useState } from 'react'
import api from '../../api/axios'
import { errorMessage } from '../../lib/errors'
import { formatDateTime, formatPrice } from '../../lib/movie'
import { FormModal, Row, inputCls } from './ui'

const STATUS = {
  pending: { label: 'Chờ xử lý', cls: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Đang xử lý', cls: 'bg-blue-100 text-blue-700' },
  failed: { label: 'Bị từ chối', cls: 'bg-red-100 text-red-700' },
  success: { label: 'Đã hoàn', cls: 'bg-green-100 text-green-700' },
}
const PROVIDERS = { mock: 'Cổng giả lập', vnpay: 'VNPay' }

// Lý do lỗi dạng dễ đọc cho người xử lý
function failText(reason) {
  if (!reason) return ''
  if (reason === 'gateway_no_response') return 'Không nhận được phản hồi từ cổng thanh toán, chưa rõ tiền đã hoàn hay chưa.'
  if (reason === 'bad_signature') return 'Phản hồi từ cổng thanh toán có chữ ký không hợp lệ nên không được tin, chưa rõ tiền đã hoàn hay chưa.'
  if (reason.startsWith('http_')) return `Cổng thanh toán trả lỗi ${reason.slice(5)}, chưa rõ tiền đã hoàn hay chưa.`
  if (reason.startsWith('vnpay_')) return `VNPay từ chối hoàn tiền (mã ${reason.slice(6)}).`
  return reason
}

export function RefundBadge({ status }) {
  const s = STATUS[status] ?? STATUS.pending
  return <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
}

function ResolveModal({ refund, onClose, onSaved }) {
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post(`/admin/refunds/${refund._id}/resolve`, { reference, note })
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Không thể lưu'))
      setSaving(false)
    }
  }

  return (
    <FormModal title="Đánh dấu đã hoàn tiền thủ công" onSubmit={submit} onClose={onClose} saving={saving} error={error}>
      <p className="text-sm text-gray-600">
        Chỉ xác nhận sau khi bạn đã <b>thực sự hoàn {formatPrice(refund.amount)}</b> cho khách (trên cổng thanh toán hoặc chuyển khoản). Khoản này sẽ được ghi là đã hoàn, vé chuyển sang "Đã hoàn tiền" và khách nhận email xác nhận.
      </p>
      <Row label="Mã giao dịch hoàn tiền (nếu có)">
        <input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} placeholder="VD: mã giao dịch ngân hàng" autoComplete="off" />
      </Row>
      <Row label="Ghi chú">
        <textarea className={inputCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="VD: đã hoàn trên cổng VNPay lúc 10:30" />
      </Row>
    </FormModal>
  )
}

// Chi tiết một khoản hoàn tiền kèm thao tác cho admin. onChanged() để nơi chứa tải lại dữ liệu.
export default function RefundPanel({ refund, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resolving, setResolving] = useState(false)

  const retry = async () => {
    const warn = refund.unknownOutcome ? '\n\nLần trước chưa rõ cổng đã hoàn hay chưa. Hãy kiểm tra giao dịch trên cổng VNPay trước: nếu đã hoàn rồi, chọn "Đánh dấu đã hoàn thủ công" thay vì thử lại.' : ''
    if (!window.confirm(`Gửi lại yêu cầu hoàn ${formatPrice(refund.amount)} cho khách?${warn}`)) return
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post(`/admin/refunds/${refund._id}/retry`)
      if (data.outcome !== 'success') setError(data.refund?.failReason ? failText(data.refund.failReason) : 'Cổng thanh toán chưa hoàn tất khoản này.')
    } catch (err) {
      setError(errorMessage(err, 'Không thể thử lại'))
    } finally {
      setBusy(false)
      onChanged()
    }
  }

  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">Hoàn tiền {formatPrice(refund.amount)}</span>
        <span className="flex items-center gap-2">
          {refund.manual && <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">Thủ công</span>}
          <RefundBadge status={refund.status} />
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-[110px_1fr] gap-y-1 text-xs text-gray-600">
        <dt>Cổng thanh toán</dt>
        <dd>{PROVIDERS[refund.provider] ?? refund.provider}</dd>
        <dt>Số lần gọi</dt>
        <dd>{refund.attempts}{refund.lastAttemptAt ? ` (gần nhất ${formatDateTime(refund.lastAttemptAt)})` : ''}</dd>
        {refund.requestedBy?.name && (<><dt>Người yêu cầu</dt><dd>{refund.requestedBy.name}</dd></>)}
        {refund.completedAt && (<><dt>Hoàn xong lúc</dt><dd>{formatDateTime(refund.completedAt)}</dd></>)}
        {refund.gatewayRefNo && (<><dt>Mã tham chiếu</dt><dd className="break-all font-mono">{refund.gatewayRefNo}</dd></>)}
        {refund.resolvedBy?.name && (<><dt>Xác nhận bởi</dt><dd>{refund.resolvedBy.name}</dd></>)}
        {refund.note && (<><dt>Ghi chú</dt><dd className="break-words">{refund.note}</dd></>)}
      </dl>

      {refund.failReason && <p className="mt-2 rounded bg-red-50 px-2 py-1.5 text-xs text-red-700">{failText(refund.failReason)}</p>}
      {refund.unknownOutcome && (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
          Hãy kiểm tra giao dịch trên cổng VNPay trước khi thử lại. Nếu đã hoàn rồi, chọn "Đánh dấu đã hoàn thủ công" để tránh hoàn hai lần.
        </p>
      )}
      {refund.stale && <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-800">Đang xử lý quá 5 phút, có thể bị treo.</p>}
      {error && <p role="alert" className="mt-2 rounded bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</p>}

      {(refund.canRetry || refund.canResolve) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {refund.canRetry && (
            <button onClick={retry} disabled={busy} className="h-10 rounded border border-brand px-3 text-sm font-semibold text-brand transition hover:bg-brand/5 disabled:opacity-50">
              {busy ? 'Đang gửi...' : 'Thử lại'}
            </button>
          )}
          {refund.canResolve && (
            <button onClick={() => setResolving(true)} disabled={busy} className="h-10 rounded border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">
              Đánh dấu đã hoàn thủ công
            </button>
          )}
        </div>
      )}

      {resolving && (
        <ResolveModal
          refund={refund}
          onClose={() => setResolving(false)}
          onSaved={() => {
            setResolving(false)
            onChanged()
          }}
        />
      )}
    </div>
  )
}
