// Đưa chỉ số về trong khoảng [0, count), quay vòng ở hai đầu
export const wrapIndex = (i, count) => (count > 0 ? ((i % count) + count) % count : 0)

// Ảnh có vị trí cuộn gần scrollLeft nhất (0 nếu chưa có ảnh)
export function nearestIndex(scrollLeft, offsets) {
  let best = 0
  for (let i = 1; i < offsets.length; i++) {
    if (Math.abs(offsets[i] - scrollLeft) < Math.abs(offsets[best] - scrollLeft)) best = i
  }
  return best
}
