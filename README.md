# AIoT FaceAI

English version: see README.en.md

He thong AIoT Smart Home ket hop dashboard web, du lieu IoT real-time, xac thuc nguoi dung va nhat ky AI nhan dien khuon mat.

README nay duoc viet cho nguoi moi hoan toan, chi can lam theo tung buoc la co the chay duoc he thong local.

## 1. Tong quan he thong

AIoT FaceAI la mot he thong giam sat va dieu khien nha thong minh voi 4 khoi chinh:

1. Frontend (giao dien web): hien thi dashboard, logs, settings, login/register.
2. Backend API (Next.js API Routes): xu ly nghiep vu, auth, docs, truy van database.
3. Database PostgreSQL: luu state hien tai, logs, lich su lenh, du lieu auth.
4. IoT Gateway + AI feed (Python): nhan du lieu tu Adafruit IO, ghi vao DB va luu su kien AI.

## 2. Kien truc don gian

```text
IoT Device / AI Module
		  |
		  v
  Adafruit IO feeds
		  |
		  v
Python gateway (adafruit_to_db.py)
		  |
		  v
	PostgreSQL (Supabase/local)
		  |
		  v
Next.js API (app/api/*)
		  |
		  v
Frontend Dashboard (app/*)
```

## 3. Frontend dang dung gi?

Frontend duoc xay bang:

1. Next.js 15 + React 18.
2. App Router (`app/`), page va component theo module.
3. Cac man hinh chinh:
	- `/dashboard`: tong quan cam bien va trang thai.
	- `/devices`: trang thiet bi.
	- `/logs`: nhat ky he thong.
	- `/settings`: cau hinh.
	- `/login`, `/register`, `/forgot-password`, `/reset-password`.

Muc tieu frontend: hien thi du lieu de hieu, thao tac nhanh, auth ro rang.

## 4. Backend dang dung gi?

Backend su dung Next.js API Routes trong `app/api/`:

1. Auth APIs: register, login, logout, forgot/reset password, session.
2. Data APIs: gauges, history, logs, commands, alerts, settings, state.
3. Admin/elevation APIs: token va phan quyen admin tam thoi.

Backend truy cap DB qua thu vien `pg` va cac ham trong `app/lib/`.

## 5. Database dang dung gi?

He thong dung PostgreSQL (co the local hoac Supabase cloud).

Nhom bang quan trong:

1. `current_state`: gia tri moi nhat cua cac feed.
2. `system_logs`, `commands`, `access_logs`: lich su su kien he thong.
3. `app_users`, `auth_sessions`, `password_reset_tokens`: auth va session.
4. `gauge_config`: cau hinh min/max/warn cho UI.

Migration SQL nam trong `database/`, chay bang script:

```bash
npm run db:init
```

## 6. AI duoc dung nhu the nao?

Trong code hien tai, AI duoc tich hop theo huong event/data pipeline:

1. Module AI ben ngoai (camera/edge/process) day ket qua len feed (vi du `ai-face-result`).
2. Gateway Python doc feed va ghi vao database.
3. Backend/Frontend hien thi ket qua AI trong logs va dashboard.
4. Khi can, he thong co the tao event mo cua/tu choi truy cap dua tren ket qua AI.

Noi ngan gon: web app khong train model truc tiep, ma tiep nhan ket qua AI va bien no thanh nghiep vu van hanh.

## 7. Cau truc thu muc chinh

```text
AIoT_FaceAI/
  app/                  # Frontend pages + API routes (Next.js)
  database/             # SQL schema + seed + migration files
  scripts/              # Script chay SQL / admin token
  Report/               # Tai lieu latex report
  adafruit.py           # Script mo phong feed
  adafruit_to_db.py     # Gateway doc feed va ghi DB
  requirements.txt      # Python dependencies
  package.json          # Node dependencies + scripts
```

## 8. Chay local tu dau (cho nguoi moi)

### B1: Cai cong cu

1. Node.js 18+ (khuyen nghi 20+)
2. npm 9+
3. Python 3.10+
4. PostgreSQL (local) hoac Supabase

### B2: Clone source

```bash
git clone https://github.com/THVKhang/AIoT_FaceAI.git
cd AIoT_FaceAI
```

### B3: Tao file env

Tao `.env.local` tai root:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db>?sslmode=require
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
APP_BASE_URL=http://localhost:3000

AIO_USERNAME=your_adafruit_username
AIO_KEY=your_adafruit_key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
MAIL_FROM=your_email@gmail.com
```

### B4: Cai dependencies

Node:

```bash
npm install
```

Python (Windows PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Python (macOS/Linux):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### B5: Khoi tao database

```bash
npm run db:init
```

### B6: Chay web app

```bash
npm run dev
```

Mo `http://localhost:3000`.

### B7: (Tuy chon) Chay gateway IoT

Mo terminal moi (venv da active):

```bash
python adafruit_to_db.py
```

Tuy chon mo phong feed:

```bash
python adafruit.py
```

## 9. Scripts quan trong

Trong `package.json`:

1. `npm run dev`: chay local dev server.
2. `npm run build`: build production.
3. `npm run start`: run production build.
4. `npm run db:init`: chay toan bo SQL migration.
5. `npm run admin:token`: tao admin token.

## 10. Deploy production

Khuyen nghi Vercel + Supabase:

1. Push code len GitHub.
2. Connect repo voi Vercel.
3. Set env vars tren Vercel (DB + SMTP + APP_BASE_URL).
4. Chay migration tren DB production.
5. Kiem tra register/login/forgot-password va dashboard data.

## 11. Cac loi thuong gap

1. Register/Login fail sau deploy:
	- Thuong do thieu env vars hoac DB schema chua migrate.
2. Khong gui duoc email reset:
	- Kiem tra SMTP vars va app password.
3. Dashboard khong co du lieu:
	- Kiem tra gateway Python co dang chay khong.
4. Build local fail:
	- Chay lai `npm install` va `npm run db:init`.

## 12. Tinh nang bao mat hien co

1. Password hash.
2. Session token + expire.
3. Password reset token co han.
4. Role user/admin va co che admin elevation.

## 13. Dinh huong mo rong AI/ML

Neu sau nay them train/inference module:

1. Tach service train/offline khoi web app.
2. Giu API web de consume ket qua AI.
3. Luu model metadata + access logs trong DB.
4. Bổ sung monitoring cho inference latency va accuracy drift.

---

Neu ban moi vao du an, hay bat dau tu muc 8 (chay local tu dau), sau do doc muc 1-6 de hieu kien truc tong the.
