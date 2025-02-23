//home page.tsx

"use client";
import Layout from "@/src/components/Layout";
import React from "react";
import EmployeesPage from "@/src/components/Employees";

export default function Homepage() {
  return (
    <Layout>
      <EmployeesPage />
    </Layout>
  );
}