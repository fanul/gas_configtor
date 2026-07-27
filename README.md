# gas_configtor

Dashboard Vue 3 yang berjalan sebagai Google Apps Script Web App untuk mengelola Cloudflare KV dan melakukan provisioning subdomain/path route secara langsung dari GAS.

## Yang dilakukan Route Provisioner

Saat tombol **Provision Route** ditekan, backend GAS akan:

1. Menyimpan API token secara privat di `PropertiesService`.
2. Membuat DNS record proxied untuk hostname jika belum ada.
3. Mengunggah Cloudflare Worker proxy untuk target URL.
4. Membuat atau memperbarui Cloudflare Worker Route.
5. Menyimpan metadata route di konfigurasi GAS.

Browser tidak memanggil Cloudflare API secara langsung dan token tidak pernah dikirim kembali dari GAS ke browser.

Saat dashboard dimuat, konfigurasi, route, dan cache resource dibaca dari GAS Script Properties. Jika token dan Account ID tersedia, zone dan KV otomatis direfresh dari Cloudflare; jika API gagal, dropdown tetap memakai cache terakhir.

Route Provisioner menggunakan tabel CRUD: **New Route**, **Save Draft**, **Edit**, **Provision/Update**, dan **Delete**. Setiap route memiliki ID sendiri sehingga banyak hostname/path dapat dikelola sekaligus.

## Prasyarat Cloudflare

Buat API Token dengan permission berikut:

- Account → Workers Scripts → Edit
- Zone → Workers Routes → Edit
- Zone → DNS → Edit
- Zone → Zone → Read
- Account → Workers KV Storage → Read (untuk daftar KV)

Batasi token ke account dan zone yang diperlukan.

Dapatkan **Account ID** dari halaman Overview Cloudflare. Zone ID akan dipilih otomatis setelah menekan **Fetch Resources**.

## Usage 1: seluruh subdomain

Tujuan:

```text
https://game.uploadx.my.id/*
        ↓
Cloudflare Worker
        ↓
https://script.google.com/macros/s/DEPLOYMENT_ID/exec/*
```

Isi form:

```text
Hostname/Subdomain : game.uploadx.my.id
Path prefix        : /
Target URL         : https://script.google.com/macros/s/DEPLOYMENT_ID/exec
Worker name        : gas-game-uploadx
Strip prefix       : aktif
```

Cloudflare route yang dibuat:

```text
game.uploadx.my.id/*
```

## Usage 2: hanya path `/backpack`

Tujuan:

```text
https://game.uploadx.my.id/backpack/*
        ↓
Cloudflare Worker
        ↓
https://script.google.com/macros/s/DEPLOYMENT_ID/exec/*
```

Isi form:

```text
Hostname/Subdomain : game.uploadx.my.id
Path prefix        : /backpack
Target URL         : https://script.google.com/macros/s/DEPLOYMENT_ID/exec
Worker name        : gas-game-uploadx-backpack
Strip prefix       : aktif
```

Cloudflare route yang dibuat:

```text
game.uploadx.my.id/backpack*
```

Dengan `Strip prefix` aktif:

```text
/backpack/users?id=1 → target /users?id=1
```

Dengan `Strip prefix` nonaktif:

```text
/backpack/users?id=1 → target /backpack/users?id=1
```

## Peringatan route overlap

Jangan memasang route root `game.uploadx.my.id/*` dan route path `game.uploadx.my.id/backpack*` ke target yang bertentangan tanpa memahami precedence. Cloudflare memilih pattern paling spesifik, sehingga `/backpack*` akan menang untuk request `/backpack...`.

DNS dummy yang dibuat adalah proxied AAAA `100::`. DNS ini hanya menjadi attachment point untuk Worker Route; request yang cocok diproses Worker sebelum menuju origin.

## Membuat aplikasi GAS kompatibel Full proxy

Halaman `HtmlService` tidak dapat diproxy secara transparan hanya dengan menyalin HTML wrapper Google. Runtime bawaan `google.script.run` menggunakan Warden dan endpoint privat Google yang terikat pada origin `script.google.com`.

Mode **Full proxy** menggunakan arsitektur Worker-native:

```text
Browser pada custom domain
        │
        ├── GET /path
        │      ↓
        │   Cloudflare Worker mengambil HTML mentah dari GAS
        │
        └── google.script.run.namaFungsi(...)
               ↓ diterjemahkan oleh RPC shim
            POST /path?__gas_rpc=1
               ↓
            Cloudflare Worker
               ↓
            GAS doPost() dispatcher allowlist
               ↓
            Spreadsheet / Drive / service GAS lain
```

