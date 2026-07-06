/**
 * ProjectListPage.tsx
 * ---------------------------------------------------------------------------
 * Landing page of the back office: lists every stored project, links to
 * create a new one, and links to edit/view an existing one's schedule.
 * Also surfaces each project's public "live view" link for copying.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProjects, deleteProject } from "@/lib/storage/projectRepository";
import type { Project } from "@/lib/storage/types";
import { formatDisplayDate } from "@/lib/dateUtils";
import { toast } from "sonner";

export function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  // Re-read from storage on mount (and whenever we come back to this page via navigation).
  useEffect(() => {
    setProjects(getProjects());
  }, []);

  function handleDelete(project: Project) {
    const confirmed = window.confirm(
      `Delete "${project.projectName || project.projectCode}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    deleteProject(project.id);
    setProjects(getProjects());
    toast.success("Project deleted");
  }

  function copyPublicLink(projectId: string) {
    const url = `${window.location.origin}/schedule/${projectId}`;
    navigator.clipboard.writeText(url);
    toast.success("Public schedule link copied to clipboard");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Create and manage client project schedules.</p>
        </div>
        <Button asChild>
          <Link to="/backoffice/projects/new">
            <Plus className="size-4" />
            New Project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No projects yet. Click "New Project" to set up your first schedule.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{project.projectName || "Untitled Project"}</CardTitle>
                  {project.projectCode && <Badge variant="secondary">{project.projectCode}</Badge>}
                </div>
                <CardDescription>{project.client || "No client set"}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {formatDisplayDate(project.startDate)} – {formatDisplayDate(project.endDate)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link to={`/backoffice/projects/${project.id}/edit`}>Open Schedule</Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyPublicLink(project.id)}>
                    <ExternalLink className="size-4" />
                    Copy Client Link
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(project)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
