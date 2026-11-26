// Phân loại độ tuổi. Danh sách mã phải khớp với AGE_RATINGS ở server/src/models/Movie.js
export const AGE_INFO = {
  P: { label: 'Mọi lứa tuổi', cls: 'bg-green-600' },
  K: { label: 'Dưới 13 tuổi xem cùng người giám hộ', cls: 'bg-amber-500' },
  T13: { label: 'Từ 13 tuổi', cls: 'bg-blue-600' },
  T16: { label: 'Từ 16 tuổi', cls: 'bg-pink-600' },
  T18: { label: 'Từ 18 tuổi', cls: 'bg-red-600' },
}
