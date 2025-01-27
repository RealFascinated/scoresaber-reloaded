import SSRLayout from "@/components/ssr-layout";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="flex flex-col min-h-screen text-white w-full">
        <SSRLayout>{children}</SSRLayout>
      </main>
    </>
  );
}
