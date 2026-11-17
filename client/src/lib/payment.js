import api from '../api/axios'

// Giao dịch kèm đơn đặt vé đầy đủ (phim, rạp, ghế...) để hiển thị
export async function loadPayment(id) {
  const { data: payment } = await api.get(`/payments/${id}`)
  const { data: booking } = await api.get(`/bookings/${payment.booking._id}`)
  return { payment, booking }
}
