"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Pencil, Plus, Trash2, Check, ChevronsUpDown, Eye, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { countries } from "@/lib/countries";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  passportFormSchema,
  type PassportFormValues,
  useCreatePassport,
  useUpdatePassport,
  useDeletePassport,
} from "../hooks/use-passport";
import { Passport } from "../hooks/types";
import { DragDropUpload } from "@/components/upload-image";
import { toast } from "sonner";

type PassportInput = Omit<Passport, "expiryDate"> & { expiryDate: Date | string };

interface PassportManagerProps {
  customerId: string;
  passports: Passport[];
}

export function PassportManager({ customerId, passports }: PassportManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingPassport, setEditingPassport] = useState<PassportInput | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingPassport, setViewingPassport] = useState<Passport | null>(null);

  const createPassport = useCreatePassport(customerId);
  const updatePassport = useUpdatePassport(customerId);
  const deletePassportMutation = useDeletePassport(customerId);

  // Generate temp folder name once on mount
  const [tempFolderName] = useState(() => `temp_${Date.now()}`);

  const form = useForm<PassportFormValues>({
    resolver: zodResolver(passportFormSchema),
    defaultValues: {
      customerId,
      passportNumber: "",
      issuingCountry: "Thailand",
      issuingDate: undefined,
      expiryDate: undefined,
      imageUrl: null,
      isPrimary: false,
    } as Partial<PassportFormValues>,
  });

  const handleAddNew = () => {
    setEditingPassport(null);
    form.reset({
      customerId,
      passportNumber: "",
      issuingCountry: "Thailand",
      issuingDate: undefined,
      expiryDate: undefined,
      imageUrl: null,
      isPrimary: false,
    });
    setIsOpen(true);
  };

  const handleEdit = (passport: PassportInput) => {
    const issuingDate = passport.issuingDate
      ? typeof passport.issuingDate === "string"
        ? new Date(passport.issuingDate)
        : passport.issuingDate
      : undefined;
    const expiryDate = typeof passport.expiryDate === "string" ? new Date(passport.expiryDate) : passport.expiryDate;

    setEditingPassport(passport);
    form.reset({
      id: passport.id,
      customerId: passport.customerId,
      passportNumber: passport.passportNumber,
      issuingCountry: passport.issuingCountry,
      issuingDate,
      expiryDate,
      imageUrl: passport.imageUrl || null,
      isPrimary: passport.isPrimary,
    });
    setIsOpen(true);
  };

  const handleView = (passport: Passport) => {
    setViewingPassport(passport);
    setIsViewOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this passport?")) return;
    deletePassportMutation.mutate(id);
  };

  const onSubmit = async (values: PassportFormValues) => {
    try {
      if (values.id) {
        await updatePassport.mutateAsync(values);
        setIsOpen(false);
        form.reset();
      } else {
        await createPassport.mutateAsync({
          passportNumber: values.passportNumber,
          issuingCountry: values.issuingCountry,
          issuingDate: values.issuingDate,
          expiryDate: values.expiryDate,
          imageUrl: values.imageUrl || null,
          isPrimary: values.isPrimary,
        });
        setIsOpen(false);
        form.reset();
      }
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      // Form validation errors will be displayed via FormMessage
      if (error instanceof Error) {
        const fieldError = error as Error & { field?: string; fields?: { field: string; message: string }[] };
        
        // Handle multiple field errors
        if (fieldError.fields && Array.isArray(fieldError.fields)) {
          fieldError.fields.forEach((err) => {
            if (err.field === "passportNumber") {
              form.setError("passportNumber", {
                type: "server",
                message: err.message,
              });
            } else if (err.field === "passports") {
              form.setError("passportNumber", {
                type: "server",
                message: err.message,
              });
            }
          });
        }
        // Handle single field error
        else if (fieldError.field === "passportNumber" || fieldError.field === "passports") {
          form.setError("passportNumber", {
            type: "server",
            message: error.message,
          });
        }
      }
    }
  };

  const isLoading = createPassport.isPending || updatePassport.isPending || deletePassportMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Passports</CardTitle>
        <Button variant="secondary" size="sm" onClick={handleAddNew}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent>
        {passports.length === 0 ? (
          <p className="text-muted-foreground text-sm">No passports recorded.</p>
        ) : (
          <div className="space-y-3 pt-2">
            {passports.map((passport) => (
              <div key={passport.id} className="group relative rounded-md border p-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{passport.issuingCountry}</div>
                      {passport.isPrimary && (
                        <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-1">{passport.passportNumber}</div>
                    <div className="mt-2 space-y-1 text-xs">
                      {passport.issuingDate && (
                        <div className="text-muted-foreground">
                          Issued: {format(new Date(passport.issuingDate), "PP")}
                        </div>
                      )}
                      <div className="text-red-500">Expires: {format(new Date(passport.expiryDate), "PP")}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(passport)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(passport)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(passport.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPassport ? "Edit Passport" : "Add Passport"}</DialogTitle>
              <DialogDescription>
                {editingPassport ? "Update the passport details below." : "Enter the details for the new passport."}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="issuingCountry"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel required>Issuing country</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                            >
                              {field.value
                                ? countries.find((country) => country.value === field.value)?.label
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
                                      form.setValue("issuingCountry", country.value);
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
                  name="passportNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Passport no.</FormLabel>
                      <FormControl>
                        <Input placeholder="Passport no." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issuingDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel required>Date of issue</FormLabel>
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
                  name="expiryDate"
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
                  name="imageUrl"
                  render={({ field }) => {
                    const imageUrl = field.value;
                    const customerIdForFolder = customerId || tempFolderName;
                    const folderName = `passports/${customerIdForFolder}`;
                    const uploadKey = `passport-upload-${customerIdForFolder}`;

                    return (
                      <FormItem>
                        <FormLabel>Passport image</FormLabel>
                        {imageUrl ? (
                          <div className="space-y-2">
                            <div className="bg-muted relative h-48 w-full overflow-hidden rounded-md border">
                              <picture>
                                <img src={imageUrl} alt="Passport" className="h-full w-full object-contain" />
                              </picture>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={() => field.onChange(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
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

                <FormField
                  control={form.control}
                  name="isPrimary"
                  render={({ field }) => {
                    // If there's only one passport (including the one being edited), force isPrimary to true
                    const totalPassports = editingPassport ? passports.length : passports.length + 1;
                    const isOnlyPassport = totalPassports === 1;
                    const isDisabled = isOnlyPassport;

                    return (
                      <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={isOnlyPassport ? true : field.value}
                            onCheckedChange={(checked) => {
                              if (isOnlyPassport) {
                                // Force to true if it's the only passport
                                field.onChange(true);
                                return;
                              }

                              // If unchecking and there are other passports
                              if (!checked && totalPassports > 1) {
                                // API will handle setting another passport as primary
                                field.onChange(false);
                              } else {
                                field.onChange(checked);
                              }
                            }}
                            disabled={isDisabled}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Set as Primary Passport</FormLabel>
                          {isDisabled && (
                            <p className="text-muted-foreground text-xs">
                              This passport must be primary as it&apos;s the only one.
                            </p>
                          )}
                        </div>
                      </FormItem>
                    );
                  }}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* View Passport Image Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Passport Image</DialogTitle>
              <DialogDescription>
                {viewingPassport && (
                  <>
                    {viewingPassport.issuingCountry} - {viewingPassport.passportNumber}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {viewingPassport?.imageUrl ? (
              <div className="flex items-center justify-center">
                <div className="relative max-h-[70vh] w-full overflow-hidden rounded-md border">
                  <picture>
                    <img
                      src={viewingPassport.imageUrl}
                      alt={`Passport ${viewingPassport.passportNumber}`}
                      className="h-full w-full object-contain"
                    />
                  </picture>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground flex h-64 items-center justify-center">No image available</div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
