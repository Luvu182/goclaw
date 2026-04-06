import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SkillPreview, InstallResult, URLStep } from "./skill-install-types";

interface URLPreviewStepProps {
  urlStep: URLStep;
  previews: SkillPreview[];
  selected: Set<string>;
  urlResult: InstallResult | null;
  onToggleSkill: (slug: string) => void;
  onToggleAll: () => void;
}

export function URLPreviewStep({
  urlStep, previews, selected, urlResult, onToggleSkill, onToggleAll,
}: URLPreviewStepProps) {
  const { t } = useTranslation("skills");

  /* Step 2: Select skills */
  if (urlStep === "select") {
    return (
      <>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t("installUrl.foundSkills", { count: previews.length })}</p>
          <Button variant="ghost" size="sm" onClick={onToggleAll} className="text-xs h-7">
            {selected.size === previews.length ? t("installUrl.deselectAll") : t("installUrl.selectAll")}
          </Button>
        </div>
        <div className="flex flex-col gap-1 overflow-y-auto max-h-[40dvh]">
          {previews.map((skill) => (
            <label
              key={skill.slug}
              className="flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(skill.slug)}
                onChange={() => onToggleSkill(skill.slug)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm">{skill.name}</span>
                  <span className="text-xs text-muted-foreground">({skill.slug})</span>
                </div>
                {skill.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{skill.description}</p>
                )}
                {skill.dir && (
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{skill.dir}/</p>
                )}
              </div>
            </label>
          ))}
        </div>
      </>
    );
  }

  /* Step 3: Installing */
  if (urlStep === "installing") {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("installUrl.installingCount", { count: selected.size })}</p>
      </div>
    );
  }

  /* Step 4: Results */
  if (urlStep === "done" && urlResult) {
    return (
      <div className="flex flex-col gap-2">
        {urlResult.installed.length > 0 && (
          <div className="flex flex-col gap-1">
            {urlResult.installed.map((s) => (
              <div key={s.slug} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="font-medium">{s.name}</span>
                {s.deps_warning && <span className="text-xs text-amber-600">{s.deps_warning}</span>}
              </div>
            ))}
          </div>
        )}
        {urlResult.errors && urlResult.errors.length > 0 && (
          <div className="flex flex-col gap-1">
            {urlResult.errors.map((err, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-destructive">{err}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
