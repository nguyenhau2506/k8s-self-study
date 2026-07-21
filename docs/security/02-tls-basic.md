# TLS Basics — Nền tảng Mã hóa và Chứng chỉ số

------------------------------------------------------------------------

# 1. Tổng quan lý thuyết

## 1.1 Tại sao cần TLS?

Khi bạn truy cập một trang web hay gửi request từ `kubectl` đến `kube-apiserver`, dữ liệu đó phải đi qua mạng. Nếu không có mã hóa, bất kỳ ai ở giữa đường truyền đều có thể:

- **Nghe trộm (Eavesdropping)** — Đọc được mật khẩu, token, dữ liệu nhạy cảm
- **Giả mạo (Man-in-the-Middle)** — Đóng giả server hợp lệ để lừa client gửi thông tin
- **Chỉnh sửa dữ liệu (Tampering)** — Thay đổi nội dung request/response mà không bị phát hiện

**TLS (Transport Layer Security)** giải quyết cả 3 vấn đề trên thông qua hai cơ chế nền tảng: **mã hóa** và **xác thực định danh**.

## 1.2 Bức tranh tổng thể

```
Không có TLS:
Client ──────────────────────────────► Server
           │ Hacker đọc được tất cả │

Có TLS:
Client ══════════════════════════════► Server
   Bước 1: Trao đổi khóa bất đối xứng (an toàn)
   Bước 2: Giao tiếp bằng khóa đối xứng (nhanh)
   Bước 3: Xác thực certificate (đúng server không?)
```

------------------------------------------------------------------------

# 2. Hai phương pháp mã hóa cốt lõi

## 2.1 Mã hóa đối xứng (Symmetric Encryption)

Dùng **một chìa khóa duy nhất** để vừa mã hóa vừa giải mã.

```
Người gửi                              Người nhận
    │                                       │
    ├── Có KEY                              ├── Cần KEY để giải mã
    │                                       │
    │   plaintext ──[KEY]──► ciphertext     │
    │                                       │   ciphertext ──[KEY]──► plaintext
    │                                       │
    └───────── KEY phải được gửi qua mạng ──┘
                          ↑
                  ❌ Đây là vấn đề!
               Hacker bắt được KEY → Giải mã được tất cả
```

| Ưu điểm | Nhược điểm |
|---------|-----------|
| Rất nhanh, hiệu năng cao | Phải gửi KEY qua mạng — nếu bị bắt thì mọi thứ lộ hết |
| Đơn giản, ít tốn CPU | Không giải quyết được vấn đề phân phối khóa an toàn |

**Ví dụ thuật toán:** AES-256, ChaCha20

## 2.2 Mã hóa bất đối xứng (Asymmetric Encryption)

Sử dụng **một cặp khóa** có quan hệ toán học đặc biệt với nhau:
- **Public Key** (Khóa công khai) — Có thể chia sẻ tự do cho bất kỳ ai
- **Private Key** (Khóa bí mật) — Chỉ mình bạn giữ, **tuyệt đối không chia sẻ**

```
┌─────────────────────────────────────────────────────┐
│  Quy tắc sinh tử:                                   │
│  Mã hóa bằng Public Key  → Chỉ Private Key mở được  │
│  Mã hóa bằng Private Key → Chỉ Public Key mở được   │
└─────────────────────────────────────────────────────┘
```

```
Kịch bản: Client gửi thông tin bí mật đến Server

Client biết Public Key của Server (ai cũng biết)
    │
    ├── Dùng Public Key mã hóa dữ liệu
    │        plaintext ──[Public Key]──► ciphertext
    │
    └── Gửi ciphertext qua mạng
              │
              │  Hacker bắt được ciphertext...
              │  nhưng không có Private Key → Không giải mã được ✅
              │
              ▼
           Server
    └── Dùng Private Key (chỉ mình server có) để giải mã
              ciphertext ──[Private Key]──► plaintext ✅
```

