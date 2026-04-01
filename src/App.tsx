import { MemoryRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { ThemeProvider } from "./components/ThemeProvider";
import { BackgroundTaskProvider } from "@/contexts/BackgroundTaskContext";
import { Toaster } from "@/components/ui/sonner";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import GitLabSettings from "./pages/GitLabSettings";
import Commits from "./pages/Commits";
import LLMSettings from "./pages/LLMSettings";
import CommitSummary from "./pages/CommitSummary";

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <BackgroundTaskProvider>
          <Routes>
            <Route
              path="/"
              element={
                <Layout>
                  <Dashboard />
                </Layout>
              }
            />
            <Route
              path="/commits"
              element={
                <Layout>
                  <Commits />
                </Layout>
              }
            />
            <Route
              path="/commits/summary"
              element={
                <Layout>
                  <CommitSummary />
                </Layout>
              }
            />
            <Route
              path="/gitlab-settings"
              element={
                <Layout>
                  <GitLabSettings />
                </Layout>
              }
            />
            <Route
              path="/llm-settings"
              element={
                <Layout>
                  <LLMSettings />
                </Layout>
              }
            />
            <Route
              path="/settings"
              element={
                <Layout>
                  <Settings />
                </Layout>
              }
            />
          </Routes>
        </BackgroundTaskProvider>
      </Router>
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}