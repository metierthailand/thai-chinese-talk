"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export type ListQueryDefaults = Record<string, string | number>;

export function useListQueryParams<TDefaults extends ListQueryDefaults>(
  defaults: TDefaults,
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // สร้าง object params จาก URL + defaults
  const params = {} as { [K in keyof TDefaults]: TDefaults[K] };

  (Object.keys(defaults) as (keyof TDefaults)[]).forEach((key) => {
    const defaultValue = defaults[key];
    const raw = searchParams.get(String(key));

    if (typeof defaultValue === "number") {
      const parsed = raw !== null ? Number(raw) : defaultValue;
      const safe =
        Number.isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
      params[key] = safe as TDefaults[typeof key];
    } else {
      params[key] = (raw ?? defaultValue) as TDefaults[typeof key];
    }
  });

  const setParams = useCallback(
    (updates: Partial<TDefaults>) => {
      const query = new URLSearchParams(searchParams.toString());

      (Object.keys(updates) as (keyof TDefaults)[]).forEach((key) => {
        const value = updates[key];
        const defaultValue = defaults[key];

        if (
          value === undefined ||
          value === "" ||
          value === defaultValue
        ) {
          query.delete(String(key));
        } else {
          query.set(String(key), String(value));
        }
      });

      const qs = query.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, searchParams, pathname, defaults],
  );

  // spread params ออกมาให้ใช้ตรง ๆ + setParams
  return { ...(params as TDefaults), setParams };
}