import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette } from "@/src/theme";

export default function TabsLayout() {
  const p = usePalette();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.brandPrimary,
        tabBarInactiveTintColor: p.onSurfaceTertiary,
        tabBarStyle: {
          backgroundColor: p.surfaceSecondary,
          borderTopColor: p.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-variant" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transaksi"
        options={{
          title: "Transaksi",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="swap-horizontal" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="anggaran"
        options={{
          title: "Anggaran",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-donut" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="laporan"
        options={{
          title: "Laporan",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-line" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="lainnya"
        options={{
          title: "Lainnya",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
