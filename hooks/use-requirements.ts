// hooks/use-requirements.ts
"use client";

import { useCallback, useState } from "react";
import type {
  Requirement,
  RequirementListResponse,
} from "@/types/requirements";

type FetchParams = {
  page?: number;
  pageSize?: number;
  projectId?: string;
  q?: string;
  status?: string;
  priority?: string;
};

export function useRequirements() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRequirements = useCallback(
    async (params: FetchParams = {}) => {
      setLoading(true);
      try {
        const nextPage = params.page ?? page;
        const nextPageSize = params.pageSize ?? pageSize;

        const qs = new URLSearchParams();
        qs.set("page", String(nextPage));
        qs.set("pageSize", String(nextPageSize));

        // Match the param names expected by /api/requirements/list
        if (params.projectId) qs.set("projectId", params.projectId);
        if (params.q) qs.set("q", params.q);
        if (params.status && params.status !== "all")
          qs.set("status", params.status);
        if (params.priority && params.priority !== "all")
          qs.set("priority", params.priority);

        const res = await fetch(`/api/requirements/list?${qs.toString()}`, {
          cache: "no-store",
        });

        const text = await res.text().catch(() => "");
        const payload: RequirementListResponse | null = text
          ? JSON.parse(text)
          : null;

        if (!res.ok) {
          throw new Error((payload as any)?.error ?? `Failed (${res.status})`);
        }

        setRequirements(payload?.requirements ?? []);
        setPage(payload?.page ?? nextPage);
        setPageSize(payload?.pageSize ?? nextPageSize);
        setTotalCount(payload?.totalCount ?? 0);
        setTotalPages(payload?.totalPages ?? 1);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize],
  );

  const deleteRequirement = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await fetch(`/api/requirements/${id}/delete`, {
        method: "DELETE",
      });
      return res.ok;
    },
    [],
  );

  return {
    requirements,
    loading,
    page,
    pageSize,
    totalCount,
    totalPages,
    setPage,
    setPageSize,
    fetchRequirements,
    deleteRequirement,
  };
}
