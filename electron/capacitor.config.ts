import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.ftcvanguard.vanguard",
  appName: "Vanguard",
  webDir: "dist",
  plugins: {
    SystemBars: {
      style: "DARK",
    },
  },
};

export default config;
