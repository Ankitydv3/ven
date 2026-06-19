import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { createCustomerHandler, deleteCustomerHandler, listCustomers, readCustomer, updateCustomerHandler } from "../controllers/customerController";
import { customerSchema, customerUpdateSchema } from "../validation/customerValidation";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/", asyncHandler(listCustomers));
router.get("/:id", asyncHandler(readCustomer));
router.post("/", validateRequest(customerSchema), asyncHandler(createCustomerHandler));
router.put("/:id", validateRequest(customerUpdateSchema), asyncHandler(updateCustomerHandler));
router.delete("/:id", asyncHandler(deleteCustomerHandler));

export default router;