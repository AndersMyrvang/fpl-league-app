import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fplleague.app',
  appName: 'FPL League',
  // webDir points at public/ as a placeholder — the actual app loads from server.url below.
  // To switch to a fully bundled static build later, set output:'export' in next.config.js,
  // change webDir to 'out', and remove server.url.
  webDir: 'public',
  server: {
    // TODO: replace with your actual Vercel deployment URL once deployed.
    // Example: 'https://fpl-league-app.vercel.app'
    url: 'https://leaguestatsfpl.vercel.app',
    cleartext: false,
  },
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#09090f',
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#09090f',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
    },
  },
};

export default config;
