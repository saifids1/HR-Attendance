import { createContext, useEffect, useState } from "react";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

const AuthProvider = ({ children }) => {

  const [auth, setAuth] = useState({
    token: null,
    role: null,
    emp_id: null
  });

  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (token) {
      setAuth({
        token,
        role: user?.role?.toLowerCase() || null,
        emp_id: user?.emp_id || null
      });
    }

    setLoading(false);

  }, []);

  return (
    <AuthContext.Provider
      value={{
        auth,
        setAuth,
        loading,
        refreshTrigger,
        triggerRefresh
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;