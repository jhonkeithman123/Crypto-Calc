import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import CipherScreen from './src/screens/CipherScreen';
import ModCalcScreen from './src/screens/ModCalcScreen';
import { C } from './src/theme';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={{
            headerStyle:      { backgroundColor: C.bgPanel },
            headerTintColor:  C.textPrimary,
            headerTitleStyle: { fontSize: 15, fontWeight: '700' },
            tabBarStyle: {
              backgroundColor: C.bgPanel,
              borderTopColor:  'rgba(139,92,246,0.18)',
              height: 58,
              paddingBottom: 8,
            },
            tabBarActiveTintColor:   '#8b5cf6',
            tabBarInactiveTintColor: '#5a5880',
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          }}
        >
          <Tab.Screen
            name="Cipher"
            component={CipherScreen}
            options={{
              title: 'Caesar Cipher',
              tabBarLabel: 'Cipher Calc',
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size - 4, color }}>🔐</Text>
              ),
            }}
          />
          <Tab.Screen
            name="ModCalc"
            component={ModCalcScreen}
            options={{
              title: 'Mod Calculator',
              tabBarLabel: 'Mod Calc',
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size - 4, color }}>∑</Text>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
