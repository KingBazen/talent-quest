/** Tailwind config for the mobile app.
 *
 * Mirrors the brand palette from the web app at [tailwind.config.ts]
 * (../../tailwind.config.ts) so a Tailwind class name that works there
 * works here too. NativeWind transpiles these into RN style objects.
 */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0b0b0d",
        card: "#16161a",
        border: "#27272f",
        muted: "#1f1f25",
        "muted-foreground": "#a1a1aa",
        foreground: "#f5f5f7",
        brand: {
          300: "#f5d68f",
          400: "#f0c674",
          500: "#e2a73f",
          600: "#c98c2c",
          700: "#a06d20",
        },
        destructive: "#dc2626",
      },
      fontFamily: {
        sans: ["System"],
        display: ["System"],
      },
    },
  },
  plugins: [],
};
