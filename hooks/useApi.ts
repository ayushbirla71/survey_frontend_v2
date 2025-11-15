"use client";

// Custom React hooks for API calls
import { useState, useEffect } from "react";
import { authApi, type ApiResponse, type PaginatedResponse } from "@/lib/api";
import { useRouter } from "next/navigation";

// Generic hook for API calls - Updated for new API structure
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiCall();

      if (response.data !== undefined) {
        setData(response.data);
      } else {
        setError(response.error || "Failed to fetch data");
      }
    } catch (err: any) {
      console.log(">>>> the error in the USE API is : ", err.message);
      if (err.message.includes("401")) {
        authApi.removeAuthToken();
        router.refresh();
      }
      setError(err instanceof Error ? err.message : "Unknown error");
      return;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
}

// Hook for paginated API calls - Updated for new API structure
export function usePaginatedApi<T>(
  apiCall: (params: any) => Promise<PaginatedResponse<T>>,
  initialParams: any = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState(initialParams);

  const fetchData = async (newParams = params) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiCall(newParams);

      if (response.data !== undefined && response.pagination) {
        setData(response.data);
        setPagination(response.pagination);
      } else {
        setError("Failed to fetch data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateParams = (newParams: any) => {
    const updatedParams = { ...params, ...newParams };
    setParams(updatedParams);
    fetchData(updatedParams);
  };

  return {
    data,
    pagination,
    loading,
    error,
    updateParams,
    refetch: () => fetchData(),
  };
}

// Hook for mutations (POST, PUT, DELETE) - Updated for new API structure
export function useMutation<T, P = any>(
  mutationFn: (params: P) => Promise<ApiResponse<T>>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (params: P): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await mutationFn(params);
      console.log("response USE API MUTATE is", response);

      if (response.data !== undefined) {
        console.log("response.data USE API MUTATE is", response.data);
        return response.data;
      } else {
        console.log("response.error USE API MUTATE is", response.error);
        setError(response.error || "Mutation failed");
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
