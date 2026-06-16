"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Loader2, 
  ScanSearch, 
  Hash, 
  CheckCircle2, 
  Clock, 
  Circle, 
  AlertCircle,
  Sparkles,
  ArrowRight,
  Calendar,
  User,
  Building2,
  MessageSquare,
  ChevronRight,
  Star,
  Zap,
  Shield,
  Award
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { trackComplaint } from "@/services/complaints";
import type { Complaint } from "@/lib/types";

// Floating particles background
function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 10,
    opacity: Math.random() * 0.3 + 0.1,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-teal-400/20"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Premium Status Badge with glow
function PremiumStatusBadge({ status, priority, assignedTeam }: { status: string; priority: string; assignedTeam?: string }) {
  const statusColors = {
    "Complaint Submitted": "bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-blue-500/20",
    "Assigned": "bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-purple-500/20",
    "In Progress": "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-amber-500/20",
    "Completed": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/20",
  };

  const priorityColors = {
    High: "bg-red-500/20 text-red-400 border-red-500/30 shadow-red-500/20",
    Medium: "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-amber-500/20",
    Low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/20",
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Badge 
          variant="outline" 
          className={`${statusColors[status as keyof typeof statusColors] || statusColors["Complaint Submitted"]} 
            font-medium shadow-lg backdrop-blur-sm border-2 transition-all duration-300 hover:scale-105`}
        >
          <span className="relative">
            {status === "Completed" && <CheckCircle2 className="inline mr-1.5 h-3 w-3" />}
            {status === "In Progress" && <Loader2 className="inline mr-1.5 h-3 w-3 animate-spin" />}
            {status}
          </span>
        </Badge>
      </motion.div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
      >
        <Badge
          variant="outline"
          className={`${priorityColors[priority as keyof typeof priorityColors] || priorityColors.Medium}
            font-medium shadow-lg backdrop-blur-sm border-2 transition-all duration-300 hover:scale-105`}
        >
          {priority} Priority
        </Badge>
      </motion.div>

      {assignedTeam && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
        >
          <Badge 
            variant="secondary" 
            className="bg-slate-800/50 text-slate-300 border-slate-700/50 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-105"
          >
            <Building2 className="inline mr-1.5 h-3 w-3" />
            {assignedTeam}
          </Badge>
        </motion.div>
      )}
    </div>
  );
}

