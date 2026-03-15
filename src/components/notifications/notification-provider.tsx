"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Bell,
  Receipt,
} from "lucide-react";

interface Notification {
  id: string;
  type: "quote_accepted" | "quote_rejected" | "quote_viewed" | "reminder_sent" | "invoice_paid" | "other";
  title: string;
  message: string;
  quoteId: string;
  createdAt: string;
}

interface NotificationContextType {
  badgeCounts: {
    pendingQuotes: number;
    unpaidInvoices: number;
    overdueInvoices: number;
  };
  refreshCounts: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  badgeCounts: { pendingQuotes: 0, unpaidInvoices: 0, overdueInvoices: 0 },
  refreshCounts: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

const POLL_INTERVAL = 30_000; // 30 seconds
const TOAST_ICONS: Record<string, React.ReactNode> = {
  quote_accepted: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  quote_rejected: <XCircle className="h-5 w-5 text-red-500" />,
  quote_viewed: <Eye className="h-5 w-5 text-purple-500" />,
  reminder_sent: <Bell className="h-5 w-5 text-amber-500" />,
  invoice_paid: <Receipt className="h-5 w-5 text-green-500" />,
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [lastPoll, setLastPoll] = useState(() => new Date().toISOString());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  // Badge counts
  const { data: badgeCounts, refetch: refetchCounts } = trpc.notifications.getBadgeCounts.useQuery(
    undefined,
    { refetchInterval: 60_000 } // Refresh counts every minute
  );

  // Poll for changes
  const { data: pollData } = trpc.notifications.pollChanges.useQuery(
    { since: lastPoll },
    {
      refetchInterval: POLL_INTERVAL,
      refetchIntervalInBackground: false,
    }
  );

  // Process new notifications
  useEffect(() => {
    if (!pollData?.changes) return;

    for (const change of pollData.changes) {
      // Skip already seen
      if (seenIdsRef.current.has(change.id)) continue;

      // On first load, just mark as seen (don't show toasts for old events)
      if (!initialized.current) {
        seenIdsRef.current = new Set(seenIdsRef.current).add(change.id);
        continue;
      }

      // Show toast for notification-worthy events
      if (change.type !== "other" && change.title) {
        const icon = TOAST_ICONS[change.type] ?? <Bell className="h-5 w-5" />;

        toast(change.title, {
          description: change.message,
          icon,
          duration: 8_000,
          action: change.quoteId
            ? {
                label: "Voir",
                onClick: () => {
                  // Navigate to quote or invoice based on type
                  if (change.type === "invoice_paid") {
                    window.location.href = `/invoices`;
                  } else {
                    window.location.href = `/quotes/${change.quoteId}`;
                  }
                },
              }
            : undefined,
        });
      }

      seenIdsRef.current = new Set(seenIdsRef.current).add(change.id);
    }

    // Update last poll time
    if (pollData.changes.length > 0) {
      queueMicrotask(() => setLastPoll(new Date().toISOString()));
      // Also refresh badge counts when there are changes
      refetchCounts();
    }
  }, [pollData, refetchCounts]);

  // Mark as initialized after first render
  useEffect(() => {
    const timer = setTimeout(() => {
      initialized.current = true;
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const refreshCounts = useCallback(() => {
    refetchCounts();
  }, [refetchCounts]);

  return (
    <NotificationContext.Provider
      value={{
        badgeCounts: badgeCounts ?? { pendingQuotes: 0, unpaidInvoices: 0, overdueInvoices: 0 },
        refreshCounts,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
