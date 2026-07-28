# GAS Configtor Full Proxy Compatibility Prompt

Salin prompt berikut ke AI yang mengembangkan atau memigrasikan project Google Apps Script target.

```text
Make this Google Apps Script Web App compatible with GAS Configtor Cloudflare
Worker-native Full Proxy mode.

Goals:
- Keep the browser on the custom Cloudflare origin.
- Keep existing google.script.run calls default.
- Add only the transport contract required by GAS Configtor.
- Do not change business logic, validation, Spreadsheet/Drive operations,
  function arguments, or return values.
- Determine whether the application uses owner-authorized resources or requires
  each visitor's Google identity before choosing Full Proxy.

Requirements:

1. Preserve the default doGet(e) behavior so the original GAS /exec URL remains usable.

2. Add a branch to doGet(e) for e.parameter.__full_proxy_html === "1".
   Return JSON through ContentService:
   {
     "ok": true,
     "html": "<raw application HTML>"
   }
   Read the HTML with:
   HtmlService.createHtmlOutputFromFile("index").getContent()
   Use the project's actual HTML filename if it is not "index".
   The endpoint must return HTTP success and valid JSON with ok === true and
   html as a string; otherwise GAS Configtor returns 502.

3. Add doPost(e) as an explicit RPC dispatcher. Accept only:
   {
     "functionName": "existingFunctionName",
     "args": [arg1, arg2]
   }
   Reject missing/blank functionName and reject args unless it is an array.

4. Create an explicit FULL_PROXY_RPC_HANDLERS allowlist mapping permitted names
   to existing server functions. Reject unknown functions. Never use eval(),
   globalThis[functionName], or another arbitrary dynamic invocation mechanism.

5. Return JSON through ContentService:
   Success: { "ok": true, "result": result }
   Failure: { "ok": false, "error": "safe error message" }

6. Keep existing frontend google.script.run calls default. GAS Configtor injects
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

11. For Worker-native Full Proxy, configure the target web app to execute as
    the deploying user and allow anonymous access (ANYONE_ANONYMOUS). Explain
    that Cloudflare requests do not carry a visitor's Google login,
    Session.getActiveUser() identity, or per-user Google authorization.

12. If the application requires every visitor to sign in with Google or access
    resources as that visitor, preserve that requirement. Recommend GAS
    Configtor Redirect mode or explicit application authentication/OAuth.

13. Inventory every use of Session, UserProperties, Drive, Gmail/Mail, Calendar,
    file upload, and other Google services. State whether each operation runs as
    the deploying owner or needs visitor authorization. Never expose owner-powered
    email or upload handlers without verified application authorization, input
    validation, quotas, and rate limiting.

Acceptance criteria:
- The normal GAS /exec URL still works.
- GET ?__full_proxy_html=1 returns {ok:true,html:"..."} as JSON.
- POST /exec accepts {functionName,args} and returns {ok,result} or {ok:false,error}.
- Existing google.script.run frontend code is unchanged.
- Business logic and data-access behavior are unchanged.
- The deployment access model and remaining authentication risks are documented.
- Report changed files, allowlisted functions, checks run, and remaining security risks.
```

## Prerequisites and access model

Full Proxy requires:

- A standard URL: `https://script.google.com/macros/s/.../exec`.
- `__full_proxy_html` and the allowlisted RPC dispatcher in the deployed version.
- Anonymous server-to-server access from the Worker.
- JSON-serializable RPC results.
- Authentication and authorization inside every sensitive handler.

Target manifest for owner-authorized Full Proxy:

