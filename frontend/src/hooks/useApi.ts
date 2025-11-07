import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders, getToken } from "../utils/authUtils";

// API base URL
const API_BASE = "http://localhost:5000/api";

// Common query options
export const QUERY_DEFAULTS = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: true,
  retry: 1,
};

export const QUERY_LONG_CACHE = {
  staleTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: true,
  refetchInterval: 60 * 60 * 1000, // 1 hour
  refetchIntervalInBackground: false,
  retry: 1,
};

export const QUERY_SHORT_CACHE = {
  staleTime: 1 * 60 * 1000, // 1 minute
  refetchOnWindowFocus: true,
  retry: 1,
};

// Health status query
export const useHealthStatus = () => {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE}/health`);
        if (!response.ok) {
          return {
            status: "offline",
            message: "Backend server is offline",
            timestamp: new Date().toISOString(),
            authenticated: false,
            healthLevel: "red",
          };
        }
        const data = await response.json();

        // Add authentication status and health level
        return {
          ...data,
          authenticated: !!getToken(),
          healthLevel: data.status === "healthy" ? "green" : "yellow",
        };
      } catch (error) {
        return {
          status: "offline",
          message: "Network error - Cannot reach server",
          timestamp: new Date().toISOString(),
          authenticated: false,
          healthLevel: "red",
        };
      }
    },
    refetchInterval: 60000, // Refetch every 1 minute
    staleTime: 50000, // Consider data stale after 50 seconds
    retry: 1, // Only retry once for health checks
  });
};

// User info query
export const useUserInfo = () => {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/me`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch user info");
      }
      return response.json();
    },
    enabled: !!getToken(),
    ...QUERY_DEFAULTS,
  });
};

// Courses query
export const useCourses = () => {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/courses`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch courses");
      }
      return response.json();
    },
    enabled: !!getToken(),
    ...QUERY_LONG_CACHE,
  });
};

// Profile query
export const useProfile = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/profile`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      return response.json();
    },
    enabled: !!getToken(),
    ...QUERY_DEFAULTS,
  });
};

// Analytics query
export const useAnalytics = () => {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      return response.json();
    },
    enabled: !!getToken(),
    ...QUERY_SHORT_CACHE,
  });
};

// Tasks query
export const useTasks = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["tasks", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const url = `${API_BASE}/tasks${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }
      return response.json();
    },
    enabled: !!getToken(),
    ...QUERY_LONG_CACHE,
  });
};

// Task mutations
export const createTaskAPI = async (taskData: {
  title: string;
  description?: string;
  type: string;
  course?: string;
  due_date: string;
  due_time?: string;
  priority: string;
}) => {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(taskData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create task");
  }

  return response.json();
};

export const updateTaskAPI = async (taskId: number, updates: any) => {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update task");
  }

  return response.json();
};

export const deleteTaskAPI = async (taskId: number) => {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete task");
  }

  return response.json();
};

// Canvas integration
export const syncCanvasCoursesAPI = async () => {
  const response = await fetch(`${API_BASE}/sync-canvas-courses`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to sync Canvas courses");
  }
  return response.json();
};

// Get syllabus URL for a course by DB id
export const getCourseSyllabusUrl = async (courseId: number) => {
  const url = `${API_BASE}/courses/${courseId}/syllabus`;
  console.debug("getCourseSyllabusUrl fetching:", url);
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    console.warn("getCourseSyllabusUrl failed", response.status, bodyText);
    let parsed = undefined;
    try {
      parsed = JSON.parse(bodyText);
    } catch {}
    const msg =
      parsed?.message ||
      parsed?.error ||
      bodyText ||
      "Failed to get syllabus url";
    throw new Error(msg || `HTTP ${response.status}`);
  }

  return response.json();
};

// Resolve Canvas assignment URL for a task (backend will search by title/course)
export const getTaskCanvasUrl = async (taskId: number) => {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/canvas-url`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Failed to resolve Canvas URL");
  }

  return response.json();
};
