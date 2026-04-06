import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Loader2, XCircle } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { URLPreviewStep } from "./skill-install-url-preview";
import type { SkillPreview, InstallResult, URLStep } from "./skill-install-types";

interface URLTabProps {
  onPreviewURL: (url: string, branch?: string) => Promise<{ skills: SkillPreview[]; total: number }>;
  onInstallURL: (url: string, slugs: string[], branch?: string) => Promise<{
    installed: Array<{ id: string; slug: string; version: number; name: string; deps_warning?: string }>;
    total: number;
    errors?: string[];
  }>;
  onClose: () => void;
  tabSwitcher: React.ReactNode;
}

export function URLTab({ onPreviewURL, onInstallURL, onClose, tabSwitcher }: URLTabProps) {
  const { t } = useTranslation("skills");
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [urlStep, setUrlStep] = useState<URLStep>("input");
  const [urlLoading, setUrlLoading] = useState(false);
  const [previews, setPreviews] = useState<SkillPreview[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [urlResult, setUrlResult] = useState<InstallResult | null>(null);
  const [urlError, setUrlError] = useState("");

  const isGitHub = /github\.com\/[^/]+\/[^/]+/.test(url);

  const handlePreview = async () => {
    if (!url.trim()) return;
    setUrlLoading(true); setUrlError("");
    try {
      const res = await onPreviewURL(url.trim(), branch.trim() || undefined);
      const skills = res.skills ?? [];
      setPreviews(skills);
      setSelected(new Set(skills.map((s) => s.slug)));
      setUrlStep("select");
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setUrlLoading(false);
    }
  };

  const handleURLInstall = async () => {
    const slugs = [...selected];
    if (slugs.length === 0) return;
    setUrlStep("installing"); setUrlError("");
    try {
      const res = await onInstallURL(url.trim(), slugs, branch.trim() || undefined);
      setUrlResult({ installed: res.installed ?? [], errors: res.errors });
      setUrlStep("done");
    } catch (err) {
      setUrlResult({ installed: [], errors: [err instanceof Error ? err.message : "Install failed"] });
      setUrlStep("done");
    }
  };

  const toggleSkill = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === previews.length ? new Set() : new Set(previews.map((s) => s.slug)));
  };

  return (
    <>
      {urlStep === "input" && tabSwitcher}

      <div className="flex flex-col gap-4 overflow-y-auto flex-1">
        {/* Step 1: URL input */}
        {urlStep === "input" && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="skill-url">{t("installUrl.urlLabel")}</Label>
              <Input
                id="skill-url"
                placeholder="https://github.com/owner/repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={urlLoading}
                className="text-base md:text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") handlePreview(); }}
              />
            </div>
            {isGitHub && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="skill-branch">{t("installUrl.branchLabel")}</Label>
                <Input
                  id="skill-branch"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  disabled={urlLoading}
                  className="text-base md:text-sm"
                />
                <p className="text-xs text-muted-foreground">{t("installUrl.branchHint")}</p>
              </div>
            )}
            {urlError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0" /><span>{urlError}</span>
              </div>
            )}
          </>
        )}

        {/* Step 2+: Preview / Installing / Done */}
        {urlStep !== "input" && (
          <URLPreviewStep
            urlStep={urlStep}
            previews={previews}
            selected={selected}
            urlResult={urlResult}
            onToggleSkill={toggleSkill}
            onToggleAll={toggleAll}
          />
        )}
      </div>

      <DialogFooter>
        {urlStep === "input" && (
          <>
            <Button variant="outline" onClick={onClose}>{t("upload.cancel")}</Button>
            <Button onClick={handlePreview} disabled={!url.trim() || urlLoading}>
              {urlLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" />{t("installUrl.scanning")}</>
              ) : (
                <><Globe className="h-4 w-4 mr-1" />{t("installUrl.scan")}</>
              )}
            </Button>
          </>
        )}
        {urlStep === "select" && (
          <>
            <Button variant="outline" onClick={() => setUrlStep("input")}>{t("installUrl.back")}</Button>
            <Button onClick={handleURLInstall} disabled={selected.size === 0}>
              {t("installUrl.installCount", { count: selected.size })}
            </Button>
          </>
        )}
        {urlStep === "done" && (
          <Button onClick={onClose}>{t("installUrl.close")}</Button>
        )}
      </DialogFooter>
    </>
  );
}
