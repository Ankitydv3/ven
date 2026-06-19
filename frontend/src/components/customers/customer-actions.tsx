"use client";

import { PencilLine, Trash2, MoreHorizontal } from "lucide-react";
import type { Customer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CustomerActionsProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  deleting?: boolean;
}

export function CustomerActions({
  customer,
  onEdit,
  onDelete,
  deleting = false,
}: CustomerActionsProps) {
  return (
    <>
      {/* Desktop Actions */}
      <div className="hidden sm:flex items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-xs font-medium text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all duration-200 group"
          onClick={() => onEdit(customer)}
        >
          <PencilLine className="h-3.5 w-3.5 mr-1.5 group-hover:scale-110 transition-transform" />
          Edit
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200 group"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5 group-hover:scale-110 transition-transform" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 text-white backdrop-blur-2xl shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-semibold text-white">
                Delete Customer
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                Are you sure you want to delete <span className="text-white font-medium">{customer.fullName}</span>?
                This action cannot be undone and will remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-all">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={() => onDelete(customer)}
                className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all duration-200 disabled:opacity-50"
              >
                {deleting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Deleting...
                  </span>
                ) : (
                  "Delete Customer"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Mobile Actions */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-[160px] border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 text-white backdrop-blur-2xl shadow-2xl"
          >
            <DropdownMenuItem
              onClick={() => onEdit(customer)}
              className="flex items-center gap-2.5 text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 cursor-pointer rounded-lg"
            >
              <PencilLine className="h-4 w-4" />
              Edit Customer
            </DropdownMenuItem>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="flex items-center gap-2.5 text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer rounded-lg"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Customer
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 text-white backdrop-blur-2xl shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-semibold text-white">
                    Delete Customer
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-300">
                    Are you sure you want to delete <span className="text-white font-medium">{customer.fullName}</span>?
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                  <AlertDialogCancel className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-all">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleting}
                    onClick={() => onDelete(customer)}
                    className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all duration-200"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}