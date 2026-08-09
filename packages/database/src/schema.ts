// docs/data-model.md 12장 스키마. users/purchase_policies 테이블은 이번 MVP가
// 단일 허용 사용자·고정 정책(policy-engine이 환경변수에서 읽음)이라 생략했다.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS purchases (
  purchase_id TEXT PRIMARY KEY,
  telegram_user_id INTEGER NOT NULL,
  product_id TEXT NOT NULL,
  product_url TEXT NOT NULL,
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

CREATE UNIQUE INDEX IF NOT EXISTS ux_purchases_confirmation_token_hash
  ON purchases(confirmation_token_hash);

CREATE TABLE IF NOT EXISTS purchase_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL
);
`;
