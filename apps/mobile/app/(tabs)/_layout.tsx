import { Tabs } from "expo-router";
import { Text } from "react-native";

/**
 * Bottom tab bar. Lucide icons would be nicer but require an extra dep —
 * keeping the dep list minimal for now and using emoji glyphs as placeholder
 * tab icons. Swap to lucide-react-native or @expo/vector-icons when polishing.
 */

function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#f0c674",
        tabBarInactiveTintColor: "#a1a1aa",
        tabBarStyle: {
          backgroundColor: "#0b0b0d",
          borderTopColor: "#27272f",
        },
        headerStyle: { backgroundColor: "#0b0b0d" },
        headerTintColor: "#f5f5f7",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <TabIcon glyph="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="contestants"
        options={{
          title: "Contestants",
          tabBarIcon: ({ color }) => <TabIcon glyph="🎤" color={color} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: "Watchlist",
          tabBarIcon: ({ color }) => <TabIcon glyph="🔖" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <TabIcon glyph="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}
