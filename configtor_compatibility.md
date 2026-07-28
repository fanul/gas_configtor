# GAS Configtor Full Proxy Compatibility Prompt

Salin prompt berikut ke AI yang mengembangkan atau memigrasikan project Google Apps Script target.

```text
Make this Google Apps Script Web App compatible with GAS Configtor Cloudflare
Worker-native Full Proxy mode.

Goals:
- Keep the browser on the custom Cloudflare origin.
- Keep existing google.script.run calls unchanged.
- Add only the transport contract required by GAS Configtor.
- Do not change business logic, validation, Spreadsheet/Drive operations,
  function arguments, or return values.

Requirements:

1. Preserve the normal doGet(e) behavior so the original GAS /exec URL remains usable.

2. Add a branch to doGet(e) for e.parameter.__full_proxy_html === "1".
   Return JSON through ContentService:
   {
     "ok": true,
     "html": "<raw application HTML>"
   }
   Read the HTML with:
   HtmlService.createHtmlOutputFromFile("index").getContent()
   Use the project's actual HTML filename if it is not "index".

3. Add doPost(e) as an explicit RPC dispatcher. Accept only:
   {
     "functionName": "existingFunctionName",
     "args": [arg1, arg2]
   }

4. Create an explicit FULL_PROXY_RPC_HANDLERS allowlist mapping permitted names
   to existing server functions. Reject unknown functions. Never use eval(),
   globalThis[functionName], or another arbitrary dynamic invocation mechanism.

5. Return JSON through ContentService:
   Success: { "ok": true, "result": result }
   Failure: { "ok": false, "error": "safe error message" }

6. Keep existing frontend google.script.run calls unchanged. GAS Configtor injects
   a same-origin compatibility shim supporting withSuccessHandler(),
   withFailureHandler(), dynamic method names, and arguments.

7. Preserve and enforce authentication, authorization, validation, and permission
   checks inside every sensitive allowlisted handler. CORS and the allowlist are
   not authentication.

8. Ensure every RPC result is JSON-serializable. Convert Date, Blob, Range, Sheet,
   Spreadsheet, Drive File, iterators, and other native Apps Script objects into
   plain JSON values before returning them.

9. Do not add Cloudflare credentials, Spreadsheet IDs, access tokens, or secrets
   to frontend HTML or Worker source.

10. Add the smallest runnable checks proving:
    - __full_proxy_html returns raw application HTML;
    - an allowlisted function succeeds;
    - an unknown function is rejected;
    - arguments and safe errors are serialized correctly.

Acceptance criteria:
- The normal GAS /exec URL still works.
- GET ?__full_proxy_html=1 returns {ok:true,html:"..."} as JSON.
- POST /exec accepts {functionName,args} and returns {ok,result} or {ok:false,error}.
- Existing google.script.run frontend code is unchanged.
- Business logic and data-access behavior are unchanged.
- Report changed files, allowlisted functions, checks run, and remaining security risks.
```

## Minimal backend shape

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
    if (!handler) return jsonResponse_({ ok: false, error: 'RPC function is not allowed.' })

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

The backend shape is only a transport example. Adapt the HTML filename and allowlist, and retain the target application's existing authorization and validation.

## Provisioning behavior

After deploying the compatible target GAS version:

1. Enter its current `/exec` URL in GAS Configtor.
2. Select **Full proxy**.
3. Click **Provision/Update** to upload the generated Worker and update its route.

Existing routes must be provisioned again when the target URL, hostname, path, mode, or Worker template changes. Workspace-scoped URLs such as `https://script.google.com/a/macros/...` are forced to Redirect because Google authentication cannot be transparently full-proxied.

Full Proxy does not automatically retry failed RPC/POST requests through Redirect because doing so could execute a write twice. Switch the route to **Redirect** and provision it again when the target application cannot satisfy this contract.
