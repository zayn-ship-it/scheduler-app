/**
 * ProjectListPage.tsx
 * ---------------------------------------------------------------------------
 * Landing page of the back office: lists every stored project, links to
 * create a new one, and links to edit/view an existing one's schedule.
 * Also surfaces each project's public "live view" link for copying.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getProjects, deleteProject } from "@/lib/storage/projectRepository";
import type { Project } from "@/lib/storage/types";
import { formatDisplayDate } from "@/lib/dateUtils";
import { toast } from "sonner";

export function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Re-read from storage on mount (and whenever we come back to this page via navigation).
  useEffect(() => {
    getProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(project: Project) {
    const confirmed = window.confirm(
      `Delete "${project.projectName || project.projectCode}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await deleteProject(project.id);
      const updated = await getProjects();
      setProjects(updated);
      toast.success("Project deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete project");
    }
  }

  function copyPublicLink(projectId: string) {
    const url = `${window.location.origin}/schedule/${projectId}`;
    navigator.clipboard.writeText(url);
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Public schedule link copied to clipboard and opened in a new tab");
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
            <Icon name="add" size={16} />
            New Project
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-4 w-1/3" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
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
                    <Icon name="link_2" size={16} />
                    Copy Client Link
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(project)}
                  >
                    <Icon name="delete" size={16} />
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
