/**
 * Legacy campaign URL retained only for old links.
 * Lead Rescue is the canonical public product and buyer route.
 */
export default function LegacyEnquiryRecoveryRoute() {
  return null;
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/lead-rescue',
      permanent: true,
    },
  };
}
