"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { countries } from "@/lib/countries";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { customerFormSchema, CustomerFormValues } from "../hooks/use-customers";

interface Tag {
  id: string;
  name: string;
}

interface CustomerFormProps {
  mode: "create" | "edit";
  initialData?: Partial<CustomerFormValues>;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  availableTags?: Tag[];
  selectedTagIds?: string[];
}

export function CustomerForm({ mode, initialData, onSubmit, onCancel, isLoading = false, availableTags = [], selectedTagIds = [] }: CustomerFormProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      firstNameTh: initialData?.firstNameTh ?? "",
      lastNameTh: initialData?.lastNameTh ?? "",
      firstNameEn: initialData?.firstNameEn ?? "",
      lastNameEn: initialData?.lastNameEn ?? "",
      title: initialData?.title ?? undefined,
      nickname: initialData?.nickname || "",
      email: initialData?.email ?? "",
      phone: initialData?.phone ?? "",
      lineId: initialData?.lineId ?? "",
      nationality: initialData?.nationality ?? "",
      dateOfBirth: initialData?.dateOfBirth ?? "",
      preferences: initialData?.preferences ?? "",
      type: initialData?.type ?? "INDIVIDUAL",
      tagIds: initialData?.tagIds ?? selectedTagIds,
    },
  });

  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      form.reset({
        firstNameTh: initialData.firstNameTh ?? "",
        lastNameTh: initialData.lastNameTh ?? "",
        firstNameEn: initialData.firstNameEn ?? "",
        lastNameEn: initialData.lastNameEn ?? "",
        title: initialData.title || undefined,
        nickname: initialData.nickname || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        lineId: initialData.lineId || "",
        nationality: initialData.nationality || "",
        dateOfBirth: initialData.dateOfBirth || "",
        preferences: initialData.preferences || "",
        type: initialData.type || "INDIVIDUAL",
        tagIds: initialData.tagIds || selectedTagIds,
      });
    }
  }, [initialData, form, selectedTagIds]);

  async function handleSubmit(values: CustomerFormValues) {
    await onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  <SelectItem value="CORPORATE">Corporate</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Thai Name</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstNameTh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name (Thai) *</FormLabel>
                  <FormControl>
                    <Input placeholder="ชื่อ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastNameTh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name (Thai) *</FormLabel>
                  <FormControl>
                    <Input placeholder="นามสกุล" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">English Name</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstNameEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name (English) *</FormLabel>
                  <FormControl>
                    <Input placeholder="First Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastNameEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name (English) *</FormLabel>
                  <FormControl>
                    <Input placeholder="Last Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select title" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MR">Mr.</SelectItem>
                    <SelectItem value="MRS">Mrs.</SelectItem>
                    <SelectItem value="MS">Ms.</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nickname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nickname</FormLabel>
                <FormControl>
                  <Input placeholder="Johnny" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="0912345678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lineId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LINE ID</FormLabel>
              <FormControl>
                <Input placeholder="@johndoe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
         <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Issuing Country</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? countries.find(
                                    (country) => country.value === field.value
                                  )?.label
                                : "Select country"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                          <Command>
                            <CommandInput placeholder="Search country..." />
                            <CommandList>
                              <CommandEmpty>No country found.</CommandEmpty>
                              <CommandGroup>
                                {countries.map((country) => (
                                  <CommandItem
                                    value={country.label}
                                    key={country.value}
                                    onSelect={() => {
                                      form.setValue("nationality", country.value);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        country.value === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {country.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Birth</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      captionLayout="dropdown"
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => {
                        field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                      }}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="preferences"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferences</FormLabel>
              <FormDescription>Dietary requirements, seat preferences, etc.</FormDescription>
              <FormControl>
                <Textarea placeholder="Vegetarian, Window seat preferred..." className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tagIds"
          render={({ field }) => {
            const selectedTags = availableTags.filter((tag) => field.value?.includes(tag.id));
            return (
              <FormItem className="flex flex-col">
                <FormLabel>Tags</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          (!field.value || field.value.length === 0) && "text-muted-foreground"
                        )}
                      >
                        <span className="flex flex-1 items-center gap-1 flex-wrap">
                          {field.value && field.value.length > 0 ? (
                            selectedTags.map((tag) => (
                              <Badge key={tag.id} variant="outline">
                                {tag.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">Select tags</span>
                          )}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search tags..." />
                    <CommandList>
                      <CommandEmpty>No tags found.</CommandEmpty>
                      <CommandGroup>
                        {availableTags.map((tag) => {
                          const isSelected = field.value?.includes(tag.id);
                          return (
                            <CommandItem
                              value={tag.name}
                              key={tag.id}
                              onSelect={() => {
                                const currentValue = field.value || [];
                                const newValue = isSelected
                                  ? currentValue.filter((id) => id !== tag.id)
                                  : [...currentValue, tag.id];
                                form.setValue("tagIds", newValue);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  isSelected ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {tag.name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Select one or more tags to categorize this customer.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}}
        />

        <div className="flex justify-end space-x-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? mode === "create"
                ? "Creating..."
                : "Updating..."
              : mode === "create"
                ? "Create Customer"
                : "Update Customer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

