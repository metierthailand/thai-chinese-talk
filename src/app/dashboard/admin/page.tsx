"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { UsersTable } from "./users-table";
import { UserDialog } from "./user-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Lock } from "lucide-react";
import { User } from "./types";
import Link from "next/link";
import { AccessDenied } from "@/components/page/access-denied";
import { Loading } from "@/components/page/loading";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleUserSaved = () => {
    setIsDialogOpen(false);
    fetchUsers();
  };

  // Show loading state while checking session
  if (status === "loading") {
    return <Loading />;
  }

  // Show unauthorized message if not SUPER_ADMIN
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Management</h1>
        <Button onClick={handleCreateUser}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <UsersTable users={users} loading={loading} onEdit={handleEditUser} />

      <UserDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        user={selectedUser || undefined}
        onSaved={handleUserSaved}
      />
    </div>
  );
}
