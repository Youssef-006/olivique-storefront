import { Contact as PageContent } from "@/app/components/Info";
import { metadataFor } from "@/lib/site-seo";
export const metadata = metadataFor("/contact");
export default function ContactPage() {
  return <PageContent />;
}
