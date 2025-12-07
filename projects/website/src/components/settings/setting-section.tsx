import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@uidotdev/usehooks";
import { ReactElement, useEffect, useRef } from "react";
import { Path, UseFormReturn } from "react-hook-form";
import { IconType } from "react-icons";
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "../ui/form";

type FieldType = "text" | "checkbox" | "select";

export interface Field<TFormValues extends Record<string, any>, TName extends Path<TFormValues>> {
  name: TName;
  label: string;
  type: FieldType;
  description?: string;
  options?: readonly { label: string; value: string }[];
  customControl?: (props: {
    field: {
      value: TFormValues[TName];
      onChange: (value: TFormValues[TName]) => void;
    };
  }) => ReactElement;
}

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

function FormFieldComponent<
  TFormValues extends Record<string, any>,
  TName extends Path<TFormValues>,
>({ field, formField, form }: FormFieldComponentProps<TFormValues, TName>) {
  const debouncedValue = useDebounce(formField.value, 500);
  const hasChanged = useRef(false);

  const wrappedOnChange = (value: any) => {
    hasChanged.current = true;
    formField.onChange(value);
    if (field.type === "text") {
      // For text inputs, we'll let the debounced effect handle the save
      return;
    }
    // For other inputs, save immediately
    const onSubmit = (form as any).onSubmit;
    if (onSubmit) {
      form.handleSubmit(onSubmit)();
    }
  };

  // Effect to handle debounced saves for text inputs
  useEffect(() => {
    if (!hasChanged.current) {
      return;
    }

    if (field.type === "text" && debouncedValue !== undefined) {
      const onSubmit = (form as any).onSubmit;
      if (onSubmit) {
        form.handleSubmit(onSubmit)();
      }
    }
  }, [debouncedValue, field.type, form]);

  return (
    <FormItem
      className={
        field.customControl
          ? ""
          : field.type === "checkbox"
            ? "flex flex-row items-center justify-between gap-4 space-y-0 py-1"
            : "flex flex-col items-start space-y-2 py-1 md:flex-row md:items-start md:justify-between md:space-y-0"
      }
    >
      {field.customControl ? (
        <FormControl>
          <div className="py-1">
            {field.customControl({
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
          <FormControl>
            {field.type === "checkbox" ? (
              <Checkbox checked={formField.value as boolean} onCheckedChange={wrappedOnChange} />
            ) : field.type === "select" ? (
              <Select value={formField.value as string} onValueChange={wrappedOnChange}>
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
            ) : null}
          </FormControl>
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
