"use client";

import { useListQueryParams } from "@/hooks/use-list-query-params";

export type ListQueryDefaults = Record<string, string | number>;

const leadsDefaults = {
  page: 1,
  pageSize: 10,
  search: "",
  status: "ALL", // ALL | INTERESTED | BOOKED | COMPLETED | CANCELLED
  source: "ALL", // ALL | FACEBOOK | YOUTUBE | TIKTOK | FRIEND
  customerId: "",
} satisfies ListQueryDefaults;

export type LeadsListParams = typeof leadsDefaults;
export function useLeadsParams() {
  return useListQueryParams(leadsDefaults);
}

export function mapLeadsParamsToQuery(params: LeadsListParams) {
  const { page, pageSize, search, status, source, customerId } = params;

  return {
    page,
    pageSize,
    search: search || undefined,
    status: status === "ALL" ? undefined : status,
    source: source === "ALL" ? undefined : source,
    customerId: customerId || undefined,
  };
}
