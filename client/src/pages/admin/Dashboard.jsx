import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { errorMessage } from '../../lib/errors'
import { dayLabel, formatPrice } from '../../lib/movie'
import { ErrorText, PageHeader } from './ui'

const RANGES = [7, 30, 90]

const METRICS = [
  { key: 'revenue', label: 'Doanh thu', format: formatPrice },
  { key: 'tickets', label: 'Số vé', format: (n) => `${n.toLocaleString('vi-VN')} vé` },
]

const STATUS_ROWS = [
  { key: 'paid', label: 'Đã thanh toán', dot: 'bg-green-500' },
  { key: 'pending', label: 'Chờ thanh toán', dot: 'bg-amber-500' },
  { key: 'cancelled', label: 'Đã hủy', dot: 'bg-gray-400' },
  { key: 'expired', label: 'Hết hạn', dot: 'bg-gray-300' },
  { key: 'refunding', label: 'Đang hoàn tiền', dot: 'bg-amber-300' },
  { key: 'refunded', label: 'Đã hoàn tiền', dot: 'bg-gray-500' },
]

const shortDate = (key) => `${key.slice(8, 10)}/${key.slice(5, 7)}`
const number = (n) => Number(n).toLocaleString('vi-VN')

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm sm:p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 break-words text-xl font-bold text-brand sm:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function Card({ title, action, children }) {
  return (
    <section className="min-w-0 rounded-lg bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded border border-gray-300 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`h-8 whitespace-nowrap rounded px-3 text-sm font-medium transition ${value === o.value ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Biểu đồ cột: mỗi ngày một cột. Cột bao trọn chiều cao để dễ chạm trên điện thoại; chọn cột để xem chi tiết ngày đó.
function DailyChart({ daily }) {
  const [metric, setMetric] = useState('revenue')
  const [picked, setPicked] = useState(null)
  const m = METRICS.find((x) => x.key === metric)
  const other = METRICS.find((x) => x.key !== metric)
  const max = Math.max(0, ...daily.map((d) => d[metric]))
  const active = daily[picked ?? daily.length - 1]
  const middle = daily[Math.floor((daily.length - 1) / 2)]

  return (
    <Card
      title="Theo ngày"
      action={<Segmented options={METRICS.map((x) => ({ value: x.key, label: x.label }))} value={metric} onChange={setMetric} />}
    >
      <p className="mb-3 min-h-10 text-sm text-gray-600" aria-live="polite">
        <span className="font-semibold text-gray-900">{dayLabel(active.date)}</span>
        {' · '}
        <span className="font-bold text-brand">{m.format(active[metric])}</span>
        <span className="text-gray-400"> · {other.format(active[other.key])} · {number(active.bookings)} đơn</span>
      </p>
      <div className="flex h-44 items-end gap-px border-b border-gray-200 sm:h-56 sm:gap-0.5" onMouseLeave={() => setPicked(null)}>
        {daily.map((d, i) => (
          <button
            key={d.date}
            type="button"
            aria-label={`${dayLabel(d.date)}: ${m.format(d[metric])}`}
            onMouseEnter={() => setPicked(i)}
            onClick={() => setPicked(i)}
            onFocus={() => setPicked(i)}
            className="group flex h-full min-w-0 flex-1 items-end"
          >
            <span
              className={`block w-full rounded-t-sm transition-colors ${active === d ? 'bg-brand-dark' : 'bg-brand/60 group-hover:bg-brand'}`}
              style={{ height: `${max ? (d[metric] / max) * 100 : 0}%`, minHeight: 2 }}
            />
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-400">
        <span>{shortDate(daily[0].date)}</span>
        {daily.length > 2 && <span>{shortDate(middle.date)}</span>}
        <span>{shortDate(daily[daily.length - 1].date)}</span>
      </div>
      {max === 0 && <p className="mt-3 text-center text-sm text-gray-500">Chưa có đơn thanh toán trong khoảng này.</p>}
    </Card>
  )
}

function TopMovies({ movies }) {
  const max = Math.max(1, ...movies.map((m) => m.revenue))
  return (
    <Card title="Phim bán chạy">
      {movies.length === 0 ? (
        <p className="text-sm text-gray-500">Chưa có dữ liệu.</p>
      ) : (
        <ol className="space-y-4">
          {movies.map((m, i) => (
            <li key={m.movieId}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold">
                  <span className="mr-2 text-gray-400">{i + 1}</span>
                  {m.title}
                </p>
                <p className="shrink-0 text-sm font-bold text-brand">{formatPrice(m.revenue)}</p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-brand" style={{ width: `${(m.revenue / max) * 100}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-400">{number(m.tickets)} vé</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

function Overview({ status, counts }) {
  return (
    <Card title="Tình trạng hệ thống">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Đơn đặt vé (tất cả)</p>
      <ul className="mb-5 space-y-2">
        {STATUS_ROWS.map((s) => (
          <li key={s.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
            <span className="font-semibold">{number(status[s.key])}</span>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-3 gap-2 border-t pt-4 text-center">
        {[
          ['Phim đang chiếu', counts.nowShowing],
          ['Suất sắp tới', counts.upcomingShowtimes],
          ['Người dùng', counts.users],
        ].map(([label, value]) => (
          <div key={label}>
            <dd className="text-xl font-bold">{number(value)}</dd>
            <dt className="text-xs text-gray-500">{label}</dt>
          </div>
        ))}
      </dl>
    </Card>
  )
}

export default function Dashboard() {
  const [days, setDays] = useState(30)
  // Kết quả của lần tải gần nhất; giữ dữ liệu cũ (mờ đi) trong lúc tải khoảng ngày mới để trang không nhấp nháy
  const [done, setDone] = useState({ days: 0, data: null, error: '' })

  useEffect(() => {
    let cancelled = false
    api
      .get('/admin/stats', { params: { days } })
      .then(({ data }) => !cancelled && setDone({ days, data, error: '' }))
      .catch((err) => !cancelled && setDone((d) => ({ ...d, days, error: errorMessage(err, 'Không thể tải thống kê') })))
    return () => {
      cancelled = true
    }
  }, [days])

  const { data, error } = done
  const loading = done.days !== days

  return (
    <div>
      <PageHeader title="Tổng quan" action={<Segmented options={RANGES.map((d) => ({ value: d, label: `${d} ngày` }))} value={days} onChange={setDays} />} />
      <ErrorText message={error} />
      {!data && !error && <p className="text-gray-500">Đang tải...</p>}

      {data && (
        <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Doanh thu" value={formatPrice(data.summary.revenue)} hint={`${days} ngày gần nhất`} />
            <StatCard label="Vé đã bán" value={number(data.summary.tickets)} hint={`${days} ngày gần nhất`} />
            <StatCard label="Đơn đã thanh toán" value={number(data.summary.paidBookings)} hint={`${days} ngày gần nhất`} />
            <StatCard label="Chờ thanh toán" value={number(data.status.pending)} hint="Hiện tại" />
          </div>
          <DailyChart key={data.range.days} daily={data.daily} />
          <div className="grid gap-4 lg:grid-cols-2">
            <TopMovies movies={data.topMovies} />
            <Overview status={data.status} counts={data.counts} />
          </div>
        </div>
      )}
    </div>
  )
}
