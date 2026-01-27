"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, DollarSign, BookMarked } from "lucide-react";
import { Loading } from "@/components/page/loading";

interface TopCustomerByRevenue {
  customerId: string;
  firstNameTh: string | null;
  lastNameTh: string | null;
  firstNameEn: string;
  lastNameEn: string;
  totalRevenue: number;
}

interface UpcomingTrip {
  id: string;
  name: string;
  pax: number;
  status: string;
}

interface DashboardStats {
  customerCount: number;
  activeLeadsCount: number;
  openBookingsCount: number;
  totalRevenue: number;
  totalOutstanding: number;
  upcomingTrips: UpcomingTrip[];
  topCustomersByRevenue: TopCustomerByRevenue[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back!</p>
        </div>
        <div className="flex items-center gap-4">{/* Add any global actions here */}</div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total revenue</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("th-TH", {
                style: "currency",
                currency: "THB",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(stats?.totalRevenue || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total outstanding</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("th-TH", {
                style: "currency",
                currency: "THB",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(stats?.totalOutstanding || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.customerCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">Open bookings</CardTitle>
              <CardDescription className="text-xs">Includes deposit pending / deposit paid</CardDescription>
            </div>
            <BookMarked className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openBookingsCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
              <CardDescription className="text-xs">Includes interested / booked</CardDescription>
            </div>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeLeadsCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Upcoming trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.upcomingTrips.length === 0 ? (
                <p className="text-muted-foreground text-sm">No upcoming trips.</p>
              ) : (
                stats?.upcomingTrips.map((trip, index) => (
                  <div key={trip.id} className="flex items-center">
                    <div className="ml-4 space-y-1 flex gap-4">
                      <p className="text-muted-foreground text-sm">{index + 1}</p>
                      <p className="text-sm leading-none font-medium">{trip.name}</p>
                    </div>
                    <div className="ml-auto font-medium">
                      {trip.pax}
                      <span className="text-muted-foreground text-sm"> PAX</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Top 5 customers by revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topCustomersByRevenue.length === 0 ? (
                <p className="text-muted-foreground text-sm">No customers found.</p>
              ) : (
                stats?.topCustomersByRevenue.map((customer, index) => (
                  <div key={customer.customerId} className="flex items-center justify-between">
                    <div className="flex gap-4">
                      <p className="text-muted-foreground text-sm">{index + 1}</p>
                      <div className="space-y-1">
                        <p className="text-sm leading-none font-medium">
                          {customer.firstNameEn} {customer.lastNameEn}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {customer.firstNameTh || ""} {customer.lastNameTh || ""}
                        </p>
                      </div>
                    </div>
                    <div className="ml-auto font-medium">
                      {new Intl.NumberFormat("th-TH", {
                        style: "currency",
                        currency: "THB",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(customer.totalRevenue || 0)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
