import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useState, createContext, useContext, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBar } from "@/components/StatusBar";
import { cn } from "@/lib/utils";
import {
  Home,
  ClipboardList,
  Bot,
  Link2,
  Key,
  Settings,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
}

interface NavSection {
  label: string;
  icon: ReactNode;
  items: NavItem[];
}

// Sidebar context for state management
type SidebarContextType = {
  isOpen: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextType>({
  isOpen: true,
  toggle: () => {},
});

export const useSidebarState = () => useContext(SidebarContext);

const navSections: NavSection[] = [
  {
    label: "General",
    icon: <Home className="h-4 w-4" />,
    items: [
      { path: "/", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
    ],
  },
  {
    label: "GitLab",
    icon: <Link2 className="h-4 w-4" />,
    items: [
      { path: "/commits", label: "Commits", icon: <ClipboardList className="h-4 w-4" /> },
      { path: "/commits/summary", label: "AI Summary", icon: <Bot className="h-4 w-4" /> },
      { path: "/gitlab-settings", label: "GitLab Settings", icon: <Link2 className="h-4 w-4" /> },
    ],
  },
  {
    label: "AI / LLM",
    icon: <Bot className="h-4 w-4" />,
    items: [
      { path: "/llm-settings", label: "LLM Settings", icon: <Key className="h-4 w-4" /> },
    ],
  },
];

const standaloneItems: NavItem[] = [
  { path: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/commits": "Commits",
  "/commits/summary": "AI Summary",
  "/gitlab-settings": "GitLab Settings",
  "/llm-settings": "LLM Settings",
  "/settings": "Settings",
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const getCurrentPageTitle = () => {
    return pageTitles[location.pathname] || "Dashboard";
  };

  return (
    <SidebarContext.Provider value={{ isOpen: sidebarOpen, toggle: toggleSidebar }}>
      <div className="flex h-screen bg-background">
        {/* Sidebar - uses flex, not fixed */}
        <aside
          className={cn(
            "flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out border-r border-sidebar-border",
            sidebarOpen ? "w-64" : "w-16"
          )}
        >
          {/* Header */}
          <div className="p-2 border-b border-sidebar-border">
            <Link
              to="/"
              className={cn(
                "flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors",
                sidebarOpen ? "px-3" : "justify-center"
              )}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Link2 className="h-4 w-4" />
              </div>
              {sidebarOpen && (
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">GitLab Scraper</span>
                  <span className="text-xs text-sidebar-foreground/70">v1.0.0</span>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2">
            {navSections.map((section) => (
              <div key={section.label} className="mb-2">
                {sidebarOpen && (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-sidebar-foreground/70">
                    {section.icon}
                    {section.label}
                  </div>
                )}
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={cn(
                          "flex items-center gap-3 rounded-lg p-2 transition-colors",
                          location.pathname === item.path
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "hover:bg-sidebar-accent/50",
                          sidebarOpen ? "px-3" : "justify-center"
                        )}
                        title={!sidebarOpen ? item.label : undefined}
                      >
                        {item.icon}
                        {sidebarOpen && <span className="text-sm">{item.label}</span>}
                        {sidebarOpen && location.pathname === item.path && (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <Separator className="my-3 bg-sidebar-border" />

            {/* Standalone items */}
            <ul className="space-y-1">
              {standaloneItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg p-2 transition-colors",
                      location.pathname === item.path
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "hover:bg-sidebar-accent/50",
                      sidebarOpen ? "px-3" : "justify-center"
                    )}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    {item.icon}
                    {sidebarOpen && <span className="text-sm">{item.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-2 border-t border-sidebar-border">
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg p-2 bg-sidebar-accent/50",
                sidebarOpen ? "px-3" : "justify-center"
              )}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                <Settings className="h-4 w-4" />
              </div>
              {sidebarOpen && (
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium text-sm">User</span>
                  <span className="text-xs text-sidebar-foreground/70">Active</span>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Navbar */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-accent hover:text-accent-foreground"
              onClick={toggleSidebar}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
              ) : (
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="sr-only">Toggle Sidebar</span>
            </Button>

            <Separator orientation="vertical" className="h-6 bg-border" />

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 flex-1">
              <Link
                to="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Home
              </Link>
              {location.pathname !== "/" && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {getCurrentPageTitle()}
                  </span>
                </>
              )}
            </nav>

            {/* User info */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                Welcome, User
              </span>
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <span className="text-xs font-medium">U</span>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto p-6 bg-background">{children}</main>
        </div>

        {/* Status Bar */}
        <StatusBar />
      </div>
    </SidebarContext.Provider>
  );
}