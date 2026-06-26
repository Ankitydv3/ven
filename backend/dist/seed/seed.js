"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("../config/db");
const seedCoreData_1 = require("../utils/seedCoreData");
const seedOknaUsers_1 = require("../utils/seedOknaUsers");
dotenv_1.default.config();
async function seed() {
    await (0, db_1.connectDB)();
    await (0, seedCoreData_1.seedCoreData)();
    await (0, seedOknaUsers_1.seedOknaUsers)();
    console.log("Seed completed");
    process.exit(0);
}
void seed();
