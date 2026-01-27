"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { ROLE_LABELS, ROLE_VALUES, USER_STATUS_LABELS, USER_STATUS_VALUES } from "@/lib/constants/role";

interface UserFilterProps {
  onFilterChange?: () => void;
}

type UpdateParams = {
  search?: string;
  role?: string;
  status?: string;
};

export function UserFilter({ onFilterChange }: UserFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial values from URL
  const searchQuery = searchParams.get("search") || "";
  const roleFilter = searchParams.get("role") || "ALL";
  const statusFilter = searchParams.get("status") || "ALL";

  // Local state (init จาก URL แค่ตอน mount)
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [role, setRole] = useState(roleFilter || "ALL");
  const [status, setStatus] = useState(statusFilter || "ALL");

  // Debounced search
  const debouncedSearch = useDebounce(searchInput, 500);

  // --- Helper: build query string from current params + updates ---
  const buildQueryString = (updates: UpdateParams) => {
    const params = new URLSearchParams(searchParams.toString());

    const setParam = (key: string, value: string | undefined, defaultValue?: string) => {
      if (value === undefined) return; // ไม่แตะ key นี้ถ้าไม่ได้ส่งมา

      if (value === "" || (defaultValue !== undefined && value === defaultValue)) {
        params.delete(key);
        return;
      }

      params.set(key, value);
    };

    setParam("search", updates.search);
    setParam("role", updates.role, "ALL");
    setParam("status", updates.status, "ALL");

    // Reset to page 1 when filters change
    if (updates.search !== undefined || updates.role !== undefined || updates.status !== undefined) {
      params.set("page", "1");
    }

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const pushWithParams = (updates: UpdateParams) => {
    const newQuery = buildQueryString(updates);
    router.push(`/dashboard/admin${newQuery}`, { scroll: false });
    onFilterChange?.();
  };

  useEffect(() => {
    if (debouncedSearch === searchQuery) return;

    pushWithParams({ search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, searchQuery]);

  // Sync URL → local state (รองรับ back/forward / external change)
  useEffect(() => {
    setSearchInput(searchQuery);
    setRole(roleFilter || "ALL");
    setStatus(statusFilter || "ALL");
  }, [searchQuery, roleFilter, statusFilter]);

  return (
    <div className="flex flex-col items-center justify-end gap-4 md:flex-row">

      {/* Status filter */}
      <Select
        value={status}
        onValueChange={(value) => {
          setStatus(value);
          pushWithParams({ status: value });
        }}
      >
        <SelectTrigger className="w-full md:w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All status</SelectItem>
          {USER_STATUS_VALUES.map((statusValue) => (
            <SelectItem key={statusValue} value={statusValue}>
              {USER_STATUS_LABELS[statusValue]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Role filter */}
      <Select
        value={role}
        onValueChange={(value) => {
          setRole(value);
          pushWithParams({ role: value });
        }}
      >
        <SelectTrigger className="w-full md:w-40">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All roles</SelectItem>
          {ROLE_VALUES.map((roleValue) => (
            <SelectItem key={roleValue} value={roleValue}>
              {ROLE_LABELS[roleValue]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search */}
      <div className="relative w-full flex-1 md:max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by staff name, email, phone number"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
