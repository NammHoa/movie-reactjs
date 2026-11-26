const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com']
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

// Lấy mã video nếu đúng là link YouTube. So tên miền chính xác để link giả như "youtube.com.evil.com" không bị nhúng.
export function youtubeId(url) {
  let u
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null

  const parts = u.pathname.split('/').filter(Boolean)
  let id = null
  if (u.hostname === 'youtu.be') id = parts[0]
  else if (YOUTUBE_HOSTS.includes(u.hostname)) {
    if (parts[0] === 'watch') id = u.searchParams.get('v')
    else if (parts[0] === 'shorts' || parts[0] === 'embed') id = parts[1]
  }
  return id && VIDEO_ID.test(id) ? id : null
}

export const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
