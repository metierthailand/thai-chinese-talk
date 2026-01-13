"use client";

import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  CheckCircle2,
  Circle,
  XCircle,
  FileText,
  Calendar,
  MapPin,
  DollarSign,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLead } from "../hooks/use-leads";
import { format } from "date-fns";
import { formatDecimal, cn } from "@/lib/utils";
import Link from "next/link";
import { Loading } from "@/components/page/loading";
import { getLeadSourceLabel, getLeadStatusLabel } from "@/lib/constants/lead";

const LEAD_STATUSES = [
  { value: "INTERESTED", label: "Interested", icon: Circle },
  { value: "BOOKED", label: "Booked", icon: CheckCircle2 },
  { value: "COMPLETED", label: "Completed", icon: CheckCircle2 },
  { value: "CANCELLED", label: "Cancelled", icon: XCircle },
] as const;

const getStatusIndex = (status: string): number => {
  return LEAD_STATUSES.findIndex((s) => s.value === status);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "INTERESTED":
      return "bg-blue-500";
    case "BOOKED":
      return "bg-green-500";
    case "COMPLETED":
      return "bg-emerald-500";
    case "CANCELLED":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

export default function LeadViewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data: lead, isLoading, error } = useLead(typeof id === "string" ? id : undefined);

  if (isLoading) {
    return <Loading />;
  }

  if (error || !lead) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Failed to load lead.</p>
        </div>
      </div>
    );
  }

  const currentStatusIndex = getStatusIndex(lead.status);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Lead Details</h2>
            <p className="text-muted-foreground">View lead information and status.</p>
          </div>
        </div>
        <Button variant="default" onClick={() => router.push(`/dashboard/leads/${lead.id}/edit`)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Lead
        </Button>
      </div>

      {/* Status Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Status</CardTitle>
          <CardDescription>Current progress in the sales pipeline</CardDescription>
        </CardHeader>
        <CardContent>

          <div className="flex items-center justify-between">
            {LEAD_STATUSES.map((status, index) => {
              const StatusIcon = status.icon;
              const isActive = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              const isLast = index === LEAD_STATUSES.length - 1;
              const isCancelled = lead.status === "CANCELLED";

              // Determine colors based on status
              let iconBgColor = "bg-muted text-muted-foreground";
              let lineColor = "bg-muted";

              if (isActive) {
                if (isCurrent) {
                  // Current status
                  if (isCancelled) {
                    iconBgColor = "bg-red-500 text-white";
                  } else {
                    iconBgColor = "bg-primary text-primary-foreground";
                  }
                } else {
                  // Past status - always green (completed)
                  iconBgColor = "bg-green-500 text-white";
                }
              }

              // Line color logic
              if (index < currentStatusIndex) {
                // If the next status is CANCELLED, make the line red
                if (isCancelled && index === currentStatusIndex - 1) {
                  lineColor = "bg-red-500";
                } else {
                  lineColor = "bg-green-500";
                }
              }

              return (
                <div key={status.value} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div className={cn("rounded-full p-3 transition-colors", iconBgColor)}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <span
                      className={cn(
                        "mt-2 text-center text-xs font-medium",
                        isActive ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                  {!isLast && <div className={cn("mx-2 -mt-8 h-1 flex-1 transition-colors", lineColor)} />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lead Details */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Source</p>
              <Badge variant="outline" className="mt-1">
                {getLeadSourceLabel(lead.source)}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Status</p>
              <Badge className={cn("mt-1", getStatusColor(lead.status))}>{getLeadStatusLabel(lead.status)}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Trip Interest</p>
              <p className="mt-1 text-base">{lead.tripInterest}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Pax</p>
              <p className="mt-1 text-base">{lead.pax}</p>
            </div>
            {lead.agent && (
              <div>
                <p className="text-muted-foreground text-sm font-medium">Created By (Agent)</p>
                <p className="mt-1 text-base">
                  {lead.agent.firstName} {lead.agent.lastName}
                </p>
                <p className="text-muted-foreground text-sm">{lead.agent.email}</p>
              </div>
            )}
            {lead.salesUser && (
              <div>
                <p className="text-muted-foreground text-sm font-medium">Sales User</p>
                <p className="mt-1 text-base">
                  {lead.salesUser.firstName} {lead.salesUser.lastName}
                </p>
                <p className="text-muted-foreground text-sm">{lead.salesUser.email}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-sm font-medium">Created</p>
              <p className="mt-1 text-sm">{format(new Date(lead.createdAt), "dd MMM yyyy, HH:mm")}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Last Updated</p>
              <p className="mt-1 text-sm">{format(new Date(lead.updatedAt), "dd MMM yyyy, HH:mm")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead.newCustomer ? (
              <>
                <Badge variant="outline" className="w-fit">New Customer</Badge>
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Name</p>
                  <p className="text-base font-semibold">
                    {lead.firstName} {lead.lastName}
                  </p>
                </div>
                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="text-muted-foreground h-4 w-4" />
                    <a href={`mailto:${lead.email}`} className="text-primary text-sm hover:underline">
                      {lead.email}
                    </a>
                  </div>
                )}
                {lead.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="text-muted-foreground h-4 w-4" />
                    <a href={`tel:${lead.phoneNumber}`} className="text-primary text-sm hover:underline">
                      {lead.phoneNumber}
                    </a>
                  </div>
                )}
                {lead.lineId && (
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">LINE ID</p>
                    <p className="text-base">{lead.lineId}</p>
                  </div>
                )}
              </>
            ) : lead.customer ? (
              <>
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Name (Thai)</p>
                  <p className="text-base font-semibold">
                    {lead.customer.firstNameTh} {lead.customer.lastNameTh}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Name (English)</p>
                  <p className="text-base font-semibold">
                    {lead.customer.firstNameEn} {lead.customer.lastNameEn}
                  </p>
                </div>
                {lead.customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="text-muted-foreground h-4 w-4" />
                    <a href={`mailto:${lead.customer.email}`} className="text-primary text-sm hover:underline">
                      {lead.customer.email}
                    </a>
                  </div>
                )}
                {lead.customer.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="text-muted-foreground h-4 w-4" />
                    <a href={`tel:${lead.customer.phoneNumber}`} className="text-primary text-sm hover:underline">
                      {lead.customer.phoneNumber}
                    </a>
                  </div>
                )}
                <Separator />
                <Link href={`/dashboard/customers/${lead.customer.id}`}>
                  <Button variant="outline" className="w-full">
                    View Customer Profile
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">No customer information</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-2">Lead Note</p>
              <p className="text-sm whitespace-pre-wrap">{lead.leadNote ?? "No lead notes"}</p>
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-2">Source Note</p>
              <p className="text-sm whitespace-pre-wrap">{lead.sourceNote ?? "No source notes"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings */}
      {lead.bookings && lead.bookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Related Bookings
            </CardTitle>
            <CardDescription>
              {lead.bookings.length} {lead.bookings.length === 1 ? "booking" : "bookings"} associated with this lead
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lead.bookings.map((booking) => (
                <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
                  <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="text-muted-foreground h-4 w-4" />
                            <h4 className="font-semibold">{booking.trip.name}</h4>
                          </div>
                          <p className="text-muted-foreground text-sm">{booking.trip.destination}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="text-muted-foreground h-4 w-4" />
                              <span>
                                {format(new Date(booking.trip.startDate), "dd MMM yyyy")} -{" "}
                                {format(new Date(booking.trip.endDate), "dd MMM yyyy")}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 pt-2">
                            <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                            <Badge variant="outline">{booking.visaStatus.replace("_", " ")}</Badge>
                          </div>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-muted-foreground text-sm font-medium">Total</p>
                          <p className="text-lg font-semibold">{formatDecimal(booking.totalAmount)}</p>
                          <p className="text-muted-foreground text-sm">Paid: {formatDecimal(booking.paidAmount)}</p>
                          {booking.paidAmount < booking.totalAmount && (
                            <p className="text-sm text-yellow-600">
                              Remaining: {formatDecimal(booking.totalAmount - booking.paidAmount)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
