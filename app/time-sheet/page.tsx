//home page.tsx

"use client";
import Layout from "@/src/components/Layout";
import TimesheetsPage from "@/src/components/timesheets";
import React from "react";

export default function Homepage() {
  return (
    <Layout>
      <TimesheetsPage />
    </Layout>
  );
}