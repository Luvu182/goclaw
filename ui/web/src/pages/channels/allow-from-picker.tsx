import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContacts } from "@/pages/contacts/hooks/use-contacts";
import { useGroups } from "@/pages/contacts/hooks/use-groups";

interface AllowFromPickerProps {
  channelType: string;
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  help?: string;
}

export function AllowFromPicker({ channelType, value, onChange, label, help }: AllowFromPickerProps) {
  const { t } = useTranslation("channels");
  const [search, setSearch] = useState("");
  const [manualId, setManualId] = useState("");

  const { contacts, loading: contactsLoading } = useContacts({ channelType, limit: 200 });
  const { groups, loading: groupsLoading } = useGroups(channelType);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const addManual = () => {
    const trimmed = manualId.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setManualId("");
    }
  };

  // Build name lookup maps
  const contactNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contacts) {
      if (c.display_name) map.set(c.sender_id, c.display_name);
    }
    return map;
  }, [contacts]);

  const groupNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) {
      if (g.group_name) map.set(g.group_id, g.group_name);
    }
    return map;
  }, [groups]);

  const resolveName = (id: string): string => {
    return contactNameMap.get(id) ?? groupNameMap.get(id) ?? id;
  };

  // Filter lists by search
  const lowerSearch = search.toLowerCase();
  const filteredContacts = contacts.filter(
    (c) =>
      (c.display_name ?? "").toLowerCase().includes(lowerSearch) ||
      c.sender_id.toLowerCase().includes(lowerSearch) ||
      (c.username ?? "").toLowerCase().includes(lowerSearch),
  );
  const filteredGroups = groups.filter(
    (g) =>
      (g.group_name ?? "").toLowerCase().includes(lowerSearch) ||
      g.group_id.toLowerCase().includes(lowerSearch),
  );

  const loading = contactsLoading || groupsLoading;

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}

      {/* Selected badges */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1">
              {resolveName(id)}
              <button type="button" onClick={() => toggle(id)} className="ml-1 text-xs hover:text-destructive">
                &times;
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search + tabs */}
      {loading ? (
        <p className="text-sm text-muted-foreground">{t("zalo.loading")}</p>
      ) : (
        <>
          <Input
            placeholder={t("allowFromPicker.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-base md:text-sm"
          />
          <Tabs defaultValue="users">
            <TabsList className="w-full">
              <TabsTrigger value="users" className="flex-1 text-xs">
                {t("allowFromPicker.users")} ({filteredContacts.length})
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex-1 text-xs">
                {t("allowFromPicker.groups")} ({filteredGroups.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="mt-2">
              <div className="max-h-56 overflow-y-auto overscroll-contain rounded border p-2 space-y-1">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 py-0.5 text-sm cursor-pointer hover:bg-muted/50 rounded px-1"
                    >
                      <input type="checkbox" checked={value.includes(c.sender_id)} onChange={() => toggle(c.sender_id)} />
                      <span className="truncate">{c.display_name ?? c.sender_id}</span>
                      {c.username && <span className="text-xs text-muted-foreground">@{c.username}</span>}
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">{c.sender_id}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    {t("allowFromPicker.noMatch")}
                  </p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="groups" className="mt-2">
              <div className="max-h-56 overflow-y-auto overscroll-contain rounded border p-2 space-y-1">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((g) => (
                    <label
                      key={g.id}
                      className="flex items-center gap-2 py-0.5 text-sm cursor-pointer hover:bg-muted/50 rounded px-1"
                    >
                      <input type="checkbox" checked={value.includes(g.group_id)} onChange={() => toggle(g.group_id)} />
                      <span className="truncate">{g.group_name ?? g.group_id}</span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {g.member_count > 0 ? `${g.member_count} members` : g.group_id}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    {t("allowFromPicker.noMatch")}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Manual ID entry */}
      <div className="flex gap-2">
        <Input
          placeholder={t("allowFromPicker.manualPlaceholder")}
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addManual();
            }
          }}
          className="h-8 text-base md:text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={addManual} disabled={!manualId.trim()}>
          {t("allowFromPicker.add")}
        </Button>
      </div>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}
