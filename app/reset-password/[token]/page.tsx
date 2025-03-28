// app/reset-password/[token]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import ResetPasswordForm from "@/src/components/forgot-password/resetForm";

const ResetPasswordPage = ({ params }: { params: { token: string } }) => {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Make sure to use the full URL with environment variable
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/reset/${token}`
        );
        setMessage(res.data.message);
        setValidToken(true);
        setLoading(false);
      } catch (error: any) {
        console.error("Token verification error:", error);
        setMessage(
          error.response?.data?.message || 
          "Invalid or expired password reset token. Please try again."
        );
        setValidToken(false);
        setLoading(false);
      }
    };
    
    verifyToken();
  }, [token]);

  if (loading) {
    return (
      <div className="container flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p>Verifying reset token...</p>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="container flex justify-center items-center min-h-screen">
        <div className="text-center bg-red-100 p-4 rounded-md border border-red-300">
          <h2 className="text-xl font-bold mb-2">Reset Password Error</h2>
          <p>{message}</p>
          <button 
            onClick={() => window.location.href = "/forgot-password"}
            className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Back to Forgot Password
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ResetPasswordForm token={token} />
    </div>
  );
};

export default ResetPasswordPage;