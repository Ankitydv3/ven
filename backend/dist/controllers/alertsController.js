"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlerts = getAlerts;
const alertsService_1 = require("../services/alertsService");
const teamScope_1 = require("../utils/teamScope");
async function getAlerts(req, res) {
    const { q, team } = req.query;
    const scopedTeam = (0, teamScope_1.resolveTeamQuery)(req.user, team);
    const teamOnly = (0, teamScope_1.isTeamRole)(req.user?.role);
    const scopeFilter = (0, teamScope_1.taskVisibilityFilter)(req.user);
    const data = await (0, alertsService_1.getAlertsData)({
        q,
        team: scopedTeam,
        teamOnly,
        scopeFilter: Object.keys(scopeFilter).length > 0 ? scopeFilter : undefined,
        userId: req.user?.id,
        userRole: req.user?.role,
        subAdminType: req.user?.subAdminType,
    });
    res.json(data);
}
