import { ReactNode } from "react";
import "../../styles/globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-full w-full antialiased">{children}</body>
    </html>
  );
}
