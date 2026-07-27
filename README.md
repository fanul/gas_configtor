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

Cloudflare Worker proxy cocok untuk endpoint HTTP dan GAS `doGet`/`doPost`. Halaman GAS HtmlService yang bergantung pada `google.script.run` sebaiknya tetap dibuka melalui URL deployment GAS karena bridge tersebut terikat pada runtime Google Apps Script.
