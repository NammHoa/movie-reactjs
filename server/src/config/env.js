const DEFAULT_CLIENT_URL = 'http://localhost:5173'
const MIN_SECRET_LENGTH = 32

// Các giá trị mẫu công khai (nằm trong .env.example trên GitHub): ai cũng biết nên không được dùng làm khóa thật.
const PLACEHOLDER_SECRETS = ['doi_thanh_chuoi_bi_mat_cua_ban', 'secret', 'changeme', 'change_me', 'your_secret', 'jwt_secret']

const parseUrl = (v) => {
  try {
    const u = new URL(v)
    return ['http:', 'https:'].includes(u.protocol) ? u : null
  } catch {
    return null
  }
}

// Trả về { errors, warnings }. Lỗi làm server không khởi động; cảnh báo chỉ in ra.
// Cùng một lỗi cấu hình thì ở production là lỗi nặng, còn lúc dev chỉ cảnh báo để không cản việc code.
function validateEnv(env = process.env) {
  const production = env.NODE_ENV === 'production'
  const errors = []
  const warnings = []
  const strict = (msg) => (production ? errors : warnings).push(msg)

  if (!env.MONGO_URI) errors.push('Thiếu MONGO_URI (chuỗi kết nối MongoDB).')
  else if (!/^mongodb(\+srv)?:\/\//.test(env.MONGO_URI)) errors.push('MONGO_URI phải bắt đầu bằng mongodb:// hoặc mongodb+srv://')

  const secret = env.JWT_SECRET
  if (!secret) errors.push('Thiếu JWT_SECRET (khóa ký đăng nhập).')
  else {
    if (PLACEHOLDER_SECRETS.includes(secret.toLowerCase())) {
      strict('JWT_SECRET đang là giá trị mẫu công khai trong .env.example: ai cũng có thể tự tạo token đăng nhập (kể cả admin). Hãy tạo khóa ngẫu nhiên mới.')
    } else if (secret.length < MIN_SECRET_LENGTH) {
      strict(`JWT_SECRET quá ngắn (${secret.length} ký tự), cần ít nhất ${MIN_SECRET_LENGTH} ký tự ngẫu nhiên.`)
    }
  }

  if (env.PORT && !(Number.isInteger(Number(env.PORT)) && Number(env.PORT) > 0 && Number(env.PORT) < 65536)) {
    errors.push(`PORT không hợp lệ: "${env.PORT}"`)
  }

  if (!env.CLIENT_URL) {
    if (production) errors.push('Thiếu CLIENT_URL (địa chỉ website, dùng cho CORS). Production không được mặc định về localhost.')
  } else {
    const url = parseUrl(env.CLIENT_URL)
    if (!url) errors.push(`CLIENT_URL không hợp lệ: "${env.CLIENT_URL}" (ví dụ: https://tenmien.com)`)
    else {
      if (url.origin !== env.CLIENT_URL) warnings.push(`CLIENT_URL có đường dẫn hoặc dấu "/" ở cuối, server sẽ dùng "${url.origin}" cho CORS.`)
      if (production && url.protocol !== 'https:') warnings.push('CLIENT_URL ở production nên dùng https.')
    }
  }

  if (env.TRUST_PROXY && !(Number.isInteger(Number(env.TRUST_PROXY)) && Number(env.TRUST_PROXY) >= 0)) {
    errors.push(`TRUST_PROXY phải là số nguyên không âm (số proxy đứng trước server), hiện là "${env.TRUST_PROXY}"`)
  }

  if (env.HOLD_MINUTES && !(Number(env.HOLD_MINUTES) > 0)) {
    warnings.push(`HOLD_MINUTES không hợp lệ ("${env.HOLD_MINUTES}"), server sẽ dùng mặc định 10 phút.`)
  }

  if (production) {
    if (!env.PAYMENT_GATEWAY || env.PAYMENT_GATEWAY === 'mock') {
      warnings.push('Cổng thanh toán giả lập bị tắt ở production, nên khách sẽ không thanh toán được cho đến khi tích hợp cổng thật.')
    }
    if (env.RATE_LIMIT_OFF === 'true') warnings.push('RATE_LIMIT_OFF bị bỏ qua ở production, giới hạn request vẫn bật.')
  }

  return { errors, warnings }
}

// Origin dùng cho CORS, đã chuẩn hóa (bỏ "/" cuối và đường dẫn). Cấu hình sai thì quay về mặc định của môi trường dev.
const clientUrl = () => (process.env.CLIENT_URL && parseUrl(process.env.CLIENT_URL)?.origin) || DEFAULT_CLIENT_URL

// Gọi một lần lúc khởi động: có lỗi thì in rõ rồi dừng, thay vì chạy lên rồi lỗi khó hiểu giữa chừng.
function assertEnv() {
  const { errors, warnings } = validateEnv()
  warnings.forEach((w) => console.warn(`⚠  ${w}`))
  if (errors.length) {
    console.error('\nCấu hình server không hợp lệ:')
    errors.forEach((e) => console.error(`  - ${e}`))
    console.error('\nSửa trong server/.env (mẫu: server/.env.example) rồi chạy lại.\n')
    process.exit(1)
  }
}

module.exports = { validateEnv, assertEnv, clientUrl }
