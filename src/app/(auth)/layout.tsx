import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full min-w-0 max-w-md items-center px-4">
      {children}
    </div>
  );
}

