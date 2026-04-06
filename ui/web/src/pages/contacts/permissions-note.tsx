import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Info } from "lucide-react";
import { PERM_CHANNELS } from "./constants";

export function PermissionsNote() {
  const { t } = useTranslation("contacts");
  const [open, setOpen] = useState(true);
  const p = "permissionsNote";

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
      >
        <Info className="h-4 w-4 text-blue-500 shrink-0" />
        <span className="font-medium text-blue-700 dark:text-blue-400">{t(`${p}.title`)}</span>
        <ChevronDown className={`ml-auto h-4 w-4 text-blue-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="px-3 pb-3 space-y-1 text-xs text-muted-foreground">
          {PERM_CHANNELS.map((ch) => (
            <li key={ch} className={ch === "feishu" ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
              {t(`${p}.${ch}`)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
