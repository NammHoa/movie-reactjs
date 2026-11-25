import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { Field, FormError, PasswordRules, PrimaryButton, RadioGroup, RateLimitNotice, SelectField } from '../../components/AuthUI'
import { useAuth } from '../../context/AuthContext'
import { errorMessage, formatCountdown, isRateLimited, retryAfterOf } from '../../lib/errors'
import { useCooldown } from '../../lib/useCooldown'
import { useGeo } from '../../lib/useGeo'
import { PASSWORD_RULES, PHONE_RE, isPasswordValid, normalizePhone } from '../../lib/validators'

const todayStr = () => new Date().toISOString().slice(0, 10)

const GENDERS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
]

const toForm = (p) => ({
  name: p.name ?? '',
  phone: p.phone ?? '',
  dob: p.dob ? p.dob.slice(0, 10) : '',
  gender: p.gender ?? '',
  city: p.city ?? '',
  district: p.district ?? '',
  address: p.address ?? '',
})

// Giá trị đang lưu có thể không nằm trong danh sách tỉnh / quận (nhập tay trước đây): vẫn phải hiện ra
const withCurrent = (names, current) => {
  const list = names.includes(current) || !current ? names : [current, ...names]
  return list.map((n) => ({ value: n, label: n }))
}

function Card({ title, hint, children }) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Success({ children }) {
  if (!children) return null
  return (
    <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
      {children}
    </p>
  )
}

