"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Eye, Loader2, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getAvatarColor } from "@/lib/user-constants";
import { getUserInitials, resolveAvatarUrl } from "@/lib/avatar";
import { removeUserAvatar, uploadUserAvatar } from "@/services/users";
import type { ManagedUser } from "@/lib/types";

interface ProfileAvatarEditorProps {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  onAvatarChange: (avatarUrl?: string) => void;
  disabled?: boolean;
  size?: "md" | "lg";
}

export function ProfileAvatarEditor({
  userId,
  name,
  avatarUrl,
  onAvatarChange,
  disabled = false,
  size = "lg",
}: ProfileAvatarEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  const showImage = Boolean(resolvedUrl) && !imageError;
  const initials = getUserInitials(name);
  const dimension = size === "lg" ? "h-28 w-28 text-2xl" : "h-20 w-20 text-xl";

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }

    setUploading(true);
    try {
      const { user } = await uploadUserAvatar(userId, file);
      onAvatarChange((user as ManagedUser).avatarUrl);
      setImageError(false);
      toast.success("Profile picture updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeUserAvatar(userId);
      onAvatarChange(undefined);
      setPreviewOpen(false);
      toast.success("Profile picture removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove profile picture");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <button
        type="button"
        disabled={disabled || !showImage}
        onClick={() => showImage && setPreviewOpen(true)}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5",
          dimension,
          showImage ? "cursor-zoom-in" : "cursor-default"
        )}
        aria-label={showImage ? "View profile picture" : "Profile picture placeholder"}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedUrl!}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span
            className={cn(
              "flex h-full w-full items-center justify-center font-semibold",
              getAvatarColor(name)
            )}
          >
            {initials}
          </span>
        )}
      </button>

      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Profile Picture</p>
        <p className="text-xs text-slate-400">Upload JPEG, PNG, WebP, or GIF up to 5 MB.</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="gap-1.5 rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB]"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {resolvedUrl ? "Change Photo" : "Add Photo"}
          </Button>

          {showImage && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => setPreviewOpen(true)}
                className="gap-1.5 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <Eye className="h-4 w-4" />
                View Photo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || removing}
                onClick={() => void handleRemove()}
                className="gap-1.5 rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
              >
                {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove Photo
              </Button>
            </>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md border-white/10 bg-app text-white">
          <DialogHeader>
            <DialogTitle>{name}&apos;s Profile Picture</DialogTitle>
          </DialogHeader>
          {resolvedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolvedUrl} alt={name} className="max-h-[420px] w-full rounded-xl object-contain" />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl bg-white/5">
              <UserRound className="h-10 w-10 text-slate-500" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
