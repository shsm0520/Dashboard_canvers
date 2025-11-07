import { useState, useEffect } from "react";
import { getToken, setToken, removeToken } from "./utils/authUtils";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Assignments from "./components/Assignments";
import AccountManagement from "./components/AccountManagement";
import LoadingScreen from "./components/LoadingScreen";
import "./App.css";

interface User {
  username: string;
}

type CurrentTab = "dashboard" | "assignments" | "account";
type LoadingStage = "initial" | "authenticating" | "loading-data" | "complete";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("initial");
  const [currentTab, setCurrentTab] = useState<CurrentTab>("dashboard");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Stage 1: Initial setup
        setLoadingStage("initial");
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate initial setup

        // Stage 2: Check authentication
        setLoadingStage("authenticating");
        const token = getToken();
        const savedUser = localStorage.getItem("dashboard_user");

        if (token && savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);

          // Stage 3: Verify token with backend
          try {
            const response = await fetch("http://localhost:5000/api/me", {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "X-Client-Timezone":
                  Intl.DateTimeFormat().resolvedOptions().timeZone,
                "X-Client-Timezone-Offset": new Date()
                  .getTimezoneOffset()
                  .toString(),
              },
            });

            if (!response.ok) {
              // If token is invalid, clear storage
              removeToken();
              localStorage.removeItem("dashboard_user");
              setUser(null);
              setLoadingStage("complete");
              setLoading(false);
              return;
            }

            // Stage 4: Loading initial data
            setLoadingStage("loading-data");

            // Ensure minimum loading time for smooth UX
            await new Promise((resolve) => setTimeout(resolve, 800));

            setLoadingStage("complete");
            await new Promise((resolve) => setTimeout(resolve, 200)); // Brief completion stage
          } catch (error) {
            // If backend is down, keep the local user info but skip data loading
            console.log("Backend verification failed, keeping local session");
            setLoadingStage("complete");
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        } else {
          // No token or user data, user needs to login
          setUser(null);
          setLoadingStage("complete");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
        setLoadingStage("complete");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem("dashboard_user", JSON.stringify(userData));
    setToken(token);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentTab("dashboard");
    localStorage.removeItem("dashboard_user");
    removeToken();
  };

  if (loading) {
    return <LoadingScreen stage={loadingStage} />;
  }

  const renderCurrentTab = () => {
    switch (currentTab) {
      case "dashboard":
        return (
          <Dashboard
            user={user!}
            onLogout={handleLogout}
            currentTab={currentTab}
            onTabChange={setCurrentTab}
          />
        );
      case "assignments":
        return (
          <Assignments
            user={user!}
            onLogout={handleLogout}
            currentTab={currentTab}
            onTabChange={setCurrentTab}
          />
        );
      case "account":
        return (
          <AccountManagement
            user={user!}
            onLogout={handleLogout}
            currentTab={currentTab}
            onTabChange={setCurrentTab}
          />
        );
      default:
        return null;
    }
  };

  return <>{user ? renderCurrentTab() : <Login onLogin={handleLogin} />}</>;
}

export default App;
