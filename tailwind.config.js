/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./pages/**/*.html",
    "./components/**/*.html",
    "./assets/js/**/*.js"
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2.5rem"
      }
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0E6D66",
          hover: "#0A5752",
          soft: "#D8F0ED"
        },
        secondary: {
          DEFAULT: "#C7B792",
          deep: "#7A6A45",
          soft: "#F2ECDC"
        },
        accent: {
          DEFAULT: "#C35B34",
          soft: "#F9E3D8"
        },
        dark: {
          DEFAULT: "#0F172A",
          soft: "#334155",
          muted: "#64748B"
        },
        surface: {
          DEFAULT: "#F7F3EA",
          muted: "#EEE7D8",
          strong: "#FFFFFF"
        }
      },
      fontFamily: {
        sans: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem",
        34: "8.5rem"
      },
      borderRadius: {
        "4xl": "2rem"
      },
      boxShadow: {
        soft: "0 24px 80px rgba(15, 23, 42, 0.08)",
        lift: "0 30px 120px rgba(15, 23, 42, 0.12)"
      },
      screens: {
        xs: "480px",
        phone: "480px",
        tablet: "768px",
        layout: "1200px",
        wide: "1680px",
        "3xl": "1920px"
      },
      letterSpacing: {
        luxe: "0.18em"
      }
    }
  },
  plugins: []
};
