import { Checkout as PageContent } from "@/app/components/Checkout";
import { metadataFor } from "@/lib/site-seo";
export const metadata = metadataFor("/checkout");
export default function CheckoutPage() {
  return <PageContent />;
}
