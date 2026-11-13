import { redirect } from "next/navigation";
import { getPublishedGames } from "@/lib/registry";

export function generateStaticParams() {
  return getPublishedGames().map((game) => ({
    slug: game.id
  }));
}

export default async function PlayRedirectPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/games/${slug}`);
}
