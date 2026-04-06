import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGroups } from "@/pages/contacts/hooks/use-groups";

export const ACCESS_TAG_KEYS = new Set(["allow_from", "group_allow_from"]);

interface TagsFieldProps {
  id: string;
  label: string;
  help: string;
  value: unknown;
  onChange: (v: unknown) => void;
  placeholder?: string;
  channelType?: string;
  fieldKey: string;
}

export function TagsField({
  id,
  label,
  help,
  value,
  onChange,
  placeholder,
  channelType,
  fieldKey,
}: TagsFieldProps) {
  const { t } = useTranslation("channels");
  // Only fetch groups for access-control tags fields when channel type is known
  const shouldResolve = ACCESS_TAG_KEYS.has(fieldKey) && !!channelType;
  const { groups } = useGroups(shouldResolve ? channelType : undefined);

  const tags = Array.isArray(value) ? (value as string[]) : [];

  // Build a map of group_id -> group_name for quick lookup
  const groupNameMap = useMemo(() => {
    if (!shouldResolve || groups.length === 0) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const g of groups) {
      if (g.group_name) map.set(g.group_id, g.group_name);
    }
    return map;
  }, [shouldResolve, groups]);

  // Find tags that match known groups
  const resolvedTags = useMemo(() => {
    if (groupNameMap.size === 0 || tags.length === 0) return [];
    return tags
      .filter((tag) => groupNameMap.has(tag))
      .map((tag) => ({ id: tag, name: groupNameMap.get(tag)! }));
  }, [groupNameMap, tags]);

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={tags.join("\n")}
        onChange={(e) => {
          const lines = e.target.value.split(/[\n,]/).map((l) => l.trim()).filter(Boolean);
          onChange(lines.length > 0 ? lines : undefined);
        }}
        placeholder={placeholder ?? t("groupOverrides.fields.allowedUsersPlaceholder")}
        rows={3}
        className="font-mono text-sm"
      />
      {resolvedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {resolvedTags.map(({ id: gid, name }) => (
            <span
              key={gid}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              title={gid}
            >
              <span className="font-medium text-foreground">{name}</span>
              <span className="opacity-60">{gid}</span>
            </span>
          ))}
        </div>
      )}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}
