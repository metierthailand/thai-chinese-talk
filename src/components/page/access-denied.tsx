'use client';

import Link from "next/link";
import { Button } from "../ui/button";
import { Lock } from "lucide-react";

export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-md text-center">
        <Lock className="text-destructive mx-auto size-12" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Access Denied</h1>
        <p className="text-muted-foreground mt-4">
          {message || "You do not have permission to access this page. Only Super Administrators can manage users."}
        </p>
        <div className="mt-6">
          <Link href="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
