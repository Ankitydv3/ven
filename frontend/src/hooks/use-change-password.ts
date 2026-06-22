"use client";

import { useMutation } from "@tanstack/react-query";
import { changePassword } from "@/services/auth";

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ newPassword, confirmPassword }: { newPassword: string; confirmPassword: string }) =>
      changePassword(newPassword, confirmPassword),
  });
}
