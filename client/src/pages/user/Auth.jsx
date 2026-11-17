import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import {
  AuthShell,
  BackTitle,
  Field,
  FormError,
  PasswordRules,
  PrimaryButton,
  RadioGroup,
  SelectField,
} from '../../components/AuthUI'
import { PASSWORD_RULES, PHONE_RE, EMAIL_RE, isPasswordValid, normalizePhone, parseIdentifier } from '../../lib/validators'

const GEO_API = 'https://provinces.open-api.vn/api/v1'
const todayStr = () => new Date().toISOString().slice(0, 10)

const emptyReg = {
  phone: '', email: '', password: '',
  name: '', dob: '', gender: '', city: '', district: '', address: '',
}

// Luồng: identify -> (login) | (register1 -> register2)
export default function Auth() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [step, setStep] = useState('identify')
  const [identifier, setIdentifier] = useState('')
  const [account, setAccount] = useState(null) // { type, value } sau khi kiểm tra
  const [password, setPassword] = useState('')
  const [reg, setReg] = useState(emptyReg)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  // Tỉnh / quận lấy từ API công khai; nếu lỗi thì cho nhập tay
  const [provinces, setProvinces] = useState(null)
  const [districtData, setDistrictData] = useState({ city: '', list: [] })
  const districts = districtData.city === reg.city ? districtData.list : []
  const geoFailed = provinces !== null && provinces.length === 0

  useEffect(() => {
    if (step !== 'register2' || provinces !== null) return
    fetch(`${GEO_API}/?depth=1`)
      .then((r) => r.json())
      .then((list) => setProvinces(list.map((p) => ({ code: p.code, name: p.name }))))
      .catch(() => setProvinces([]))
  }, [step, provinces])

  useEffect(() => {
    const province = provinces?.find((p) => p.name === reg.city)
    if (!province) return
    let cancelled = false
    fetch(`${GEO_API}/p/${province.code}?depth=2`)
      .then((r) => r.json())
      .then((data) => !cancelled && setDistrictData({ city: reg.city, list: data.districts.map((d) => d.name) }))
      .catch(() => !cancelled && setDistrictData({ city: reg.city, list: [] }))
    return () => {
      cancelled = true
    }
  }, [reg.city, provinces])

  const goto = (next) => {
    setErrors({})
    setFormError('')
    setNotice('')
    setStep(next)
  }

  const setRegField = (name) => (e) => {
    const value = e.target.value
    setReg((r) => ({ ...r, [name]: value, ...(name === 'city' ? { district: '' } : {}) }))
    setErrors((er) => ({ ...er, [name]: undefined }))
  }

  const finish = (data) => {
    login(data.user, data.token)
    // Quay lại trang đang xem dở (vd. trang chọn ghế) nếu có, chỉ nhận đường dẫn nội bộ
    const from = location.state?.from
    const back = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null
    navigate(back ?? (data.user.role === 'admin' ? '/admin' : '/'))
  }

  const apiError = (err) => err.response?.data?.message || 'Không thể kết nối tới máy chủ'

  // ---- Bước 1: nhập SĐT / Email ----
  const submitIdentify = async (e) => {
    e.preventDefault()
    const parsed = parseIdentifier(identifier)
    if (!parsed) return setErrors({ identifier: 'Vui lòng nhập số điện thoại hoặc email hợp lệ' })

    setLoading(true)
    setFormError('')
    try {
      const { data } = await api.post('/auth/check', { identifier: parsed.value })
      setAccount(parsed)
      if (data.exists) {
        setPassword('')
        goto('login')
      } else {
        setReg({
          ...emptyReg,
          phone: parsed.type === 'phone' ? parsed.value : '',
          email: parsed.type === 'email' ? parsed.value : '',
        })
        goto('register1')
      }
    } catch (err) {
      setFormError(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  // ---- Đăng nhập ----
  const submitLogin = async (e) => {
    e.preventDefault()
    if (!password) return setErrors({ password: 'Mật khẩu không được để trống' })

    setLoading(true)
    setFormError('')
    try {
      const { data } = await api.post('/auth/login', { identifier: account.value, password })
      finish(data)
    } catch (err) {
      setFormError(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  // ---- Đăng ký, bước 1: SĐT / Email / Mật khẩu ----
  const submitRegister1 = (e) => {
    e.preventDefault()
    const next = {}
    if (!PHONE_RE.test(normalizePhone(reg.phone))) next.phone = 'Số điện thoại không hợp lệ'
    if (!EMAIL_RE.test(reg.email.trim())) next.email = 'Email không hợp lệ'
    if (!isPasswordValid(reg.password)) next.password = 'Mật khẩu chưa đáp ứng các yêu cầu bên dưới'
    setErrors(next)
    if (Object.keys(next).length === 0) goto('register2')
  }

  // ---- Đăng ký, bước 2: thông tin cá nhân ----
  const submitRegister2 = async (e) => {
    e.preventDefault()
    const next = {}
    if (!reg.name.trim()) next.name = 'Vui lòng nhập họ tên'
    if (!reg.dob || reg.dob > todayStr()) next.dob = 'Ngày sinh không hợp lệ'
    if (!reg.gender) next.gender = 'Vui lòng chọn giới tính'
    setErrors(next)
    if (Object.keys(next).length) return

    setLoading(true)
    setFormError('')
    try {
      const { data } = await api.post('/auth/register', {
        ...reg,
        phone: normalizePhone(reg.phone),
        email: reg.email.trim(),
      })
      finish(data)
    } catch (err) {
      setFormError(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  // ================= GIAO DIỆN =================
  if (step === 'identify') {
    return (
      <AuthShell>
        <form onSubmit={submitIdentify} className="space-y-8" noValidate>
          <h1 className="text-3xl leading-snug">
            Đăng nhập hoặc <br /> Tạo tài khoản
          </h1>
          <p className="text-base">Vui lòng đăng nhập để nhận nhiều ưu đãi</p>
          <Field
            label="Số điện thoại / Email"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value)
              setErrors({})
            }}
            error={errors.identifier}
            autoComplete="username"
            autoFocus
          />
          <FormError message={formError} />
          <PrimaryButton disabled={!identifier.trim()} loading={loading}>
            Tiếp tục
          </PrimaryButton>
        </form>
      </AuthShell>
    )
  }

  if (step === 'login') {
    return (
      <AuthShell>
        <BackTitle title="Đăng nhập" onBack={() => goto('identify')} />
        <form onSubmit={submitLogin} className="space-y-6" noValidate>
          <div className="pt-6 text-center">
            <p>Bạn đang đăng nhập với</p>
            <p className="mt-1 text-lg font-bold">{account.value}</p>
          </div>
          <Field
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setErrors({})
              setFormError('')
            }}
            error={errors.password}
            autoComplete="current-password"
            autoFocus
          />
          <FormError message={formError} />
          <PrimaryButton loading={loading}>Đăng nhập</PrimaryButton>
          <div className="flex justify-between pt-8 text-sm">
            <button type="button" onClick={() => setNotice('Tính năng quên mật khẩu đang được phát triển')} className="underline">
              Quên mật khẩu
            </button>
            <button type="button" onClick={() => setNotice('Đăng nhập bằng Email OTP đang được phát triển')} className="underline">
              Đăng nhập với Email OTP
            </button>
          </div>
          {notice && <p className="text-center text-sm text-gray-500">{notice}</p>}
        </form>
      </AuthShell>
    )
  }

  if (step === 'register1') {
    const filled = reg.phone && reg.email && reg.password
    return (
      <AuthShell>
        <BackTitle title="Tạo tài khoản" onBack={() => goto('identify')} />
        <form onSubmit={submitRegister1} className="space-y-6" noValidate>
          <Field label="Số điện thoại" inputMode="tel" value={reg.phone} onChange={setRegField('phone')} error={errors.phone} autoComplete="tel" />
          <Field label="Email" type="email" value={reg.email} onChange={setRegField('email')} error={errors.email} autoComplete="email" />
          <Field label="Mật khẩu" type="password" value={reg.password} onChange={setRegField('password')} error={errors.password} autoComplete="new-password" maxLength={64} />
          <PasswordRules rules={PASSWORD_RULES} password={reg.password} />
          <PrimaryButton disabled={!filled}>Tiếp tục</PrimaryButton>
        </form>
      </AuthShell>
    )
  }

  // register2
  const filled2 = reg.name.trim() && reg.dob && reg.gender
  return (
    <AuthShell>
      <BackTitle title="Tạo tài khoản" onBack={() => goto('register1')} />
      <form onSubmit={submitRegister2} className="space-y-5" noValidate>
        <Field label="Họ tên" value={reg.name} onChange={setRegField('name')} error={errors.name} autoComplete="name" />
        <Field label="Ngày sinh" type="date" max={todayStr()} value={reg.dob} onChange={setRegField('dob')} error={errors.dob} />
        <div>
          <RadioGroup
            label="Giới tính:"
            name="gender"
            value={reg.gender}
            onChange={(g) => {
              setReg((r) => ({ ...r, gender: g }))
              setErrors((er) => ({ ...er, gender: undefined }))
            }}
            options={[
              { value: 'male', label: 'Nam' },
              { value: 'female', label: 'Nữ' },
              { value: 'other', label: 'Khác' },
            ]}
          />
          {errors.gender && <p className="mt-1.5 text-sm text-red-500">{errors.gender}</p>}
        </div>

        {geoFailed ? (
          <>
            <Field label="Tỉnh / Thành phố" value={reg.city} onChange={setRegField('city')} />
            <Field label="Quận / Huyện" value={reg.district} onChange={setRegField('district')} />
          </>
        ) : (
          <>
            <SelectField
              placeholder={provinces === null ? 'Đang tải...' : 'Tỉnh / Thành phố'}
              options={(provinces ?? []).map((p) => ({ value: p.name, label: p.name }))}
              value={reg.city}
              onChange={setRegField('city')}
              disabled={provinces === null}
            />
            <SelectField
              placeholder="Quận / Huyện"
              options={districts.map((d) => ({ value: d, label: d }))}
              value={reg.district}
              onChange={setRegField('district')}
              disabled={!reg.city}
            />
          </>
        )}
        <Field label="Địa chỉ" value={reg.address} onChange={setRegField('address')} autoComplete="street-address" />

        <FormError message={formError} />
        <PrimaryButton disabled={!filled2} loading={loading}>
          Hoàn tất đăng ký
        </PrimaryButton>
      </form>
    </AuthShell>
  )
}
