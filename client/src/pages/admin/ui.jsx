export const inputCls =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-gray-100'

export function Row({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}

export function PageHeader({ title, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="border-l-4 border-brand pl-3 text-2xl font-bold">{title}</h1>
      {action}
    </div>
  )
}

export function ErrorText({ message }) {
  if (!message) return null
  return <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{message}</p>
}

export const primaryBtn = 'rounded bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60'

// Cửa sổ nổi chứa form
export function FormModal({ title, onSubmit, onClose, saving, error, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <form onSubmit={onSubmit} className="my-8 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-5 text-xl font-bold">{title}</h2>
        <div className="space-y-4">{children}</div>
        {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
            Hủy
          </button>
          <button type="submit" disabled={saving} className={`${primaryBtn} px-5`}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  )
}
