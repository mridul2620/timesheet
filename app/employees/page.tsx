//home page.tsx

"use client";
import Layout from "@/src/components/Layout/sidebarLayout";
import React from "react";
import EmployeesPage from "@/src/components/Employees/employees";

export default function Homepage() {
  return (
    <Layout>
      <EmployeesPage />
    </Layout>
  );
}