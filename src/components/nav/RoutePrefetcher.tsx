"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ROUTES_TO_PREFETCH = [
  "/dashboard",
  "/clients",
  "/projects",
  "/income",
  "/expenses",
  "/hours",
  "/finance/invoices",
  "/business",
  "/business/general-expenses",
  "/business/mileage",
];

export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    const prefetch = () => {
      for (const route of ROUTES_TO_PREFETCH) {
        router.prefetch(route);
      }
    };

    const w = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, opts?: IdleRequestOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof w.requestIdleCallback === "function") {
      const idleId = w.requestIdleCallback(prefetch, { timeout: 1200 });
      return () => {
        if (typeof w.cancelIdleCallback === "function") {
          w.cancelIdleCallback(idleId);
        }
      };
    }

    const timeoutId = setTimeout(prefetch, 250);
    return () => clearTimeout(timeoutId);
  }, [router]);

  return null;
}
