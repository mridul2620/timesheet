//profile page.tsx

"use client";
import Layout from "@/src/components/Layout/sidebarLayout";
import React from "react";
import ProfilePageContent from "@/src/components/Profile/profile";

export default function Profilepage() {
  return (
    <Layout>
      <ProfilePageContent />
    </Layout>
  );
}
