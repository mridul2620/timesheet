import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

const ForgotPasswordForm = () => {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter(); 

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create URLSearchParams object to encode data
    const data = new URLSearchParams();
    data.append("identifier", identifier);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/forgot`,
        data,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      setMessage(res.data.message);

      // Additional functionality: redirect after successful submission
      if (res.data.success && isMounted) {
        router.push("/"); // Redirect to home or another page
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || "An error occurred");
    }
  };

  return (
    <div className="container">
      <div className="drop drop-4"></div>
      <form onSubmit={handleSubmit}>
      <h2 className="text-white text-2xl font-bold text-center font-serif mb-2">
          Chartsign
        </h2>
        <div className="input-container">
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Email or Username"
          required
          className="border rounded px-3 py-2 mb-3"
        />
        </div>
        <button type="submit">Reset Password</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default ForgotPasswordForm;
