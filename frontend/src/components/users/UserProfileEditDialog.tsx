"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { glassCardClass } from "@/lib/user-constants";
import { fetchUserById } from "@/services/users";
import type { ManagedUser, UserRole } from "@/lib/types";

interface UserProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ManagedUser | null;
  actorRole?: UserRole;
  onSaved?: () => void;
}

export function UserProfileEditDialog({
  open,
  onOpenChange,
  user,
  actorRole,
  onSaved,
}: UserProfileEditDialogProps) {
  const [profileUser, setProfileUser] = useState<ManagedUser | null>(user);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user?._id) {
      setProfileUser(user);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchUserById(user._id)
      .then((freshUser) => {
        if (!cancelled) setProfileUser(freshUser);
      })
      .catch(() => {
        if (!cancelled) setProfileUser(user);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  if (!profileUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${glassCardClass} max-h-[92vh] overflow-y-auto text-white sm:max-w-3xl`}
      >
        <DialogHeader>
          <DialogTitle>Edit Profile — {profileUser.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading profile...
          </div>
        ) : (
          <ProfileEditor
            user={profileUser}
            mode="admin"
            actorRole={actorRole}
            onAvatarChange={(avatarUrl) =>
              setProfileUser((current) => (current ? { ...current, avatarUrl } : current))
            }
            onSaved={(updatedUser) => {
              setProfileUser(updatedUser);
              onSaved?.();
            }}
          />
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="border-white/10 bg-transparent text-white hover:bg-white/5"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
