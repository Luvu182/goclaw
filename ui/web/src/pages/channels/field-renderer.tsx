import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToolNameSelect } from "@/components/shared/tool-name-select";
import { SkillNameSelect } from "@/components/shared/skill-name-select";
import { AllowFromPicker } from "./allow-from-picker";
import { ZaloContactsPicker } from "./zalo/zalo-contacts-picker";
import { TagsField, ACCESS_TAG_KEYS } from "./tags-field";
import type { FieldDef } from "./channel-schemas";

const INHERIT = "__inherit__";

export interface FieldRendererProps {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  id: string;
  isEdit?: boolean;
  disabled?: boolean;
  disabledHint?: string;
  channelType?: string;
  instanceId?: string;
}

export function FieldRenderer({
  field,
  value,
  onChange,
  id,
  isEdit,
  disabled,
  disabledHint,
  channelType,
  instanceId,
}: FieldRendererProps) {
  const { t } = useTranslation("channels");
  // i18n: try "fieldConfig.<key>.label" / "fieldConfig.<key>.help", fall back to hardcoded schema string
  const label = t(`fieldConfig.${field.key}.label`, { defaultValue: field.label });
  const help = field.help ? t(`fieldConfig.${field.key}.help`, { defaultValue: field.help }) : "";
  const resolvedHint = disabledHint ? t(disabledHint, { defaultValue: disabledHint }) : undefined;
  const labelSuffix = field.required && !isEdit ? " *" : "";
  const editHint = isEdit && field.type === "password" ? ` ${t("form.credentialsHint")}` : "";

  switch (field.type) {
    case "text":
    case "password":
      return (
        <div className="grid gap-1.5">
          <Label htmlFor={id}>
            {label}{labelSuffix}{editHint}
          </Label>
          <Input
            id={id}
            type={field.type}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {help && <p className="text-xs text-muted-foreground">{help}</p>}
        </div>
      );

    case "number":
      return (
        <div className="grid gap-1.5">
          <Label htmlFor={id}>{label}{labelSuffix}</Label>
          <Input
            id={id}
            type="number"
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={field.defaultValue !== undefined ? String(field.defaultValue) : undefined}
          />
          {help && <p className="text-xs text-muted-foreground">{help}</p>}
        </div>
      );

    case "boolean": {
      const boolHint = resolvedHint || help;
      return (
        <div className={`grid gap-1${disabled ? " opacity-50" : ""}`}>
          <div className="flex items-center gap-2">
            <Switch
              id={id}
              checked={(value as boolean) ?? (field.defaultValue as boolean) ?? false}
              onCheckedChange={(v) => onChange(v)}
              disabled={disabled}
            />
            <Label htmlFor={id}>{label}</Label>
          </div>
          {boolHint && <p className="text-xs text-muted-foreground ml-9">{boolHint}</p>}
        </div>
      );
    }

    case "select":
      return (
        <div className="grid gap-1.5">
          <Label>{label}{labelSuffix}</Label>
          <Select
            value={(value as string) ?? (field.defaultValue as string) ?? ""}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(`fieldOptions.${field.key}.${opt.value}`, { defaultValue: opt.label })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {help && <p className="text-xs text-muted-foreground">{help}</p>}
        </div>
      );

    case "tristate": {
      // Tri-state: undefined = inherit, value = override.
      // With options: select with Inherit + custom options (string value).
      // Without options: select with Inherit/Yes/No (boolean value).
      const inheritLabel = t("groupOverrides.fields.inherit", { defaultValue: "Inherit" });

      if (field.options) {
        // String tri-state (e.g. group_policy)
        const allOptions = [{ value: INHERIT, label: inheritLabel }, ...field.options];
        const selectValue = (value as string) || INHERIT;
        return (
          <div className="grid gap-1.5">
            <Label>{label}</Label>
            <Select
              value={selectValue}
              onValueChange={(v) => onChange(v === INHERIT ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.value === INHERIT ? inheritLabel : t(`fieldOptions.${field.key}.${opt.value}`, { defaultValue: opt.label })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {help && <p className="text-xs text-muted-foreground">{help}</p>}
          </div>
        );
      }

      // Boolean tri-state (e.g. require_mention, enabled)
      const yesLabel = t("groupOverrides.fields.yes", { defaultValue: "Yes" });
      const noLabel = t("groupOverrides.fields.no", { defaultValue: "No" });
      const triOptions = [
        { value: INHERIT, label: inheritLabel },
        { value: "true", label: yesLabel },
        { value: "false", label: noLabel },
      ];
      const boolToStr = (v: unknown): string => {
        if (v === undefined || v === null) return INHERIT;
        return v ? "true" : "false";
      };
      const strToBool = (v: string): boolean | undefined => {
        if (v === INHERIT) return undefined;
        return v === "true";
      };

      return (
        <div className={`grid gap-1.5${disabled ? " opacity-50" : ""}`}>
          <Label>{label}</Label>
          <Select value={boolToStr(value)} onValueChange={(v) => onChange(strToBool(v))} disabled={disabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {triOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {resolvedHint && <p className="text-xs text-muted-foreground">{resolvedHint}</p>}
          {!resolvedHint && help && <p className="text-xs text-muted-foreground">{help}</p>}
        </div>
      );
    }

    case "textarea":
      return (
        <div className="grid gap-1.5">
          <Label htmlFor={id}>{label}</Label>
          <Textarea
            id={id}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            placeholder={field.placeholder}
            rows={3}
          />
          {help && <p className="text-xs text-muted-foreground">{help}</p>}
        </div>
      );

    case "tool-select":
      return (
        <div className="grid gap-1.5">
          <Label>{label}</Label>
          <ToolNameSelect
            value={(value as string[]) ?? []}
            onChange={(v) => onChange(v.length > 0 ? v : undefined)}
            placeholder={field.placeholder}
          />
          {help && <p className="text-xs text-muted-foreground">{help}</p>}
        </div>
      );

    case "skill-select":
      return (
        <div className="grid gap-1.5">
          <Label>{label}</Label>
          <SkillNameSelect
            value={(value as string[]) ?? []}
            onChange={(v) => onChange(v.length > 0 ? v : undefined)}
            placeholder={field.placeholder}
          />
          {help && <p className="text-xs text-muted-foreground">{help}</p>}
        </div>
      );

    case "tags":
      // Use ZaloContactsPicker for Zalo (fetches fresh from Zalo API)
      if (ACCESS_TAG_KEYS.has(field.key) && channelType === "zalo_personal" && instanceId) {
        const tags = Array.isArray(value) ? (value as string[]) : [];
        return (
          <ZaloContactsPicker
            instanceId={instanceId}
            hasCredentials={true}
            value={tags}
            onChange={(ids) => onChange(ids.length > 0 ? ids : undefined)}
          />
        );
      }
      // Use AllowFromPicker for other channels (queries DB)
      // allow_from → users only, group_allow_from → groups only
      if (ACCESS_TAG_KEYS.has(field.key) && channelType) {
        const tags = Array.isArray(value) ? (value as string[]) : [];
        const mode = field.key === "group_allow_from" ? "groups" as const : "users" as const;
        return (
          <AllowFromPicker
            channelType={channelType}
            value={tags}
            onChange={(ids) => onChange(ids.length > 0 ? ids : undefined)}
            label={`${label}${labelSuffix}`}
            help={help}
            mode={mode}
            instanceId={instanceId}
          />
        );
      }
      return (
        <TagsField
          id={id}
          label={`${label}${labelSuffix}`}
          help={help}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
          channelType={channelType}
          fieldKey={field.key}
        />
      );

    default:
      return null;
  }
}