| Ưu điểm | Nhược điểm |
|---------|-----------|
| Không cần gửi Private Key qua mạng | Chậm hơn đối xứng khoảng 100-1000 lần |
| Giải quyết an toàn vấn đề phân phối khóa | Tốn tài nguyên CPU hơn |

**Ví dụ thuật toán:** RSA-2048, RSA-4096, ECDSA

------------------------------------------------------------------------

# 3. Ứng dụng thực tế: SSH Key-based Authentication

Thay vì đăng nhập bằng mật khẩu (dễ bị brute-force, bị nghe trộm), SSH dùng cặp khóa bất đối xứng:

```
Máy cá nhân của bạn             Server (VM, Worker Node...)
        │                                  │
        ├── id_rsa       (Private Key)     ├── ~/.ssh/authorized_keys
        │   └── GIỮ BÍ MẬT                │   └── chứa nội dung id_rsa.pub
        │                                  │
        └── id_rsa.pub   (Public Key) ────►│
            └── copy lên server
```

```bash
# Tạo cặp khóa RSA 4096-bit
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
# Tạo ra: ~/.ssh/id_rsa  (Private Key — GIỮ BÍ MẬT)
#          ~/.ssh/id_rsa.pub (Public Key — copy lên server)

# Copy Public Key lên server
ssh-copy-id -i ~/.ssh/id_rsa.pub user@server-ip
```

**Cơ chế xác thực:**

```
1. Client gửi yêu cầu kết nối SSH
2. Server tạo chuỗi ngẫu nhiên (challenge), mã hóa bằng Public Key của client
3. Chỉ client có Private Key mới giải mã được challenge đó
4. Client giải mã và gửi lại proof → Server xác nhận đây đúng là chủ sở hữu Private Key
5. Kết nối thành công — Không cần nhập mật khẩu!
```

> ✅ Hacker thấy Public Key trên server cũng vô dụng — không có Private Key thì không đăng nhập được.

------------------------------------------------------------------------

# 4. Quá trình bắt tay TLS/HTTPS (TLS Handshake)

HTTPS không chỉ dùng một loại mã hóa. Nó **kết hợp cả hai** để tận dụng ưu điểm của từng loại:

```
TLS Handshake — 5 bước:

Browser (Client)                               Web Server
        │                                           │
        │  1. "Xin chào, tôi muốn kết nối HTTPS"   │
        │ ─────────────────────────────────────►   │
        │                                           │
        │  2. Server gửi Certificate                │
        │     (chứa Public Key + thông tin định danh)│
        │ ◄─────────────────────────────────────── │
        │                                           │
        │  3. Browser tạo Symmetric Key ngẫu nhiên  │
        │     Mã hóa Symmetric Key bằng Public Key  │
        │     của Server → Gửi đi                   │
        │ ─────────────────────────────────────►   │
        │     (Hacker bắt được cũng không giải mã được) │
        │                                           │
        │  4. Server dùng Private Key giải mã       │
        │     → Lấy được Symmetric Key ✅            │
        │                                           │
        │  5. Từ đây: Giao tiếp bằng Symmetric Key ⚡│
        │ ◄══════════════════════════════════════► │
        │         (Nhanh, an toàn, mã hóa đối xứng) │
```

> 💡 **Tại sao không dùng bất đối xứng cho toàn bộ?**
> Mã hóa bất đối xứng chậm hơn đối xứng **100-1000 lần**. TLS chỉ dùng bất đối xứng để "bắt tay" và trao đổi khóa an toàn một lần duy nhất, sau đó chuyển sang đối xứng ngay lập tức.

------------------------------------------------------------------------

# 5. Vấn đề định danh: Chứng chỉ số và CA

## 5.1 Tấn công Man-in-the-Middle

Mã hóa thôi là **chưa đủ**. Hãy xem kịch bản này:

```
Bạn muốn vào mybank.com              Hacker ở giữa
         │                                  │
         │  "Xin Public Key mybank.com"     │
         └─────────────────────────────►   │
                                            │
                               Hacker giả làm mybank.com
                               Gửi Public Key của MÌNH
                                            │
         ◄──────────────────────────────── │
         "Đây là Public Key mybank.com" ← GIẢ MẠO!

Bạn mã hóa mật khẩu bằng Public Key của hacker
→ Hacker giải mã được tất cả ❌
```

