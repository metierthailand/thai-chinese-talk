import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerInteractions } from "@/app/dashboard/customers/_components/customer-interactions";
import { CustomerTasks } from "@/app/dashboard/customers/_components/customer-tasks";
import { PassportManager } from "@/app/dashboard/customers/_components/passport-manager";
import { ArrowLeft, Mail, Phone, MapPin, Calendar } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      passports: {
        orderBy: { updatedAt: "desc" },
      },
      leads: {
        orderBy: { updatedAt: "desc" },
      },
      bookings: {
        orderBy: { createdAt: "desc" },
        include: {
          trip: true,
        },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  // Fetch tasks separately as they might not be directly linked in the relation if using loose linking
  // But our schema has relatedCustomerId, so we can fetch them.
  const tasks = await prisma.task.findMany({
    where: { relatedCustomerId: id },
    orderBy: { dueDate: "asc" },
  });

  const clientTasks = tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate.toISOString(),
    priority: t.priority.toString(),
  }));

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
              <p className="text-muted-foreground mt-1 text-sm">{`${customer.firstNameEn} ${customer.lastNameEn} ${customer.nickname && `(${customer.nickname})`}`}</p>
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
          <Tabs defaultValue="interactions" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="interactions">Interactions</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
            </TabsList>

            <TabsContent value="interactions" className="mt-6">
              <CustomerInteractions customerId={customer.id} />
            </TabsContent>

            <TabsContent value="tasks" className="mt-6">
              <CustomerTasks customerId={customer.id} initialTasks={clientTasks} />
            </TabsContent>

            <TabsContent value="leads" className="mt-6">
              <div className="space-y-4">
                {customer.leads.length === 0 ? (
                  <p className="text-muted-foreground">No leads found.</p>
                ) : (
                  customer.leads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between rounded-md border p-4">
                      <div>
                        <div className="font-medium">{lead.destinationInterest || "General Inquiry"}</div>
                        <div className="text-muted-foreground text-sm">Status: {lead.status}</div>
                      </div>
                      <Link href={`/dashboard/leads/${lead.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="bookings" className="mt-6">
              <div className="space-y-4">
                {customer.bookings.length === 0 ? (
                  <p className="text-muted-foreground">No bookings found.</p>
                ) : (
                  customer.bookings.map((booking) => (
                    <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
                      <div className="rounded-md border p-4">
                        <div className="font-medium">{booking.trip.name}</div>
                        <div className="text-muted-foreground text-sm">
                          {format(booking.trip.startDate, "PP")} - {format(booking.trip.endDate, "PP")}
                        </div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          Status: {booking.status} | Amount: {booking.totalAmount.toString()}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
