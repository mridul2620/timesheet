import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

const ResetPasswordForm = ({ token }: { token: string }) => {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create URLSearchParams object to encode data
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
      setMessage(res.data.message);
      router.push("/"); // Redirect to login page on success
    } catch (error: any) {
      setMessage(error.response?.data?.message || "An error occurred");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded shadow-md">
        <h1 className="text-2xl font-bold mb-6">Reset Password</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New Password"
            required
            className="border rounded px-3 py-2 mb-3 w-full"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded w-full"
          >
            Reset Password
          </button>
        </form>
        {message && <p className="mt-4 text-center text-red-500">{message}</p>}
      </div>
    </div>
  );
};

export default ResetPasswordForm;