**Vấn đề cốt lõi:** Làm sao biết Public Key nhận được thực sự là của `mybank.com` chứ không phải hacker?

## 5.2 Chứng chỉ số (Digital Certificate)

Certificate là **tài liệu điện tử** chứa:
- **Public Key** của server
- **Thông tin định danh**: Tên miền (CN/SAN), tổ chức, quốc gia
- **Ngày hiệu lực** (Not Before / Not After)
- **Chữ ký số** của Certificate Authority (CA)

```
Certificate của mybank.com
┌──────────────────────────────────────────┐
│  Subject:    CN=mybank.com               │
│  Issuer:     DigiCert Inc                │
│  Valid From: 2025-01-01                  │
│  Valid To:   2026-01-01                  │
│  Public Key: RSA 2048-bit (nội dung...)  │
│                                          │
│  ✍️ Chữ ký số của DigiCert              │
└──────────────────────────────────────────┘
```

## 5.3 Certificate Authority (CA)

CA là **tổ chức trung gian được tin tưởng toàn cầu** (DigiCert, GlobalSign, Let's Encrypt...). Trình duyệt của bạn có sẵn Public Key của các CA lớn này được cài trước khi xuất xưởng.

```
Quy trình cấp chứng chỉ (CSR flow):

mybank.com                          CA (DigiCert)
     │                                    │
     │  1. Tạo cặp khóa RSA               │
     │     Private Key → giữ bí mật       │
     │                                    │
     │  2. Tạo CSR (Certificate           │
     │     Signing Request)               │
     │     CSR = Public Key + tên miền    │
     │ ──────────────────────────────►   │
     │                                    │
     │              3. CA xác minh bạn thực sự
     │                 sở hữu tên miền mybank.com
     │                 (DNS challenge, HTTP challenge...)
     │                                    │
     │  4. CA dùng Private Key của mình   │
     │     ký lên Certificate             │
     │ ◄────────────────────────────────  │
     │                                    │
     └── mybank.com có Certificate ✅
         được ký bởi DigiCert
```

**Cách trình duyệt xác minh:**

```
Browser nhận Certificate của mybank.com
        │
        ├── Lấy chữ ký số trên Certificate
        ├── Dùng Public Key của DigiCert (có sẵn trong browser)
        │   để verify chữ ký đó
        │
        ├── Chữ ký hợp lệ? ──► ✅ Hiện ổ khóa xanh 🔒 HTTPS
        └── Không hợp lệ?  ──► ❌ Cảnh báo "Your connection is not private"
```

> 🔐 **Tại sao hacker không thể giả mạo?**
> Hacker có thể tạo certificate với tên `mybank.com`, nhưng không thể **ký** nó bằng Private Key của DigiCert. Certificate của hắn sẽ bị trình duyệt từ chối ngay vì chữ ký không hợp lệ.

## 5.4 Private CA cho hệ thống nội bộ

Với các hệ thống nội bộ (Kubernetes, microservices, Docker containers), tổ chức thường tự dựng **Private CA** riêng thay vì mua từ CA bên ngoài:

```
Private CA (tự tạo cho nội bộ)
        │
        ├── ca.crt được cài trên tất cả nodes/apps
        │   → Tất cả thành phần "tin tưởng" CA này
        │
        ├── Ký cert cho: kube-apiserver
        ├── Ký cert cho: etcd
        ├── Ký cert cho: kubelet (mỗi node)
        └── Ký cert cho: developer clients

→ Mọi giao tiếp nội bộ đều được mã hóa và xác thực (mTLS)
  mà không tốn tiền mua cert từ CA bên ngoài
```

**Trong Kubernetes (kubeadm):** Private CA nằm tại `/etc/kubernetes/pki/ca.crt` (public) và `ca.key` (private).

------------------------------------------------------------------------

# 6. Quy ước đặt tên file (Naming Conventions)

Khi làm việc với certificate và key trong Kubernetes hay bất kỳ hệ thống nào, cần nhận ra ngay file nào là Public, file nào là Private:

| Loại | Đuôi file phổ biến | Ví dụ | Chia sẻ được? |
|------|--------------------|-------|:------------:|
| **Certificate / Public Key** | `.crt`, `.pem`, `.cer` | `server.crt`, `ca.pem` | ✅ Có |
| **Private Key** | `.key`, `-key.pem` | `server.key`, `server-key.pem` | ❌ Không |
| **Certificate Signing Request** | `.csr` | `server.csr` | Gửi CA để ký |

**Quy tắc ghi nhớ nhanh:**
- Tên file có chữ **`key`** → **Private Key** → Bảo vệ nghiêm ngặt (`chmod 600`)
- Tên file **không có** chữ `key` (`.crt`, `.pem`) → **Certificate/Public Key** → Chia sẻ được

```
Ví dụ thực tế trong /etc/kubernetes/pki/:

✅ Certificate / Public Key — có thể chia sẻ:
   ca.crt
   apiserver.crt
   apiserver-kubelet-client.crt

❌ Private Key — tuyệt mật, chỉ root đọc được:
   ca.key                      ← Quan trọng nhất! Mất file này = mất cluster
   apiserver.key
   apiserver-kubelet-client.key
```

------------------------------------------------------------------------

# 7. Bảng so sánh tổng hợp

| | Mã hóa Đối xứng | Mã hóa Bất đối xứng |
|---|---|---|
| **Số khóa** | 1 khóa duy nhất | 1 cặp (Public + Private) |
| **Tốc độ** | ⚡ Rất nhanh | 🐢 Chậm hơn 100-1000 lần |
| **Phân phối khóa** | ❌ Rủi ro — phải gửi qua mạng | ✅ An toàn — chỉ Public Key gửi đi |
| **Dùng để** | Mã hóa bulk data (sau handshake) | Trao đổi khóa, xác thực chữ ký |
| **Thuật toán phổ biến** | AES-256, ChaCha20 | RSA-2048/4096, ECDSA |
| **Trong TLS** | Giai đoạn truyền dữ liệu | Giai đoạn handshake |

------------------------------------------------------------------------

# 8. Cheat-sheet

```bash
# === TẠO PRIVATE KEY ===
openssl genrsa -out server.key 2048           # RSA 2048-bit
openssl genrsa -out ca.key 4096               # RSA 4096-bit (khuyến nghị cho CA)

# === TẠO CSR ===
openssl req -new -key server.key \
  -subj "/CN=myapp.example.com/O=MyOrg" \
  -out server.csr

# === XEM THÔNG TIN CERTIFICATE ===
openssl x509 -in server.crt -text -noout      # Xem toàn bộ chi tiết
openssl x509 -in server.crt -noout -dates     # Chỉ xem ngày hết hạn
openssl x509 -in server.crt -noout -subject   # Xem Subject (CN, O...)
openssl x509 -in server.crt -noout -issuer    # Xem Issuer (CA nào ký)

# === KÝ CERTIFICATE BẰNG CA NỘI BỘ ===
openssl x509 -req -days 365 \
  -in server.csr \
  -CA ca.crt -CAkey ca.key \
  -CAcreateserial \
  -out server.crt

# === TỰ KÝ (Self-signed — test only) ===
openssl x509 -req -days 365 \
  -in server.csr \
  -signkey server.key \
  -out server.crt

# === SSH KEY PAIR ===
ssh-keygen -t rsa -b 4096 -C "email@example.com"    # Tạo cặp khóa
ssh-copy-id -i ~/.ssh/id_rsa.pub user@server         # Copy public key lên server

# === VERIFY CERTIFICATE VÀ KEY KHỚP NHAU ===
openssl x509 -noout -modulus -in server.crt | md5sum
openssl rsa  -noout -modulus -in server.key | md5sum
# Hai output phải giống nhau

# === KIỂM TRA TLS CỦA MỘT DOMAIN ===
openssl s_client -connect mybank.com:443 -showcerts
```

------------------------------------------------------------------------

# 9. Lưu ý quan trọng

- **Private Key = Tài sản quý giá nhất** — Ai có `ca.key` của Kubernetes có thể ký certificate với bất kỳ quyền nào. Luôn đặt `chmod 600`, chỉ `root` đọc được.
- **Self-signed certificate ≠ Mã hóa yếu** — Mã hóa vẫn mạnh như nhau. Vấn đề chỉ là trình duyệt không tin tưởng vì không có CA ký. Trong hệ thống nội bộ K8s, self-signed với Private CA hoàn toàn hợp lệ và được dùng mặc định bởi kubeadm.
- **Certificate hết hạn ≠ Dữ liệu bị lộ** — Cert hết hạn chỉ có nghĩa là kết nối mới bị từ chối. Dữ liệu đã truyền trước đó vẫn an toàn.
- **Public Key chia sẻ tự do được** — Không có rủi ro bảo mật khi chia sẻ Public Key. Đó chính xác là lý do nó được gọi là "công khai".
- **TLS 1.3 là tiêu chuẩn hiện đại** — TLS 1.3 (2018) loại bỏ nhiều cipher yếu, handshake nhanh hơn (1-RTT thay vì 2-RTT). Kubernetes hiện đại yêu cầu tối thiểu TLS 1.2.

------------------------------------------------------------------------

## Câu hỏi gợi mở

Bạn đang thiết lập hệ thống gồm 3 microservices: `frontend`, `api`, và `database`. Bạn muốn mã hóa toàn bộ giao tiếp giữa chúng (mTLS) và dùng certificate để xác thực lẫn nhau.

1. Nếu bạn dùng **mã hóa đối xứng thuần túy**, vấn đề gì sẽ xảy ra khi `frontend` cần giao tiếp bảo mật với `api` lần đầu tiên?

2. Bạn quyết định dùng **Private CA nội bộ**. Cần tạo bao nhiêu cặp `(certificate, private key)`? Và file nào cần cài lên **tất cả** service để chúng tin tưởng lẫn nhau?

3. Khi đọc config Kubernetes, bạn thấy hai file: `apiserver.crt` và `apiserver.key`. Không cần mở file, bạn biết ngay file nào chứa gì và file nào cần bảo vệ nghiêm ngặt hơn?

## Trả lời câu hỏi gợi mở

**Câu 1:** Với mã hóa đối xứng thuần túy, `frontend` và `api` cần chia sẻ cùng một Secret Key. Vấn đề: Key này phải được truyền qua mạng lúc khởi tạo kết nối — đúng thời điểm chưa có mã hóa nào. Nếu hacker nghe trộm được Key lúc đó, toàn bộ traffic sau đó đều bị giải mã. Đây chính xác là vấn đề "key distribution problem" mà TLS giải quyết bằng cách dùng bất đối xứng để trao đổi khóa lần đầu một cách an toàn.

**Câu 2:** Cần tạo **3 cặp** `(cert, key)` — một cho mỗi service (`frontend.crt/key`, `api.crt/key`, `database.crt/key`). Ngoài ra cần 1 cặp cho CA (`ca.crt/key`). File cần cài trên **tất cả** 3 service là **`ca.crt`** (Certificate của Private CA). Khi `frontend` nhận cert của `api`, nó dùng `ca.crt` để verify — cert được ký bởi cùng CA thì tin tưởng, không thì từ chối.

**Câu 3:** `apiserver.crt` — Certificate chứa Public Key và thông tin định danh; có thể chia sẻ tự do. `apiserver.key` — Private Key của kube-apiserver; cần bảo vệ cực kỳ nghiêm ngặt (permission `600`, chỉ `root` đọc được). Quy tắc: tên file có chữ **`key`** → Private Key → bảo vệ tối đa.
