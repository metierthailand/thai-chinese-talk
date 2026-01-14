"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Plane, DollarSign } from "lucide-react";

interface RecentLead {
  id: string;
  tripInterest?: string;
  status: string;
  customer?: {
    firstNameTh?: string;
    lastNameTh?: string;
  } | null;
  firstName?: string | null;
  lastName?: string | null;
}

interface RecentBooking {
  id: string;
  totalAmount: number;
  trip?: {
    name: string;
  } | null;
  customer?: {
    firstNameTh?: string;
    lastNameTh?: string;
    firstNameEn?: string;
    lastNameEn?: string;
  } | null;
}

interface DashboardStats {
  customerCount: number;
  activeLeadsCount: number;
  pendingBookingsCount: number;
  totalRevenue: number;
  recentLeads: RecentLead[];
  recentBookings: RecentBooking[];
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
    return <div className="p-8">Loading dashboard...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name || "Agent"}
          </p>
        </div>
        <div className="flex items-center gap-4">
           {/* Add any global actions here */}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.customerCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeLeadsCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingBookingsCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("th-TH", {
                style: "currency",
                currency: "THB",
                maximumFractionDigits: 0,
              }).format(stats?.totalRevenue || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent bookings.</p>
              ) : (
                stats?.recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{booking.trip?.name || "Unknown Trip"}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.customer?.firstNameTh || booking.customer?.firstNameEn || ""}{" "}
                        {booking.customer?.lastNameTh || booking.customer?.lastNameEn || ""}
                      </p>
                    </div>
                    <div className="ml-auto font-medium">
                      {new Intl.NumberFormat("th-TH", {
                        style: "currency",
                        currency: "THB",
                        maximumFractionDigits: 0,
                      }).format(booking.totalAmount || 0)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent leads.</p>
              ) : (
                stats?.recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {lead.tripInterest || "General Inquiry"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {lead.customer?.firstNameTh || lead.firstName || ""}{" "}
                        {lead.customer?.lastNameTh || lead.lastName || ""}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {lead.status?.replace(/_/g, " ") || lead.status}
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
