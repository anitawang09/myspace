// 拍立得画廊：一张照片一个拍立得，增删照片只改这里。
// src 写 public/ 下的路径（'/photos/xxx.jpeg'），部署子路径由 Gallery 补上。
// 没有 src 的条目显示 tone 渐变的占位色块。
export const PHOTOS = [
  { id: 'amsterdam', src: '/photos/Amsterdam.jpeg', caption: 'Amsterdam' },
  { id: 'den-haag', src: '/photos/den haag.jpeg', caption: 'Den Haag' },
  { id: 'antwerp', src: '/photos/Antwerp.jpeg', caption: 'Antwerp' },
  { id: 'madrid', src: '/photos/Madrid.jpeg', caption: 'Madrid' },
  { id: 'kyoto', src: '/photos/kyoto.jpeg', caption: 'Kyoto' },
  { id: 'kaohsiung', src: '/photos/kaohsiung.jpeg', caption: 'Kaohsiung' },
  { id: 'toronto', src: '/photos/toronto.jpeg', caption: 'Toronto' },
]
