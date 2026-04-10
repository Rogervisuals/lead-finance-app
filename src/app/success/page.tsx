import { Suspense } from "react";
import { CheckoutSuccessClient } from "./CheckoutSuccessClient";

export const dynamic = "force-dynamic";

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-zinc-100">Loading…</h1>
        </div>
      }
    >
      <CheckoutSuccessClient />
    </Suspense>
  );
}
