export interface CountLog {
  id: string;
  timestamp: string; // ISO string
  count: number;
  imageUrl: string; // Base64 data URI
  notes?: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface GeminiAnalysisResult {
  count: number;
  rawText: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  notes?: string;
}

export interface ShopOrder {
  id: string;
  timestamp: string;
  items: OrderItem[]; // Changed from string[] to structured OrderItem[]
  status: 'pending' | 'completed';
  totalAmount?: number;
}

export interface ShopInsight {
  id: string;
  timestamp: string;
  category: 'inventory' | 'customer' | 'general' | 'shopping_list' | 'security_risk';
  content: string;
  severity?: 'low' | 'medium' | 'high';
}