"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamColorHex = getTeamColorHex;
exports.listActiveTeamNames = listActiveTeamNames;
exports.listTeams = listTeams;
exports.createTeam = createTeam;
exports.resolveTeamByName = resolveTeamByName;
exports.getTeamFields = getTeamFields;
exports.deleteTeam = deleteTeam;
const Team_1 = __importDefault(require("../models/Team"));
const User_1 = __importDefault(require("../models/User"));
const ApiError_1 = require("../utils/ApiError");
const TEAM_COLOR_PALETTE = [
    "#A855F7",
    "#3B82F6",
    "#22C55E",
    "#F59E0B",
    "#EC4899",
    "#14B8A6",
    "#8B5CF6",
    "#F97316",
];
function hashTeamName(teamName) {
    let hash = 0;
    for (let i = 0; i < teamName.length; i += 1) {
        hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}
function getTeamColorHex(teamName) {
    return TEAM_COLOR_PALETTE[hashTeamName(teamName) % TEAM_COLOR_PALETTE.length];
}
async function listActiveTeamNames() {
    const teams = await Team_1.default.find({ status: "active" }).sort({ teamName: 1 }).lean();
    return teams.map((team) => team.teamName);
}
function teamNameRegex(teamName) {
    return new RegExp(`^${teamName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
}
async function listTeams(includeDisabled = false) {
    const filter = includeDisabled ? {} : { status: "active" };
    return Team_1.default.find(filter).sort({ teamName: 1 }).lean();
}
async function createTeam(teamName, createdBy) {
    const normalized = teamName.trim().replace(/\s+/g, " ");
    if (normalized.length < 2) {
        throw new ApiError_1.ApiError(400, "Team name must be at least 2 characters");
    }
    const existing = await Team_1.default.findOne({
        teamName: teamNameRegex(normalized),
    });
    if (existing) {
        throw new ApiError_1.ApiError(409, "A team with this name already exists");
    }
    const team = await Team_1.default.create({
        teamName: normalized,
        description: `Primary service team ${normalized}`,
        status: "active",
        createdBy,
    });
    return team;
}
async function resolveTeamByName(teamName) {
    const normalized = teamName?.trim();
    if (!normalized)
        return null;
    return Team_1.default.findOne({
        teamName: teamNameRegex(normalized),
        status: "active",
    });
}
async function getTeamFields(teamName) {
    const team = await resolveTeamByName(teamName);
    if (!team) {
        throw new ApiError_1.ApiError(400, "Selected team does not exist. Create the team first.");
    }
    return {
        teamName: team.teamName,
        team: team.teamName,
        teamId: team._id,
    };
}
async function deleteTeam(teamId) {
    const team = await Team_1.default.findById(teamId);
    if (!team) {
        throw new ApiError_1.ApiError(404, "Team not found");
    }
    const assignedUsers = await User_1.default.countDocuments({
        $or: [{ teamId: team._id }, { teamName: team.teamName }, { team: team.teamName }],
        $and: [{ $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] }],
    });
    if (assignedUsers > 0) {
        throw new ApiError_1.ApiError(400, `Cannot delete "${team.teamName}" while ${assignedUsers} user(s) are assigned. Reassign or remove them first.`);
    }
    await Team_1.default.deleteOne({ _id: team._id });
    return { teamName: team.teamName };
}
