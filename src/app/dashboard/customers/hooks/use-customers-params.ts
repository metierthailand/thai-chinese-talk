"use client";

import { useListQueryParams } from "@/hooks/use-list-query-params";

export type ListQueryDefaults = Record<string, string | number>;

const customerDefaults = {
  page: 1,
  pageSize: 10,
  search: "",
  type: "ALL", // ALL | INDIVIDUAL | CORPORATE
  passportExpiryFrom: "",
  passportExpiryTo: "",
  tagIds: "",
} satisfies ListQueryDefaults;

export type CustomerListParams = typeof customerDefaults;
export function useCustomerParams() {
  return useListQueryParams(customerDefaults);
}

export function mapCustomerParamsToQuery(params: CustomerListParams) {
  const { page, pageSize, search, type, passportExpiryFrom, passportExpiryTo, tagIds } = params;

  return {
    page,
    pageSize,
    search: search || undefined,
    type: type === "ALL" ? undefined : type,
    passportExpiryFrom: passportExpiryFrom || undefined,
    passportExpiryTo: passportExpiryTo || undefined,
    tagIds: tagIds || undefined,
  };
}
