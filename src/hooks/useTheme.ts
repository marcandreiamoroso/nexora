import { darkTheme, lightTheme, Theme } from "@/constants/nexoraTheme";
import { useColorScheme } from "react-native";

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? darkTheme : lightTheme;
}
