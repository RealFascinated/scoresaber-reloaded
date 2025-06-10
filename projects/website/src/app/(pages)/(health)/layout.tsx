import { ReactNode } from "react";
import "../../styles/globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased w-full h-full">{children}</body>
    </html>
  );
}
