import { Missing as PageContent } from "@/app/components/Info";
import { metadataFor } from "@/lib/site-seo";
export const metadata = metadataFor("/404");
export default function NotFound() {
  return <PageContent />;
}