Aplikasi GAS target harus menyediakan dua kontrak tambahan:

1. `GET ?__full_proxy_html=1` mengembalikan JSON berisi HTML aplikasi mentah, bukan output wrapper `HtmlService`.
2. `POST /exec` menerima `{ "functionName": "...", "args": [...] }`, menjalankan hanya fungsi pada allowlist, lalu mengembalikan `{ "ok": true, "result": ... }`.

Worker Configtor akan menyajikan HTML tersebut dari custom origin dan menyediakan shim yang kompatibel dengan pola berikut:

```javascript
google.script.run
  .withSuccessHandler(handleSuccess)
  .withFailureHandler(handleFailure)
  .listRecipesFromSheet()
```

### Contoh prompt siap pakai

Salin prompt berikut ketika membuat atau memigrasikan aplikasi Google Apps Script agar kompatibel dengan Full proxy:

```text
Ubah aplikasi Google Apps Script Web App ini agar kompatibel dengan mode Full proxy
Worker-native melalui Cloudflare, tanpa iframe, tanpa redirect ke script.google.com,
dan tanpa bergantung pada Warden atau /wardeninit.

Konteks:
- Frontend saat ini disajikan oleh HtmlService dan mungkin memakai google.script.run.
- URL publik harus tetap berada pada custom origin, misalnya:
  https://app.example.com/nama-aplikasi
- Cloudflare Worker bertindak sebagai data plane, sedangkan GAS tetap menjadi backend
  untuk Spreadsheet, Drive, PropertiesService, dan service Google lainnya.
- Jangan sekadar reverse proxy HTML wrapper dari script.google.com.

Implementasikan kontrak berikut pada project GAS target:

1. Pertahankan doGet() normal agar URL deployment GAS masih dapat dibuka langsung.
2. Jika doGet(e) menerima parameter __full_proxy_html=1, kembalikan JSON:
   {
     "ok": true,
     "html": "<!doctype html>...bundle aplikasi mentah..."
   }
   Ambil HTML menggunakan HtmlService.createHtmlOutputFromFile('index').getContent().
   Gunakan ContentService dengan MIME type JSON. Jangan kembalikan wrapper HtmlService
   untuk request ini.
3. Tambahkan doPost(e) sebagai dispatcher RPC JSON. Format request:
   {
     "functionName": "namaFungsi",
     "args": [arg1, arg2]
   }
4. Buat object allowlist eksplisit, misalnya FULL_PROXY_RPC_HANDLERS. Hanya fungsi
   yang tercantum boleh dipanggil. Jangan gunakan eval(), globalThis[functionName],
   atau pemanggilan fungsi arbitrer.
5. Format respons sukses:
   {
     "ok": true,
     "result": hasilFungsi
   }
   Format respons gagal:
   {
     "ok": false,
     "error": "pesan aman"
   }
6. Pastikan nilai Date dan object lain dapat diserialisasi JSON. Jangan mengirim Blob,
   iterator Drive, Range, Sheet, atau object native GAS langsung ke frontend.
7. Pertahankan API frontend google.script.run yang ada. Cloudflare Worker akan
   menyuntikkan shim yang mendukung:
   - withSuccessHandler(fn)
   - withFailureHandler(fn)
   - pemanggilan method dinamis beserta argumennya
8. Semua request RPC browser harus menuju same-origin:
   /nama-aplikasi?__gas_rpc=1
   Worker kemudian meneruskan request server-to-server ke deployment GAS.
9. Tangani pola redirect ContentService GAS dengan benar: POST pertama menjalankan
   doPost(), lalu GET hanya ke URL hasil yang diizinkan:
   https://script.googleusercontent.com/macros/echo
10. Terapkan validasi input dan otorisasi per fungsi sensitif. Jangan mengandalkan CORS
    sebagai autentikasi. Jangan menaruh API token, Spreadsheet ID privat, atau secret
    baru di HTML maupun source Worker.
11. Deployment Web App harus sesuai kebutuhan akses. Jika memakai
    ANYONE_ANONYMOUS + executeAs USER_DEPLOYING, anggap semua RPC allowlisted dapat
    dipanggil publik dan tambahkan autentikasi/authorization pada operasi tulis.
12. Tambahkan test untuk:
    - endpoint HTML mentah menghasilkan bundle aplikasi;
    - fungsi allowlisted berhasil;
    - fungsi acak ditolak;
    - argumen diteruskan tanpa berubah;
    - error diserialisasi dengan aman;
    - chain success/failure handler bekerja;
    - custom URL tetap custom dan tidak meminta /wardeninit.

Kriteria selesai:
- Custom URL merespons HTTP 200 dengan HTML aplikasi, bukan wrapper Google.
- Header diagnosis Worker menunjukkan:
  x-gas-route-mode: full_proxy
  x-gas-runtime: worker-native-rpc
- document.location tetap custom origin.
- Tidak ada iframe Google, redirect script.google.com, error CORS Warden, atau halaman putih.
- Minimal satu RPC baca dan satu RPC tulis berhasil melalui custom origin.
- Berikan daftar file yang diubah, fungsi yang masuk allowlist, test yang dijalankan,
  dan risiko keamanan yang masih tersisa.
```

