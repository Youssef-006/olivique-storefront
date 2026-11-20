import { LegalPage as PageContent } from "@/app/components/Info";
import { metadataFor } from "@/lib/site-seo";
export const metadata = metadataFor("/privacy-policy");
export default function Privacy() {
  return <PageContent privacy />;
}
