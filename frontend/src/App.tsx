import { useState, useEffect } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import AccountManagement from './components/AccountManagement'
import LoadingScreen from './components/LoadingScreen'
import './App.css'

interface User {
  username: string;
}

type CurrentView = 'dashboard' | 'account';
type LoadingStage = 'initial' | 'authenticating' | 'loading-data' | 'complete';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('initial');
  const [currentView, setCurrentView] = useState<CurrentView>('dashboard');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Stage 1: Initial setup
        setLoadingStage('initial');
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate initial setup

        // Stage 2: Check authentication
        setLoadingStage('authenticating');
        const token = localStorage.getItem('dashboard_token');
        const savedUser = localStorage.getItem('dashboard_user');

        if (token && savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);

          // Stage 3: Verify token with backend
          try {
            const response = await fetch('http://localhost:5000/api/me', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              // If token is invalid, clear storage
              localStorage.removeItem('dashboard_token');
              localStorage.removeItem('dashboard_user');
              setUser(null);
              setLoadingStage('complete');
              setLoading(false);
              return;
            }

            // Stage 4: Loading initial data
            setLoadingStage('loading-data');

            // Pre-load critical data with progressive loading
            const requests = [
              { name: 'health', promise: fetch('http://localhost:5000/api/health') },
              {
                name: 'courses',
                promise: fetch('http://localhost:5000/api/courses', {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                })
              },
              {
                name: 'profile',
                promise: fetch('http://localhost:5000/api/profile', {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                })
              }
            ];

            // Track loading progress
            let completedRequests = 0;
            const totalRequests = requests.length;

            const trackProgress = () => {
              completedRequests++;
              // Update progress within the loading-data stage (75-100%)
              const progress = (completedRequests / totalRequests) * 100;
              // Note: This would need to be passed to LoadingScreen via a state update
            };

            // Execute all requests and track completion
            const settledResults = await Promise.allSettled(
              requests.map(req => req.promise.then(res => {
                trackProgress();
                return res;
              }))
            );

            // Ensure minimum loading time for smooth UX
            await new Promise(resolve => setTimeout(resolve, 800));

            setLoadingStage('complete');
            await new Promise(resolve => setTimeout(resolve, 200)); // Brief completion stage

          } catch (error) {
            // If backend is down, keep the local user info but skip data loading
            console.log('Backend verification failed, keeping local session');
            setLoadingStage('complete');
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } else {
          // No token or user data, user needs to login
          setUser(null);
          setLoadingStage('complete');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
        setLoadingStage('complete');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('dashboard_user', JSON.stringify(userData));
    localStorage.setItem('dashboard_token', token);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('dashboard');
    localStorage.removeItem('dashboard_user');
    localStorage.removeItem('dashboard_token');
  };

  if (loading) {
    return <LoadingScreen stage={loadingStage} />;
  }

  return (
    <>
      {user ? (
        currentView === 'dashboard' ? (
          <Dashboard
            user={user}
            onLogout={handleLogout}
            onNavigateToAccount={() => setCurrentView('account')}
          />
        ) : (
          <AccountManagement
            user={user}
            onBack={() => setCurrentView('dashboard')}
            onLogout={handleLogout}
          />
        )
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  )
}

export default App
