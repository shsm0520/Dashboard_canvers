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
    staleTime: 2 * 60 * 1000, // 2 minutes
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