import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

export interface TasksQuery {
  page: number;
  pageSize: number;
  customerId?: string;
  status?: string;
  contact?: string;
  userId?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  search?: string;
}

export function mapTasksParamsToQuery(params: {
  page: number;
  pageSize: number;
  customerId?: string;
  status?: string;
  contact?: string;
  userId?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  search?: string;
}): TasksQuery {
  return {
    page: params.page,
    pageSize: params.pageSize,
    customerId: params.customerId,
    status: params.status,
    contact: params.contact,
    userId: params.userId,
    deadlineFrom: params.deadlineFrom,
    deadlineTo: params.deadlineTo,
    search: params.search,
  };
}

export function useTasksParams() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = useMemo(() => {
    const p = searchParams.get("page");
    return p ? parseInt(p, 10) : 1;
  }, [searchParams]);

  const pageSize = useMemo(() => {
    const ps = searchParams.get("pageSize");
    return ps ? parseInt(ps, 10) : 10;
  }, [searchParams]);

  const customerId = useMemo(() => {
    return searchParams.get("customerId") || undefined;
  }, [searchParams]);

  const status = useMemo(() => {
    return searchParams.get("status") || undefined;
  }, [searchParams]);

  const contact = useMemo(() => {
    return searchParams.get("contact") || undefined;
  }, [searchParams]);

  const userId = useMemo(() => {
    return searchParams.get("userId") || undefined;
  }, [searchParams]);

  const deadlineFrom = useMemo(() => {
    return searchParams.get("deadlineFrom") || undefined;
  }, [searchParams]);

  const deadlineTo = useMemo(() => {
    return searchParams.get("deadlineTo") || undefined;
  }, [searchParams]);

  const search = useMemo(() => {
    return searchParams.get("search") || undefined;
  }, [searchParams]);

  const setParams = useCallback(
    (updates: Partial<{
      page: number;
      pageSize: number;
      customerId?: string;
      status?: string;
      contact?: string;
      userId?: string;
      deadlineFrom?: string;
      deadlineTo?: string;
      search?: string;
    }>) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.page !== undefined) {
        if (updates.page === 1) {
          params.delete("page");
        } else {
          params.set("page", updates.page.toString());
        }
      }

      if (updates.pageSize !== undefined) {
        if (updates.pageSize === 10) {
          params.delete("pageSize");
        } else {
          params.set("pageSize", updates.pageSize.toString());
        }
      }

      if (updates.customerId !== undefined) {
        if (!updates.customerId) {
          params.delete("customerId");
        } else {
          params.set("customerId", updates.customerId);
        }
      }

      if (updates.status !== undefined) {
        if (!updates.status) {
          params.delete("status");
        } else {
          params.set("status", updates.status);
        }
      }

      if (updates.contact !== undefined) {
        if (!updates.contact) {
          params.delete("contact");
        } else {
          params.set("contact", updates.contact);
        }
      }

      if (updates.userId !== undefined) {
        if (!updates.userId) {
          params.delete("userId");
        } else {
          params.set("userId", updates.userId);
        }
      }

      if (updates.deadlineFrom !== undefined) {
        if (!updates.deadlineFrom) {
          params.delete("deadlineFrom");
        } else {
          params.set("deadlineFrom", updates.deadlineFrom);
        }
      }

      if (updates.deadlineTo !== undefined) {
        if (!updates.deadlineTo) {
          params.delete("deadlineTo");
        } else {
          params.set("deadlineTo", updates.deadlineTo);
        }
      }

      if (updates.search !== undefined) {
        if (!updates.search) {
          params.delete("search");
        } else {
          params.set("search", updates.search);
        }
      }

      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.push(`/dashboard/tasks${newUrl}`, { scroll: false });
    },
    [searchParams, router]
  );

  return {
    page,
    pageSize,
    customerId,
    status,
    contact,
    userId,
    deadlineFrom,
    deadlineTo,
    search,
    setParams,
  };
}
