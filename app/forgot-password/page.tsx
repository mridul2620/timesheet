// app/forgot-password/page.tsx
"use client";
import ForgotPasswordForm from "@/src/components/forgot-password/forgotPassForm";
import React from "react";


const ForgotPasswordPage = () => {
  return (
    <div>
      <h1>Forgot Password</h1>
      <ForgotPasswordForm />
    </div>
  );
};

export default ForgotPasswordPage;
