import { useState } from 'react'

// Khung nền kem + thẻ trắng bo góc
export function AuthShell({ children }) {
  return (
    <div className="flex min-h-[calc(100vh-61px)] items-start justify-center bg-[#f8f5ea] px-4 py-10 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">{children}</div>
    </div>
  )
}

export function BackTitle({ title, onBack }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <button type="button" onClick={onBack} aria-label="Quay lại" className="rounded-full p-1 hover:bg-gray-100">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <h1 className="text-2xl">{title}</h1>
    </div>
  )
}

const lineBase = 'relative border-b transition-colors'
const lineColor = (error) => (error ? 'border-red-500' : 'border-gray-400 focus-within:border-gray-900')

// Ô nhập kiểu gạch chân, nhãn nổi lên khi có chữ. type="password" có nút hiện/ẩn.
export function Field({ label, error, type = 'text', ...props }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const alwaysFloat = type === 'date'

  return (
    <div>
      <div className={`${lineBase} ${lineColor(error)}`}>
        <input
          {...props}
          type={isPassword && show ? 'text' : type}
          placeholder=" "
          className="peer w-full bg-transparent pb-2 pt-6 pr-10 text-base outline-none"
        />
        <label
          className={`pointer-events-none absolute left-0 origin-left transition-all ${
            alwaysFloat
              ? 'top-1 text-xs'
              : 'top-6 text-base peer-focus:top-1 peer-focus:text-xs peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-xs'
          } ${error ? 'text-red-500' : 'text-gray-500'}`}
        >
          {label}
        </label>
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {!show && <path d="M3 3l18 18" />}
            </svg>
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  )
}

export function SelectField({ placeholder, options, error, disabled, ...props }) {
  return (
    <div>
      <div className={`${lineBase} ${lineColor(error)}`}>
        <select
          {...props}
          disabled={disabled}
          className={`w-full appearance-none bg-transparent py-4 pr-8 text-base outline-none disabled:opacity-50 ${
            props.value ? 'text-gray-900' : 'text-gray-500'
          }`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2" width="12" height="8" viewBox="0 0 12 8" fill="currentColor">
          <path d="M0 0l6 8 6-8z" />
        </svg>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  )
}

export function RadioGroup({ label, name, value, onChange, options }) {
  return (
    <div>
      <p className="mb-3 text-base text-gray-600">{label}</p>
      <div className="flex gap-6">
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#a8975a] text-transparent transition peer-checked:border-gray-900 peer-checked:bg-gray-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-gray-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </span>
            <span className="text-base">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

export function PasswordRules({ rules, password }) {
  return (
    <ul className="space-y-2">
      {rules.map((r) => {
        const ok = r.test(password)
        return (
          <li key={r.id} className="flex items-center gap-2 text-[15px]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ok ? '#16a34a' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9.5" />
              <path d="M8 12.5l3 3 5-6" />
            </svg>
            <span className={ok ? 'text-gray-900' : 'text-gray-700'}>{r.label}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function PrimaryButton({ loading, disabled, children, ...props }) {
  const off = disabled || loading
  return (
    <button
      type="submit"
      disabled={off}
      {...props}
      className={`h-14 w-full rounded-xl text-lg font-bold transition ${
        off ? 'cursor-not-allowed bg-gray-200 text-gray-500' : 'bg-[#231f20] text-[#e3d9a5] hover:bg-black'
      }`}
    >
      {loading ? 'Đang xử lý...' : children}
    </button>
  )
}

export function FormError({ message }) {
  if (!message) return null
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{message}</p>
}
