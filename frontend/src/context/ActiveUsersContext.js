import { createContext, useContext, useState } from "react";

const ActiveUsersContext = createContext([]);

export function ActiveUsersProvider({ children }) {
  const [activeUsers, setActiveUsers] = useState([]);
  return (
    <ActiveUsersContext.Provider value={{ activeUsers, setActiveUsers }}>
      {children}
    </ActiveUsersContext.Provider>
  );
}

export function useActiveUsers() {
  return useContext(ActiveUsersContext);
}