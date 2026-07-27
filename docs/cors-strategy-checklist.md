# Full Proxy CORS Strategy Checklist

Target pengujian publik: `https://game.uploadx.my.id/backpack_jianghu`

| Strategi | HTML/aset | `/wardeninit` | `google.script.run` / Sheet | Status |
|---|---:|---:|---:|---|
| Header CORS pada response Worker | Ya | Tidak | Tidak | Parsial |
| OPTIONS/preflight pada API Gateway Worker | Ya | Ya untuk endpoint gateway | Tidak | Parsial |
| Reverse proxy GET/POST melalui Worker | Ya | Ya bila frontend memanggil gateway | Tidak otomatis | Parsial |
| Worker-native `google.script.run` RPC shim | Ya | Tidak diperlukan | Ya | Berhasil |
| Rewrite `google.script.host.origin` bootstrap | Ya | Tidak | Tidak | Gagal; Warden tetap memakai origin Google |
| JSONP | GET teks saja | Tidak | Tidak | Tidak cocok |
| Proxy CORS publik dari gist | Tidak diuji dengan data privat | Tidak dijamin | Tidak aman untuk Sheet/RPC | Ditolak untuk produksi |
| Menonaktifkan web security browser | Lokal saja | Ya | Mungkin | Tidak valid untuk produksi |
| Redirect ke Apps Script | Ya | Ya | Ya | Berhasil |
| Frontend mandiri + API `fetch` eksplisit melalui Worker | Ya | Tidak diperlukan | Ya | Berhasil dan direkomendasikan |

## Kesimpulan

`google.script.run` adalah transport privat milik Google Apps Script HTML Service. Ia tidak dapat dipindahkan secara transparan ke custom origin hanya dengan header CORS, JSONP, monkey-patch browser, atau reverse proxy HTML.

Backpack Jianghu sekarang memakai pola Worker-native dari project referensi: helper GAS mengeluarkan HTML mentah dan menyediakan dispatcher RPC allowlist, sedangkan Worker menyajikan HTML pada custom origin serta menerjemahkan chain `google.script.run` menjadi RPC `fetch` same-origin. Runtime tidak lagi memakai `/wardeninit`, iframe, atau wrapper Google.
