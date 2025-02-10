//profile page.tsx

"use client";
import HomepageContent from "@/src/components/Profile/index";
import Layout from "@/src/components/Layout";
import React from "react";

export default function Profilepage({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  )
}
