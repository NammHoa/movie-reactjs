// Có nên cuộn về đầu trang sau khi đổi đường dẫn không. POP (nút quay lại, tiến tới) thì để trình duyệt giữ vị trí cũ
export const shouldScrollTop = ({ from, to, hash, navigationType }) => from !== to && !hash && navigationType !== 'POP'
