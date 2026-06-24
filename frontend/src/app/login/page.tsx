import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  if (params.tab) {
    redirect(`/?tab=${params.tab}`);
  }
  redirect("/");
}
