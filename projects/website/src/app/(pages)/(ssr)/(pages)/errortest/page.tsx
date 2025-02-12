"use client";

export default function TestErrorPage() {
  return (
    <main className="w-screen bg-linear-to-b from-landing via-[#1a1a1a] to-landing">
      <button
        onClick={() => {
          throw new Error("Test error");
        }}
      >
        Click me
      </button>
    </main>
  );
}
