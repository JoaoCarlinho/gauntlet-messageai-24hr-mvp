"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Navigation/Sidebar";
import { Header } from "@/components/Navigation/Header";
import { cn } from "@/lib/utils";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Load collapse state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("sidebarCollapsed");
    if (stored !== null) {
      setIsSidebarCollapsed(JSON.parse(stored));
    }
  }, []);

  // Persist collapse state to localStorage
  const handleToggleCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onClose={() => setIsSidebarOpen(false)}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Layout */}
      <div
        className={cn(
          "transition-all duration-300",
          // Desktop margin based on sidebar state
          "lg:ml-64",
          isSidebarCollapsed && "lg:ml-20"
        )}
      >
        {/* Header */}
        <Header onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Main Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
