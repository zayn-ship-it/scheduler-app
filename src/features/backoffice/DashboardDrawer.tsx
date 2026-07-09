/**
 * DashboardDrawer.tsx
 * ---------------------------------------------------------------------------
 * The near-fullscreen Drawer opened from the "Dashboard" button on the
 * Projects list page. Two tabs: "Workload" (who's working on what, across
 * every project) and "Phases" (where every project sits in its own phase
 * timeline).
 *
 * Fetches its own data (every project + every person + every phase title)
 * only while open, so the Projects page itself doesn't pay for this on
 * every load.
 */
import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProjects } from "@/lib/storage/projectRepository";
import { getPeople } from "@/lib/storage/peopleRepository";
import { getPhaseTitles } from "@/lib/storage/phaseTitleRepository";
import type { PhaseTitle, Person, Project } from "@/lib/storage/types";
import { PeopleWorkloadView } from "@/features/schedule/PeopleWorkloadView";
import { ProjectPhasesView } from "@/features/schedule/ProjectPhasesView";

export function DashboardDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [phaseTitles, setPhaseTitles] = useState<PhaseTitle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([getProjects(), getPeople(), getPhaseTitles()])
      .then(([projectsResult, peopleResult, phaseTitlesResult]) => {
        setProjects(projectsResult);
        setPeople(peopleResult);
        setPhaseTitles(phaseTitlesResult);
      })
      .finally(() => setLoading(false));
  }, [open]);

  async function refreshPeople() {
    setPeople(await getPeople());
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[calc(100svh-64px)]">
        <Tabs defaultValue="workload" className="h-full min-h-0">
          <DrawerHeader className="items-center pb-2">
            <DrawerTitle className="sr-only">Dashboard</DrawerTitle>
            <TabsList>
              <TabsTrigger value="workload">Workload</TabsTrigger>
              <TabsTrigger value="phases">Phases</TabsTrigger>
            </TabsList>
          </DrawerHeader>
          <TabsContent value="workload" className="min-h-0 flex-1 overflow-hidden px-4 pb-4">
            {!loading && (
              <PeopleWorkloadView projects={projects} people={people} onPersonColorChanged={refreshPeople} />
            )}
          </TabsContent>
          <TabsContent value="phases" className="min-h-0 flex-1 overflow-hidden px-4 pb-4">
            {!loading && <ProjectPhasesView projects={projects} phaseTitles={phaseTitles} />}
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}
