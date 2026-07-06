/**
 * PasswordGate.tsx
 * ---------------------------------------------------------------------------
 * Wraps the back office routes and shows a simple password prompt until the
 * correct password is entered.
 *
 * *** TEMPORARY / INSECURE - PHASE 1 ONLY ***
 * The password is a single hardcoded string ("1234") compared in the
 * browser. Anyone who reads the app's source code can see it and bypass
 * this instantly - it provides zero real security. It exists only so the
 * back office isn't wide open by accident while testing locally. Phase 2
 * replaces this entirely with real Google OAuth login.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isBackOfficeUnlocked, unlockBackOffice } from "./authSession";

/** Hardcoded placeholder password - see file header comment for why this is temporary. */
const BACKOFFICE_PASSWORD = "1234";

export function PasswordGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(isBackOfficeUnlocked());
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (passwordInput === BACKOFFICE_PASSWORD) {
      unlockBackOffice();
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Back Office Access</CardTitle>
          <CardDescription>
            Enter the back office password to continue. (Phase 1 testing password: temporary, not real security.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="backoffice-password">Password</Label>
              <Input
                id="backoffice-password"
                type="password"
                autoFocus
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setError(false);
                }}
              />
              {error && <p className="text-sm text-destructive">Incorrect password. Try again.</p>}
            </div>
            <Button type="submit" className="w-full">
              Unlock
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
