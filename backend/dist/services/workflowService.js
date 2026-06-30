"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWorkflowStage = resolveWorkflowStage;
exports.workflowStageFilter = workflowStageFilter;
exports.isActiveMaterialStatus = isActiveMaterialStatus;
const MATERIAL_STAGE_MAP = {
    PENDING: "Material Required",
    PENDING_SERVICE_HEAD: "Material Required",
    DENIED: "Declined",
    AWAITING_ACCOUNTS: "Material Required",
    PAYMENT_PENDING_ONSITE: "Material Required",
    AWAITING_STOCK_CHECK: "Material Required",
    AWAITING_MATERIAL_RECEIVED: "Material Required",
    AWAITING_STORE: "Material Required",
    AWAITING_FINAL_GRANT: "Awaiting Reassignment",
    WAITING_FOR_STOCK: "Material Required",
    DECLINED_BY_STORE: "Declined",
    GRANTED_BY_STORE: "Awaiting Reassignment",
    WAITING_BY_STORE: "Material Required",
    WAITING: "Material Required",
    OUT_OF_STOCK: "Material Required",
    GRANTED: "Material Granted",
    REJECTED: "Declined",
    COMPLETED: "Completed",
};
function resolveWorkflowStage(input) {
    const { complaintStatus, taskStatus, materialRequestStatus, siteVisitStatus } = input;
    if (complaintStatus === "Completed")
        return "Completed";
    if (complaintStatus === "Cancelled")
        return "Cancelled";
    if (complaintStatus === "Declined")
        return "Declined";
    if (complaintStatus === "Pending Review")
        return "Pending Review";
    if (complaintStatus === "Pending Assignment")
        return "Pending Assignment";
    if (siteVisitStatus === "Material Required")
        return "Material Required";
    if (siteVisitStatus === "Material Granted")
        return "Material Granted";
    if (siteVisitStatus === "Revisit")
        return "Revisit";
    if (siteVisitStatus === "Awaiting Reassignment")
        return "Awaiting Reassignment";
    if (materialRequestStatus) {
        const materialStage = MATERIAL_STAGE_MAP[materialRequestStatus];
        if (materialStage && materialRequestStatus !== "GRANTED" && materialRequestStatus !== "DENIED") {
            return materialStage;
        }
        if (materialRequestStatus === "GRANTED" && taskStatus === "Pending") {
            return "Material Granted";
        }
    }
    if (taskStatus === "Need Re-visit")
        return "Revisit";
    if (taskStatus === "Need Material")
        return "Material Required";
    if (complaintStatus === "In Progress" || taskStatus === "In Progress") {
        return "In Progress";
    }
    if (complaintStatus === "Site Visit")
        return "Site Visit";
    if (complaintStatus === "Assigned" ||
        taskStatus === "Pending" ||
        taskStatus === "Overdue") {
        return "Assigned";
    }
    return "Assigned";
}
function workflowStageFilter(displayStatus) {
    const map = {
        "Re-visit": "Revisit",
        "Material Required": "Material Required",
        "Material Granted": "Material Granted",
        Pending: "Pending Assignment",
        Assigned: "Assigned",
        "In Progress": "In Progress",
        Completed: "Completed",
        "Site Visit": "Site Visit",
        "Cancelled": "Cancelled",
        "Declined": "Declined",
        "Revisit": "Revisit",
        "Awaiting Reassignment": "Awaiting Reassignment"
    };
    return map[displayStatus] ?? null;
}
function isActiveMaterialStatus(status) {
    if (!status)
        return false;
    const finalStatuses = ["GRANTED", "DENIED", "REJECTED", "COMPLETED", "DECLINED_BY_STORE"];
    return !finalStatuses.includes(status);
}
