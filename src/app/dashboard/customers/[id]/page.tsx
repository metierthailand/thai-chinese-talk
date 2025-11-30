"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PassportManager } from "@/app/dashboard/customers/_components/passport-manager";
import { CustomerTabs } from "./_components/customer-tabs";
import { ArrowLeft, Mail, Phone, MapPin, Calendar } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useCustomer } from "@/app/dashboard/customers/hooks/use-customers";
import { Loading } from "@/components/page/loading";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data: customer, isLoading, error } = useCustomer(id);

  console.log("customer", customer);

  if (isLoading) {
    return <Loading />;
  }

  if (error || !customer) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Failed to load customer. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="text-muted-foreground mt-1 flex items-center gap-2">
              <Badge variant="outline">{customer.type}</Badge> |
              {customer.tags.map(({ tag }) => (
                <Badge key={tag.id} className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  {tag.name}
                </Badge>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <h2 className="text-3xl font-bold tracking-tight">{`${customer.firstNameTh} ${customer.lastNameTh}`}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{`${customer.firstNameEn} ${customer.lastNameEn}${customer.nickname ? ` (${customer.nickname})` : ""}`}</p>
            </div>
          </div>
        </div>
        <Link href={`/dashboard/customers/${customer.id}/edit`}>
          <Button>Edit Profile</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left Column: Profile Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="text-muted-foreground h-4 w-4" />
                <span>{customer.email || "-"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="text-muted-foreground h-4 w-4" />
                <span>{customer.phone || "-"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground w-4 text-center text-xs font-bold">L</span>
                <span>{customer.lineId || "-"}</span>
              </div>
              {customer.nationality && (
                <div className="flex items-center gap-3">
                  <MapPin className="text-muted-foreground h-4 w-4" />
                  <span>{customer.nationality}</span>
                </div>
              )}
              {customer.dateOfBirth && (
                <div className="flex items-center gap-3">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <span>{format(new Date(customer.dateOfBirth), "PP")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {customer.preferences && (
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{customer.preferences}</p>
              </CardContent>
            </Card>
          )}

          <PassportManager customerId={customer.id} passports={customer.passports} />
        </div>

        {/* Right Column: Tabs */}
        <div className="md:col-span-2">
          <CustomerTabs
            customerId={customer.id}
            leads={customer.leads}
            bookings={customer.bookings}
          />
        </div>
      </div>
    </div>
  );
}
