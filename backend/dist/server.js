"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const seedCoreData_1 = require("./utils/seedCoreData");
dotenv_1.default.config();
const port = Number(process.env.PORT ?? 5000);
async function bootstrap() {
    await (0, db_1.connectDB)();
    await (0, seedCoreData_1.seedCoreData)();
    app_1.default.listen(port, () => {
        console.log(`Backend running on http://localhost:${port}`);
    });
}
void bootstrap();
