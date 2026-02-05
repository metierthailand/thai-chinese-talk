"use client";

import { useListQueryParams } from "@/hooks/use-list-query-params";

export type ListQueryDefaults = Record<string, string | number>;

export const CUSTOMER_SORT_BY_VALUES = ["name", "totalTrips", "createdAt"] as const;
export type CustomerSortBy = (typeof CUSTOMER_SORT_BY_VALUES)[number];
export const CUSTOMER_SORT_ORDER_VALUES = ["asc", "desc"] as const;
export type CustomerSortOrder = (typeof CUSTOMER_SORT_ORDER_VALUES)[number];

const customerDefaults = {
  page: 1,
  pageSize: 10,
  search: "",
  type: "ALL", // ALL | INDIVIDUAL | CORPORATE
  passportExpiryFrom: "",
  passportExpiryTo: "",
  tagIds: "",
  sortBy: "", // "" = no sort (API default: createdAt desc)
  sortOrder: "desc" as CustomerSortOrder,
} satisfies ListQueryDefaults;

export type CustomerListParams = typeof customerDefaults;
export function useCustomerParams() {
  return useListQueryParams(customerDefaults);
}

export function mapCustomerParamsToQuery(params: CustomerListParams) {
  const { page, pageSize, search, type, passportExpiryFrom, passportExpiryTo, tagIds, sortBy, sortOrder } = params;

  return {
    page,
    pageSize,
    search: search || undefined,
    type: type === "ALL" ? undefined : type,
    passportExpiryFrom: passportExpiryFrom || undefined,
    passportExpiryTo: passportExpiryTo || undefined,
    tagIds: tagIds || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  };
}
