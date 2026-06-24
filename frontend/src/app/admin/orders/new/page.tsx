"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useCreateOrder } from "@/hooks/use-orders";
import { useSession } from "@/hooks/use-session";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { complaintIssueTypes, type ComplaintIssueType } from "@/lib/constants";
import { phoneInputProps, sanitizePhoneDigits } from "@/lib/phone";

export default function NewOrderPage() {
  const { ready } = useSession("admin");
  const router = useRouter();
  const createOrderMutation = useCreateOrder();

 const [formData, setFormData] = useState({
  customerName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  materialType: "Aluminium" as "Aluminium" | "uPVC",
  deliveryDate: new Date().toISOString().split("T")[0]
});

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!ready) {
    return null;
  }

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.customerName.trim()) newErrors.customerName = "Customer name is required";

    const phoneRegex = /^[0-9]{10}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = "Phone number must be exactly 10 digits";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.pincode.trim()) newErrors.pincode = "Pincode is required";
    if (!formData.deliveryDate) newErrors.deliveryDate = "Delivery date is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createOrderMutation.mutateAsync({
        ...formData,
        deliveryDate: new Date(formData.deliveryDate)
      });
      toast.success("Order created successfully");
      router.push("/admin/orders");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || "Failed to create order");
    }
  };

  return (
    <DashboardShell
      role="admin"
      title="Create Order"
      subtitle="Fill in customer details and order specifications to register a new order."
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/orders")}
            className="border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/[0.05]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
          </Button>
        </div>

        <Card className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-app shadow-none">
          <CardHeader className="border-b border-slate-100 dark:border-white/[0.06] pb-6">
            <CardTitle className="font-serif text-xl font-medium text-[#04342C] dark:text-white">
              Order Creation Form
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-white/50">
              Provide the customer details, material selections, and configurations.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Customer Name */}
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-slate-700 dark:text-white/80">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="Enter customer name"
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#378ADD]/30"
                  />
                  {errors.customerName && <p className="text-xs text-red-500">{errors.customerName}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-700 dark:text-white/80">Phone Number</Label>
                  <Input
                    id="phone"
                    {...phoneInputProps}
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: sanitizePhoneDigits(e.target.value) })
                    }
                    placeholder="10-digit mobile number"
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#378ADD]/30"
                  />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 dark:text-white/80">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="customer@example.com"
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#378ADD]/30"
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                {/* Material Type */}
                <div className="space-y-2">
                  <Label htmlFor="materialType" className="text-slate-700 dark:text-white/80">Material Type</Label>
                  <select
                    id="materialType"
                    value={formData.materialType}
                    onChange={(e) => setFormData({ ...formData, materialType: e.target.value as "Aluminium" | "uPVC" })}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/[0.08]
                               bg-white dark:bg-app
                               py-2 px-3 text-sm
                               text-slate-900 dark:text-white"
                  >
                    <option value="Aluminium" className="bg-app text-white">Aluminium</option>
                    <option value="uPVC" className="bg-app text-white">uPVC</option>
                  </select>
                </div>

                {/* Delivery Date */}
                <div className="space-y-2">
                  <Label htmlFor="deliveryDate" className="text-slate-700 dark:text-white/80">Delivery Date</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#378ADD]/30"
                  />
                  {errors.deliveryDate && <p className="text-xs text-red-500">{errors.deliveryDate}</p>}
                </div>

                {/* Address */}
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address" className="text-slate-700 dark:text-white/80">Site Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street, flat/house number, area"
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#378ADD]/30"
                  />
                  {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-slate-700 dark:text-white/80">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Enter city"
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#378ADD]/30"
                  />
                  {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
                </div>

                {/* State */}
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-slate-700 dark:text-white/80">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Enter state"
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#378ADD]/30"
                  />
                  {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
                </div>

                {/* Pincode */}
                <div className="space-y-2">
                  <Label htmlFor="pincode" className="text-slate-700 dark:text-white/80">Pincode</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="Enter pincode"
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#378ADD]/30"
                  />
                  {errors.pincode && <p className="text-xs text-red-500">{errors.pincode}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-white/[0.06] pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/orders")}
                  className="border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-white/80"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="bg-[#185FA5] hover:bg-[#378ADD] text-white"
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin animate-infinite" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Order
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
