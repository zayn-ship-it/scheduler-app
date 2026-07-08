/**
 * ExportToSheetButton.tsx
 * ---------------------------------------------------------------------------
 * Phase 1 STUB. A real "Export to Google Sheet" feature needs Google API
 * authentication and a backend to talk to the Sheets API safely - neither
 * exists yet in this frontend-only phase. This button exists so the UI
 * matches the final design and the feature's presence isn't forgotten, but
 * clicking it just tells the user it's coming later.
 */
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ExportToSheetButton() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast("Export to Google Sheet — coming soon", {
          description: "This will be available once Google integration is added in a later phase.",
        })
      }
    >
      <Icon name="table_chart" size={16} />
      Export to Google Sheet
    </Button>
  );
}
