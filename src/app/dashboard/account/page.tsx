"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft, User, Mail, Shield, Percent, Calendar, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ROLE_LABELS } from "@/lib/constants/role";
import { format } from "date-fns";

const changeNameSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }).max(50, { message: "First name must be less than 50 characters" }),
  lastName: z.string().min(1, { message: "Last name is required" }).max(50, { message: "Last name must be less than 50 characters" }),
});

const changeEmailSchema = z.object({
  newEmail: z.string().email({ message: "Please enter a valid email address" }),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Current password is required" }),
    newPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string().min(6, { message: "Password confirmation is required" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ChangeNameFormValues = z.infer<typeof changeNameSchema>;
type ChangeEmailFormValues = z.infer<typeof changeEmailSchema>;
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

interface CommissionBooking {
  id: string;
  customerName: string;
  tripName: string;
  tripCode: string;
  destination: string;
  totalAmount: number;
  paidAmount: number;
  commission: number;
  createdAt: string;
}

interface CommissionData {
  commissionRate: number; // This is commissionPerHead (fixed amount per booking)
  totalSales: number;
  totalCommission: number;
  totalBookings: number;
  bookings: CommissionBooking[];
}

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  commissionPerHead: number | null;
  isActive: boolean;
  createdAt: string;
}

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update: updateSession } = useSession();
  const updateSessionRef = useRef(updateSession);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "account");
  const [isLoadingName, setIsLoadingName] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [commissionData, setCommissionData] = useState<CommissionData | null>(null);
  const [isLoadingCommission, setIsLoadingCommission] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(true);

  // Keep updateSession ref up to date
  useEffect(() => {
    updateSessionRef.current = updateSession;
  }, [updateSession]);

  const nameForm = useForm<ChangeNameFormValues>({
    resolver: zodResolver(changeNameSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  const emailForm = useForm<ChangeEmailFormValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      newEmail: "",
    },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update name form when userInfo changes
  useEffect(() => {
    if (userInfo) {
      nameForm.reset({
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
      });
    }
  }, [userInfo, nameForm]);

  // Sync tab with URL param
  useEffect(() => {
    const tab = searchParams.get("tab") || "account";
    setActiveTab(tab);
  }, [searchParams]);

  // Fetch user info
  const fetchUserInfo = useCallback(async (shouldUpdateSession = false) => {
      setIsLoadingUserInfo(true);
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUserInfo(data);
        // Only update session when explicitly requested (e.g., after email verification)
        if (shouldUpdateSession && updateSessionRef.current) {
          await updateSessionRef.current();
        }
        }
      } catch (error) {
        console.error("Failed to fetch user info:", error);
      } finally {
        setIsLoadingUserInfo(false);
      }
  }, []);

  useEffect(() => {
    fetchUserInfo(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh user info when coming back from email verification
  useEffect(() => {
    const handleFocus = () => {
      // Refresh user info when window regains focus (user might have verified email in another tab)
      fetchUserInfo(true);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch commission data
  useEffect(() => {
    const fetchCommission = async () => {
      if (activeTab === "billing") {
        setIsLoadingCommission(true);
        try {
          const res = await fetch("/api/auth/my-commission");
          if (res.ok) {
            const data = await res.json();
            setCommissionData(data);
          }
        } catch (error) {
          console.error("Failed to fetch commission:", error);
        } finally {
          setIsLoadingCommission(false);
        }
      }
    };

    fetchCommission();
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/dashboard/account?tab=${value}`, { scroll: false });
  };

  const onNameSubmit = async (values: ChangeNameFormValues) => {
    setIsLoadingName(true);
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to update name");
      }

      const data = await res.json();
      setUserInfo(data);
      toast.success("Name updated successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage);
    } finally {
      setIsLoadingName(false);
    }
  };

  const onEmailSubmit = async (values: ChangeEmailFormValues) => {
    setIsLoadingEmail(true);
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to change email");
      }

      const data = await res.json();
      toast.success("Verification email sent to new email address");
      
      if (process.env.NODE_ENV === "development" && data.verificationUrl) {
        toast.info("Check console for verification URL (development mode)");
      }

      emailForm.reset();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage);
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const onPasswordSubmit = async (values: ChangePasswordFormValues) => {
    setIsLoadingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to change password");
      }

      toast.success("Password changed successfully. You will be logged out.");
      
      // Logout after password change
      setTimeout(async () => {
        await signOut({ callbackUrl: "/login" });
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage);
    } finally {
      setIsLoadingPassword(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">Manage your account and billing information.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6 space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>View your account information.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUserInfo ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : userInfo ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <User className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                        <p className="text-sm">{userInfo.firstName} {userInfo.lastName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                        <p className="text-sm">{userInfo.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Role</p>
                        <p className="text-sm">{ROLE_LABELS[userInfo.role as keyof typeof ROLE_LABELS] || userInfo.role}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {userInfo.commissionPerHead !== null && (
                      <div className="flex items-start gap-3">
                        <Percent className="mt-0.5 h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Commission Per Booking</p>
                          <p className="text-sm">
                            {new Intl.NumberFormat("th-TH", {
                              style: "currency",
                              currency: "THB",
                              maximumFractionDigits: 0,
                            }).format(userInfo.commissionPerHead)}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      {userInfo.isActive ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
                      )}
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Account Status</p>
                        <p className={`text-sm ${userInfo.isActive ? "text-green-600" : "text-destructive"}`}>
                          {userInfo.isActive ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                        <p className="text-sm">
                          {format(new Date(userInfo.createdAt), "MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Failed to load account information.</p>
              )}
            </CardContent>
          </Card>

          {/* Edit Account */}
          <Card>
            <CardHeader>
              <CardTitle>Edit Name</CardTitle>
              <CardDescription>Update your display name.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...nameForm}>
                <form onSubmit={nameForm.handleSubmit(onNameSubmit)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={nameForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your first name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  <FormField
                    control={nameForm.control}
                      name="lastName"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>Last Name</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter your last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                  <Button type="submit" disabled={isLoadingName}>
                    {isLoadingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Name
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Change Email */}
          <Card>
            <CardHeader>
              <CardTitle>Change Email</CardTitle>
              <CardDescription>
                Update your email address. A verification email will be sent to your new email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Current Email</Label>
                    <Input value={userInfo?.email || session?.user?.email || ""} disabled />
                  </div>
                  <FormField
                    control={emailForm.control}
                    name="newEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter new email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoadingEmail}>
                    {isLoadingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Verification Email
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password. You will be logged out after changing your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter current password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoadingPassword}>
                    {isLoadingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Change Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Commission & Earnings</CardTitle>
              <CardDescription>View your commission rate and earnings from completed bookings.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCommission ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : commissionData ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Commission Per Booking</CardDescription>
                        <CardTitle className="text-2xl">
                          {new Intl.NumberFormat("th-TH", {
                            style: "currency",
                            currency: "THB",
                            maximumFractionDigits: 0,
                          }).format(commissionData.commissionRate || 0)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Total Sales</CardDescription>
                        <CardTitle className="text-2xl">
                          {new Intl.NumberFormat("th-TH", {
                            style: "currency",
                            currency: "THB",
                            maximumFractionDigits: 0,
                          }).format(commissionData.totalSales || 0)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Total Commission</CardDescription>
                        <CardTitle className="text-2xl">
                          {new Intl.NumberFormat("th-TH", {
                            style: "currency",
                            currency: "THB",
                            maximumFractionDigits: 0,
                          }).format(commissionData.totalCommission || 0)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>

                  {/* Bookings List */}
                  <div>
                    <h3 className="mb-4 text-lg font-semibold">
                      Completed Bookings ({commissionData.totalBookings || 0})
                    </h3>
                    {commissionData.bookings && commissionData.bookings.length > 0 ? (
                      <div className="space-y-2">
                        {commissionData.bookings.map((booking: CommissionBooking) => (
                          <Card key={booking.id}>
                            <CardContent>
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="font-medium">{booking.customerName}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {booking.tripName} ({booking.tripCode})
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(booking.createdAt).toLocaleDateString("th-TH", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </div>
                                </div>
                                <div className="text-right space-y-1">
                                  <div className="font-medium">
                                    {new Intl.NumberFormat("th-TH", {
                                      style: "currency",
                                      currency: "THB",
                                      maximumFractionDigits: 0,
                                    }).format(booking.commission)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Commission
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Sales: {new Intl.NumberFormat("th-TH", {
                                      style: "currency",
                                      currency: "THB",
                                      maximumFractionDigits: 0,
                                    }).format(booking.totalAmount)}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No completed bookings yet.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Failed to load commission data.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

