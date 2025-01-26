import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col justify-center items-center w-full">
      <h1 className="text-4xl font-bold text-red-500 mb-5">Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link prefetch={false} href="/projects/website/public" className="mt-2">
        <Button>Return Home</Button>
      </Link>
    </div>
  );
}
