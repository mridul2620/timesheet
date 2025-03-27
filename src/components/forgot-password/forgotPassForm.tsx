import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import "./forgotPass.css";

const ForgotPasswordForm = () => {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter(); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      // Send data as JSON instead of form-urlencoded
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/forgot`,
        { identifier },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      setMessage(res.data.message);

      if (res.data.success) {
        // Optional: wait a few seconds before redirecting
        setTimeout(() => {
          router.push("/"); // Redirect to home or another page
        }, 3000);
      }
    } catch (error: any) {
      console.error("Password reset error:", error);
      setMessage(error.response?.data?.message || "An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="drop drop-4"></div>
      <form onSubmit={handleSubmit}>
        <h2 className="text-white text-2xl font-bold text-center font-serif mb-2">
          Chartsign
        </h2>
        <h3 className="text-white text-lg text-center mb-4">Forgot Password</h3>
        
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Email or Username"
          required
        />
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Sending..." : "Reset Password"}
        </button>
        
        {message && (
          <p className={message.includes("sent") ? "success-message" : "error-message"}>
            {message}
          </p>
        )}
      </form>
      <div className="footer-text">
        <p>Copyright © 2019-2024 Chartsign Ltd</p>
        <p>Entry to this site is restricted to employees and affiliates of Chartsign Limited</p>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;