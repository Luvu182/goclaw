import { FieldRenderer } from "./field-renderer";
import type { FieldDef } from "./channel-schemas";

interface ChannelFieldsProps {
  fields: FieldDef[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  idPrefix: string;
  isEdit?: boolean; // for credentials: show "leave blank to keep" hint
  /** Extra values for showWhen checks (e.g. config values visible to credential fields) */
  contextValues?: Record<string, unknown>;
  /** Channel type — used to resolve group names in tags fields */
  channelType?: string;
  /** Instance ID — used for Zalo contacts picker (fetches from Zalo API) */
  instanceId?: string;
}

export function ChannelFields({ fields, values, onChange, idPrefix, isEdit, contextValues, channelType, instanceId }: ChannelFieldsProps) {
  const allValues = contextValues ? { ...contextValues, ...values } : values;
  return (
    <div className="grid gap-3">
      {fields.map((field) => {
        // Conditional visibility: skip field if showWhen condition is not met
        if (field.showWhen) {
          const depValue = allValues[field.showWhen.key] ?? fields.find((f) => f.key === field.showWhen!.key)?.defaultValue;
          if (String(depValue) !== field.showWhen.value) return null;
        }
        // Check disabledWhen condition
        let disabled = false;
        let disabledHint: string | undefined;
        if (field.disabledWhen) {
          const depValue = allValues[field.disabledWhen.key] ?? fields.find((f) => f.key === field.disabledWhen!.key)?.defaultValue;
          if (String(depValue) === field.disabledWhen.value) {
            disabled = true;
            disabledHint = field.disabledWhen.hint;
          }
        }
        return (
          <FieldRenderer
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(v) => onChange(field.key, v)}
            id={`${idPrefix}-${field.key}`}
            isEdit={isEdit}
            disabled={disabled}
            disabledHint={disabledHint}
            channelType={channelType}
            instanceId={instanceId}
          />
        );
      })}
    </div>
  );
}
