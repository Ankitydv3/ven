"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent as ReactDragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from "lucide-react";
import type { CalendarView, TaskSchedule } from "@/lib/schedule.types";
import { Button } from "@/components/ui/button";
import { useUpdateSchedule } from "@/hooks/useUpdateSchedule";
import {
  CALENDAR_END_HOUR,
  CALENDAR_START_HOUR,
  HOUR_HEIGHT,
  addDays,
  formatDisplayDate,
  formatTime12h,
  glassCardClass,
  minutesToTime,
  parseTimeToMinutes,
  startOfWeek,
  teamColors,
  toDateInputValue,
} from "@/lib/schedule-constants";
import { cn } from "@/lib/utils";

interface TaskCalendarProps {
  tasks: TaskSchedule[];
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  anchorDate: Date;
  onAnchorDateChange: (date: Date) => void;
  isLoading?: boolean;
}

export function TaskCalendar({
  tasks,
  view,
  onViewChange,
  anchorDate,
  onAnchorDateChange,
  isLoading,
}: TaskCalendarProps) {
  const updateMutation = useUpdateSchedule();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  // Auto-collapse to day view on small screens for legibility
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < 640 && view !== "day" && view !== "month") {
        onViewChange("day");
      }
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const days = useMemo(() => {
    if (view === "day") return [anchorDate];
    if (view === "week") return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
    const start = startOfWeek(monthStart);
    const result: Date[] = [];
    for (let d = new Date(start); d <= monthEnd || result.length % 7 !== 0; d = addDays(d, 1)) {
      result.push(new Date(d));
      if (result.length > 42) break;
    }
    return result;
  }, [anchorDate, view, weekStart]);

  const hours = useMemo(
    () =>
      Array.from(
        { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 },
        (_, i) => CALENDAR_START_HOUR + i
      ),
    []
  );

  const today = useMemo(() => toDateInputValue(new Date()), []);

  const navigate = (direction: -1 | 1) => {
    const next = new Date(anchorDate);
    if (view === "day") next.setDate(next.getDate() + direction);
    else if (view === "week") next.setDate(next.getDate() + direction * 7);
    else next.setMonth(next.getMonth() + direction);
    onAnchorDateChange(next);
  };

  const goToToday = () => onAnchorDateChange(new Date());

  const tasksForDay = useCallback(
    (day: Date) => {
      const key = toDateInputValue(day);
      return tasks.filter((t) => toDateInputValue(new Date(t.scheduledDate)) === key);
    },
    [tasks]
  );

  const handleDrop = async (task: TaskSchedule, day: Date, minuteOffset: number) => {
    const startMinutes = Math.max(
      CALENDAR_START_HOUR * 60,
      Math.min(minuteOffset, CALENDAR_END_HOUR * 60 - 60)
    );
    const duration =
      parseTimeToMinutes(task.endTime) - parseTimeToMinutes(task.startTime) || 60;
    const endMinutes = Math.min(startMinutes + duration, CALENDAR_END_HOUR * 60);

    await updateMutation.mutateAsync({
      id: task._id,
      payload: {
        scheduledDate: toDateInputValue(day),
        startTime: minutesToTime(startMinutes),
        endTime: minutesToTime(endMinutes),
      },
    });
  };

  const handleResize = async (task: TaskSchedule, newEndMinutes: number) => {
    const startMinutes = parseTimeToMinutes(task.startTime);
    if (newEndMinutes <= startMinutes + 15) return;

    await updateMutation.mutateAsync({
      id: task._id,
      payload: { endTime: minutesToTime(newEndMinutes) },
    });
  };

  const headerLabel =
    view === "day"
      ? formatDisplayDate(anchorDate)
      : view === "week"
        ? `${formatDisplayDate(weekStart)} – ${formatDisplayDate(addDays(weekStart, 6))}`
        : anchorDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div
      className={cn(
        glassCardClass,
        "relative flex h-full min-h-[560px] w-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl",
        "border border-slate-200/70 dark:border-white/[0.08]",
        "shadow-[0_8px_30px_-12px_rgba(4,52,44,0.18)] dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]"
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200/70 bg-white/60 px-4 py-3.5 backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.1]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="rounded-none px-2.5 hover:bg-[#2F6B63]/10 dark:hover:bg-[#7BE3CF]/10"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-white/70" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="rounded-none border-x border-slate-200 px-3 text-xs font-semibold text-[#2F6B63] hover:bg-[#2F6B63]/10 dark:border-white/[0.1] dark:text-[#7BE3CF] dark:hover:bg-[#7BE3CF]/10"
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(1)}
              className="rounded-none px-2.5 hover:bg-[#2F6B63]/10 dark:hover:bg-[#7BE3CF]/10"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4 text-slate-600 dark:text-white/70" />
            </Button>
          </div>

          <div className="flex items-center gap-2 pl-1">
            <CalendarDays className="hidden h-4 w-4 text-[#4F9B8C] dark:text-[#7BE3CF]/70 sm:block" />
            <h3 className="font-serif text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-lg">
              {headerLabel}
            </h3>
          </div>
        </div>

        <div className="flex w-full rounded-xl border border-slate-200 bg-white/70 p-1 dark:border-white/[0.08] dark:bg-white/[0.03] sm:w-auto">
          {(["day", "week", "month"] as CalendarView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={cn(
                "relative flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors duration-200 sm:flex-initial",
                view === v
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white"
              )}
            >
              {view === v && (
                <motion.span
                  layoutId="calendarViewPill"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#2F6B63] to-[#04342C] shadow-sm dark:from-[#4F9B8C] dark:to-[#2F6B63]"
                />
              )}
              <span className="relative z-10">{v}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {view === "month" ? (
        <div className="grid flex-1 grid-cols-7 gap-px overflow-auto bg-slate-200/60 p-2 dark:bg-white/[0.04] sm:p-3">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div
              key={d}
              className="px-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-white/30 sm:text-[11px]"
            >
              {d}
            </div>
          ))}
          {days.map((day) => {
            const dayTasks = tasksForDay(day);
            const inMonth = day.getMonth() === anchorDate.getMonth();
            const isToday = toDateInputValue(day) === today;
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[84px] rounded-xl bg-white/90 p-1.5 transition-colors dark:bg-[#071A17]/80 sm:min-h-[104px] sm:p-2",
                  !inMonth && "opacity-35"
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold text-slate-500 dark:text-white/50",
                      isToday &&
                        "bg-gradient-to-br from-[#4F9B8C] to-[#2F6B63] text-white shadow-sm dark:from-[#7BE3CF] dark:to-[#4F9B8C] dark:text-[#04342C]"
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="hidden text-[9px] font-medium text-slate-400 dark:text-white/30 sm:block">
                      {dayTasks.length}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <CalendarPill key={task._id} task={task} compact />
                  ))}
                  {dayTasks.length > 3 && (
                    <p className="pl-1 text-[10px] font-medium text-slate-400 dark:text-white/40">
                      +{dayTasks.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-1 overflow-auto [scrollbar-width:thin]">
          <div className="sticky left-0 z-20 w-12 shrink-0 border-r border-slate-200 bg-white/95 backdrop-blur dark:border-white/[0.08] dark:bg-[#04100D]/95 sm:w-16">
            <div className="h-[41px] border-b border-slate-200 dark:border-white/[0.08]" />
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="flex items-start justify-end pr-2 pt-1 text-[10px] font-medium text-slate-400 dark:text-white/30 sm:text-[11px]"
              >
                {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
            ))}
          </div>

          <div
            className="grid flex-1"
            style={{ gridTemplateColumns: `repeat(${days.length}, minmax(120px, 1fr))` }}
          >
            {days.map((day) => {
              const isToday = toDateInputValue(day) === today;
              return (
                <div
                  key={day.toISOString()}
                  className="relative border-r border-slate-200/80 dark:border-white/[0.06]"
                >
                  <div
                    className={cn(
                      "sticky top-0 z-10 h-[41px] border-b border-slate-200 bg-white/95 px-2 py-2 text-center backdrop-blur dark:border-white/[0.08] dark:bg-[#04100D]/95",
                      isToday && "bg-[#2F6B63]/[0.06] dark:bg-[#7BE3CF]/[0.06]"
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs font-semibold sm:text-sm",
                        isToday
                          ? "text-[#2F6B63] dark:text-[#7BE3CF]"
                          : "text-slate-700 dark:text-white/80"
                      )}
                    >
                      {formatDisplayDate(day)}
                    </p>
                  </div>
                  <div className="relative">
                    {hours.map((hour) => {
                      const cellKey = `${day.toISOString()}-${hour}`;
                      return (
                        <div
                          key={hour}
                          style={{ height: HOUR_HEIGHT }}
                          className={cn(
                            "border-b border-slate-100 transition-colors dark:border-white/[0.04]",
                            dragOverCell === cellKey && "bg-[#4F9B8C]/10 dark:bg-[#7BE3CF]/10"
                          )}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverCell(cellKey);
                          }}
                          onDragLeave={() => setDragOverCell((c) => (c === cellKey ? null : c))}
                          onDrop={(e) => {
                            e.preventDefault();
                            const taskId = e.dataTransfer.getData("taskId");
                            const task = tasks.find((t) => t._id === taskId);
                            setDragOverCell(null);
                            if (!task) return;
                            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                            const offsetY = e.clientY - rect.top;
                            const minuteOffset = hour * 60 + Math.round((offsetY / HOUR_HEIGHT) * 60);
                            void handleDrop(task, day, minuteOffset);
                            setDraggingId(null);
                          }}
                        />
                      );
                    })}

                    {tasksForDay(day).map((task) => (
                      <CalendarEvent
                        key={task._id}
                        task={task}
                        dragging={draggingId === task._id}
                        resizing={resizingId === task._id}
                        onDragStart={() => setDraggingId(task._id)}
                        onDragEnd={() => setDraggingId(null)}
                        onResizeStart={() => setResizingId(task._id)}
                        onResize={(endMinutes) => {
                          void handleResize(task, endMinutes);
                          setResizingId(null);
                        }}
                      />
                    ))}

                    {tasksForDay(day).length === 0 && view === "day" && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <p className="text-xs text-slate-300 dark:text-white/15">No tasks scheduled</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-white/50 backdrop-blur-sm dark:bg-[#04100D]/60"
          >
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 shadow-lg dark:border-white/10 dark:bg-[#0A1F1A]/90">
              <Loader2 className="h-4 w-4 animate-spin text-[#2F6B63] dark:text-[#7BE3CF]" />
              <span className="text-xs font-medium text-slate-600 dark:text-white/70">Updating…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CalendarPill({ task, compact }: { task: TaskSchedule; compact?: boolean }) {
  const style = teamColors[task.team] ?? teamColors["Team Alpha"];
  return (
    <div
      className={cn(
        "truncate rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-transform hover:scale-[1.02]",
        style.bg,
        style.border,
        style.text
      )}
    >
      {compact ? task.complaintId || task.taskId : `${task.complaintId || task.taskId} · ${formatTime12h(task.startTime)}`}
    </div>
  );
}

function CalendarEvent({
  task,
  dragging,
  resizing,
  onDragStart,
  onDragEnd,
  onResizeStart,
  onResize,
}: {
  task: TaskSchedule;
  dragging: boolean;
  resizing: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onResizeStart: () => void;
  onResize: (endMinutes: number) => void;
}) {
  const style = teamColors[task.team] ?? teamColors["Team Alpha"];
  const start = parseTimeToMinutes(task.startTime);
  const end = parseTimeToMinutes(task.endTime);
  const top = ((start - CALENDAR_START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 30);
  const isShort = height < 44;

  return (
    <motion.div
      layout
      draggable
      onDragStart={(e) => {
        const dragEvent = e as unknown as ReactDragEvent<HTMLDivElement>;
        onDragStart();
        dragEvent.dataTransfer.setData("taskId", task._id);
        dragEvent.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: dragging ? 0.55 : 1, scale: dragging ? 0.98 : 1 }}
      whileHover={{ scale: 1.015 }}
      style={{ top, height }}
      className={cn(
        "absolute left-1 right-1 z-20 cursor-grab overflow-hidden rounded-xl border p-2 text-[11px] backdrop-blur-sm",
        "shadow-[0_2px_10px_-2px_rgba(4,52,44,0.25)] transition-shadow hover:shadow-[0_4px_16px_-2px_rgba(4,52,44,0.35)] active:cursor-grabbing",
        style.bg,
        style.border,
        resizing && "ring-2 ring-[#4F9B8C] dark:ring-[#7BE3CF]"
      )}
    >
      <p className={cn("truncate font-bold leading-tight", style.text)}>
        {task.complaintId || task.taskId}
      </p>
      {!isShort && (
        <p className="truncate text-slate-600 dark:text-white/60">
          {task.complaintTitle || task.serviceType}
        </p>
      )}
      {!isShort && (
        <p className="truncate text-[10px] font-medium text-slate-500 dark:text-white/45">
          Team: {task.team}
        </p>
      )}
      {!isShort && (
        <p className={cn("truncate text-[10px] font-bold", style.text)}>
          Status: {task.status}
        </p>
      )}
      {!isShort && (
        <p className="truncate text-[10px] font-medium text-slate-500 dark:text-white/45">
          Assigned: {task.assignedAt ? new Date(task.assignedAt).toLocaleString() : "N/A"}
        </p>
      )}
      {!isShort && (
        <p className="truncate text-[10px] font-medium text-slate-500 dark:text-white/45">
          Slot: {formatTime12h(task.startTime)} – {formatTime12h(task.endTime)}
        </p>
      )}

      <button
        type="button"
        aria-label="Resize task"
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart();
          const startY = e.clientY;
          const initialEnd = end;

          const onMove = (moveEvent: MouseEvent) => {
            const delta = moveEvent.clientY - startY;
            const addedMinutes = Math.round((delta / HOUR_HEIGHT) * 60);
            onResize(initialEnd + addedMinutes);
          };

          const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          };

          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
        className="absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize bg-black/0 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
      />
    </motion.div>
  );
}