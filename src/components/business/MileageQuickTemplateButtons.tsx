import Link from "next/link";
import { TrashIcon } from "@/components/icons/LabeledIcons";
import { deleteMileageTemplateAction } from "@/app/(app)/server-actions/mileage";

type Template = {
  id: string;
  trip_type: "one_way" | "round_trip" | string;
  start_location: string;
  end_location: string | null;
  distance_km: number | string;
};

function locationLabel(key: string | null | undefined) {
  const k = String(key ?? "").trim().toLowerCase();
  if (!k) return "";
  if (k === "home") return "Huis";
  return k
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export async function MileageQuickTemplateButtons({
  templates,
}: {
  templates: Template[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((t) => {
        const route =
          t.start_location || t.end_location
            ? `${locationLabel(t.start_location || "home")}${
                t.end_location ? ` → ${locationLabel(t.end_location)}` : ""
              }`
            : "";
        const label = [
          route || null,
          String(t.trip_type) === "round_trip" ? "RT" : "One way",
          `${Number(t.distance_km ?? 0).toFixed(2)} km`,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <div key={t.id} className="relative inline-flex max-w-full items-stretch">
            <Link
              href={`/business/mileage/add?template=${encodeURIComponent(t.id)}`}
              className="rounded-md border border-zinc-800 bg-zinc-950/30 py-1.5 pl-3 pr-8 text-left text-xs text-zinc-200 hover:bg-zinc-950/50"
              title="Use template (opens prefilled form)"
            >
              <span className="block max-w-[24rem] truncate text-zinc-200">
                {label}
              </span>
            </Link>
            <form action={deleteMileageTemplateAction} className="absolute right-0 top-0">
              <input type="hidden" name="template_id" value={t.id} />
              <button
                type="submit"
                title="Remove template"
                aria-label="Remove template"
                className="flex h-6 w-6 items-center justify-center rounded-tr-md text-sm leading-none text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
}

