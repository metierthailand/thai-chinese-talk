"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Pencil, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
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

type PassportInput = Omit<Passport, "expiryDate"> & { expiryDate: Date | string };

interface PassportManagerProps {
  customerId: string;
  passports: Passport[];
}

export function PassportManager({ customerId, passports }: PassportManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingPassport, setEditingPassport] = useState<PassportInput | null>(null);

  const createPassport = useCreatePassport(customerId);
  const updatePassport = useUpdatePassport(customerId);
  const deletePassportMutation = useDeletePassport(customerId);

  const form = useForm<PassportFormValues>({
    resolver: zodResolver(passportFormSchema),
    defaultValues: {
      customerId,
      passportNumber: "",
      issuingCountry: "",
      isPrimary: false,
    } as Partial<PassportFormValues>,
  });

  const handleAddNew = () => {
    setEditingPassport(null);
    form.reset({
      customerId,
      passportNumber: "",
      issuingCountry: "",
      isPrimary: false,
    });
    setIsOpen(true);
  };

  const handleEdit = (passport: PassportInput) => {
    const expiryDate = typeof passport.expiryDate === "string" ? new Date(passport.expiryDate) : passport.expiryDate;

    setEditingPassport(passport);
    form.reset({
      id: passport.id,
      customerId: passport.customerId,
      passportNumber: passport.passportNumber,
      issuingCountry: passport.issuingCountry,
      expiryDate,
      isPrimary: passport.isPrimary,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this passport?")) return;
    deletePassportMutation.mutate(id);
  };

  const onSubmit = async (values: PassportFormValues) => {
    if (values.id) {
      updatePassport.mutate(values, {
        onSuccess: () => {
          setIsOpen(false);
          form.reset();
        },
      });
    } else {
      createPassport.mutate(
        {
          passportNumber: values.passportNumber,
          issuingCountry: values.issuingCountry,
          expiryDate: values.expiryDate,
          isPrimary: values.isPrimary,
        },
        {
          onSuccess: () => {
            setIsOpen(false);
            form.reset();
          },
        },
      );
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
                  {passport.imageUrl && (
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded border">
                      <picture>
                        <img
                          src={passport.imageUrl}
                          alt={`Passport ${passport.passportNumber}`}
                          className="object-cover"
                        />
                      </picture>
                    </div>
                  )}
                  <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
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
                      <FormLabel>Issuing Country</FormLabel>
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
                      <FormLabel>Passport Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. AA1234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expiry Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            captionLayout="dropdown"
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            fromYear={2000}
                            toYear={2100}
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
                  name="isPrimary"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Set as Primary Passport</FormLabel>
                      </div>
                    </FormItem>
                  )}
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
      </CardContent>
    </Card>
  );
}
