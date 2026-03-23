import { redirect } from "next/navigation";
import { getUserOrNull } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getUserOrNull();
  redirect(user ? "/dashboard" : "/login");
}
