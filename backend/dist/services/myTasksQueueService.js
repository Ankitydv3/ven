"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMyTasksQueueItem = isMyTasksQueueItem;
exports.myTasksQueueSort = myTasksQueueSort;
const HIDDEN_COMPLAINT_STATUSES = new Set([
    "Completed",
    "Cancelled",
    "Declined",
    "Pending Review",
    "Pending Assignment",
]);
const HIDDEN_TASK_STATUSES = new Set(["Completed", "Cancelled"]);
/** Team work queue — matches dashboard-assigned complaints that still need action. */
function isMyTasksQueueItem(item) {
    if (HIDDEN_COMPLAINT_STATUSES.has(item.status)) {
        return false;
    }
    const taskStatus = item.taskScheduleStatus;
    if (taskStatus) {
        return !HIDDEN_TASK_STATUSES.has(taskStatus);
    }
    const stage = item.workflowStage ?? item.status;
    return !HIDDEN_COMPLAINT_STATUSES.has(stage);
}
function myTasksQueueSort(a, b) {
    const aAssigned = a.assignedDate ? new Date(a.assignedDate).getTime() : 0;
    const bAssigned = b.assignedDate ? new Date(b.assignedDate).getTime() : 0;
    if (bAssigned !== aAssigned)
        return bAssigned - aAssigned;
    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bCreated - aCreated;
}