### Template backend minimal

```javascript
function doGet(e) {
  if (e && e.parameter && e.parameter.__full_proxy_html === '1') {
    return jsonResponse_({
      ok: true,
      html: HtmlService.createHtmlOutputFromFile('index').getContent()
    })
  }

  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Nama Aplikasi')
}

const FULL_PROXY_RPC_HANDLERS = {
  listData: listData,
  saveData: saveData
}

function doPost(e) {
  try {
    const request = JSON.parse((e.postData && e.postData.contents) || '{}')
    const handler = FULL_PROXY_RPC_HANDLERS[request.functionName]
    if (!handler) {
      return jsonResponse_({ ok: false, error: 'RPC function is not allowed.' })
    }

    const args = Array.isArray(request.args) ? request.args : []
    return jsonResponse_({ ok: true, result: handler.apply(null, args) })
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error && error.message ? error.message : String(error)
    })
  }
}

function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON)
}
```

Template tersebut hanya menunjukkan kontrak transport. Tambahkan autentikasi, validasi
schema, pembatasan ukuran payload, rate limiting, dan pemeriksaan hak akses sesuai data
yang dikelola aplikasi.

## Menjalankan lokal

```bash
npm install
npm run dev
```

`google.script.run` hanya tersedia di deployment GAS. Build lokal berguna untuk UI, tetapi operasi Cloudflare harus dites dari URL `/exec`.

## Build Vue

```bash
npm run build
```

Build menghasilkan `dist/`. Untuk GAS, JS dan CSS harus di-inline menjadi satu `index.html`.

## Struktur modular

```text
src/services/gas/               bridge google.script.run
src/services/cloudflare/        Cloudflare control-plane driver
src/stores/modules/             state dan actions Pinia
src/components/cloudflare/      credentials, KV, route provisioner
gas/Code.gs                     GAS web app entrypoint
gas/ConfigStore.gs              config dan secret storage
gas/CloudflareApi.gs            Cloudflare REST API orchestration
gas/WorkerTemplate.gs           generator Worker proxy
```

## Deploy dengan clasp

`.clasp.json`:

```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "gas"
}
```

Setelah hasil build di-inline dan disalin menjadi `gas/index.html`:

```bash
clasp push
clasp deploy -d "Cloudflare route provisioner"
```

Jika deployment sudah ada:

```bash
clasp deployments
clasp deploy -i DEPLOYMENT_ID -d "Cloudflare route provisioner update"
```

Di environment yang mengalami `Premature close`, gunakan Google Apps Script REST API untuk push content, membuat version, dan memperbarui deployment.

## Security

- Jangan commit API token.
- Token disimpan dalam GAS Script Properties sebagai `CF_API_TOKEN`.
- Deployment GAS sebaiknya dibatasi sesuai kebutuhan. Jika web app dibuka publik, siapa pun yang dapat membuka dashboard berpotensi melakukan provisioning dengan token pemilik deployment.
- Untuk penggunaan publik, tambahkan allowlist email atau autentikasi di backend sebelum `provisionCloudflareRoute()`.

## Batasan

- Full proxy Worker-native memerlukan perubahan pada aplikasi GAS target. Project yang hanya memiliki `doGet()` wrapper tidak otomatis kompatibel.
- Fungsi `google.script.run` yang menerima/mengembalikan object native GAS harus diubah menjadi data JSON biasa.
- `PropertiesService.getUserProperties()` pada deployment `executeAs: USER_DEPLOYING` tidak memberikan isolasi pengguna anonim seperti sesi login aplikasi. Gunakan identitas aplikasi sendiri jika membutuhkan data per pengguna.
- Operasi Drive atau Spreadsheet yang sensitif wajib memiliki authorization di dispatcher, bukan hanya allowlist nama fungsi.
- Reverse proxy biasa tetap tersedia untuk target HTTP yang tidak memakai runtime privat `HtmlService`.
