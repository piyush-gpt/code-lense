import { create } from 'zustand';

export interface User {
  account_login: string;
  installation_id: number;
  account_type: 'User' | 'Organization';
  account_id: number;
  permissions: any;
  repositories: string[];
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,

  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user,
    loading: false,
    error: null 
  }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error, loading: false }),

  logout: async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:4000'}/api/user/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    set({ 
      user: null, 
      isAuthenticated: false, 
      loading: false, 
      error: null 
    });
  },

  checkAuth: async () => {
    set({ loading: true, error: null });

    try {
      console.log('🔍 Checking auth...');
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:4000'}/api/user/me`;
      console.log('🌐 API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        credentials: 'include',
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        console.log('Response not ok');
        const errorData = await response.json();
        
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          console.log('User not authenticated, trying to refresh token...');
          
          // Try to refresh the token using installation ID
          try {
            const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:4000'}/api/user/refresh-token`, {
              method: 'POST',
              credentials: 'include',
            });
            
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              console.log('✅ Token refreshed successfully');
              set({ 
                user: refreshData.user, 
                isAuthenticated: true, 
                loading: false,
                error: null 
              });
              return;
            } else {
              console.log('❌ Token refresh failed');
            }
          } catch (refreshError) {
            console.log('❌ Token refresh error:', refreshError);
          }
          
          // If refresh failed, user is not authenticated
          set({ 
            user: null, 
            isAuthenticated: false, 
            loading: false,
            error: null 
          });
          return;
        }
        
        throw new Error('Failed to check authentication');
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('User authenticated');
        console.log(data.user);
        set({ 
          user: data.user, 
          isAuthenticated: true, 
          loading: false,
          error: null 
        });
      } else {
        console.log('User not authenticated');
        console.log(data.error);
        set({ 
          user: null, 
          isAuthenticated: false, 
          loading: false,
          error: data.error 
        });
      }
    } catch (error) {
      set({ 
        user: null, 
        isAuthenticated: false, 
        loading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      });
    }
  },
})); 