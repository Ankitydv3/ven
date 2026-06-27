"use client";

import { Suspense } from "react";
import { ComplaintDetailsPage } from "@/components/complaints/ComplaintDetailsPage";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function TeamComplaintDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-app"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>}>
      <ComplaintDetailsPage id={id} role="team" />
    </Suspense>
  );
}
