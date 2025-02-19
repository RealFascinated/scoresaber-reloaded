import { AuthType } from "@/common/auth/auth-type";
import Auth from "@/components/auth/auth";

type AuthPageProps = {
  params: Promise<{
    type: AuthType;
  }>;
};

export default async function AuthPage({ params }: AuthPageProps) {
  const { type } = await params;

  return (
    <main className="w-full flex justify-center">
      <Auth type={type} />
    </main>
  );
}
