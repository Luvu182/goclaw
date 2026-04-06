import { useState } from "react";
import { Shield, Trash2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { HeartbeatPermission } from "@/pages/agents/hooks/use-agent-heartbeat";

interface HeartbeatPermissionsSectionProps {
  permissions: HeartbeatPermission[];
  setPermissions: React.Dispatch<React.SetStateAction<HeartbeatPermission[]>>;
  fetchPermissions: () => Promise<HeartbeatPermission[]>;
  grantPermission: (userId: string, permission: string, scope?: string) => Promise<void>;
  revokePermission: (userId: string, scope?: string) => Promise<void>;
}

export function HeartbeatPermissionsSection({
  permissions, setPermissions, fetchPermissions, grantPermission, revokePermission,
}: HeartbeatPermissionsSectionProps) {
  const { t } = useTranslation("agents");
  const [newPermUserId, setNewPermUserId] = useState("");
  const [newPermType, setNewPermType] = useState<"allow" | "deny">("deny");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-orange-500" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("heartbeat.permissions")}
        </h4>
      </div>
      <p className="text-xs text-muted-foreground">{t("heartbeat.permissionsHint")}</p>
      {permissions.length > 0 && (
        <div className="space-y-1">
          {permissions.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant={p.permission === "deny" ? "destructive" : "success"} className="text-[10px] shrink-0">
                  {p.permission}
                </Badge>
                <span className="truncate font-mono text-xs">{p.userId}</span>
                {p.scope !== "*" && (
                  <span className="text-[10px] text-muted-foreground">({p.scope})</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={async () => {
                  try {
                    await revokePermission(p.userId, p.scope);
                    setPermissions((prev) => prev.filter((x) => x.id !== p.id));
                  } catch { /* toast handled by hook */ }
                }}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Select value={newPermType} onValueChange={(v) => setNewPermType(v as "allow" | "deny")}>
          <SelectTrigger className="w-24 text-base md:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deny">{t("heartbeat.permDeny")}</SelectItem>
            <SelectItem value="allow">{t("heartbeat.permAllow")}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={t("heartbeat.permUserPlaceholder")}
          value={newPermUserId}
          onChange={(e) => setNewPermUserId(e.target.value)}
          className="text-base md:text-sm flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={!newPermUserId.trim()}
          onClick={async () => {
            const uid = newPermUserId.trim();
            if (!uid) return;
            await grantPermission(uid, newPermType);
            setNewPermUserId("");
            fetchPermissions().then(setPermissions).catch(() => {});
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
