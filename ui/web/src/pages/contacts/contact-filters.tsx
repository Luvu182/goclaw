import { useTranslation } from "react-i18next";
import { Merge, Search, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHANNEL_TYPES } from "./constants";

interface ContactFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  channelType: string;
  onChannelChange: (value: string) => void;
  contactType: string;
  onContactTypeChange: (value: string) => void;
}

export function ContactFilters({
  search,
  onSearchChange,
  onSearchSubmit,
  channelType,
  onChannelChange,
  contactType,
  onContactTypeChange,
}: ContactFiltersProps) {
  const { t } = useTranslation("contacts");

  return (
    <div className="flex flex-wrap items-end gap-2">
      <form onSubmit={onSearchSubmit} className="flex gap-2 flex-1 min-w-[200px] max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          {t("filter")}
        </Button>
      </form>

      <Select value={channelType || "all"} onValueChange={onChannelChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allChannels")}</SelectItem>
          {CHANNEL_TYPES.map((ct) => (
            <SelectItem key={ct} value={ct}>{ct}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={contactType || "all"} onValueChange={onContactTypeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
          <SelectItem value="user">{t("types.user")}</SelectItem>
          <SelectItem value="group">{t("types.group")}</SelectItem>
          <SelectItem value="topic">{t("types.topic", "Topic")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

interface SelectionToolbarProps {
  selectedCount: number;
  allSelectedMerged: boolean;
  onMerge: () => void;
  onUnmerge: () => void;
}

export function SelectionToolbar({
  selectedCount,
  allSelectedMerged,
  onMerge,
  onUnmerge,
}: SelectionToolbarProps) {
  const { t } = useTranslation("contacts");

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
      <span className="text-sm font-medium">
        {t("selectedCount", { count: selectedCount })}
      </span>
      <div className="ml-auto flex gap-2">
        <Button size="sm" variant="default" className="gap-1" onClick={onMerge}>
          <Merge className="h-3.5 w-3.5" /> {t("merge.button")}
        </Button>
        {allSelectedMerged && (
          <Button size="sm" variant="outline" className="gap-1" onClick={onUnmerge}>
            <Unlink className="h-3.5 w-3.5" /> {t("merge.unmergeButton")}
          </Button>
        )}
      </div>
    </div>
  );
}
