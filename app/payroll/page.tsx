//home page.tsx

"use client";
import Layout from "@/src/components/Layout/sidebarLayout";
import PayrollPage from "@/src/components/payroll/payroll";
import React from "react";

export default function Homepage() {
  return (
    <Layout>
      <PayrollPage />
    </Layout>
  );
}
