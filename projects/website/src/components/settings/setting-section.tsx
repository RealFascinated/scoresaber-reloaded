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
  options?: { label: string; value: string }[];
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
      className={field.type === "checkbox" ? "flex flex-row items-center space-x-2 space-y-0" : ""}
    >
      {field.type === "checkbox" ? (
        <>
          <FormControl>
            <Checkbox checked={formField.value as boolean} onCheckedChange={wrappedOnChange} />
          </FormControl>
          <div className="leading-none">
            <FormLabel className="mb-1 block">{field.label}</FormLabel>
            {field.description && <FormDescription>{field.description}</FormDescription>}
          </div>
        </>
      ) : (
        <>
          <FormLabel className="mb-1 block">{field.label}</FormLabel>
          <FormControl>
            {field.customControl ? (
              field.customControl({
                field: {
                  ...formField,
                  onChange: wrappedOnChange,
                },
              })
            ) : field.type === "select" ? (
              <Select value={formField.value as string} onValueChange={wrappedOnChange}>
                <SelectTrigger>
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
          {field.description && (
            <FormDescription className="mt-1">{field.description}</FormDescription>
          )}
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="text-muted-foreground size-5" />
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      <div className="space-y-4">
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
