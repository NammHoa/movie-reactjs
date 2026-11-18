import QrScanner from 'qr-scanner'

export const hasCamera = () => QrScanner.hasCamera().catch(() => false)

// Quét liên tục từ camera; gọi onCode với chuỗi trong mã QR. Trả về scanner để dừng bằng .destroy()
export function startCameraScan(video, onCode) {
  const scanner = new QrScanner(video, (result) => onCode(result.data), {
    preferredCamera: 'environment',
    highlightScanRegion: true,
    returnDetailedScanResult: true,
  })
  return scanner.start().then(() => scanner)
}

// Đọc mã QR từ một ảnh (ví dụ ảnh chụp bằng camera điện thoại); không thấy mã thì trả null
export async function scanImageFile(file) {
  try {
    const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true })
    return result.data
  } catch {
    return null
  }
}
