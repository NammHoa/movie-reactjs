export const STATUS_LABELS = {
  now_showing: 'Đang chiếu',
  coming_soon: 'Sắp chiếu',
  ended: 'Ngừng chiếu',
}

export const STATUS_STYLES = {
  now_showing: 'bg-green-100 text-green-700',
  coming_soon: 'bg-amber-100 text-amber-700',
  ended: 'bg-gray-200 text-gray-600',
}

export const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')
