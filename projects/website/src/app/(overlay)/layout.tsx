import SSRLayout from "@/components/ssr-layout";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="flex min-h-screen w-full flex-col text-white">
        <SSRLayout>{children}</SSRLayout>
      </main>
    </>
  );
}
