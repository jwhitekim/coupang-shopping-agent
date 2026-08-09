import { randomUUID } from "node:crypto";

// md 7장: 버튼 callback_data에는 상품/결제 정보 전체가 아니라 일회용 미리보기 ID만 담는다.
// 실제 상품 데이터는 session.candidates에서 productId로 조회한다.
export interface PendingPreview {
  userId: number;
  productId: string;
  createdAt: number;
  used: boolean;
}

const TTL_MS = 5 * 60 * 1000;
const store = new Map<string, PendingPreview>();

export function createPreview(data: { userId: number; productId: string }): string {
  const id = randomUUID().slice(0, 8);
  store.set(id, { ...data, createdAt: Date.now(), used: false });
  return id;
}

export function getPreview(id: string): PendingPreview | undefined {
  const preview = store.get(id);
  if (!preview) return undefined;
  if (Date.now() - preview.createdAt > TTL_MS) {
    store.delete(id);
    return undefined;
  }
  return preview;
}

export function updatePreview(id: string, patch: Partial<PendingPreview>): void {
  const preview = store.get(id);
  if (preview) store.set(id, { ...preview, ...patch });
}

export function deletePreview(id: string): void {
  store.delete(id);
}
