import Login from "@/components/auth/login";
import { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Sign in",
    description: "Sign in to link your player profile.",
  };
}

export default async function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