// Enhanced Timeline with floating elements
function Timeline({ complaint }: { complaint: Complaint }) {
  const steps = [
    { 
      label: "Complaint Submitted", 
      description: "Your complaint has been successfully logged in our system.",
      icon: MessageSquare,
      color: "text-blue-400"
    },
    { 
      label: "Assigned", 
      description: "A specialized team has been assigned to review your case.",
      icon: User,
      color: "text-purple-400"
    },
    { 
      label: "In Progress", 
      description: "The team is actively investigating and working on a resolution.",
      icon: Zap,
      color: "text-amber-400"
    },
    { 
      label: "Completed", 
      description: "Your complaint has been fully resolved and closed.",
      icon: Award,
      color: "text-emerald-400"
    },
  ];

  const statusMap: Record<string, number> = {
    "Complaint Submitted": 0,
    "Assigned": 1,
    "In Progress": 2,
    "Completed": 3,
  };
  
  const currentLevel = statusMap[complaint.status] ?? 0;

  return (
    <div className="space-y-8">
      {/* Status & Priority Badges */}
      <PremiumStatusBadge 
        status={complaint.status} 
        priority={complaint.priority}
        assignedTeam={complaint.assignedTeam}
      />

      {/* Premium Timeline */}
      <div className="relative pl-2 space-y-10">
        {/* Animated gradient line */}
        <motion.div 
          className="absolute left-[15px] top-3 bottom-3 w-0.5 rounded-full"
          style={{
            background: "linear-gradient(180deg, #14b8a6 0%, #8b5cf6 50%, #14b8a6 100%)",
            backgroundSize: "100% 200%",
          }}
          animate={{
            backgroundPosition: ["0% 0%", "0% 100%", "0% 0%"],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {steps.map((step, index) => {
          const isActive = index <= currentLevel;
          const isCurrent = index === currentLevel;
          const Icon = step.icon;
          
          return (
            <motion.div 
              key={step.label} 
              className="relative flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15, type: "spring", stiffness: 200, damping: 25 }}
            >
              {/* Timeline Node with floating glow */}
              <div className="relative z-10">
                <motion.div 
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-background shadow-lg transition-all duration-300"
                  animate={{
                    scale: isActive ? [1, 1.05, 1] : 1,
                    boxShadow: isActive ? [
                      "0 0 0 0 rgba(20, 184, 166, 0)",
                      "0 0 20px 4px rgba(20, 184, 166, 0.3)",
                      "0 0 0 0 rgba(20, 184, 166, 0)",
                    ] : "none",
                  }}
                  transition={{
                    duration: 2,
                    repeat: isActive ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-background shadow-lg transition-all duration-300 ${
                    isActive 
                      ? `border-teal-500 bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-teal-500/30` 
                      : "border-slate-700/50 bg-slate-800/50 text-slate-500 backdrop-blur-sm"
                  }`}
                >
                  {isActive ? (
                    isCurrent && complaint.status !== "Completed" ? (
                      <Clock className="h-4 w-4 animate-pulse" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </motion.div>
                
                {/* Floating pulse ring */}
                {isActive && (
                  <motion.div 
                    className="absolute inset-0 rounded-full border-2 border-teal-500/30"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </div>

              {/* Timeline Content with glass effect */}
              <motion.div 
                className="flex-1 space-y-1.5 pt-1"
                whileHover={{ x: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${isActive ? step.color : "text-slate-600"}`} />
                  <p className={`text-sm font-semibold tracking-tight transition-colors duration-300 ${
                    isActive ? "text-slate-100" : "text-slate-500"
                  }`}>
                    {step.label}
                  </p>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    >
                      <Sparkles className="h-3 w-3 text-teal-400" />
                    </motion.div>
                  )}
                </div>
                <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                  isActive ? "text-slate-400" : "text-slate-600"
                }`}>
                  {step.description}
                </p>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function ComplaintTracking() {
  const [trackingId, setTrackingId] = useState("");
  const [trackingComplaint, setTrackingComplaint] = useState<Complaint | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTrack = async () => {
    if (!trackingId.trim()) {
      toast.error("Please enter a valid complaint ID");
      return;
    }

    setTrackingLoading(true);

    try {
      const response = await trackComplaint(trackingId.trim());
      setTrackingComplaint(response.complaint);
      toast.success("Complaint located successfully", {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
        style: {
          background: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(20, 184, 166, 0.2)",
          color: "#e2e8f0",
        },
      });
    } catch (error) {
      setTrackingComplaint(null);
      toast.error(
        error instanceof Error ? error.message : "Failed to track complaint",
        {
          icon: <AlertCircle className="h-4 w-4 text-red-400" />,
          style: {
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#e2e8f0",
          },
        }
      );
    } finally {
      setTrackingLoading(false);
    }
  };

  // Keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative mx-auto max-w-4xl space-y-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 min-h-screen overflow-hidden">
      <FloatingParticles />
      
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Search Card with floating elements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="relative overflow-hidden border-slate-800/60 bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-slate-950/50">
          {/* Card glow border */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-500/10 via-purple-500/10 to-teal-500/10 pointer-events-none" />
          
          <CardHeader className="relative space-y-4 pb-6">
            <div className="flex items-center gap-4">
              <motion.div 
                className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/20 shadow-lg shadow-teal-500/10"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.6 }}
              >
                <ScanSearch className="h-6 w-6 text-teal-400" />
                <motion.div 
                  className="absolute -top-1 -right-1"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="h-3 w-3 text-teal-400" />
                </motion.div>
              </motion.div>
              
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Track Complaint
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm">
                  Enter your unique complaint ID to view real-time status updates.
                  <span className="inline-block ml-2 px-2 py-0.5 bg-slate-800/50 rounded text-xs text-slate-500 border border-slate-700/50">
                    ⌘K
                  </span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tracking-id" className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Complaint ID
              </Label>
              <div className="relative">
                <motion.div 
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  animate={{
                    scale: isFocused ? 1.1 : 1,
                    color: isFocused ? "#14b8a6" : "#64748b",
                  }}
                >
                  <Hash className="h-4 w-4" />
                </motion.div>
                <Input
                  ref={inputRef}
                  id="tracking-id"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder="e.g., CMP-2026-001"
                  className="h-12 pl-9 font-mono text-sm tracking-wide bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-teal-500/50 transition-all duration-300"
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                />
                <motion.div 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500"
                  animate={{
                    opacity: isFocused ? 1 : 0,
                    y: isFocused ? 0 : 5,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  Press Enter
                </motion.div>
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                className="relative h-12 w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all duration-300 overflow-hidden group"
                onClick={handleTrack}
                type="button"
                disabled={trackingLoading}
              >
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                {trackingLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="relative">Searching...</span>
                  </>
                ) : (
                  <>
                    <span className="relative flex items-center">
                      Track Complaint
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                  </>
                )}
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Shield className="h-3 w-3 text-teal-500" />
                <span>256-bit encrypted</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3 w-3 text-teal-500" />
                <span>Real-time updates</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Star className="h-3 w-3 text-teal-500" />
                <span>24/7 support</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Card with premium animation */}
      <AnimatePresence>
        {trackingComplaint && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 25 }}
          >
            <Card className="relative overflow-hidden border-slate-800/60 bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-slate-950/50">
              {/* Animated border */}
              <motion.div 
                className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-r from-teal-500/30 via-purple-500/30 to-teal-500/30"
                animate={{
                  background: [
                    "linear-gradient(0deg, rgba(20,184,166,0.3), rgba(139,92,246,0.3), rgba(20,184,166,0.3))",
                    "linear-gradient(180deg, rgba(20,184,166,0.3), rgba(139,92,246,0.3), rgba(20,184,166,0.3))",
                  ],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              
              <CardHeader className="relative border-b border-slate-800/60 pb-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <motion.div 
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/20">
                        <Hash className="h-4 w-4 text-teal-400" />
                      </div>
                      <CardTitle className="text-lg font-mono tracking-tight text-slate-100">
                        {trackingComplaint.complaintId}
                      </CardTitle>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <CardDescription className="text-base font-medium text-slate-300">
                        {trackingComplaint.title}
                      </CardDescription>
                    </motion.div>
                  </div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                  >
                    <Badge className="bg-gradient-to-r from-teal-500/20 to-teal-600/20 text-teal-400 border-teal-500/30 shadow-lg shadow-teal-500/10">
                      <Calendar className="mr-1.5 h-3 w-3" />
                      {new Date().toLocaleDateString()}
                    </Badge>
                  </motion.div>
                </div>
              </CardHeader>

              <CardContent className="relative pt-6">
                <Timeline complaint={trackingComplaint} />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}