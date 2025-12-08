import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useDebounce } from "@uidotdev/usehooks";
import { ReactElement, ReactNode, useEffect, useRef } from "react";
import { Path, UseFormReturn } from "react-hook-form";
import { IconType } from "react-icons";
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "../ui/form";

interface BaseField<TFormValues extends Record<string, any>, TName extends Path<TFormValues>> {
  name: TName;
  label: string;
  description?: string;
}

export interface CheckboxField<
  TFormValues extends Record<string, any>,
  TName extends Path<TFormValues>,
> extends BaseField<TFormValues, TName> {
  type: "checkbox";
}

export interface SelectField<
  TFormValues extends Record<string, any>,
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
  TFormValues extends Record<string, any>,
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
  TFormValues extends Record<string, any>,
  TName extends Path<TFormValues>,
> extends BaseField<TFormValues, TName> {
  type: "text";
}

export type Field<TFormValues extends Record<string, any>, TName extends Path<TFormValues>> =
  | CheckboxField<TFormValues, TName>
  | SelectField<TFormValues, TName>
  | SliderField<TFormValues, TName>
  | TextField<TFormValues, TName>;

interface SettingSectionProps<TFormValues extends Record<string, any>> {
  title: string;
  icon: IconType;
  fields: readonly Field<TFormValues, Path<TFormValues>>[];
  form: UseFormReturn<TFormValues>;
}

interface FormFieldComponentProps<
  TFormValues extends Record<string, any>,
  TName extends Path<TFormValues>,
> {
  field: Field<TFormValues, TName>;
  formField: {
    value: TFormValues[TName];
    onChange: (value: TFormValues[TName]) => void;
  };
  form: UseFormReturn<TFormValues>;
}

type RenderFieldProps<TFormValues extends Record<string, any>, TName extends Path<TFormValues>> = {
  field: Field<TFormValues, TName>;
  value: TFormValues[TName];
  onChange: (value: TFormValues[TName]) => void;
};

function renderCheckboxField<
  TFormValues extends Record<string, any>,
  TName extends Path<TFormValues>,
>({ value, onChange }: RenderFieldProps<TFormValues, TName>) {
  return <Checkbox checked={value as boolean} onCheckedChange={onChange} />;
}

function renderSelectField<
  TFormValues extends Record<string, any>,
  TName extends Path<TFormValues>,
>({ field, value, onChange }: RenderFieldProps<TFormValues, TName>) {
  if (field.type !== "select") return null;

  return (
    <Select value={value as string} onValueChange={onChange}>
      <SelectTrigger className="w-full md:w-52">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {field.options?.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function renderSliderField<
  TFormValues extends Record<string, any>,
  TName extends Path<TFormValues>,
>({ field, value, onChange }: RenderFieldProps<TFormValues, TName>) {
  if (field.type !== "slider") return null;

  const labelFormatter = field.labelFormatter ?? ((val: number | undefined) => `${val}%`);

  return (
    <div className="flex w-full items-center gap-3 md:w-52">
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

function FormFieldComponent<
  TFormValues extends Record<string, any>,
  TName extends Path<TFormValues>,
>({ field, formField, form }: FormFieldComponentProps<TFormValues, TName>) {
  const debouncedValue = useDebounce(formField.value, 500);
  const hasChanged = useRef(false);

  const wrappedOnChange = (value: any) => {
    hasChanged.current = true;
    formField.onChange(value);
    if (field.type === "text" || field.type === "slider") {
      // For text and slider inputs, we'll let the debounced effect handle the save
      return;
    }
    // For other inputs, save immediately
    const onSubmit = (form as any).onSubmit;
    if (onSubmit) {
      form.handleSubmit(onSubmit)();
    }
  };

  // Effect to handle debounced saves for text and slider inputs
  useEffect(() => {
    if (!hasChanged.current) {
      return;
    }

    if ((field.type === "text" || field.type === "slider") && debouncedValue !== undefined) {
      const onSubmit = (form as any).onSubmit;
      if (onSubmit) {
        form.handleSubmit(onSubmit)();
      }
    }
  }, [debouncedValue, field.type, form]);

  const hasCustomControl = field.type === "select" && field.customControl;

  const renderControl = () => {
    const renderProps: RenderFieldProps<TFormValues, TName> = {
      field,
      value: formField.value,
      onChange: wrappedOnChange,
    };

    switch (field.type) {
      case "checkbox":
        return renderCheckboxField(renderProps);
      case "select":
        return renderSelectField(renderProps);
      case "slider":
        return renderSliderField(renderProps);
      default:
        return null;
    }
  };

  return (
    <FormItem
      className={
        hasCustomControl
          ? ""
          : field.type === "checkbox"
            ? "flex flex-row items-center justify-between gap-4 space-y-0 py-1"
            : "flex flex-col items-start space-y-2 py-1 md:flex-row md:items-start md:justify-between md:space-y-0"
      }
    >
      {hasCustomControl ? (
        <FormControl>
          <div className="py-1">
            {field.type === "select" &&
              field.customControl &&
              field.customControl({
                field: {
                  ...formField,
                  onChange: wrappedOnChange,
                },
              })}
          </div>
        </FormControl>
      ) : (
        <>
          <div className="flex-1 space-y-0 md:pr-4">
            <FormLabel className="text-sm leading-tight font-normal">{field.label}</FormLabel>
            {field.description && (
              <FormDescription className="text-xs leading-tight">
                {field.description}
              </FormDescription>
            )}
          </div>
          <FormControl>{renderControl()}</FormControl>
        </>
      )}
    </FormItem>
  );
}

export function SettingSection<TFormValues extends Record<string, any>>({
  title,
  icon: Icon,
  fields,
  form,
}: SettingSectionProps<TFormValues>) {
  return (
    <div className="space-y-2">
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
        <Icon className="size-3.5" />
        <span>{title}</span>
      </div>
      <div className="space-y-1">
        {fields.map(field => (
          <FormField
            key={String(field.name)}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormFieldComponent field={field} formField={formField} form={form} />
            )}
          />
        ))}
      </div>
    </div>
  );
}
