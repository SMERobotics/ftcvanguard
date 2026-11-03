import { JetBrainsMono_400Regular, JetBrainsMono_700Bold, useFonts } from '@expo-google-fonts/jetbrains-mono';
import { selectionAsync } from 'expo-haptics';
import { NativeTabs } from 'expo-router/native-tabs';

export default function App() {
  const [loaded, error] = useFonts({ JetBrainsMono_400Regular, JetBrainsMono_700Bold });

  if (error) throw error;
  if (!loaded) return null;

  return (
    <NativeTabs
      labelStyle={{ fontFamily: 'JetBrainsMono_400Regular' }}
      screenListeners={({ navigation }) => ({
        tabPress: ({ data }) => {
          if (data.isPrevented || navigation.isFocused()) return;
          void selectionAsync().catch(() => {});
        },
      })}>
      <NativeTabs.Trigger name="schedule">
        <NativeTabs.Trigger.Label>Schedule</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('./assets/lucide/clipboard-clock.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rankings">
        <NativeTabs.Trigger.Label>Rankings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('./assets/lucide/podium.png')} renderingMode="template" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
