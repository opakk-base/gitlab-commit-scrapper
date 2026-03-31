import { MemoryRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import GitLabSettings from "./pages/GitLabSettings";
import CommitScraper from "./pages/CommitScraper";
import ScrapeResults from "./pages/ScrapeResults";
import LLMSettings from "./pages/LLMSettings";
import CommitSummary from "./pages/CommitSummary";

export default function App() {
  return (
    <Router>
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
              <CommitScraper />
            </Layout>
          }
        />
        <Route
          path="/commits/results"
          element={
            <Layout>
              <ScrapeResults />
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
    </Router>
  );
}