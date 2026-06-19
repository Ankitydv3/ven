"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  const navigate = (direction: -1 | 1) => {
    const next = new Date(anchorDate);
    if (view === "day") next.setDate(next.getDate() + direction);
    else if (view === "week") next.setDate(next.getDate() + direction * 7);
    else next.setMonth(next.getMonth() + direction);
    onAnchorDateChange(next);
  };

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

  return (
    <div className={cn(glassCardClass, "flex h-full min-h-[520px] flex-col overflow-hidden rounded-3xl")}>
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
            {view === "day"
              ? formatDisplayDate(anchorDate)
              : view === "week"
                ? `${formatDisplayDate(weekStart)} – ${formatDisplayDate(addDays(weekStart, 6))}`
                : anchorDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex rounded-xl border border-slate-200 p-1 dark:border-white/[0.08]">
          {(["day", "week", "month"] as CalendarView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition",
                view === v
                  ? "bg-[#2F6B63] text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <div className="grid flex-1 grid-cols-7 gap-px overflow-auto bg-slate-200/50 p-2 dark:bg-white/[0.04]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-2 py-1 text-center text-[10px] font-semibold uppercase text-slate-400">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const dayTasks = tasksForDay(day);
            const inMonth = day.getMonth() === anchorDate.getMonth();
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[88px] rounded-lg bg-white p-1.5 dark:bg-[#071A17]/80",
                  !inMonth && "opacity-40"
                )}
              >
                <p className="mb-1 text-xs font-medium text-slate-500">{day.getDate()}</p>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <CalendarPill key={task._id} task={task} compact />
                  ))}
                  {dayTasks.length > 3 && (
                    <p className="text-[10px] text-slate-400">+{dayTasks.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-1 overflow-auto">
          <div className="w-14 shrink-0 border-r border-slate-200 dark:border-white/[0.08]">
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="flex items-start justify-end pr-2 pt-1 text-[10px] text-slate-400"
              >
                {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
            ))}
          </div>

          <div
            className="grid flex-1"
            style={{ gridTemplateColumns: `repeat(${days.length}, minmax(100px, 1fr))` }}
          >
            {days.map((day) => (
              <div key={day.toISOString()} className="relative border-r border-slate-200 dark:border-white/[0.08]">
                <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-2 py-2 text-center text-xs font-semibold dark:border-white/[0.08] dark:bg-[#0A1F1A]/90">
                  {formatDisplayDate(day)}
                </div>
                <div className="relative">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      style={{ height: HOUR_HEIGHT }}
                      className="border-b border-slate-100 dark:border-white/[0.04]"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const taskId = e.dataTransfer.getData("taskId");
                        const task = tasks.find((t) => t._id === taskId);
                        if (!task) return;
                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        const offsetY = e.clientY - rect.top;
                        const minuteOffset = hour * 60 + Math.round((offsetY / HOUR_HEIGHT) * 60);
                        void handleDrop(task, day, minuteOffset);
                        setDraggingId(null);
                      }}
                    />
                  ))}

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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-black/20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F9B8C] border-t-transparent" />
        </div>
      )}
    </div>
  );
}

function CalendarPill({ task, compact }: { task: TaskSchedule; compact?: boolean }) {
  const style = teamColors[task.team] ?? teamColors["Team Alpha"];
  return (
    <div
      className={cn(
        "truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        style.bg,
        style.border,
        style.text
      )}
    >
      {compact ? task.customerName : `${task.customerName} · ${formatTime12h(task.startTime)}`}
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
  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 28);

  return (
    <motion.div
      layout
      draggable
      onDragStart={(e) => {
        onDragStart();
        e.dataTransfer.setData("taskId", task._id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: dragging ? 0.6 : 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      style={{ top, height }}
      className={cn(
        "absolute left-1 right-1 z-20 cursor-grab overflow-hidden rounded-xl border p-2 text-[11px] shadow-md active:cursor-grabbing",
        style.bg,
        style.border,
        resizing && "ring-2 ring-[#4F9B8C]"
      )}
    >
      <p className={cn("truncate font-semibold", style.text)}>{task.customerName}</p>
      <p className="truncate text-slate-600 dark:text-white/60">{task.orderId || task.taskId}</p>
      <p className="truncate text-slate-500 dark:text-white/50">
        {task.team} · {formatTime12h(task.startTime)} – {formatTime12h(task.endTime)}
      </p>
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
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-black/10 dark:bg-white/10"
      />
    </motion.div>
  );
}
