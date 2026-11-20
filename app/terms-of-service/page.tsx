import { LegalPage as PageContent } from "@/app/components/Info";
import { metadataFor } from "@/lib/site-seo";
export const metadata = metadataFor("/terms-of-service");
export default function Terms() {
  return <PageContent privacy={false} />;
}
