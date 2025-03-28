import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import "./resetpassword.css";

const ResetPasswordForm = ({ token }: { token: string }) => {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = new URLSearchParams();
    data.append("password", password);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/reset/${token}`,
        data,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      console.log("API Response:", res.data);
      setMessage(res.data.message);
      
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error: any) {
      console.error("Reset password error:", error);
      setMessage(error.response?.data?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-wrapper">
      <div className="reset-password-container">
        <div className="drop drop-4"></div>
        <form onSubmit={handleSubmit}>
          <h2 className="text-white text-2xl font-bold text-center font-serif mb-2">
            Chartsign
          </h2>
          <h3 className="text-white text-lg text-center mb-4">Reset Password</h3>
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New Password"
            required
          />
          
          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Reset Password"}
          </button>
          
          {message && (
            <p className={`${message.includes("success") ? "success-message" : "error-message"}`}>
              {message}
            </p>
          )}
        </form>
        <div className="footer-text">
          <p>Copyright © 2019-2024 Chartsign Ltd</p>
          <p>Entry to this site is restricted to employees and affiliates of Chartsign Limited</p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordForm;