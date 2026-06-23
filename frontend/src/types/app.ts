export type ToastStatus = 'success' | 'error' | 'warning';
export interface ToastItem {
  id: number;
  status: ToastStatus;
  message: string;
}
export type Language = 'en-US' | 'vi-VN';
