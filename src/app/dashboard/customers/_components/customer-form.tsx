"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Check, ChevronsUpDown, Trash2, ChevronDown, Plus, Star } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { cn, calculateAge } from "@/lib/utils";
import { countries } from "@/lib/countries";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { customerFormSchema, CustomerFormValues } from "../hooks/use-customers";
import { getProvinces, getDistrict, getSubDistrict, getPostCode } from "@/utils/thailand-geography";
import { DragDropUpload } from "@/components/upload-image";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface Tag {
  id: string;
  name: string;
}

interface CustomerFormProps {
  mode: "create" | "edit" | "view";
  initialData?: Partial<CustomerFormValues>;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  availableTags?: Tag[];
  selectedTagIds?: string[];
}

const FOOD_ALLERGY_LABELS: Record<string, string> = {
  DIARY: "Diary (นม)",
  EGGS: "Eggs (ไข่)",
  FISH: "Fish (ปลา)",
  CRUSTACEAN: "Crustacean (กุ้ง / ปู)",
  GLUTEN: "Gluten (แป้ง)",
  PEANUT_AND_NUTS: "Peanut & nuts (ถั่ว)",
  OTHER: "Other (อื่น ๆ)",
};

export function CustomerForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  availableTags = [],
  selectedTagIds = [],
}: CustomerFormProps) {
  const readOnly = mode === "view";
  const [isAddressesOpen, setIsAddressesOpen] = useState(true);
  const [isPassportsOpen, setIsPassportsOpen] = useState(true);
  const [isFoodAllergiesOpen, setIsFoodAllergiesOpen] = useState(true);

  const form = useForm<CustomerFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(customerFormSchema) as any,
    defaultValues: {
      firstNameTh: initialData?.firstNameTh ?? "",
      lastNameTh: initialData?.lastNameTh ?? "",
      firstNameEn: initialData?.firstNameEn ?? "",
      lastNameEn: initialData?.lastNameEn ?? "",
      title: initialData?.title ?? undefined,
      email: initialData?.email ?? "",
      phoneNumber: initialData?.phoneNumber ?? "",
      lineId: initialData?.lineId ?? "",
      dateOfBirth: initialData?.dateOfBirth ?? "",
      note: initialData?.note ?? "",
      tagIds: initialData?.tagIds ?? selectedTagIds,
      addresses: initialData?.addresses ?? [],
      passports:
        initialData?.passports?.map((p) => ({
          ...p,
          issuingDate: p.issuingDate ? new Date(p.issuingDate) : undefined,
          expiryDate: p.expiryDate ? new Date(p.expiryDate) : undefined,
          imageUrl: p.imageUrl ?? null,
          isPrimary: p.isPrimary ?? false,
        })) ?? [],
      foodAllergies: initialData?.foodAllergies ?? [],
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
        email: initialData.email || "",
        phoneNumber: initialData.phoneNumber || "",
        lineId: initialData.lineId || "",
        dateOfBirth: initialData.dateOfBirth || "",
        note: initialData.note || "",
        tagIds: initialData.tagIds ?? [], // Use initialData.tagIds if available, else empty (don't rely on selectedTagIds prop in effect)
        addresses: initialData.addresses || [],
        passports:
          initialData.passports?.map((p) => ({
            ...p,
            issuingDate: p.issuingDate ? new Date(p.issuingDate) : undefined,
            expiryDate: p.expiryDate ? new Date(p.expiryDate) : undefined,
            imageUrl: p.imageUrl ?? null,
            isPrimary: p.isPrimary ?? false,
          })) || [],
        foodAllergies: initialData.foodAllergies || [],
      });
    }
  }, [initialData, form]); // Removed selectedTagIds from dependency

  async function handleSubmit(values: CustomerFormValues) {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof Error) {
        const fieldError = error as Error & { field?: string; fields?: { field: string; message: string }[] };

        // Handle multiple field errors
        if (fieldError.fields && Array.isArray(fieldError.fields)) {
          fieldError.fields.forEach((err) => {
            if (err.field === "email" || err.field === "phoneNumber") {
              toast.error(err.message);
              console.log(`Setting form error for ${err.field}:`, err.message);
              form.setError(err.field as "email" | "phoneNumber", {
                type: "server",
                message: err.message,
              });
              console.log(`Form errors after setError:`, form.formState.errors);
            } else if (err.field === "passports") {
              toast.error(err.message);
              form.setError("passports", {
                type: "server",
                message: err.message,
              });
            }
          });
        }
        // Handle single field error (backward compatibility)
        else if (fieldError.field === "email") {
          form.setError("email", {
            type: "server",
            message: error.message,
          });
        } else if (fieldError.field === "phoneNumber") {
          form.setError("phoneNumber", {
            type: "server",
            message: error.message,
          });
        }
      }
    }
  }

  // Watch dateOfBirth for real-time age calculation
  const dateOfBirth = useWatch({ control: form.control, name: "dateOfBirth" });

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.stopPropagation();
          form.handleSubmit(handleSubmit)(e);
        }}
        className="space-y-6"
      >
        <h2 className="text-xl font-semibold">Customer information</h2>
        <FormField
          control={form.control}
          name="tagIds"
          render={({ field }) => {
            const selectedTags = availableTags.filter((tag) => field.value?.includes(tag.id));
            return (
              <FormItem className="flex flex-col">
                <FormLabel>Tag</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        disabled={readOnly}
                        className={cn(
                          "w-full justify-between",
                          (!field.value || field.value.length === 0) && "text-muted-foreground",
                        )}
                      >
                        <span className="flex flex-1 flex-wrap items-center gap-1">
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
                                <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                {tag.name}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Title (EN/TH)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select title" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MR">Mr. (นาย)</SelectItem>
                  <SelectItem value="MRS">Mrs. (นาง)</SelectItem>
                  <SelectItem value="MISS">Miss. (นางสาว/เด็กหญิง)</SelectItem>
                  <SelectItem value="MASTER">Master (เด็กชาย)</SelectItem>
                  <SelectItem value="OTHER">Other (อื่นๆ)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstNameEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>First name (EN)</FormLabel>
                <FormControl>
                  <Input placeholder="First name (EN)" {...field} disabled={readOnly} />
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
                <FormLabel required>Last name (EN)</FormLabel>
                <FormControl>
                  <Input placeholder="Last name (EN)" {...field} disabled={readOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstNameTh"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name (TH)</FormLabel>
                <FormControl>
                  <Input placeholder="First name (TH)" {...field} disabled={readOnly} />
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
                <FormLabel>Last name (TH)</FormLabel>
                <FormControl>
                  <Input placeholder="Last name (TH)" {...field} disabled={readOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel required>Date of birth</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        disabled={readOnly}
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

          <div className="space-y-2">
            <Label>Age</Label>
            <Input disabled value={dateOfBirth ? calculateAge(dateOfBirth) : ""} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input placeholder="Phone number" {...field} disabled={readOnly} />
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
                  <Input placeholder="LINE ID" {...field} disabled={readOnly} />
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
                <Input placeholder="Email" {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note for customer</FormLabel>
              <FormControl>
                <Textarea placeholder="Note for customer" className="resize-none" {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address Section */}
        <Collapsible open={isAddressesOpen} onOpenChange={setIsAddressesOpen} className="space-y-4">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                type="button"
                className="flex items-center gap-2 p-0 text-lg font-semibold hover:bg-transparent"
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", !isAddressesOpen && "-rotate-90")} />
                Addresses
              </Button>
            </CollapsibleTrigger>
            {!readOnly && (form.getValues("addresses") || []).length < 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  form.setValue("addresses", [
                    ...(form.getValues("addresses") || []),
                    { address: "", province: "", district: "", subDistrict: "", postalCode: "" },
                  ]);
                  setIsAddressesOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            )}
          </div>

          <CollapsibleContent className="space-y-4">
            {useWatch({ control: form.control, name: "addresses" })?.map((_, index) => (
              <div key={index} className="relative grid grid-cols-2 gap-4 rounded-md border p-4">
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    onClick={() => {
                      const current = form.getValues("addresses") || [];
                      form.setValue(
                        "addresses",
                        current.filter((_, i) => i !== index),
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <FormField
                  control={form.control}
                  name={`addresses.${index}.address`}
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Address" disabled={readOnly} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`addresses.${index}.province`}
                  render={({ field }) => {
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Province</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                disabled={readOnly}
                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                              >
                                {field.value || "Select province"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder="Search province..." />
                              <CommandList>
                                <CommandEmpty>No province found.</CommandEmpty>
                                <CommandGroup>
                                  {getProvinces().map((province) => (
                                    <CommandItem
                                      value={province}
                                      key={province}
                                      onSelect={() => {
                                        form.setValue(`addresses.${index}.province`, province);
                                        form.setValue(`addresses.${index}.district`, "");
                                        form.setValue(`addresses.${index}.subDistrict`, "");
                                        form.setValue(`addresses.${index}.postalCode`, "");
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          province === field.value ? "opacity-100" : "opacity-0",
                                        )}
                                      />
                                      {province}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name={`addresses.${index}.district`}
                  render={({ field }) => {
                    const provinceValue = form.watch(`addresses.${index}.province`);
                    const districts = provinceValue ? getDistrict(provinceValue) : [];
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>District</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                disabled={!provinceValue || readOnly}
                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                              >
                                {field.value || "Select district"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder="Search district..." />
                              <CommandList>
                                <CommandEmpty>No district found.</CommandEmpty>
                                <CommandGroup>
                                  {districts.map((district) => (
                                    <CommandItem
                                      value={district}
                                      key={district}
                                      onSelect={() => {
                                        form.setValue(`addresses.${index}.district`, district);
                                        form.setValue(`addresses.${index}.subDistrict`, "");
                                        form.setValue(`addresses.${index}.postalCode`, "");
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          district === field.value ? "opacity-100" : "opacity-0",
                                        )}
                                      />
                                      {district}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name={`addresses.${index}.subDistrict`}
                  render={({ field }) => {
                    const provinceValue = form.watch(`addresses.${index}.province`);
                    const districtValue = form.watch(`addresses.${index}.district`);
                    const subDistricts =
                      provinceValue && districtValue ? getSubDistrict(provinceValue, districtValue) : [];
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Sub district</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                disabled={!provinceValue || !districtValue || readOnly}
                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                              >
                                {field.value || "Select sub-district"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder="Search sub-district..." />
                              <CommandList>
                                <CommandEmpty>No sub-district found.</CommandEmpty>
                                <CommandGroup>
                                  {subDistricts.map((subDistrict) => (
                                    <CommandItem
                                      value={subDistrict}
                                      key={subDistrict}
                                      onSelect={() => {
                                        form.setValue(`addresses.${index}.subDistrict`, subDistrict);
                                        // Auto-fill postal code
                                        if (provinceValue && districtValue) {
                                          const postCodes = getPostCode(provinceValue, districtValue, subDistrict);
                                          if (postCodes && postCodes.length > 0) {
                                            // Get unique postal codes and use the first one
                                            const uniquePostCodes = [...new Set(postCodes)];
                                            form.setValue(`addresses.${index}.postalCode`, uniquePostCodes[0]);
                                          }
                                        }
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          subDistrict === field.value ? "opacity-100" : "opacity-0",
                                        )}
                                      />
                                      {subDistrict}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name={`addresses.${index}.postalCode`}
                  render={({ field }) => {
                    const provinceValue = form.watch(`addresses.${index}.province`);
                    const districtValue = form.watch(`addresses.${index}.district`);
                    const subDistrictValue = form.watch(`addresses.${index}.subDistrict`);
                    const availablePostCodes =
                      provinceValue && districtValue && subDistrictValue
                        ? getPostCode(provinceValue, districtValue, subDistrictValue)
                        : [];
                    const uniquePostCodes = [...new Set(availablePostCodes)];
                    const hasMultiplePostCodes = uniquePostCodes.length > 1;

                    return (
                      <FormItem>
                        <FormLabel>Postal code</FormLabel>
                        <FormControl>
                          {hasMultiplePostCodes ? (
                            <Select onValueChange={field.onChange} value={field.value || ""} disabled={readOnly}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select postal code" />
                              </SelectTrigger>
                              <SelectContent>
                                {uniquePostCodes.map((code) => (
                                  <SelectItem key={code} value={code}>
                                    {code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input {...field} placeholder="" readOnly />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Passport Section */}
        <Collapsible
          open={isPassportsOpen}
          onOpenChange={setIsPassportsOpen}
          className={cn("space-y-4", form.formState.errors.passports && "ring-destructive rounded-lg p-2 ring-2")}
        >
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                type="button"
                className="flex items-center gap-2 p-0 text-lg font-semibold hover:bg-transparent"
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", !isPassportsOpen && "-rotate-90")} />
                Passports
              </Button>
            </CollapsibleTrigger>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentPassports = form.getValues("passports") || [];
                  const isFirstPassport = currentPassports.length === 0;
                  form.setValue("passports", [
                    ...currentPassports,
                    {
                      passportNumber: "",
                      issuingCountry: "Thailand",
                      issuingDate: undefined,
                      expiryDate: undefined,
                      imageUrl: null,
                      isPrimary: isFirstPassport,
                    },
                  ]);
                  setIsPassportsOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            )}
          </div>
          <CollapsibleContent className="space-y-4">
            {form.formState.errors.passports && (
              <p className="text-destructive text-sm">{form.formState.errors.passports.message as string}</p>
            )}
            {useWatch({ control: form.control, name: "passports" })?.map((_, index) => {
              const currentPassports = form.getValues("passports") || [];
              const totalPassports = currentPassports.length;
              const isOnlyPassport = totalPassports === 1;
              const currentIsPrimary = currentPassports[index]?.isPrimary ?? false;

              return (
                <div key={index} className="rounded-md border flex flex-col">
                  <div className="w-full bg-muted px-4 py-2 text-sm font-medium flex items-center justify-between">
                    <p>Passport {index + 1}</p>
                    <div className="flex items-center gap-2">
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            currentIsPrimary ? "text-yellow-500 hover:text-yellow-700" : "text-muted-foreground hover:text-yellow-500",
                            isOnlyPassport && "opacity-50 cursor-not-allowed"
                          )}
                          disabled={isOnlyPassport || readOnly}
                          onClick={() => {
                            if (isOnlyPassport) return;

                            const updatedPassports = currentPassports.map((p, i) => {
                              if (i === index) {
                                // Toggle current passport
                                return { ...p, isPrimary: !currentIsPrimary };
                              } else if (!currentIsPrimary) {
                                // If setting current as primary, unset others
                                return { ...p, isPrimary: false };
                              }
                              return p;
                            });

                            // If unsetting primary, find another passport to set as primary
                            if (currentIsPrimary && totalPassports > 1) {
                              const otherIndex = updatedPassports.findIndex((_, i) => i !== index);
                              if (otherIndex !== -1) {
                                updatedPassports[otherIndex] = { ...updatedPassports[otherIndex], isPrimary: true };
                              }
                            }

                            form.setValue("passports", updatedPassports);
                          }}
                          title={isOnlyPassport ? "This passport must be primary as it's the only one" : currentIsPrimary ? "Remove as primary" : "Set as primary"}
                        >
                          <Star className={cn("h-4 w-4", currentIsPrimary && "fill-current")} />
                        </Button>
                      )}
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            const current = form.getValues("passports") || [];
                            const passportToDelete = current[index];
                            const isDeletingPrimary = passportToDelete?.isPrimary === true;
                            const remainingPassports = current.filter((_, i) => i !== index);

                            // If deleting primary passport and there are other passports, set another one as primary
                            if (isDeletingPrimary && remainingPassports.length > 0) {
                              remainingPassports[0] = { ...remainingPassports[0], isPrimary: true };
                            }

                            form.setValue("passports", remainingPassports);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 p-4">
                    <FormField
                      control={form.control}
                      name={`passports.${index}.passportNumber`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Passport no.</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Passport no." disabled={readOnly} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`passports.${index}.issuingCountry`}
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel required>Issuing country</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  disabled={readOnly}
                                  className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                >
                                  {field.value
                                    ? countries.find((country) => country.value === field.value)?.label
                                    : "Select country"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0 z-60">
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
                                          form.setValue(`passports.${index}.issuingCountry`, country.value);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            country.value === field.value ? "opacity-100" : "opacity-0",
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
                      name={`passports.${index}.issuingDate`}
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel required>Date of issue</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  disabled={readOnly}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
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
                                onSelect={(date) => field.onChange(date)}
                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`passports.${index}.expiryDate`}
                      render={({ field }) => {
                        const currentYear = new Date().getFullYear();
                        const minYear = currentYear - 20; // Allow up to 20 years in the past
                        const maxYear = currentYear + 20; // Allow up to 20 years in the future

                        return (
                          <FormItem className="flex flex-col">
                            <FormLabel required>Date of expiry</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground",
                                    )}
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
                                  onSelect={(date) => field.onChange(date)}
                                  fromYear={minYear}
                                  toYear={maxYear}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name={`passports.${index}.imageUrl`}
                      render={({ field }) => {
                        const imageUrl = field.value;
                        const firstName = form.watch("firstNameEn") || "";
                        const lastName = form.watch("lastNameEn") || "";
                        const customerName = `${firstName}_${lastName}`;
                        // Sanitize folder name: remove special characters, replace spaces with underscores
                        const sanitizedName =
                          customerName !== "_"
                            ? customerName
                              .replace(/[^a-zA-Z0-9ก-๙\s_]/g, "")
                              .replace(/\s+/g, "_")
                              .toLowerCase()
                            : `temp_${Date.now()}_${index}`; // Use timestamp and index for temp customers

                        const folderName = `passports/${sanitizedName}`;
                        // Use unique key to ensure component instance is separate from other DragDropUpload components
                        const uploadKey = `passport-upload-${index}-${folderName}`;

                        return (
                          <FormItem className="col-span-2">
                            <FormLabel>Passport image</FormLabel>
                            {imageUrl ? (
                              <div className="space-y-2">
                                <div className="bg-muted relative h-48 w-full overflow-hidden rounded-md border">
                                  <picture>
                                    <img src={imageUrl} alt="Passport" className="h-full w-full object-contain" />
                                  </picture>
                                  {!readOnly && (
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon"
                                      className="absolute top-2 right-2"
                                      onClick={() => field.onChange(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                                <p className="text-muted-foreground text-xs">Image uploaded successfully</p>
                              </div>
                            ) : (
                              <DragDropUpload
                                key={uploadKey}
                                acceptedFileTypes={["image/jpeg", "image/png", "image/jpg", ".jpg", ".jpeg", ".png"]}
                                maxFileSize={5 * 1024 * 1024} // 5MB
                                folderName={folderName}
                                multiple={false}
                                disabled={readOnly}
                                onUploadSuccess={(url) => {
                                  field.onChange(url);
                                }}
                                onUploadError={(error) => {
                                  toast.error(error);
                                }}
                                className="w-full"
                              />
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* Food Allergy Section */}
        <Collapsible open={isFoodAllergiesOpen} onOpenChange={setIsFoodAllergiesOpen} className="space-y-4">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                type="button"
                className="flex items-center gap-2 p-0 text-lg font-semibold hover:bg-transparent"
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", !isFoodAllergiesOpen && "-rotate-90")} />
                Food Allergies
              </Button>
            </CollapsibleTrigger>
            {!readOnly && (form.getValues("foodAllergies") || []).length < 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  form.setValue("foodAllergies", [...(form.getValues("foodAllergies") || []), { types: [], note: "" }]);
                  setIsFoodAllergiesOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            )}
          </div>
          <CollapsibleContent className="space-y-4">
            {useWatch({ control: form.control, name: "foodAllergies" })?.map((_, index) => (
              <div key={index} className="relative grid grid-cols-1 gap-4 rounded-md border p-4">
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    onClick={() => {
                      const current = form.getValues("foodAllergies") || [];
                      form.setValue(
                        "foodAllergies",
                        current.filter((_, i) => i !== index),
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <FormField
                  control={form.control}
                  name={`foodAllergies.${index}.types`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food allergy type</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {(["DIARY", "EGGS", "FISH", "CRUSTACEAN", "GLUTEN", "PEANUT_AND_NUTS", "OTHER"] as const).map(
                          (type) => {
                            const isSelected = field.value?.includes(type);
                            return (
                              <Badge
                                key={type}
                                variant={isSelected ? "default" : "outline"}
                                className={cn("cursor-pointer", readOnly && "cursor-not-allowed opacity-50")}
                                onClick={() => {
                                  if (readOnly) return;
                                  const current = field.value || [];
                                  const next = isSelected ? current.filter((t) => t !== type) : [...current, type];
                                  field.onChange(next);
                                }}
                              >
                                {FOOD_ALLERGY_LABELS[type] || type}
                              </Badge>
                            );
                          },
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`foodAllergies.${index}.note`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note for food allergy</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Note for food allergy" className="resize-none" disabled={readOnly} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {!readOnly && (
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
                  ? "Create"
                  : "Update"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
