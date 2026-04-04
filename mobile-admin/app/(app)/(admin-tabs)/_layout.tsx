import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ADMIN_PRIMARY = '#7C3AED';
const ADMIN_INACTIVE = '#374151';

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ADMIN_PRIMARY,
        tabBarInactiveTintColor: ADMIN_INACTIVE,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#D1D5DB',
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 88 : 68,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: 3,
        },
      }}
    >
      <Tabs.Screen name="dashboard/index" options={{ title: 'Dashboard', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="attendance/index" options={{ title: 'Attendance', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'time' : 'time-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="leaves/index" options={{ title: 'Leaves', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="employees/index" options={{ title: 'Employees', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="profile/index" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} /> }} />
    </Tabs>
  );
}
