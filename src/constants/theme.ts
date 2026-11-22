export const palette = { primary: "#3157D5", secondary: "#6C8CFF" };

export const lightTheme = {
  ...palette,
  background: "#FFFFFF",
  surface: "#F4F6FB",
  text: "#111827",
  textMuted: "#6B7280",
  border: "#E5E7EB",
};

export const darkTheme = {
  ...palette,
  background: "#0B1020",
  surface: "#151B2E",
  text: "#F3F4F6",
  textMuted: "#9CA3AF",
  border: "#263050",
};

export type Theme = typeof lightTheme;
