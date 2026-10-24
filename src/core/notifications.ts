export type ToastTone = "info" | "success" | "warning" | "error";
export interface Notification {
  id: string;
  message: string;
  tone: ToastTone;
  duration: number;
}
let sequence = 0;
let items: Notification[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** App-wide transient messages. Repeated errors do not create a notification flood. */
export const notifications = {
  get: () => items,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  show(
    message: string,
    options: { id?: string; tone?: ToastTone; duration?: number } = {},
  ) {
    const tone = options.tone ?? "info";
    const duplicate = items.find(
      (item) => item.message === message && item.tone === tone,
    );
    if (duplicate) return duplicate.id;
    const id = options.id ?? `notification-${++sequence}`;
    const duration =
      options.duration ?? (tone === "error" || tone === "warning" ? 0 : 6000);
    items = [
      ...items.filter((item) => item.id !== id),
      { id, message, tone, duration },
    ].slice(-5);
    emit();
    return id;
  },
  dismiss(id: string) {
    items = items.filter((item) => item.id !== id);
    emit();
  },
};
