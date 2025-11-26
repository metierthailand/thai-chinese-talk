import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerInteractions } from "@/components/CustomerInteractions";
import { CustomerTasks } from "@/components/CustomerTasks";
import { ArrowLeft, Mail, Phone, MapPin, Calendar } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      passports: true,
      interactions: {
        orderBy: { date: "desc" },
        include: { agent: { select: { name: true } } },
      },
      leads: {
        orderBy: { updatedAt: "desc" },
      },
      bookings: {
        orderBy: { createdAt: "desc" },
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

  // Transform dates for client components
  const interactions = customer.interactions.map((i) => ({
    ...i,
    date: i.date.toISOString(),
  }));

  const clientTasks = tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate.toISOString(),
    priority: t.priority.toString(),
  }));

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {customer.firstName} {customer.lastName}
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <Badge variant="outline">{customer.type}</Badge>
              {customer.tags.map(({ tag }) => (
                <Badge key={tag.id} className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <Button>Edit Profile</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Profile Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email || "-"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.phone || "-"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs text-muted-foreground w-4 text-center">L</span>
                <span>{customer.lineId || "-"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Passports</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.passports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No passports recorded.</p>
              ) : (
                <div className="space-y-3">
                  {customer.passports.map((passport) => (
                    <div key={passport.id} className="border p-3 rounded-md text-sm">
                      <div className="font-medium">{passport.issuingCountry}</div>
                      <div className="text-muted-foreground">{passport.passportNumber}</div>
                      <div className="text-xs text-red-500 mt-1">
                        Expires: {format(passport.expiryDate, "PP")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
              <CustomerInteractions
                customerId={customer.id}
                initialInteractions={interactions}
              />
            </TabsContent>
            
            <TabsContent value="tasks" className="mt-6">
              <CustomerTasks
                customerId={customer.id}
                initialTasks={clientTasks}
              />
            </TabsContent>

            <TabsContent value="leads" className="mt-6">
              <div className="space-y-4">
                {customer.leads.length === 0 ? (
                  <p className="text-muted-foreground">No leads found.</p>
                ) : (
                  customer.leads.map((lead) => (
                    <div key={lead.id} className="border p-4 rounded-md flex justify-between items-center">
                      <div>
                        <div className="font-medium">{lead.destinationInterest || "General Inquiry"}</div>
                        <div className="text-sm text-muted-foreground">
                          Status: {lead.status}
                        </div>
                      </div>
                      <Link href={`/dashboard/leads/${lead.id}`}>
                        <Button variant="outline" size="sm">View</Button>
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
                    <div key={booking.id} className="border p-4 rounded-md">
                      <div className="font-medium">{booking.tripName}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(booking.startDate, "PP")} - {format(booking.endDate, "PP")}
                      </div>
                    </div>
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
