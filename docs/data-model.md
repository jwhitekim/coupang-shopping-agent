# 데이터 모델

SQLite로 시작하기에 충분하다.

### users

```sql
CREATE TABLE users (
  telegram_user_id INTEGER PRIMARY KEY,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
```

### purchase_policies

```sql
CREATE TABLE purchase_policies (
  telegram_user_id INTEGER PRIMARY KEY,
  max_price_per_item INTEGER NOT NULL,
  max_price_per_order INTEGER NOT NULL,
  max_daily_spend INTEGER NOT NULL,
  max_quantity INTEGER NOT NULL,
  max_price_increase INTEGER NOT NULL,
  allow_subscriptions INTEGER NOT NULL DEFAULT 0,
  allowed_address_id TEXT NOT NULL
);
```

### purchases

```sql
CREATE TABLE purchases (
  purchase_id TEXT PRIMARY KEY,
  telegram_user_id INTEGER NOT NULL,
  product_id TEXT NOT NULL,
  vendor_item_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  expected_price INTEGER NOT NULL,
  final_price INTEGER,
  confirmation_token_hash TEXT NOT NULL,
  checkout_fingerprint TEXT,
  status TEXT NOT NULL,
  coupang_order_number TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### purchase_events

```sql
CREATE TABLE purchase_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL
);
```

감사 로그에는 카드번호, 쿠키, 비밀번호 등 민감정보를 기록하지 않는다.

---

## 목록

- [docs/README.md](README.md) — 문서 목차
- [docs/order-lifecycle.md](order-lifecycle.md) — 이 테이블들이 사용되는 상태 머신·중복 결제 방지 로직
