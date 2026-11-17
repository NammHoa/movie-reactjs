// Quy ước mã ghế: chữ cái của hàng + số ghế trong hàng. Ví dụ "A1", "B10".
// Phòng có tối đa 26 hàng (A–Z).

const rowLabel = (index) => String.fromCharCode(65 + index)

// Sơ đồ ghế dạng danh sách hàng: [{ row: 'A', seats: [{ code: 'A1', number: 1, booked: false }, ...] }, ...]
function buildSeatMap(rows, seatsPerRow, bookedSeats = []) {
  const booked = new Set(bookedSeats)
  return Array.from({ length: rows }, (_, r) => ({
    row: rowLabel(r),
    seats: Array.from({ length: seatsPerRow }, (_, i) => {
      const code = `${rowLabel(r)}${i + 1}`
      return { code, number: i + 1, booked: booked.has(code) }
    }),
  }))
}

module.exports = { rowLabel, buildSeatMap }
