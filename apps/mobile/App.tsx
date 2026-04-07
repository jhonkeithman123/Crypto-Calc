import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  GestureResponderEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import CipherScreen from "./src/screens/CipherScreen";
import ModCalcScreen from "./src/screens/ModCalcScreen";
import BaseConvertScreen from "./src/screens/BaseConvertScreen";
import AppInfoScreen from "./src/screens/AppInfoScreen";
import { C } from "./src/theme";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}

function AppShell() {
  const insets = useSafeAreaInsets();
  const [showInfo, setShowInfo] = useState(false);

  const swallowBackdropPress = (e: GestureResponderEvent) => {
    e.stopPropagation();
  };

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <MainTabs onOpenInfo={() => setShowInfo(true)} />

      <Modal
        transparent
        animationType="fade"
        statusBarTranslucent
        visible={showInfo}
        onRequestClose={() => setShowInfo(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setShowInfo(false)}>
          <Pressable style={s.panel} onPress={swallowBackdropPress}>
            <View
              style={[
                s.panelHeader,
                { paddingTop: insets.top + 8, paddingBottom: 8 },
              ]}
            >
              <Text style={s.panelTitle}>About & Updates</Text>
              <TouchableOpacity
                style={s.closeBtn}
                onPress={() => setShowInfo(false)}
              >
                <Text style={s.closeBtnTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <AppInfoScreen />
          </Pressable>
        </Pressable>
      </Modal>
    </NavigationContainer>
  );
}

function MainTabs({ onOpenInfo }: { onOpenInfo: () => void }) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 14);

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: C.bgPanel },
        headerTintColor: C.textPrimary,
        headerTitleStyle: { fontSize: 15, fontWeight: "700" },
        headerRight: () => (
          <TouchableOpacity
            style={{
              marginRight: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
            onPress={onOpenInfo}
          >
            <Text style={{ color: C.cyan, fontSize: 12, fontWeight: "700" }}>
              ABOUT
            </Text>
          </TouchableOpacity>
        ),
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: C.bgPanel,
          borderTopColor: "rgba(139,92,246,0.18)",
          height: 56 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#8b5cf6",
        tabBarInactiveTintColor: "#5a5880",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Cipher"
        component={CipherScreen}
        options={{
          title: "Caesar Cipher",
          tabBarLabel: "Cipher Calc",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size - 4, color }}>🔐</Text>
          ),
        }}
      />
      <Tab.Screen
        name="ModCalc"
        component={ModCalcScreen}
        options={{
          title: "Mod Calculator",
          tabBarLabel: "Mod Calc",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size - 4, color }}>∑</Text>
          ),
        }}
      />
      <Tab.Screen
        name="BaseConvert"
        component={BaseConvertScreen}
        options={{
          title: "Base Converter",
          tabBarLabel: "Convert",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size - 4, color }}>⇄</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  panel: {
    width: "88%",
    maxWidth: 420,
    height: "100%",
    backgroundColor: C.bgBase,
    borderLeftWidth: 1,
    borderLeftColor: C.border,
  },
  panelHeader: {
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bgPanel,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  panelTitle: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bgCard,
  },
  closeBtnTxt: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
});
