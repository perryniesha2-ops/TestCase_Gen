// hooks/use-requirements.ts
"use client";

import { useCallback, useState } from "react";
import type { Requirement } from "@/types/requirements";

type OverviewResponse = {
  requirements: Requirement[];
  page: number;
  pageSize: number;
  totalCount: number;
  error?: string;
};

type Params = {
  page: number;
  pageSize: number;
  project?: string;
  q?: string;
  status?: string;
  priority?: string;
  sort?: string;
  dir?: "asc" | "desc";
};

export function useRequirements() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRequirements = useCallback(
    async (p: Partial<Params> = {}) => {
      setLoading(true);
      try {
        const nextPage = p.page ?? page;
        const nextPageSize = p.pageSize ?? pageSize;

        const qs = new URLSearchParams();
        qs.set("page", String(nextPage));
        qs.set("pageSize", String(nextPageSize));

        if (p.project) qs.set("project", p.project);
        if (p.q) qs.set("q", p.q);
        if (p.status) qs.set("status", p.status);
        if (p.priority) qs.set("priority", p.priority);
        if (p.sort) qs.set("sort", p.sort);
        if (p.dir) qs.set("dir", p.dir);

        const res = await fetch(`/api/requirements/overview?${qs.toString()}`, {
          cache: "no-store",
        });

        const raw = await res.text().catch(() => "");
        const payload: OverviewResponse | null = raw ? JSON.parse(raw) : null;

        if (!res.ok) {
          throw new Error(payload?.error ?? `Failed (${res.status})`);
        }

        setRequirements(payload?.requirements ?? []);
        setPage(payload?.page ?? nextPage);
        setPageSize(payload?.pageSize ?? nextPageSize);
        setTotalCount(payload?.totalCount ?? 0);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize]
  );

  // Keep delete as-is, but it should call ONE route or ONE supabase call.
  const deleteRequirement = useCallback(async (id: string) => {
    const res = await fetch(`/api/requirements/${id}/delete`, {
      method: "DELETE",
    });
    return res.ok;
  }, []);

  return {
    requirements,
    loading,

    page,
    pageSize,
    totalCount,

    setPage,
    setPageSize,

    fetchRequirements,
    deleteRequirement,
  };
}
