import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useDebounce } from "@uidotdev/usehooks";
import type { LucideIcon } from "lucide-react";
import { ReactElement, ReactNode, Ref, useEffect, useState } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "../ui/form";

interface BaseField<TFormValues extends FieldValues, TName extends Path<TFormValues>> {
  name: TName;
  label: string;
  description?: string;
}

export interface CheckboxField<
  TFormValues extends FieldValues,
  TName extends Path<TFormValues>,
> extends BaseField<TFormValues, TName> {
  type: "checkbox";
}

export interface SelectField<
  TFormValues extends FieldValues,
  TName extends Path<TFormValues>,
> extends BaseField<TFormValues, TName> {
  type: "select";
  options?: readonly { label: string; value: string }[];
  customControl?: (props: {
    field: {
      value: TFormValues[TName];
      onChange: (value: TFormValues[TName]) => void;
    };
  }) => ReactElement;
}

export interface SliderField<
  TFormValues extends FieldValues,
  TName extends Path<TFormValues>,
> extends BaseField<TFormValues, TName> {
  type: "slider";
  min: number;
  max: number;
  step: number;
  labelFormatter?: (value: number | undefined) => ReactNode;
  labelDisplay?: "inline" | "thumb";
}

export interface TextField<
  TFormValues extends FieldValues,
  TName extends Path<TFormValues>,
> extends BaseField<TFormValues, TName> {
  type: "text";
}

export type Field<TFormValues extends FieldValues, TName extends Path<TFormValues>> =
  | CheckboxField<TFormValues, TName>
  | SelectField<TFormValues, TName>
  | SliderField<TFormValues, TName>
  | TextField<TFormValues, TName>;

interface SettingSectionProps<TFormValues extends FieldValues> {
  title: string;
  icon: LucideIcon;
  fields: readonly Field<TFormValues, Path<TFormValues>>[];
  form: UseFormReturn<TFormValues>;
  onFormSubmit?: (values: TFormValues) => void | Promise<void>;
}

interface FormFieldComponentProps<TFormValues extends FieldValues, TName extends Path<TFormValues>> {
  field: Field<TFormValues, TName>;
  formField: {
    value: TFormValues[TName];
    onChange: (value: TFormValues[TName]) => void;
    onBlur: () => void;
    name: TName;
    ref: Ref<HTMLElement>;
  };
  form: UseFormReturn<TFormValues>;
  onFormSubmit?: (values: TFormValues) => void | Promise<void>;
}

type RenderFieldProps<TFormValues extends FieldValues, TName extends Path<TFormValues>> = {
  field: Field<TFormValues, TName>;
  value: TFormValues[TName];
  onChange: (value: TFormValues[TName]) => void;
};

function renderCheckboxField<TFormValues extends FieldValues, TName extends Path<TFormValues>>({
  value,
  onChange,
}: RenderFieldProps<TFormValues, TName>) {
  return (
    <Switch
      checked={value as boolean}
      onCheckedChange={checked => {
        onChange(checked as TFormValues[TName]);
      }}
    />
  );
}

