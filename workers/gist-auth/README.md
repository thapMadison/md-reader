# gist-auth Worker

Đổi GitHub OAuth `code` → access token. Backend **duy nhất** của MDReader.

## Tại sao cần nó

`github.com/login/oauth/access_token` không gửi CORS header và không trả lời preflight OPTIONS — trình duyệt không gọi được, kể cả Device Flow. Đây là lý do duy nhất Worker tồn tại.

`api.github.com` thì **có** gửi `Access-Control-Allow-Origin: *`. Toàn bộ Gist API gọi thẳng từ browser. **Không route chúng qua đây** — Worker không nằm trên đường dữ liệu, không thấy nội dung file nào.

Token GitHub không hết hạn, nên mỗi user chỉ chạm Worker một lần lúc đăng nhập. Worker chết thì user đã đăng nhập vẫn chạy bình thường, chỉ user mới không đăng nhập được.

## Thiết lập (làm một lần)

### 1. Đăng ký OAuth App

https://github.com/settings/developers → **New OAuth App**

| Trường | Giá trị |
|---|---|
| Application name | MDReader |
| Homepage URL | `https://md-reader.thapora.com` |
| Authorization callback URL | `https://md-reader.thapora.com` |

Bấm **Generate a new client secret**, copy ngay — GitHub không cho xem lại.

> Phải là **OAuth App**, không phải GitHub App. GitHub App không cấp được scope `gist`.

### 2. Deploy

```bash
cd workers/gist-auth
npm install -g wrangler        # nếu chưa có
wrangler login
```

Điền `GITHUB_CLIENT_ID` vào `wrangler.toml` (client id là public, commit được).

Secret thì đưa qua wrangler, **không bao giờ vào file**:

```bash
wrangler secret put GITHUB_CLIENT_SECRET   # dán secret khi được hỏi
wrangler deploy
```

Ghi lại URL Worker in ra (`https://md-reader-gist-auth.<subdomain>.workers.dev`) — client cần nó ở Phase 2.

### 3. Kiểm tra nhanh

```bash
# Origin lạ → 403, và không có header CORS nào
curl -i -X POST https://<worker-url> -H 'Origin: https://evil.example' \
     -H 'Content-Type: application/json' -d '{"code":"x"}'

# Origin hợp lệ + code rác → 400 bad_verification_code
# (đây là kết quả ĐÚNG: chứng minh Worker gọi tới được GitHub và secret đã đúng)
curl -i -X POST https://<worker-url> -H 'Origin: https://md-reader.thapora.com' \
     -H 'Content-Type: application/json' -d '{"code":"invalid"}'
```

Nếu case hai trả `incorrect_client_credentials` thay vì `bad_verification_code` → secret sai hoặc chưa set.

## API

`POST /` — body `{ "code": "<oauth code>" }`

| Kết quả | Status | Body |
|---|---|---|
| OK | 200 | `{ "access_token": "gho_…", "scope": "gist" }` |
| Origin không trong allowlist | 403 | `Forbidden` (không kèm CORS header) |
| Thiếu / sai `code` | 400 | `{ "error": "missing_code" \| "invalid_json" }` |
| GitHub từ chối | 400 | `{ "error": "bad_verification_code", … }` |
| GitHub hỏng / không tới được | 502 | `{ "error": "github_unreachable" \| "github_bad_response" }` |

Lỗi từ GitHub được trả **nguyên trạng**. `bad_verification_code` (code hết hạn hoặc dùng lại) và `incorrect_client_credentials` (secret sai) cần hai cách sửa hoàn toàn khác nhau — gộp cả hai thành "auth failed" là tự bịt mắt lúc debug.

## Ràng buộc bảo mật

- **Allowlist là so chuỗi chính xác, không bao giờ `*`.** Endpoint này biến code thành token; wildcard cho bất kỳ trang nào mượn OAuth App của bạn làm cổng đổi token. `endsWith` cũng không đủ — nó nhận cả `evil.md-reader.thapora.com` lẫn `http://` (token bay qua mạng dạng plaintext). Có test cho cả ba biến thể lookalike.
- **Client secret chỉ ở Worker env**, không bao giờ về client, không bao giờ vào git.
- **Không lưu, không log gì.** Không KV, không `[observability]`. Token trong log là token sống lâu hơn request mang nó.
- **Scope chỉ `gist`.** Token lộ cũng không đụng được repo. Client nên verify `scope` trả về đúng như đã xin.

## Test

```bash
npx vitest run workers      # từ thư mục gốc repo
```

Test gọi thẳng `worker.fetch()` dưới jsdom thay vì workerd — Worker chỉ dùng `Request`/`Response`/`fetch`, đều là Web standard có sẵn trong Node 20.

**Test không bắt được lỗi CORS.** Lỗi CORS hiện ra ở browser là `TypeError: Failed to fetch`, không có status code, và mọi `vi.stubGlobal('fetch')` đều pass. Bắt buộc smoke test thủ công ở cuối Phase 2: `npm run dev` → đăng nhập thật → push một file → mở trên điện thoại → đăng nhập cùng tài khoản → xác nhận file hiện ra và content load được.
