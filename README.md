# gas_configtor

Dashboard Vue 3 yang berjalan sebagai Google Apps Script Web App untuk mengelola Cloudflare KV dan melakukan provisioning subdomain/path route secara langsung dari GAS.

## Yang dilakukan Route Provisioner

Saat tombol **Provision Route** ditekan, backend GAS akan:

1. Mengunggah atau memperbarui Cloudflare Worker untuk target URL.
2. Membuat atau memperbarui Cloudflare Worker Route.
3. Membuat DNS record proxied setelah Worker dan route siap, untuk mencegah 522.
4. Menyimpan metadata route di konfigurasi GAS.

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

### Prompt AI dan template backend

Gunakan [`configtor_compatibility.md`](configtor_compatibility.md) saat meminta AI membuat atau memigrasikan project GAS target. Dokumen tersebut memuat prompt siap salin, template backend minimal, kriteria selesai, aturan keamanan, fallback, dan langkah reprovision.

Frontend yang sudah memakai `google.script.run` tidak perlu diubah menjadi `fetch()`; Worker Configtor menyuntikkan shim same-origin. Project target hanya perlu menambahkan endpoint HTML mentah, dispatcher RPC allowlist, dan hasil yang dapat diserialisasi JSON.

URL Workspace `https://script.google.com/a/macros/...` otomatis dipaksa ke mode **Redirect**. Kegagalan Full proxy biasa tidak otomatis mengulang RPC/POST melalui Redirect karena operasi tulis dapat berjalan dua kali; ubah mode ke Redirect lalu **Provision/Update** kembali.

## Menjalankan lokal

```bash
npm install
npm run dev
```

`google.script.run` hanya tersedia di deployment GAS. Build lokal berguna untuk UI, tetapi operasi Cloudflare harus dites dari URL `/exec`.

## Build Vue

```bash
npm run build:gas
```

Build menghasilkan `dist/` lalu meng-inline JS dan CSS menjadi `gas/index.html`.

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

Setelah menjalankan `npm run build:gas`:

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
