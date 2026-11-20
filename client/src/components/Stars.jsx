// Hiển thị điểm (cho phép số lẻ như 3.7) bằng cách cắt lớp sao vàng theo tỉ lệ phần trăm
export function Stars({ value = 0, className = 'text-base' }) {
  const percent = Math.max(0, Math.min(5, value)) * 20
  return (
    <span role="img" aria-label={`${value} trên 5 sao`} className={`relative inline-block leading-none ${className}`}>
      <span className="text-gray-300" aria-hidden="true">★★★★★</span>
      <span className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-amber-400" style={{ width: `${percent}%` }} aria-hidden="true">
        ★★★★★
      </span>
    </span>
  )
}

// Chọn điểm 1-5. Mỗi sao là một nút cao 40px để bấm được bằng ngón tay trên điện thoại.
export function StarInput({ value, onChange, disabled }) {
  return (
    <div role="radiogroup" aria-label="Điểm đánh giá" className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} sao`}
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`h-10 w-10 text-3xl leading-none transition disabled:opacity-50 ${n <= value ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
