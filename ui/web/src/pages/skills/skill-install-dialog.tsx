import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Globe } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FileTab } from "./skill-install-file-tab";
import { URLTab } from "./skill-install-url-tab";
import type { Tab, SkillPreview } from "./skill-install-types";

interface SkillInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => Promise<unknown>;
  onPreviewURL: (url: string, branch?: string) => Promise<{ skills: SkillPreview[]; total: number }>;
  onInstallURL: (url: string, slugs: string[], branch?: string) => Promise<{
    installed: Array<{ id: string; slug: string; version: number; name: string; deps_warning?: string }>;
    total: number;
    errors?: string[];
  }>;
}

export function SkillInstallDialog({
  open, onOpenChange, onUpload, onPreviewURL, onInstallURL,
}: SkillInstallDialogProps) {
  const { t } = useTranslation("skills");
  const [tab, setTab] = useState<Tab>("file");
  // Bump key to reset child state when switching tabs or closing
  const [tabKey, setTabKey] = useState(0);

  const handleClose = useCallback((v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setTab("file");
      setTabKey((k) => k + 1);
    }
  }, [onOpenChange]);

  const close = useCallback(() => handleClose(false), [handleClose]);

  const switchTab = useCallback((t: Tab) => {
    setTab(t);
    setTabKey((k) => k + 1);
  }, []);

  const tabSwitcher = useMemo(() => (
    <TabSwitcher current={tab} onSwitch={switchTab} />
  ), [tab, switchTab]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[80dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("install.title")}</DialogTitle>
          <DialogDescription>{t("install.description")}</DialogDescription>
        </DialogHeader>

        {tab === "file" ? (
          <FileTab
            key={tabKey}
            onUpload={onUpload}
            onClose={close}
            tabSwitcher={tabSwitcher}
          />
        ) : (
          <URLTab
            key={tabKey}
            onPreviewURL={onPreviewURL}
            onInstallURL={onInstallURL}
            onClose={close}
            tabSwitcher={tabSwitcher}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Tab switcher ── */

function TabSwitcher({ current, onSwitch }: { current: Tab; onSwitch: (t: Tab) => void }) {
  const { t } = useTranslation("skills");
  return (
    <div className="flex gap-1 border-b">
      <button
        type="button"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border-b-2 -mb-px",
          current === "file" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
        )}
        onClick={() => onSwitch("file")}
      >
        <Upload className="h-3.5 w-3.5" /> {t("install.tabFile")}
      </button>
      <button
        type="button"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border-b-2 -mb-px",
          current === "url" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
        )}
        onClick={() => onSwitch("url")}
      >
        <Globe className="h-3.5 w-3.5" /> {t("install.tabUrl")}
      </button>
    </div>
  );
}
