import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login_app" />
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}
