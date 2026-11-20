import { Home as PageContent } from "@/app/components/Store";
import { metadataFor } from "@/lib/site-seo";
export const metadata = metadataFor("/");
export default function Home() {
  return <PageContent />;
}
