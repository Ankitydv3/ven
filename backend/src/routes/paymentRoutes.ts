import { Router } from "express";
import * as paymentController from "../controllers/paymentController";
import { authRequired, requireRole } from "../middleware/auth";

const router = Router();

router.use(authRequired);

router.get("/stats", requireRole("admin", "accountant", "manager"), paymentController.getStats);
router.get("/export/csv", requireRole("admin", "accountant"), paymentController.exportCSV);
router.get("/", requireRole("admin", "accountant", "manager"), paymentController.listPayments);
router.post("/", requireRole("admin", "accountant", "team"), paymentController.createPaymentHandler);
router.get("/:id", requireRole("admin", "accountant", "manager", "team"), paymentController.readPayment);
router.put("/:id", requireRole("admin", "accountant"), paymentController.updatePaymentHandler);
router.delete("/:id", requireRole("admin"), paymentController.deletePaymentHandler);

router.get("/:id/invoice", paymentController.downloadInvoice);
router.post("/:id/email", paymentController.emailInvoice);

export default router;
