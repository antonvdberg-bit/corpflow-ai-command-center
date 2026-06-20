import ProductAUsClinicLanding from '../../components/ProductAUsClinicLanding.js';

/**
 * Product A — US medspa / aesthetic / elective clinic audit landing.
 * Canonical route: /product-a/us-clinics
 * Intake API: POST /api/product-a/intake
 * Spec: docs/product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md
 */

export default function ProductAUsClinicsPage() {
  return <ProductAUsClinicLanding />;
}

export async function getStaticProps() {
  return { props: {} };
}
