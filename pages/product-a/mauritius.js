import ProductAMauritiusPropertyLanding from '../../components/ProductAMauritiusPropertyLanding.js';

/**
 * Product A — Mauritius property audit landing (premium tier).
 * Canonical route: /product-a/mauritius
 * Intake API: POST /api/product-a/intake (market=mauritius-property)
 * Doctrine: docs/marketing/PRODUCT_A_MAURITIUS_PROPERTY_OFFER_V1.md
 */

export default function ProductAMauritiusPage() {
  return <ProductAMauritiusPropertyLanding />;
}

export async function getStaticProps() {
  return { props: {} };
}
