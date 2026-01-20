export type CategoryType = 'water' | 'staple' | 'main' | 'side' | 'hygiene' | 'other';

export interface InventoryItem {
  id: string;
  name: string;          // 商品名
  quantity: number;      // 現在の数量
  maxQuantity?: number;  // ★追加: 目標備蓄数 (この数値を維持するように補充)
  unit: string;          // 単位 (個, 本, 袋, 缶, g など)
  expiryDate: string;    // 賞味期限 (YYYY-MM-DD)
  category: CategoryType;// カテゴリ
  
  // ▼ ユーザー入力・運用設定
  notes?: string;        // 自由記述メモ（保管場所や味の補足など）
  isRollingStock: boolean; // ★重要: trueの場合、消費(quantity減)時に自動で買い物リストへ追加

  // ▼ AI解析・緊急時用メタデータ（自動付与推奨）
  calories?: number;     // 健康管理用
  requiresFire?: boolean;// 緊急時フィルタ用（火が必要か）
  requiresWater?: boolean;// 緊急時フィルタ用（水が必要か）
  location?: 'pantry' | 'fridge' | 'emergency_bag'; // IoT連携用ロケーション
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  addedAt: string;
  checked: boolean;
  // AI Agent Fields
  amazonQuery?: string;  // Amazon search query suggested by AI
  aiReason?: string;     // Reason for adding (e.g. "Stock low")
  isLoading?: boolean;   // While AI is thinking
}

export type ViewState = 'home' | 'inventory' | 'scan' | 'advisor' | 'shopping' | 'add';
