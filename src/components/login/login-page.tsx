"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
  faCheckCircle,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import "./loginpage.css";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const url = `http://localhost:3001/api/login`;
  const router = useRouter(); 

  const usernameRegex = /^[a-zA-Z0-9]+$/;
  const passwordRegex = /^(?=.*\d)(?=.*[a-zA-Z])(?=.*[!@#$%^&*]).{8,}$/;

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setUsername(value);
    if (!usernameRegex.test(value)) {
      setUsernameError("Username should only contain letters and numbers.");
    } else {
      setUsernameError("");
    }
    setErrorMessage("");
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPassword(value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!usernameRegex.test(username)) {
      setErrorMessage("Username should only contain letters and numbers.");
      return;
    }

    setErrorMessage("");

    const data = new URLSearchParams();
    data.append("username", username);
    data.append("password", password);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data.toString(),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(result);
        localStorage.setItem("loginResponse", JSON.stringify(result));
        window.location.replace('http://localhost:3000/home-page');
      } else if (response.status === 401) {
        setErrorMessage("Invalid credentials. Please try again.");
      } else {
        console.error("Server error:", response.status);
        setErrorMessage("Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("An error occurred. Please try again.");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const checkPasswordCriteria = (criteria: string) => {
    let result = false;
    switch (criteria) {
      case "length":
        result = password.length >= 8;
        break;
      case "letters":
        result = /[a-zA-Z]/.test(password);
        break;
      case "numbers":
        result = /\d/.test(password);
        break;
      case "special":
        result = /[!@#$%^&*]/.test(password);
        break;
      default:
        result = false;
    }
    return result;
  };

  return (
    <div className="container">
      <div className="drop drop-4"></div>
      <form onSubmit={handleSubmit}>
        <h2 className="text-white text-2xl font-bold text-center font-serif mb-2">
          Chartsign
        </h2>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <div className="input-container">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={handleUsernameChange}
            className="placeholder-white"
          />
          {usernameError && <p className="error-message">{usernameError}</p>}
        </div>
        <div className="input-container">
          <div className="password-container">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={handlePasswordChange}
              className="placeholder-white"
            />
            <span
              onClick={togglePasswordVisibility}
              className="toggle-password"
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
            </span>
          </div>
          {passwordError && <p className="error-message">{passwordError}</p>}
        </div>
        <div className="password-checklist">
          <p className="pt-4 mb-0 pb-2 text-base flex ml-1">Password must:</p>
          <ul>
            <li
              className={checkPasswordCriteria("length") ? "valid" : "invalid"}
            >
              <FontAwesomeIcon
                icon={
                  checkPasswordCriteria("length")
                    ? faCheckCircle
                    : faTimesCircle
                }
                style={{ width: "16px", height: "16px" }}
              />
              &nbsp;Be at least 8 characters long
            </li>
            <li
              className={checkPasswordCriteria("letters") ? "valid" : "invalid"}
            >
              <FontAwesomeIcon
                icon={
                  checkPasswordCriteria("letters")
                    ? faCheckCircle
                    : faTimesCircle
                }
                style={{ width: "16px", height: "16px" }}
              />
              &nbsp;Contain at least one letter
            </li>
            <li
              className={checkPasswordCriteria("numbers") ? "valid" : "invalid"}
            >
              <FontAwesomeIcon
                icon={
                  checkPasswordCriteria("numbers")
                    ? faCheckCircle
                    : faTimesCircle
                }
                style={{ width: "16px", height: "16px" }}
              />
              &nbsp;Contain at least one number
            </li>
            <li
              className={checkPasswordCriteria("special") ? "valid" : "invalid"}
            >
              <FontAwesomeIcon
                icon={
                  checkPasswordCriteria("special")
                    ? faCheckCircle
                    : faTimesCircle
                }
                style={{ width: "16px", height: "16px" }}
              />
              &nbsp;Contain at least one special character
            </li>
          </ul>
        </div>
        <br />
        <button type="submit" onClick={handleSubmit}>Sign In</button>
        <div className="text-center">
          <Link
            href="/forgot-password"
            className="text-blue-100 hover:underline text-sm"
          >
            Forgot Password?
          </Link>
        </div>
      </form>
      <div className="footer-text">
        <p>Copyright © 2019-2024 Chartsign Ltd</p>
        <p>Entry to this site is restricted to employees and affiliates of Chartsign Limited</p>
      </div>
    </div>
  );
};

export default LoginPage;
