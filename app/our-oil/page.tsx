import { redirect } from "next/navigation";

export default async function LegacyPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const query = lang === "en" || lang === "ar" ? "?lang=" + lang : "";
  redirect("/" + query + "#our-story");
}
