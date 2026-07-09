/**
 * DashboardDrawer.tsx
 * ---------------------------------------------------------------------------
 * The near-fullscreen Drawer opened from the "Dashboard" button on the
 * Projects list page. Two tabs planned - only "Workload" is built for now,
 * the second is a placeholder for later.
 *
 * Fetches its own data (every project + every person) only while open, so
 * the Projects page itself doesn't pay for this on every load.
 */
import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProjects } from "@/lib/storage/projectRepository";
import { getPeople } from "@/lib/storage/peopleRepository";
import type { Person, Project } from "@/lib/storage/types";
import { PeopleWorkloadView } from "@/features/schedule/PeopleWorkloadView";

export function DashboardDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([getProjects(), getPeople()])
      .then(([projectsResult, peopleResult]) => {
        setProjects(projectsResult);
        setPeople(peopleResult);
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
              <TabsTrigger value="coming-soon">Coming soon</TabsTrigger>
            </TabsList>
          </DrawerHeader>
          <TabsContent value="workload" className="min-h-0 flex-1 overflow-hidden px-4 pb-4">
            {!loading && (
              <PeopleWorkloadView projects={projects} people={people} onPersonColorChanged={refreshPeople} />
            )}
          </TabsContent>
          <TabsContent value="coming-soon" className="min-h-0 flex-1">
            <p className="p-6 text-center text-sm text-muted-foreground">More views coming soon.</p>
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}
