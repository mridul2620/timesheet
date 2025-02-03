"use client";
import React, { useState, useEffect } from "react";
import Head from "next/head";
import LoginPage from "../src/components/login/login-page";

const Home = () => {
  const [showMainContent, setShowMainContent] = useState(false);

  useEffect(() => {
    // Simulate loading time for the preloader
    setTimeout(() => {
      setShowMainContent(true);
    }, 3000); // 3 seconds
  }, []);
  const FullPageAnimation = () => (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <LoginPage />
    </div>
  );

  return (
    <div>
      <Head>
        <title>Chartsign</title>
      </Head>
      <LoginPage />
    </div>
  );
};

export default Home;
