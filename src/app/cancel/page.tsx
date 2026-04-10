import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-zinc-100">Payment cancelled</h1>
      <p className="mt-3 text-sm text-zinc-400">
        No charges were made. You can upgrade anytime from the app.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-block rounded-md border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-900"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
