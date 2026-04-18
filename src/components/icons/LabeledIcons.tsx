"use client";

import type { ReactNode } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { config } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrashCan } from "@fortawesome/free-regular-svg-icons";

config.autoAddCss = false;

const defaultIconClass = "h-[0.95em] w-[0.95em] shrink-0 opacity-90";

/** Generic icon + text; add new presets below instead of new files. */
export function IconLabel({
  icon,
  children,
  className,
  iconClassName,
}: {
  icon: IconDefinition;
  children: ReactNode;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={className ?? "inline-flex items-center gap-1.5"}>
      <FontAwesomeIcon
        icon={icon}
        className={iconClassName ?? defaultIconClass}
        aria-hidden
      />
      {children}
    </span>
  );
}

export function EditLabel({
  children,
  className,
  iconClassName,
}: {
  children: ReactNode;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <IconLabel
      icon={faPenToSquare}
      className={className}
      iconClassName={iconClassName}
    >
      {children}
    </IconLabel>
  );
}

export function DeleteLabel({
  children,
  className,
  iconClassName,
}: {
  children: ReactNode;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <IconLabel
      icon={faTrashCan}
      className={className}
      iconClassName={iconClassName}
    >
      {children}
    </IconLabel>
  );
}

/** Trash can only (e.g. icon-only buttons with `aria-label`). */
export function TrashIcon({ className }: { className?: string }) {
  return (
    <FontAwesomeIcon
      icon={faTrashCan}
      className={className ?? `${defaultIconClass} inline-block`}
      aria-hidden
    />
  );
}
