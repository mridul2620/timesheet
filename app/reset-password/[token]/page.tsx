// app/reset-password/[token]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import ResetPasswordForm from "@/src/components/forgot-password/resetForm";

const ResetPasswordPage = ({ params }: { params: { token: string } }) => {
  const token = params.token;
  const [message, setMessage] = useState("");
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const res = await axios.get(`/api/reset/${token}`);
        setMessage(res.data.message);
        setValidToken(true);
      } catch (error: any) {
        setMessage(error.response.data.message);
        setValidToken(false);
      }
    };
    verifyToken();
  }, [token]);

  if (!validToken) {
    return <div>{message}</div>;
  }

  return (
    <div>
      <ResetPasswordForm token={token} />
    </div>
  );
};

export default ResetPasswordPage;
