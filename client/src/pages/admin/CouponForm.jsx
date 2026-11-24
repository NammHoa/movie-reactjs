import { useState } from 'react'
import api from '../../api/axios'
import { errorMessage } from '../../lib/errors'
import { toLocalInput } from '../../lib/movie'
import { FormModal, Row, inputCls } from './ui'

const toForm = (c) => ({
  code: c?.code ?? '',
  type: c?.type ?? 'percent',
  value: c?.value ?? '',
  maxDiscount: c?.maxDiscount ?? '',
  minOrder: c?.minOrder ?? 0,
  startsAt: c?.startsAt ? toLocalInput(c.startsAt) : '',
  expiresAt: c?.expiresAt ? toLocalInput(c.expiresAt) : '',
  usageLimit: c?.usageLimit ?? '',
  active: c?.active ?? true,
})

const numberOrNull = (v) => (v === '' || v === null ? null : Number(v))
const isoOrNull = (v) => (v ? new Date(v).toISOString() : null)

// Form thêm / sửa mã giảm giá. coupon = null: thêm mới. Mã không đổi được sau khi tạo.
export default function CouponForm({ coupon, onClose, onSaved }) {
  const [form, setForm] = useState(() => toForm(coupon))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const percent = form.type === 'percent'

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        type: form.type,
        value: Number(form.value),
        maxDiscount: percent ? numberOrNull(form.maxDiscount) : null,
        minOrder: Number(form.minOrder || 0),
        startsAt: isoOrNull(form.startsAt),
        expiresAt: isoOrNull(form.expiresAt),
        usageLimit: numberOrNull(form.usageLimit),
        active: form.active,
      }
      if (coupon) await api.put(`/admin/coupons/${coupon._id}`, payload)
      else await api.post('/admin/coupons', { ...payload, code: form.code })
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Không thể lưu mã giảm giá'))
      setSaving(false)
    }
  }

  return (
    <FormModal title={coupon ? `Sửa mã ${coupon.code}` : 'Thêm mã giảm giá'} onSubmit={submit} onClose={onClose} saving={saving} error={error}>
      <Row label="Mã *">
        <input
          className={`${inputCls} font-mono uppercase`}
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          maxLength={20}
          placeholder="VD: SUMMER10"
          autoComplete="off"
          spellCheck={false}
          required
          disabled={!!coupon}
          autoFocus={!coupon}
        />
        <span className="mt-1 block text-xs text-gray-500">4-20 ký tự: chữ, số, gạch ngang hoặc gạch dưới. Không đổi được sau khi tạo.</span>
      </Row>

      <Row label="Loại giảm giá">
        <select className={inputCls} value={form.type} onChange={set('type')}>
          <option value="percent">Theo phần trăm (%)</option>
          <option value="fixed">Số tiền cố định (đ)</option>
        </select>
      </Row>

      <div className="grid gap-4 sm:grid-cols-2">
        <Row label={percent ? 'Phần trăm giảm (1-100) *' : 'Số tiền giảm (đ) *'}>
          <input className={inputCls} type="number" inputMode="numeric" min={percent ? 1 : 1000} max={percent ? 100 : 10000000} step={percent ? 1 : 1000} value={form.value} onChange={set('value')} required />
        </Row>
        {percent && (
          <Row label="Giảm tối đa (đ)">
            <input className={inputCls} type="number" inputMode="numeric" min="1000" max="10000000" step="1000" value={form.maxDiscount} onChange={set('maxDiscount')} placeholder="Không giới hạn" />
          </Row>
        )}
      </div>

      <Row label="Đơn tối thiểu (đ)">
        <input className={inputCls} type="number" inputMode="numeric" min="0" max="10000000" step="1000" value={form.minOrder} onChange={set('minOrder')} />
      </Row>

      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Bắt đầu">
          <input className={inputCls} type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
        </Row>
        <Row label="Hết hạn">
          <input className={inputCls} type="datetime-local" value={form.expiresAt} onChange={set('expiresAt')} />
        </Row>
      </div>

      <Row label="Tổng số lượt dùng">
        <input className={inputCls} type="number" inputMode="numeric" min={Math.max(1, coupon?.usedCount ?? 1)} max="1000000" step="1" value={form.usageLimit} onChange={set('usageLimit')} placeholder="Không giới hạn" />
        <span className="mt-1 block text-xs text-gray-500">Mỗi tài khoản chỉ dùng một mã một lần.</span>
      </Row>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="h-4 w-4" />
        Đang bật (khách có thể dùng)
      </label>
    </FormModal>
  )
}
