import React from 'react';
import { Tabs } from 'expo-router';
import { useAuthContext } from '@/context/AuthContext';
import { Chrome as Home, Upload, Trophy, BookOpen, Users, Settings, ChartBar as BarChart3, MessageSquare } from 'lucide-react-native';

export default function TabLayout() {
  const { user } = useAuthContext();

  if (!user) return null;

  const getTabsForRole = () => {
    switch (user.role) {
      case 'admin':
        return [
          {
            name: 'index',
            title: 'Dashboard',
            icon: Home,
          },
          {
            name: 'users',
            title: 'Users',
            icon: Users,
          },
          {
            name: 'analytics',
            title: 'Analytics',
            icon: BarChart3,
          },
          {
            name: 'settings',
            title: 'Settings',
            icon: Settings,
          },
        ];

      case 'guru':
        return [
          {
            name: 'index',
            title: 'Dashboard',
            icon: Home,
          },
          {
            name: 'setoran',
            title: 'Setoran',
            icon: MessageSquare,
          },
          {
            name: 'quiz',
            title: 'Quiz',
            icon: BookOpen,
          },
          {
            name: 'students',
            title: 'Siswa',
            icon: Users,
          },
        ];

      case 'siswa':
        return [
          {
            name: 'index',
            title: 'Home',
            icon: Home,
          },
          {
            name: 'upload',
            title: 'Upload',
            icon: Upload,
          },
          {
            name: 'quiz',
            title: 'Quiz',
            icon: BookOpen,
          },
          {
            name: 'achievements',
            title: 'Prestasi',
            icon: Trophy,
          },
        ];

      case 'ortu':
        return [
          {
            name: 'index',
            title: 'Home',
            icon: Home,
          },
          {
            name: 'progress',
            title: 'Progress',
            icon: BarChart3,
          },
          {
            name: 'achievements',
            title: 'Prestasi',
            icon: Trophy,
          },
        ];

      default:
        return [
          {
            name: 'index',
            title: 'Home',
            icon: Home,
          },
        ];
    }
  };

  const tabs = getTabsForRole();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ size, color }) => (
              <tab.icon size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}