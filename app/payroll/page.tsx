//home page.tsx

"use client";
import Layout from "@/src/components/Layout";
import PayrollPage from "@/src/components/payroll";
import React from "react";

export default function Homepage() {
  return (
    <Layout>
      <PayrollPage />
    </Layout>
  );
}
