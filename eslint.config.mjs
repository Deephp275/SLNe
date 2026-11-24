import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextVitals,
  { ignores: ['.next/**', 'node_modules/**', 'tests/**', 'test-results/**', 'playwright-report/**', 'server.js', 'playwright.config.js', 'data/**'] },
  { linterOptions: { reportUnusedDisableDirectives: 'off' } },
  {
    rules: {
      // Reading the URL / window on first load and then setting state is deliberate in these screens and works correctly
      'react-hooks/set-state-in-effect': 'off',
      // After sign-in/sign-out we want a FULL page load so the new session cookie is used everywhere
      '@next/next/no-location-assign-relative-destination': 'off',
    },
  },
  // The admin screens show photos at tiny sizes straight from the upload folder; next/image adds nothing there
  { files: ['app/admin/**', 'components/admin/**'], rules: { '@next/next/no-img-element': 'off' } },
];
export default config;