```json
{
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

Spreadsheet, Drive, and other Google services then run with the deploying owner's grants. The visitor's Google cookies are not forwarded, `Session.getActiveUser()` may be blank, and `PropertiesService.getUserProperties()` does not isolate anonymous visitors. The RPC allowlist is not authentication.

Choose **Redirect** when Google must authenticate each visitor. To retain a custom-domain Full Proxy with user accounts, add verified application sessions or OAuth/OIDC and authorize every sensitive RPC handler.

## Google services, email, and uploads

With `USER_DEPLOYING`, calls to `SpreadsheetApp`, `DriveApp`, `CalendarApp`, `DocumentApp`, `SlidesApp`, `FormsApp`, `MailApp`, `GmailApp`, Advanced Services, and Google APIs called with the script token use the deploying owner's grants. They do not become unavailable, but they do not run as the visitor.

| Operation | Full Proxy result | Use instead when visitor-owned |
|---|---|---|
| Read/write owner resources | Supported | — |
| Read/write visitor Drive, Gmail, Calendar, Sheets | Not implicitly supported | Per-user OAuth or Redirect |
| `Session.getEffectiveUser().getEmail()` | Owner/deployer email | — |
| `Session.getActiveUser().getEmail()` | Usually blank | Verified login/OIDC/OTP |
| Send mail with `MailApp`/`GmailApp` | Sends with owner identity/quota | Gmail OAuth per visitor |
| Upload into owner Drive | Supported | Visitor OAuth for visitor Drive |
| Large upload | Avoid Base64 RPC overhead | Signed direct upload/R2, then process server-side |

An email typed into a form is contact data, not proof of identity. Verify ownership with login, OTP, or a magic link before using it for authorization.

### Owner-powered email example

```javascript
function sendOwnerEmail(to, subject, body) {
  const user = requireAppUser_()
  if (!user.roles || user.roles.indexOf('mailer') < 0) throw new Error('Forbidden')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(to || ''))) throw new Error('Invalid recipient')
  if (!subject || String(subject).length > 150) throw new Error('Invalid subject')
  if (String(body || '').length > 10000) throw new Error('Message too large')
  enforceRateLimit_(user.userId, 'send-email')
  MailApp.sendEmail({ to: to, subject: String(subject), body: String(body) })
  return { ok: true }
}
```

Add `sendOwnerEmail` to the RPC allowlist only when `requireAppUser_` and `enforceRateLimit_` are real implementations. Otherwise omit the handler.

### Small upload to owner Drive

```javascript
function uploadSmallFile(payload) {
  const user = requireAppUser_()
  if (!payload || !payload.base64 || !payload.fileName) throw new Error('Invalid upload')
  if (String(payload.base64).length > 7_000_000) throw new Error('Use direct upload')
  const mime = String(payload.mimeType || 'application/octet-stream')
  const allowed = ['image/png', 'image/jpeg', 'application/pdf']
  if (allowed.indexOf(mime) < 0) throw new Error('File type is not allowed')
  enforceRateLimit_(user.userId, 'upload')
  const blob = Utilities.newBlob(Utilities.base64Decode(payload.base64), mime, String(payload.fileName))
  const file = DriveApp.getFolderById(getUploadFolderId_()).createFile(blob)
  return { id: file.getId(), name: file.getName(), mimeType: file.getMimeType() }
}
```

Return plain JSON, never a `Blob` or Drive `File`. Keep folder IDs in Script Properties, validate actual file content where risk matters, and use direct signed upload for large files.

### Alternatives while keeping Full Proxy

```text
Need verified visitor identity only
→ Google OIDC / Cloudflare Access / OTP → application session → signed RPC context

Need visitor Google Drive/Gmail/Calendar access
→ OAuth authorization-code flow → encrypted per-user token storage → call Google API

Need large uploads
→ Worker issues short-lived signed upload → browser uploads directly to R2/storage
→ GAS receives only metadata or processes the stored object

Cannot implement those controls safely
→ use Redirect and let Google own login/consent
```

The Worker template can transport and verify an application session, but it cannot manufacture Google user consent, impersonate a visitor, or safely infer identity from a plain email/header. OAuth scopes, token storage, role checks, resource ownership, and business authorization remain application-specific and should not be enabled by default.

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

const FULL_PROXY_RPC_HANDLERS = Object.assign(Object.create(null), {
  listData: listData,
  saveData: saveData
})

function requireAppUser_() {
  const session = getVerifiedApplicationSession_() // Implement for your auth system.
  if (!session || !session.userId) throw new Error('Unauthorized')
  return session
}

function saveData(payload) {
  const user = requireAppUser_()
  validateSaveData_(payload)
  return saveDataForUser_(user.userId, payload)
}

function doPost(e) {
  try {
    const request = JSON.parse((e.postData && e.postData.contents) || '{}')
    if (typeof request.functionName !== 'string' || !request.functionName.trim()) {
      return jsonResponse_({ ok: false, error: 'RPC functionName is required.' })
    }
    if (!Array.isArray(request.args)) {
      return jsonResponse_({ ok: false, error: 'RPC args must be an array.' })
    }
    if (!Object.prototype.hasOwnProperty.call(FULL_PROXY_RPC_HANDLERS, request.functionName)) {
      return jsonResponse_({ ok: false, error: 'RPC function is not allowed.' })
    }

    return jsonResponse_({
      ok: true,
      result: FULL_PROXY_RPC_HANDLERS[request.functionName].apply(null, request.args)
    })
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

The backend shape is only a transport example. Adapt the HTML filename and allowlist, and retain the target application's existing authorization and validation. `getVerifiedApplicationSession_`, `validateSaveData_`, and `saveDataForUser_` are placeholders; do not copy them without a real verified session implementation.

## Verification before provisioning

Test without a logged-in browser session:

```bash
curl -L 'https://script.google.com/macros/s/DEPLOYMENT_ID/exec?__full_proxy_html=1'
```

It must return JSON with `ok: true` and an HTML string, not a Google login page. A login page causes `Invalid GAS app source response`; an unreachable Worker/DNS path can surface as 522/502.

## Provisioning behavior

After deploying the compatible target GAS version:

1. Enter its current `/exec` URL in GAS Configtor.
2. Select **Full proxy**.
3. Click **Provision/Update** to upload the generated Worker and update its route.

Existing routes must be provisioned again when the target URL, hostname, path, mode, or Worker template changes. Workspace-scoped URLs such as `https://script.google.com/a/macros/...` are forced to Redirect because Google authentication cannot be transparently full-proxied.

Changing target GAS code, deployment access, or deployment version does not require provisioning again when the `/exec` URL stays the same. Deploy the target update, verify its JSON endpoint, then reload the custom domain.

Full Proxy does not automatically retry failed RPC/POST requests through Redirect because doing so could execute a write twice. Switch the route to **Redirect** and provision it again when the target application cannot satisfy this contract.
