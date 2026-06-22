"use client";

import { Copy, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { UserCredentials } from "@/lib/types";
import { buildCredentialsText, downloadBlob } from "@/lib/user-export";
import { downloadCredentialsPdf } from "@/services/users";
import { glassCardClass, primaryButtonClass } from "@/lib/user-constants";

interface UserCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  credentials: UserCredentials | null;
}

export function UserCredentialsDialog({
  open,
  onOpenChange,
  employeeName,
  credentials,
}: UserCredentialsDialogProps) {
  if (!credentials) return null;

  const text = buildCredentialsText(credentials);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Credentials copied to clipboard");
    } catch {
      toast.error("Failed to copy credentials");
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=640,height=480");
    if (!printWindow) {
      toast.error("Unable to open print window");
      return;
    }

    printWindow.document.write(`
      <html>
        <head><title>Employee Credentials</title></head>
        <body style="font-family: Arial, sans-serif; padding: 32px;">
          <h2>Employee Created Successfully</h2>
          <p><strong>Name:</strong> ${employeeName}</p>
          <p><strong>Employee ID:</strong> ${credentials.employeeId}</p>
          <p><strong>Username:</strong> ${credentials.username}</p>
          <p><strong>Temporary Password:</strong> ${credentials.temporaryPassword}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await downloadCredentialsPdf({
        name: employeeName,
        ...credentials,
      });
      downloadBlob(blob, `${credentials.employeeId}-credentials.pdf`);
      toast.success("Credentials PDF downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download PDF");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${glassCardClass} border-[rgba(59,130,246,0.2)] text-white sm:max-w-lg`}>
        <DialogHeader>
          <DialogTitle className="text-xl text-white">Employee Created Successfully</DialogTitle>
          <DialogDescription className="text-[#94A3B8]">
            Share these login credentials securely with {employeeName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-xl border border-white/10 bg-[#0B1120]/80 p-4 font-mono text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-[#64748B]">Employee ID</span>
            <span className="text-white">{credentials.employeeId}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#64748B]">Username</span>
            <span className="text-[#60A5FA]">{credentials.username}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#64748B]">Temporary Password</span>
            <span className="text-[#4ADE80]">{credentials.temporaryPassword}</span>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Credentials
          </Button>
          <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Credentials
          </Button>
          <Button type="button" className={primaryButtonClass} onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
