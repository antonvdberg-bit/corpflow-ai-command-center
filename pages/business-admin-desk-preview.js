import React from 'react';

import BusinessAdminDeskPublicLanding from '../components/BusinessAdminDeskPublicLanding.js';

export default function BusinessAdminDeskPreviewPage() {
  return <BusinessAdminDeskPublicLanding />;
}

export async function getServerSideProps() {
  if (String(process.env.VERCEL_ENV || '').toLowerCase() === 'production') {
    return { notFound: true };
  }

  return { props: {} };
}