function InfoForm({ profile, onSaved }) {
  const [base, setBase] = useState(() => toForm(profile))
  const [form, setForm] = useState(base)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const { provinces, districts, geoFailed } = useGeo(form.city)

  const set = (name) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [name]: value, ...(name === 'city' ? { district: '' } : {}) }))
    setErrors((er) => ({ ...er, [name]: undefined }))
    setSaved(false)
  }

  // Chỉ gửi những trường đã đổi
  const normalized = { ...form, name: form.name.trim(), phone: normalizePhone(form.phone), address: form.address.trim() }
  const changes = Object.fromEntries(Object.entries(normalized).filter(([k, v]) => v !== base[k]))
  const dirty = Object.keys(changes).length > 0

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!normalized.name) next.name = 'Vui lòng nhập họ tên'
    if (!PHONE_RE.test(normalized.phone)) next.phone = 'Số điện thoại không hợp lệ'
    if ('dob' in changes && (!normalized.dob || normalized.dob > todayStr())) next.dob = 'Ngày sinh không hợp lệ'
    setErrors(next)
    if (Object.keys(next).length || !dirty) return

    setLoading(true)
    setFormError('')
    setSaved(false)
    try {
      const { data } = await api.patch('/auth/profile', changes)
      const fresh = toForm(data.user)
      setBase(fresh)
      setForm(fresh)
      setSaved(true)
      onSaved(data.user)
    } catch (err) {
      if (err.response?.status === 409) setErrors({ phone: errorMessage(err) })
      else setFormError(errorMessage(err, 'Không thể lưu thông tin'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="min-w-0 rounded-lg bg-gray-50 px-3 py-2">
        <p className="text-xs text-gray-500">Email (dùng để đăng nhập, không đổi được)</p>
        <p className="break-all font-medium">{profile.email}</p>
      </div>
      <Field label="Họ tên" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" maxLength={100} />
      <Field label="Số điện thoại" inputMode="tel" value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" />
      <Field label="Ngày sinh" type="date" max={todayStr()} value={form.dob} onChange={set('dob')} error={errors.dob} />
      <RadioGroup
        label="Giới tính:"
        name="profile-gender"
        value={form.gender}
        onChange={(g) => {
          setForm((f) => ({ ...f, gender: g }))
          setSaved(false)
        }}
        options={GENDERS}
      />

      {geoFailed ? (
        <>
          <Field label="Tỉnh / Thành phố" value={form.city} onChange={set('city')} />
          <Field label="Quận / Huyện" value={form.district} onChange={set('district')} />
        </>
      ) : (
        <>
          <SelectField
            placeholder={provinces === null ? 'Đang tải...' : 'Tỉnh / Thành phố'}
            options={withCurrent((provinces ?? []).map((p) => p.name), form.city)}
            value={form.city}
            onChange={set('city')}
            disabled={provinces === null}
          />
          <SelectField
            placeholder="Quận / Huyện"
            options={withCurrent(districts, form.district)}
            value={form.district}
            onChange={set('district')}
            disabled={!form.city}
          />
        </>
      )}
      <Field label="Địa chỉ" value={form.address} onChange={set('address')} autoComplete="street-address" maxLength={200} />

      <FormError message={formError} />
      <Success>{saved && 'Đã lưu thông tin.'}</Success>
      <PrimaryButton disabled={!dirty} loading={loading}>Lưu thay đổi</PrimaryButton>
    </form>
  )
}

// Công tắc bật/tắt email nhắc giờ chiếu: lưu ngay khi gạt, lỗi thì trả về trạng thái cũ
function ReminderSwitch({ profile }) {
  const [on, setOn] = useState(profile.emailReminders !== false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  const toggle = async () => {
    const next = !on
    setOn(next)
    setBusy(true)
    setError('')
    setSaved('')
    try {
      await api.patch('/auth/profile', { emailReminders: next })
      setSaved(next ? 'Đã bật email nhắc giờ chiếu.' : 'Đã tắt email nhắc giờ chiếu.')
    } catch (err) {
      setOn(!next)
      setError(errorMessage(err, 'Không thể lưu cài đặt'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p id="reminder-label" className="font-medium">Email nhắc giờ chiếu</p>
          <p id="reminder-hint" className="mt-0.5 break-words text-sm text-gray-500">
            Nhận email vài giờ trước suất chiếu, kèm mã QR, gửi tới {profile.email}.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="reminder-label"
          aria-describedby="reminder-hint"
          onClick={toggle}
          disabled={busy}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60 ${on ? 'bg-brand' : 'bg-gray-300'}`}
        >
          <span className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : ''}`} />
        </button>
      </div>
      <FormError message={error} />
      <Success>{saved}</Success>
    </div>
  )
}

const emptyPw = { current: '', next: '', confirm: '' }

function PasswordForm() {
  const { user, login } = useAuth()
  const [pw, setPw] = useState(emptyPw)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const cooldown = useCooldown()
  const blocked = cooldown.secondsLeft > 0

  const set = (name) => (e) => {
    const value = e.target.value
    setPw((p) => ({ ...p, [name]: value }))
    setErrors((er) => ({ ...er, [name]: undefined }))
    setFormError('')
    setDone(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!pw.current) next.current = 'Vui lòng nhập mật khẩu hiện tại'
    if (!isPasswordValid(pw.next)) next.next = 'Mật khẩu mới chưa đáp ứng các yêu cầu bên dưới'
    else if (pw.next === pw.current) next.next = 'Mật khẩu mới phải khác mật khẩu hiện tại'
    if (pw.confirm !== pw.next) next.confirm = 'Mật khẩu nhập lại không khớp'
    setErrors(next)
    if (Object.keys(next).length) return

    setLoading(true)
    setFormError('')
    setDone(false)
    try {
      const { data } = await api.post('/auth/change-password', { currentPassword: pw.current, newPassword: pw.next })
      // Server đã vô hiệu các token cũ: phải dùng token mới thì phiên này mới không bị đăng xuất
      login(user, data.token, data.refreshToken)
      setPw(emptyPw)
      cooldown.clear()
      setDone(true)
    } catch (err) {
      if (isRateLimited(err)) cooldown.start(retryAfterOf(err) || 60)
      else if (err.response?.status === 403) setErrors({ current: errorMessage(err) })
      else setFormError(errorMessage(err, 'Không thể đổi mật khẩu'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Mật khẩu hiện tại" type="password" value={pw.current} onChange={set('current')} error={errors.current} autoComplete="current-password" maxLength={64} />
      <Field label="Mật khẩu mới" type="password" value={pw.next} onChange={set('next')} error={errors.next} autoComplete="new-password" maxLength={64} />
      <PasswordRules rules={PASSWORD_RULES} password={pw.next} />
      <Field label="Nhập lại mật khẩu mới" type="password" value={pw.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" maxLength={64} />

      <FormError message={formError} />
      <RateLimitNotice secondsLeft={cooldown.secondsLeft} />
      <Success>{done && 'Đã đổi mật khẩu. Các thiết bị khác đang đăng nhập sẽ phải đăng nhập lại.'}</Success>
      <PrimaryButton disabled={!pw.current || !pw.next || !pw.confirm || blocked} loading={loading}>
        {blocked ? `Thử lại sau ${formatCountdown(cooldown.secondsLeft)}` : 'Đổi mật khẩu'}
      </PrimaryButton>
    </form>
  )
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [reload, setReload] = useState(0)
  const [state, setState] = useState({ profile: null, error: '' })

  useEffect(() => {
    let cancelled = false
    api
      .get('/auth/profile')
      .then(({ data }) => !cancelled && setState({ profile: data.user, error: '' }))
      .catch((err) => !cancelled && setState({ profile: null, error: errorMessage(err, 'Không thể tải hồ sơ') }))
    return () => {
      cancelled = true
    }
  }, [reload])

  const { profile, error } = state

  // Giữ thanh menu đồng bộ (tên hiển thị "Xin chào, ...") khi vừa lưu
  const onSaved = (p) => updateUser({ ...user, id: p.id, name: p.name, email: p.email, phone: p.phone, role: p.role })

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="border-l-4 border-brand pl-3 text-2xl font-bold">Hồ sơ của tôi</h1>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          <p>{error}</p>
          <button onClick={() => setReload((r) => r + 1)} className="mt-2 font-semibold underline">Thử lại</button>
        </div>
      )}
      {!profile && !error && <p className="text-gray-500">Đang tải...</p>}

      {profile && (
        <>
          <Card title="Thông tin cá nhân">
            <InfoForm profile={profile} onSaved={onSaved} />
          </Card>
          <Card title="Thông báo">
            <ReminderSwitch profile={profile} />
          </Card>
          <Card title="Đổi mật khẩu" hint="Sau khi đổi, các thiết bị khác sẽ bị đăng xuất.">
            <PasswordForm />
          </Card>
        </>
      )}
    </main>
  )
}
