/**
 * App.tsx
 * ---------------------------------------------------------------------------
 * Top-level route table for the whole app.
 *
 *   /                                  -> redirects to /backoffice/projects
 *   /backoffice/*                      -> magic-link-gated admin area (BackOfficeLayout + nested routes)
 *   /schedule/:projectId               -> public, read-only client-facing schedule view (no auth)
 */
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthGate } from "@/auth/AuthGate";
import { BackOfficeLayout } from "@/features/backoffice/BackOfficeLayout";
import { ProjectListPage } from "@/features/backoffice/ProjectListPage";
import { ProjectFormPage } from "@/features/backoffice/ProjectFormPage";
import { SettingsPage } from "@/features/backoffice/SettingsPage";
import { PublicScheduleView } from "@/features/public/PublicScheduleView";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/backoffice/projects" replace />} />

      <Route
        path="/backoffice"
        element={
          <AuthGate>
            <BackOfficeLayout />
          </AuthGate>
        }
      >
        <Route index element={<Navigate to="projects" replace />} />
        <Route path="projects" element={<ProjectListPage />} />
        <Route path="projects/new" element={<ProjectFormPage mode="create" />} />
        <Route path="projects/:projectId/edit" element={<ProjectFormPage mode="edit" />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="/schedule/:projectId" element={<PublicScheduleView />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
