"use client";

import { useCallback, useRef, useState } from "react";

type AnyAsyncFn<TArgs extends any[], TResult> = (
  ...args: TArgs
) => Promise<TResult>;

export function useSingleFlight<TArgs extends any[], TResult>(
  fn: AnyAsyncFn<TArgs, TResult>
) {
  const inFlightRef = useRef(false);
  const [loading, setLoading] = useState(false);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (inFlightRef.current) return undefined; // ignore duplicates
      inFlightRef.current = true;
      setLoading(true);

      try {
        return await fn(...args);
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    },
    [fn]
  );

  return { run, loading };
}
