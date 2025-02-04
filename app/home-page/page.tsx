//home page.tsx

"use client";
import HomepageContent from "@/src/components/homepage/homepage";
import Layout from "@/src/components/Layout";
import React from "react";

export default function Homepage({
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
