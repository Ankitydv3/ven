"use client";

import { useParams } from "next/navigation";
import { LazyComplaintDetailsPage } from "@/lib/lazy-pages";

export default function TeamComplaintDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  return <LazyComplaintDetailsPage id={id} role="team" />;
}