function optionId(fieldName: string, value: string): string {
  return `${fieldName}-${value.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function renderSelectField<TFormValues extends FieldValues, TName extends Path<TFormValues>>({
  field,
  value,
  onChange,
}: RenderFieldProps<TFormValues, TName>) {
  if (field.type !== "select") return null;

  const name = String(field.name);

  return (
    <RadioGroup value={value as string} onValueChange={onChange} className="flex w-full flex-col gap-2.5">
      {field.options?.map(option => {
        const id = optionId(name, option.value);
        return (
          <div key={option.value} className="flex items-center gap-2.5">
            <RadioGroupItem value={option.value} id={id} />
            <Label htmlFor={id} className="cursor-pointer text-[15px] leading-snug font-normal">
              {option.label}
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}

function renderSliderField<TFormValues extends FieldValues, TName extends Path<TFormValues>>({
  field,
  value,
  onChange,
}: RenderFieldProps<TFormValues, TName>) {
  if (field.type !== "slider") return null;

  const labelFormatter = field.labelFormatter ?? ((val: number | undefined) => `${val}%`);

  return (
    <div className="flex w-full max-w-xl items-center gap-4">
      <Slider
        value={[value as number]}
        onValueChange={values => onChange(values[0] as TFormValues[TName])}
        min={field.min}
        max={field.max}
        step={field.step}
        label={field.labelDisplay === "thumb" ? labelFormatter : undefined}
        labelPosition={field.labelDisplay === "thumb" ? "top" : "none"}
        className="flex-1"
      />
      {field.labelDisplay !== "thumb" && (
        <span className="text-muted-foreground min-w-12 text-right text-sm font-medium">
          {labelFormatter(value as number)}
        </span>
      )}
    </div>
  );
}

function renderTextField<TFormValues extends FieldValues, TName extends Path<TFormValues>>({
  value,
  onChange,
}: RenderFieldProps<TFormValues, TName>) {
  return (
    <Input
      value={value as string}
      onChange={e => onChange(e.target.value as TFormValues[TName])}
      className="w-full max-w-xl"
    />
  );
}

function FormFieldComponent<TFormValues extends FieldValues, TName extends Path<TFormValues>>({
  field,
  formField,
  form,
  onFormSubmit,
}: FormFieldComponentProps<TFormValues, TName>) {
  const debouncedValue = useDebounce(formField.value, 500);
  const [hasChanged, setHasChanged] = useState(false);

  const wrappedOnChange = (value: TFormValues[TName]) => {
    setHasChanged(true);
    formField.onChange(value);
    if (field.type === "text" || field.type === "slider") {
      // For text and slider inputs, we'll let the debounced effect handle the save
      return;
    }
    // For other inputs, save immediately
    if (onFormSubmit) {
      form.handleSubmit(onFormSubmit)();
    }
  };

  // Effect to handle debounced saves for text and slider inputs
  useEffect(() => {
    if (!hasChanged) {
      return;
    }

    if ((field.type === "text" || field.type === "slider") && debouncedValue !== undefined) {
      if (onFormSubmit) {
        form.handleSubmit(onFormSubmit)();
      }
      queueMicrotask(() => setHasChanged(false));
    }
  }, [debouncedValue, field.type, form, hasChanged, onFormSubmit]);

  const hasCustomControl = field.type === "select" && field.customControl;

  const renderProps: RenderFieldProps<TFormValues, TName> = {
    field,
    value: formField.value,
    onChange: wrappedOnChange,
  };

  let control: ReactElement | null = null;
  if (!hasCustomControl) {
    switch (field.type) {
      case "checkbox":
        control = renderCheckboxField(renderProps);
        break;
      case "select":
        control = renderSelectField(renderProps);
        break;
      case "slider":
        control = renderSliderField(renderProps);
        break;
      case "text":
        control = renderTextField(renderProps);
        break;
      default:
        control = null;
    }
  }

  if (hasCustomControl && field.type === "select" && field.customControl) {
    const CustomControl = field.customControl;
    const { ref: _unusedFieldRef, ...fieldForCustom } = formField;
    return (
      <FormItem className="space-y-0 py-4">
        <FormControl>
          <CustomControl
            field={{
              ...fieldForCustom,
              onChange: wrappedOnChange,
            }}
          />
        </FormControl>
      </FormItem>
    );
  }

  const isToggleRow = field.type === "checkbox";

  return (
    <FormItem
      className={
        isToggleRow ? "flex flex-row items-start gap-6 py-4 sm:items-center" : "flex flex-col gap-3 py-4"
      }
    >
      <div className={isToggleRow ? "min-w-0 flex-1" : "w-full min-w-0"}>
        <FormLabel className="text-foreground text-[15px] leading-snug font-medium">{field.label}</FormLabel>
        {field.description && (
          <FormDescription className="text-muted-foreground mt-1 text-[13px] leading-snug">
            {field.description}
          </FormDescription>
        )}
      </div>
      <FormControl className={isToggleRow ? "ml-auto shrink-0 pt-0.5 sm:pt-0" : "w-full min-w-0"}>
        {control}
      </FormControl>
    </FormItem>
  );
}

export function SettingSection<TFormValues extends FieldValues>({
  title,
  icon: Icon,
  fields,
  form,
  onFormSubmit,
}: SettingSectionProps<TFormValues>) {
  return (
    <section className="flex flex-col">
      <h3 className="text-foreground flex items-center gap-2 pb-2 text-lg font-semibold tracking-tight">
        <Icon className="text-muted-foreground size-5 shrink-0" aria-hidden />
        {title}
      </h3>
      <div className="divide-border/80 border-border/80 divide-y border-t">
        {fields.map(field => (
          <FormField
            key={String(field.name)}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormFieldComponent
                field={field}
                formField={formField}
                form={form}
                onFormSubmit={onFormSubmit}
              />
            )}
          />
        ))}
      </div>
    </section>
  );
}
