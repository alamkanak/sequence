import { useEffect, useRef, useSyncExternalStore } from "react";
import { notifications, type Notification } from "../core/notifications";
import { CheckCircleIcon, WarningCircleIcon, XIcon } from "./icons";
import { cn, skin } from "./ui";

export function Toast({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: () => void;
}) {
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    if (!notification.duration) return;
    const timer = window.setTimeout(
      () => dismiss.current(),
      notification.duration,
    );
    return () => window.clearTimeout(timer);
  }, [notification]);
  const urgent =
    notification.tone === "error" || notification.tone === "warning";
  return (
    <div
      role={urgent ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg shadow-black/10",
        skin.panel,
        skin.border,
      )}
    >
      {urgent ? (
        <WarningCircleIcon
          size={20}
          className="mt-0.5 shrink-0 text-amber-600 [[data-theme=dark]_&]:text-amber-400"
        />
      ) : (
        <CheckCircleIcon
          size={20}
          className="mt-0.5 shrink-0 text-emerald-600 [[data-theme=dark]_&]:text-emerald-400"
        />
      )}
      <p className="min-w-0 flex-1 text-sm leading-6 break-words">
        {notification.message}
      </p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className={cn(
          "-m-1 flex size-8 shrink-0 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-indigo-500",
          skin.muted,
          skin.hover,
        )}
      >
        <XIcon size={16} />
      </button>
    </div>
  );
}
export function ToastHost() {
  const items = useSyncExternalStore(
    notifications.subscribe,
    notifications.get,
  );
  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3"
    >
      {items.map((item) => (
        <Toast
          key={item.id}
          notification={item}
          onDismiss={() => notifications.dismiss(item.id)}
        />
      ))}
    </section>
  );
}
