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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { tripFormSchema, type TripFormValues } from "../hooks/use-trips";
import { useAllAirlineAndAirports } from "@/app/dashboard/airline-and-airports/hooks/use-airline-and-airports";

interface TripFormProps {
  mode: "create" | "edit" | "view";
  initialData?: Partial<TripFormValues>;
  onSubmit?: (values: TripFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function TripForm({ mode, initialData, onSubmit, onCancel, isLoading = false }: TripFormProps) {
  const readOnly = mode === "view";
  const { data: airlineAndAirports = [] } = useAllAirlineAndAirports();
  const [airlineAndAirportOpen, setAirlineAndAirportOpen] = useState(false);
  const [airlineAndAirportSearch, setAirlineAndAirportSearch] = useState("");

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      type: "GROUP_TOUR",
      code: "",
      name: "",
      startDate: "",
      endDate: "",
      pax: "1",
      foc: "1",
      tl: "",
      tg: "",
      staff: "",
      standardPrice: "0",
      extraPricePerPerson: "0",
      note: "",
      airlineAndAirportId: "",
    },
  });

  // Use useWatch outside render to avoid React Compiler warning
  const endDateValue = useWatch({ control: form.control, name: "endDate" });

  // Sync initial data into the form (for edit/view)
  useEffect(() => {
    if (initialData) {
      form.reset({
        type: initialData.type || "GROUP_TOUR",
        code: initialData.code ?? "",
        name: initialData.name ?? "",
        startDate: initialData.startDate ?? "",
        endDate: initialData.endDate ?? "",
        pax: initialData.pax ?? "1",
        foc: initialData.foc ?? "1",
        tl: initialData.tl ?? "",
        tg: initialData.tg ?? "",
        staff: initialData.staff ?? "",
        standardPrice: initialData.standardPrice ?? "0",
        extraPricePerPerson: initialData.extraPricePerPerson ?? "0",
        note: initialData.note ?? "",
        airlineAndAirportId: initialData.airlineAndAirportId ?? "",
      });
    }
  }, [initialData, form]);

  async function handleSubmit(values: TripFormValues) {
    if (!onSubmit || readOnly) return;
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof Error) {
        const fieldError = error as Error & { field?: string };
        if (fieldError.field) {
          form.setError(fieldError.field as keyof TripFormValues, {
            type: "server",
            message: error.message,
          });
        }
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel required>Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={readOnly}
                    key={`type-select-${field.value || ""}`}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="GROUP_TOUR">Group tour</SelectItem>
                      <SelectItem value="PRIVATE_TOUR">Private tour</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Trip code</FormLabel>
                <FormControl>
                  <Input placeholder="Trip code" {...field} disabled={readOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Trip name</FormLabel>
              <FormControl>
                <Input placeholder="Trip name" {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="airlineAndAirportId"
          render={({ field }) => {
            const selectedAirlineAndAirport = airlineAndAirports.find((aa) => aa.id === field.value);

            // Filter airline and airports based on search
            const filteredAirlineAndAirports = airlineAndAirportSearch
              ? airlineAndAirports.filter(
                (aa) =>
                  aa.code.toLowerCase().includes(airlineAndAirportSearch.toLowerCase()) ||
                  aa.name.toLowerCase().includes(airlineAndAirportSearch.toLowerCase()),
              )
              : airlineAndAirports;

            return (
              <FormItem>
                <FormLabel required>IATA code</FormLabel>
                <Popover
                  open={airlineAndAirportOpen}
                  onOpenChange={(open) => {
                    setAirlineAndAirportOpen(open);
                    if (!open) {
                      setAirlineAndAirportSearch("");
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                        disabled={readOnly}
                      >
                        {selectedAirlineAndAirport
                          ? `${selectedAirlineAndAirport.code} - ${selectedAirlineAndAirport.name}`
                          : "Select airline/airport"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search by code or name..."
                        value={airlineAndAirportSearch}
                        onValueChange={setAirlineAndAirportSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No IATA code found.</CommandEmpty>
                        <CommandGroup>
                          {filteredAirlineAndAirports.map((aa) => (
                            <CommandItem
                              value={`${aa.code} ${aa.name}`}
                              key={aa.id}
                              onSelect={() => {
                                field.onChange(aa.id);
                                setAirlineAndAirportOpen(false);
                                setAirlineAndAirportSearch("");
                              }}
                            >
                              <Check
                                className={cn("mr-2 h-4 w-4", field.value === aa.id ? "opacity-100" : "opacity-0")}
                              />
                              <div className="flex flex-col">
                                <span className="font-mono">{aa.code}</span>
                                <span className="text-muted-foreground text-sm">{aa.name}</span>
                              </div>
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
          name="startDate"
          render={({ field }) => {
            const startDate = field.value ? new Date(field.value) : undefined;
            const endDate = endDateValue ? new Date(endDateValue) : undefined;

            const dateRange: DateRange | undefined =
              startDate && endDate
                ? { from: startDate, to: endDate }
                : startDate
                  ? { from: startDate, to: undefined }
                  : undefined;

            // Calculate date range limits (±1 year from today)
            const today = new Date();
            const oneYearAgo = new Date(today);
            oneYearAgo.setFullYear(today.getFullYear() - 1);
            const oneYearFromNow = new Date(today);
            oneYearFromNow.setFullYear(today.getFullYear() + 1);

            const handleSelect = (range: DateRange | undefined) => {
              if (readOnly) return;
              if (range?.from) {
                field.onChange(format(range.from, "yyyy-MM-dd"));
                if (range.to) {
                  form.setValue("endDate", format(range.to, "yyyy-MM-dd"));
                } else {
                  form.setValue("endDate", "");
                }
              } else {
                field.onChange("");
                form.setValue("endDate", "");
              }
            };

            return (
              <FormItem className="flex flex-col">
                <FormLabel required>Trip date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal", !dateRange && "text-muted-foreground")}
                        disabled={readOnly}
                      >
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      captionLayout="dropdown"
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={handleSelect}
                      numberOfMonths={2}
                      disabled={(date) => {
                        return date < oneYearAgo || date > oneYearFromNow;
                      }}
                      fromYear={oneYearAgo.getFullYear()}
                      toYear={oneYearFromNow.getFullYear()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        {/* Hidden field for endDate to maintain form structure */}
        <FormField control={form.control} name="endDate" render={() => <></>} />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="pax"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Passengers (PAX)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Passengers (PAX)" {...field} disabled={readOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="foc"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Free of charge (FOC)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Free of charge (FOC)" {...field} disabled={readOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="tl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tour leader (TL)</FormLabel>
                <FormControl>
                  <Input placeholder="Tour leader (TL)" {...field} disabled={readOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tour guide (TG)</FormLabel>
                <FormControl>
                  <Input placeholder="Tour guide (TG)" {...field} disabled={readOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="staff"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Staff</FormLabel>
              <FormControl>
                <Input placeholder="Staff" {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="standardPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Standard price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} disabled={readOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="extraPricePerPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Extra price for single traveller</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} disabled={readOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note for trip</FormLabel>
              <FormControl>
                <Textarea placeholder="Note for trip" className="resize-none" {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mode !== "view" && (
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
