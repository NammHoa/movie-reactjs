// Các form của trụ sở cho tài khoản chi nhánh (quản lý rạp)
import { useState } from 'react'
import api from '../../api/axios'
import { PasswordRules } from '../../components/AuthUI'
import { errorMessage } from '../../lib/errors'
import { PASSWORD_RULES, isPasswordValid } from '../../lib/validators'
import { FormModal, Row, inputCls } from './ui'

const PASSWORD_ERROR = 'Mật khẩu chưa đáp ứng các yêu cầu bên dưới'

// Chạy một lệnh lưu: khóa nút trong lúc chờ, lỗi thì hiện câu của server ngay trong form
function useSave(fallback) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async (request, onSaved) => {
    setSaving(true)
    setError('')
    try {
      await request()
      onSaved()
    } catch (err) {
      setError(errorMessage(err, fallback))
      setSaving(false)
    }
  }
  return { saving, error, setError, save }
}

function CinemaSelect({ cinemas, value, onChange }) {
  return (
    <Row label="Rạp *">
      <select className={inputCls} value={value} onChange={onChange} required>
        <option value="">— Chọn rạp —</option>
        {cinemas.map((c) => (
          <option key={c._id} value={c._id}>{c.name}</option>
        ))}
      </select>
    </Row>
  )
}

function PasswordInput({ label, value, onChange }) {
  return (
    <>
      <Row label={label}>
        <input className={inputCls} type="password" value={value} onChange={onChange} autoComplete="new-password" maxLength={64} required />
      </Row>
      <PasswordRules rules={PASSWORD_RULES} password={value} />
    </>
  )
}

export function CreateManagerForm({ cinemas, onClose, onSaved }) {
  const [form, setForm] = useState({ username: '', name: '', email: '', cinema: '', password: '' })
  const { saving, error, setError, save } = useSave('Không thể tạo tài khoản')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    if (!isPasswordValid(form.password)) return setError(PASSWORD_ERROR)
    save(() => api.post('/admin/users/managers', form), () => onSaved(`Đã tạo tài khoản ${form.username.trim().toLowerCase()}.`))
  }

  return (
    <FormModal title="Tạo tài khoản quản lý rạp" onSubmit={submit} onClose={onClose} saving={saving} error={error}>
      <Row label="Tên đăng nhập *">
        <input className={inputCls} value={form.username} onChange={set('username')} placeholder="Ví dụ: svh.denim" maxLength={30} autoCapitalize="none" autoComplete="off" spellCheck={false} required autoFocus />
        <span className="mt-1 block text-xs text-gray-500">4–30 ký tự: chữ thường, số, dấu chấm, có ít nhất một chữ. Không đổi được sau khi tạo.</span>
      </Row>
      <Row label="Họ tên *">
        <input className={inputCls} value={form.name} onChange={set('name')} maxLength={100} autoComplete="off" required />
      </Row>
      <Row label="Email liên hệ *">
        <input className={inputCls} type="email" value={form.email} onChange={set('email')} autoComplete="off" required />
      </Row>
      <CinemaSelect cinemas={cinemas} value={form.cinema} onChange={set('cinema')} />
      <PasswordInput label="Mật khẩu tạm *" value={form.password} onChange={set('password')} />
      <p className="text-sm text-gray-500">Nhắc người nhận đổi mật khẩu ở trang Hồ sơ sau lần đăng nhập đầu.</p>
    </FormModal>
  )
}

// Dùng cho cả "Đổi rạp" và "Cấp lại quyền" (tài khoản đã bị gỡ quyền quản lý)
export function AssignCinemaForm({ account, cinemas, onClose, onSaved }) {
  const restore = account.role !== 'manager'
  const [cinema, setCinema] = useState(account.cinema?._id ?? '')
  const { saving, error, save } = useSave('Không thể lưu')

  const submit = (e) => {
    e.preventDefault()
    save(
      () => api.patch(`/admin/users/${account._id}/manager`, { cinema }),
      () => onSaved(restore ? `Đã cấp lại quyền quản lý cho ${account.username}.` : `Đã đổi rạp cho ${account.username}.`),
    )
  }

  return (
    <FormModal title={restore ? 'Cấp lại quyền quản lý' : 'Đổi rạp'} onSubmit={submit} onClose={onClose} saving={saving} error={error}>
      <p className="break-words text-sm text-gray-600">Tài khoản <b>{account.username}</b> ({account.name}). Quyền mới có hiệu lực ngay.</p>
      <CinemaSelect cinemas={cinemas} value={cinema} onChange={(e) => setCinema(e.target.value)} />
    </FormModal>
  )
}

export function ResetPasswordForm({ account, onClose, onSaved }) {
  const [password, setPassword] = useState('')
  const { saving, error, setError, save } = useSave('Không thể đặt lại mật khẩu')

  const submit = (e) => {
    e.preventDefault()
    if (!isPasswordValid(password)) return setError(PASSWORD_ERROR)
    save(() => api.post(`/admin/users/${account._id}/password`, { password }), () => onSaved(`Đã đặt lại mật khẩu cho ${account.username}.`))
  }

  return (
    <FormModal title="Đặt lại mật khẩu" onSubmit={submit} onClose={onClose} saving={saving} error={error}>
      <p className="break-words text-sm text-gray-600">Tài khoản <b>{account.username}</b> sẽ bị đăng xuất khỏi mọi thiết bị.</p>
      <PasswordInput label="Mật khẩu mới *" value={password} onChange={(e) => setPassword(e.target.value)} />
    </FormModal>
  )
}
