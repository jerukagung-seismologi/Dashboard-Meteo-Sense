/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingExcludes: {
    '*': [
      '**/*.db',
      '**/*.db-journal',
      '**/*.sqlite',
      '**/*.sqlite3',
    ],
  },
  async redirects() {
    return [
      {
        source: '/dashboard/reanalisis-era5',
        destination: '/dashboard/klimatologi?tab=era5',
        permanent: true,
      },
      {
        source: '/dashboard/validasi-bias',
        destination: '/dashboard/kalibrasi?tab=validation',
        permanent: true,
      },
      {
        source: '/dashboard/settings',
        destination: '/dashboard/kalibrasi?tab=sensor-settings',
        permanent: true,
      },
      {
        source: '/dashboard/settings/calibration',
        destination: '/dashboard/kalibrasi?tab=sensor-settings',
        permanent: true,
      },
      {
        source: '/dashboard/climate-drivers/mjo',
        destination: '/dashboard/tropical-dynamics',
        permanent: true,
      },
      {
        source: '/dashboard/climate-drivers/monsoon',
        destination: '/dashboard/indeks-monsun',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
