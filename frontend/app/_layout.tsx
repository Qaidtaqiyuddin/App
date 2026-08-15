import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { usePalette } from "@/src/theme";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const p = usePalette();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: p.surface }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={p.surface} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.surface } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="transaction/new" options={{ presentation: "modal" }} />
          <Stack.Screen name="transaction/[id]" options={{ presentation: "modal" }} />
          <Stack.Screen name="account/edit" options={{ presentation: "modal" }} />
          <Stack.Screen name="bill/edit" options={{ presentation: "modal" }} />
          <Stack.Screen name="debt/edit" options={{ presentation: "modal" }} />
          <Stack.Screen name="savings/edit" options={{ presentation: "modal" }} />
          <Stack.Screen name="note/edit" options={{ presentation: "modal" }} />
          <Stack.Screen name="budget/edit" options={{ presentation: "modal" }} />
          <Stack.Screen name="category/edit" options={{ presentation: "modal" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
