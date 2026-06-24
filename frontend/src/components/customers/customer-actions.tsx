"use client";

import { Eye, MoreHorizontal, PencilLine, Trash2 } from "lucide-react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CustomerActionsProps {
  customer: Customer;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  deleting?: boolean;
}

export function CustomerActions({
  customer,
  onView,
  onEdit,
  onDelete,
  deleting = false,
}: CustomerActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Actions for ${customer.fullName}`}
          className="h-8 w-8 rounded-lg p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[160px] rounded-xl border-slate-200 dark:border-white/[0.08] dark:bg-app"
      >
        <DropdownMenuItem
          onClick={() => onView(customer)}
          className="cursor-pointer gap-2 rounded-lg"
        >
          <Eye className="h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onEdit(customer)}
          className="cursor-pointer gap-2 rounded-lg"
        >
          <PencilLine className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/[0.08]" />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-lg text-rose-600 focus:text-rose-600 dark:text-rose-400"
              onSelect={(event) => event.preventDefault()}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl border-slate-200 dark:border-white/[0.08] dark:bg-app">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900 dark:text-white">
                Delete Customer
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 dark:text-white/50">
                Are you sure you want to delete{" "}
                <span className="font-medium text-slate-900 dark:text-white">
                  {customer.fullName}
                </span>
                ? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={() => onDelete(customer)}
                className="rounded-xl bg-rose-600 text-white hover:bg-rose-500"
              >
                {deleting ? "Deleting..." : "Delete Customer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
