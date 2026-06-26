"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWorkflowStage = resolveWorkflowStage;
exports.workflowStageFilter = workflowStageFilter;
exports.isActiveMaterialStatus = isActiveMaterialStatus;
const MATERIAL_STAGE_MAP = {
    PENDING: "Waiting Service Head",
    PENDING_SERVICE_HEAD: "Waiting Service Head",
    DENIED: "Material Denied",
    AWAITING_ACCOUNTS: "Waiting Accounts",
    AWAITING_STORE: "Waiting Store Manager",
    WAITING: "Material Waiting Stock",
    OUT_OF_STOCK: "Material Out of Stock",
    GRANTED: "Material Granted",
};
function resolveWorkflowStage(input) {
    const { complaintStatus, taskStatus, materialRequestStatus } = input;
    if (complaintStatus === "Completed")
        return "Completed";
    if (complaintStatus === "Declined")
        return "Declined";
    if (complaintStatus === "Pending Review")
        return "Pending Review";
    if (complaintStatus === "Pending Assignment")
        return "Pending Assignment";
    if (materialRequestStatus) {
        const materialStage = MATERIAL_STAGE_MAP[materialRequestStatus];
        if (materialStage && materialRequestStatus !== "GRANTED") {
            return materialStage;
        }
        if (materialRequestStatus === "GRANTED" && taskStatus === "Pending") {
            return "Material Granted";
        }
    }
    if (taskStatus === "Need Re-visit")
        return "Re-visit Scheduled";
    if (taskStatus === "Need Material")
        return "Waiting Service Head";
    if (complaintStatus === "In Progress" || taskStatus === "In Progress")
        return "In Progress";
    if (complaintStatus === "Assigned" || taskStatus === "Pending" || taskStatus === "Overdue") {
        return "Assigned";
    }
    return "Assigned";
}
function workflowStageFilter(displayStatus) {
    const map = {
        "Re-visit": "Re-visit Scheduled",
        "Material Required": "Waiting Service Head",
        "Waiting Service Head": "Waiting Service Head",
        "Material Denied": "Material Denied",
        "Waiting Accounts": "Waiting Accounts",
        "Waiting Store Manager": "Waiting Store Manager",
        "Material Waiting Stock": "Material Waiting Stock",
        "Material Out of Stock": "Material Out of Stock",
        "Material Granted": "Material Granted",
        Pending: "Pending Assignment",
        Assigned: "Assigned",
        "In Progress": "In Progress",
        Completed: "Completed",
    };
    return map[displayStatus] ?? null;
}
function isActiveMaterialStatus(status) {
    return Boolean(status && status !== "GRANTED" && status !== "DENIED");
}
