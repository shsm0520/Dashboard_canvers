import { useQuery } from '@tanstack/react-query'

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('dashboard_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

// API base URL
const API_BASE = 'http://localhost:5000/api'

// Health status query
export const useHealthStatus = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE}/health`)
        if (!response.ok) {
          return {
            status: 'offline',
            message: 'Backend server is offline',
            timestamp: new Date().toISOString(),
            authenticated: false,
            healthLevel: 'red'
          }
        }
        const data = await response.json()

        // Add authentication status and health level
        const token = localStorage.getItem('dashboard_token')
        return {
          ...data,
          authenticated: !!token,
          healthLevel: data.status === 'healthy' ? 'green' : 'yellow'
        }
      } catch (error) {
        return {
          status: 'offline',
          message: 'Network error - Cannot reach server',
          timestamp: new Date().toISOString(),
          authenticated: false,
          healthLevel: 'red'
        }
      }
    },
    refetchInterval: 60000, // Refetch every 1 minute
    staleTime: 50000, // Consider data stale after 50 seconds
    retry: 1, // Only retry once for health checks
  })
}

// User info query
export const useUserInfo = () => {
  const token = localStorage.getItem('dashboard_token')

  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/me`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error('Failed to fetch user info')
      }
      return response.json()
    },
    enabled: !!token, // Only run if token exists
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Courses query
export const useCourses = () => {
  const token = localStorage.getItem('dashboard_token')

  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/courses`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error('Failed to fetch courses')
      }
      return response.json()
    },
    enabled: !!token, // Only run if token exists
    staleTime: 10 * 60 * 1000, // 10 minutes - courses don't change often
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 60 * 60 * 1000, // Auto-refetch every 1 hour
    refetchIntervalInBackground: false, // Don't refetch when tab is not visible
  })
}

// Profile query
export const useProfile = () => {
  const token = localStorage.getItem('dashboard_token')

  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/profile`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      return response.json()
    },
    enabled: !!token, // Only run if token exists
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Analytics query
export const useAnalytics = () => {
  const token = localStorage.getItem('dashboard_token')

  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      return response.json()
    },
    enabled: !!token, // Only run if token exists
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// Tasks query
export const useTasks = (startDate?: string, endDate?: string) => {
  const token = localStorage.getItem('dashboard_token')

  return useQuery({
    queryKey: ['tasks', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const url = `${API_BASE}/tasks${params.toString() ? `?${params.toString()}` : ''}`

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      return response.json()
    },
    enabled: !!token, // Only run if token exists
    staleTime: 5 * 60 * 1000, // 5 minutes - data becomes stale after 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 60 * 60 * 1000, // Auto-refetch every 1 hour
    refetchIntervalInBackground: false, // Don't refetch when tab is not visible
  })
}

// Task mutations
export const createTaskAPI = async (taskData: {
  title: string
  description?: string
  type: string
  course?: string
  due_date: string
  due_time?: string
  priority: string
}) => {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(taskData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create task')
  }

  return response.json()
}

export const updateTaskAPI = async (taskId: number, updates: any) => {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to update task')
  }

  return response.json()
}

export const deleteTaskAPI = async (taskId: number) => {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to delete task')
  }

  return response.json()
}

// Canvas integration
export const syncCanvasCoursesAPI = async () => {
  const response = await fetch(`${API_BASE}/sync-canvas-courses`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to sync Canvas courses')
  }

  return response.json()
}