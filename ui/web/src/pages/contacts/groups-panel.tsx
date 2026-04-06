import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { formatDate } from "@/lib/format";
import { useMinLoading } from "@/hooks/use-min-loading";
import { useGroups } from "./hooks/use-groups";
import { CHANNEL_TYPES } from "./constants";

export function GroupsPanel() {
  const { t } = useTranslation("contacts");
  const [channelFilter, setChannelFilter] = useState("");
  const { groups, loading, fetching, refresh } = useGroups(channelFilter || undefined);
  const spinning = useMinLoading(fetching);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={channelFilter || "all"} onValueChange={(v) => setChannelFilter(v === "all" ? "" : v)}>
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
        <Button variant="outline" size="sm" onClick={refresh} disabled={spinning} className="gap-1">
          <RefreshCw className={"h-3.5 w-3.5" + (spinning ? " animate-spin" : "")} />
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">{t("groups.count", { count: groups.length })}</span>
      </div>

      {loading && groups.length === 0 ? (
        <TableSkeleton rows={5} />
      ) : groups.length === 0 ? (
        <EmptyState icon={Users} title={t("groups.emptyTitle")} description={t("groups.emptyDescription")} />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">{t("groups.name")}</th>
                <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">{t("groups.groupId")}</th>
                <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">{t("groups.channel")}</th>
                <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">{t("groups.members")}</th>
                <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">{t("columns.lastSeen")}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-medium">{g.group_name || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{g.group_id}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className="text-[11px]">{g.channel_type}</Badge>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{g.member_count || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{formatDate(g.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
