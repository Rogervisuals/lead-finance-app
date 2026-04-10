"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PlanId } from "@/lib/subscription/types";

const SubscriptionPlanContext = createContext<PlanId | null>(null);

/**
 * Holds the real plan string from Supabase (re-fetched on each server render of the app layout).
 */
export function SubscriptionPlanProvider({
  plan,
  children,
}: {
  plan: PlanId;
  children: ReactNode;
}) {
  return (
    <SubscriptionPlanContext.Provider value={plan}>
      {children}
    </SubscriptionPlanContext.Provider>
  );
}

export function useSubscriptionPlan(): PlanId {
  const v = useContext(SubscriptionPlanContext);
  if (v == null) {
    throw new Error("useSubscriptionPlan must be used within SubscriptionPlanProvider");
  }
  return v;
}
