import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface NavSection {
  label: string;
  icon: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "General",
    icon: "🏠",
    items: [{ path: "/", label: "Dashboard", icon: "📊" }],
  },
  {
    label: "GitLab",
    icon: "🦊",
    items: [
      { path: "/commits", label: "Commit Scraper", icon: "🔍" },
      { path: "/commits/results", label: "Scrape Results", icon: "📋" },
      { path: "/commits/summary", label: "AI Summary", icon: "🤖" },
      { path: "/gitlab-settings", label: "GitLab Settings", icon: "🔗" },
    ],
  },
  {
    label: "AI / LLM",
    icon: "🧠",
    items: [
      { path: "/llm-settings", label: "LLM Settings", icon: "🔑" },
    ],
  },
];

const standaloneItems: NavItem[] = [
  { path: "/settings", label: "Settings", icon: "⚙️" },
];

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/commits": "Commit Scraper",
  "/commits/results": "Scrape Results",
  "/commits/summary": "AI Summary",
  "/gitlab-settings": "GitLab Settings",
  "/llm-settings": "LLM Settings",
  "/settings": "Settings",
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["GitLab", "AI / LLM"])
  );

  const toggleSection = (sectionLabel: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionLabel)) {
        newSet.delete(sectionLabel);
      } else {
        newSet.add(sectionLabel);
      }
      return newSet;
    });
  };

  const isSectionActive = (section: NavSection) =>
    section.items.some((item) => item.path === location.pathname);

  const getCurrentPageTitle = () => {
    return pageTitles[location.pathname] || "Dashboard";
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold">GitLab Scraper</h1>
        </div>
        <nav className="flex-1 p-4">
          {/* Sections with expandable sub-items */}
          {navSections.map((section) => (
            <div key={section.label} className="mb-2">
              <button
                onClick={() => toggleSection(section.label)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors w-full ${
                  isSectionActive(section)
                    ? "bg-slate-700"
                    : "hover:bg-slate-700"
                }`}
              >
                <span>{section.icon}</span>
                <span className="flex-1 text-left">{section.label}</span>
                <span
                  className={`transition-transform ${
                    expandedSections.has(section.label) ? "rotate-90" : ""
                  }`}
                >
                  ▶
                </span>
              </button>
              {expandedSections.has(section.label) && (
                <ul className="mt-1 ml-4 space-y-1">
                  {section.items.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                          location.pathname === item.path
                            ? "bg-blue-600 text-white"
                            : "hover:bg-slate-700"
                        }`}
                      >
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Standalone items */}
          <ul className="space-y-2 mt-4">
            {standaloneItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? "bg-blue-600 text-white"
                      : "hover:bg-slate-700"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-700 text-sm text-slate-400">
          v1.0.0
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {getCurrentPageTitle()}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Welcome, User</span>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
              U
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}