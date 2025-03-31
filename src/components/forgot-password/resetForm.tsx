import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import "./resetpassword.css";

const ResetPasswordForm = ({ token }: { token: string }) => {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
          
          <div className="password-input-container">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New Password"
              required
            />
            <button 
              type="button" 
              className="password-toggle-btn"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>
          
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? "Sending..." : "Reset Password"}
          </button>
          
          {message && (
            <p className={`${message.includes("success") ? "success-message" : "error-message"}`}>
              {message}
            </p>
          )}
        </form>
        <div className="footer-text">
          <p>Copyright © 2019-2025 Chartsign Ltd</p>
          <p>Entry to this site is restricted to employees and affiliates of Chartsign Limited</p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordForm;