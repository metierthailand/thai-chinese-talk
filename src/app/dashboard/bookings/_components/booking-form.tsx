"use client";

import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CustomerForm } from "@/app/dashboard/customers/_components/customer-form";
import { DeleteDialog } from "../../_components/delete-dialog";
import { useBookingForm } from "./form/use-booking-form";
import { BookingFormValues } from "./form/booking-schema";
import { Booking } from "../hooks/use-bookings";
import { TripSection } from "./form/sections/trip-section";
import { CustomerSection } from "./form/sections/customer-section";
import { CompanionSection } from "./form/sections/companion-section";
import { CostSummarySection } from "./form/sections/cost-summary-section";
import { TravelDetailsSection } from "./form/sections/travel-details-section";
import { SalesSection } from "./form/sections/sales-section";
import { PaymentSection } from "./form/sections/payment-section";

export type { BookingFormValues } from "./form/booking-schema";

interface BookingFormProps {
  mode: "create" | "edit" | "view";
  initialData?: Partial<BookingFormValues>;
  onSubmit?: (values: BookingFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  booking?: Booking;
}

export function BookingForm({ mode, initialData, onSubmit, onCancel, isLoading = false, booking }: BookingFormProps) {
  const {
    form,
    readOnly,
    trips,
    tripSearchOpen,
    setTripSearchOpen,
    tripSearchQuery,
    setTripSearchQuery,
    filteredTrips,
    handleTripChange,
    customerSearchOpen,
    setCustomerSearchOpen,
    customerSearchQuery,
    setCustomerSearchQuery,
    isSearching,
    searchResults,
    selectedCustomer,
    createCustomerDialogOpen,
    setCreateCustomerDialogOpen,
    tags,
    createCustomerMutation,
    handleCreateCustomer,
    customerPassports,
    customerId,
    salesUserSearchOpen,
    setSalesUserSearchOpen,
    salesUserSearchQuery,
    setSalesUserSearchQuery,
    filteredSalesUsers,
    selectedSalesUser,
    companionSearchOpen,
    setCompanionSearchOpen,
    companionSearchQuery,
    setCompanionSearchQuery,
    filteredCompanionCustomers,
    availableCompanionCustomers,
    handleAddCompanion,
    selectedCompanions,
    handleDeleteCompanion,
    deletingCompanionId,
    setDeletingCompanionId,
    handleRemoveCompanion,
    calculatedAmounts,
    enableSingleTravellerPrice,
    setEnableSingleTravellerPrice,
    enableBedPrice,
    setEnableBedPrice,
    enableSeatPrice,
    setEnableSeatPrice,
    enableBagPrice,
    setEnableBagPrice,
    enableDiscount,
    setEnableDiscount,
    isPaymentProofsOpen,
    setIsPaymentProofsOpen,
    payments,
    handleSubmit,
    tripId
  } = useBookingForm({ mode, initialData, booking, onSubmit });

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Booking information</h3>

            <TripSection
              form={form}
              readOnly={readOnly}
              trips={trips}
              tripSearchOpen={tripSearchOpen}
              setTripSearchOpen={setTripSearchOpen}
              tripSearchQuery={tripSearchQuery}
              setTripSearchQuery={setTripSearchQuery}
              filteredTrips={filteredTrips}
              handleTripChange={handleTripChange}
              booking={booking}
            />

            <CustomerSection
              form={form}
              readOnly={readOnly}
              customerSearchOpen={customerSearchOpen}
              setCustomerSearchOpen={setCustomerSearchOpen}
              customerSearchQuery={customerSearchQuery}
              setCustomerSearchQuery={setCustomerSearchQuery}
              isSearching={isSearching}
              searchResults={searchResults}
              selectedCustomer={selectedCustomer}
              setCreateCustomerDialogOpen={setCreateCustomerDialogOpen}
              customerPassports={customerPassports}
              customerId={customerId}
            />

            <CompanionSection
              form={form}
              readOnly={readOnly}
              selectedCompanions={selectedCompanions}
              companionSearchOpen={companionSearchOpen}
              setCompanionSearchOpen={setCompanionSearchOpen}
              tripId={tripId}
              availableCompanionCustomers={availableCompanionCustomers}
              companionSearchQuery={companionSearchQuery}
              setCompanionSearchQuery={setCompanionSearchQuery}
              filteredCompanionCustomers={filteredCompanionCustomers}
              companionCustomerIds={form.watch("companionCustomerIds") || []}
              handleAddCompanion={handleAddCompanion}
              handleDeleteCompanion={handleDeleteCompanion}
            />
          </div>

          {/* Pricing Section */}
          <CostSummarySection
            form={form}
            readOnly={readOnly}
            calculatedAmounts={calculatedAmounts}
            trips={trips}
            tripId={tripId}
            enableSingleTravellerPrice={enableSingleTravellerPrice}
            setEnableSingleTravellerPrice={setEnableSingleTravellerPrice}
          />

          <Separator />

          {/* Travel Details Section */}
          <TravelDetailsSection
            form={form}
            readOnly={readOnly}
            enableBedPrice={enableBedPrice}
            setEnableBedPrice={setEnableBedPrice}
            enableSeatPrice={enableSeatPrice}
            setEnableSeatPrice={setEnableSeatPrice}
            enableBagPrice={enableBagPrice}
            setEnableBagPrice={setEnableBagPrice}
            enableDiscount={enableDiscount}
            setEnableDiscount={setEnableDiscount}
          />

          <Separator />

          {/* Sales User Field */}
          <SalesSection
            form={form}
            readOnly={readOnly}
            selectedSalesUser={selectedSalesUser}
            salesUserSearchOpen={salesUserSearchOpen}
            setSalesUserSearchOpen={setSalesUserSearchOpen}
            salesUserSearchQuery={salesUserSearchQuery}
            setSalesUserSearchQuery={setSalesUserSearchQuery}
            filteredSalesUsers={filteredSalesUsers}
          />

          {/* Note */}
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note for booking</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Note for booking"
                    className="resize-none"
                    {...field}
                    disabled={readOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          {/* Payment Section */}
          <PaymentSection
            form={form}
            readOnly={readOnly}
            mode={mode}
            booking={booking}
            calculatedAmounts={calculatedAmounts}
            isPaymentProofsOpen={isPaymentProofsOpen}
            setIsPaymentProofsOpen={setIsPaymentProofsOpen}
            payments={payments}
            trips={trips}
            tripId={tripId}
            selectedCustomer={selectedCustomer}
          />

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
                    ? "Create Booking"
                    : "Update Booking"}
              </Button>
            </div>
          )}
        </form>

        {/* Create Customer Dialog */}
        <Dialog open={createCustomerDialogOpen} onOpenChange={setCreateCustomerDialogOpen} modal={false}>
          <DialogContent className="max-h-[90vh] w-full! lg:w-[820px]! sm:max-w-7xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-3xl">New Customer</DialogTitle>
            </DialogHeader>
            <CustomerForm
              mode="create"
              onSubmit={handleCreateCustomer}
              onCancel={() => setCreateCustomerDialogOpen(false)}
              isLoading={createCustomerMutation.isPending}
              availableTags={tags}
            />
          </DialogContent>
        </Dialog>

      </Form>

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingCompanionId}
        onOpenChange={() => setDeletingCompanionId(null)}
        onConfirm={() => handleRemoveCompanion(deletingCompanionId ?? "")}
        isDeleting={false}
        title="Are you sure?"
        description="This action cannot be undone."
      />
    </>
  );
}
