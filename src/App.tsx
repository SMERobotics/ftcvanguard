import { JetBrainsMono_400Regular, useFonts } from '@expo-google-fonts/jetbrains-mono';
import { Text, View } from 'react-native';

export default function App() {
  const [loaded, error] = useFonts({ JetBrainsMono_400Regular });

  if (error) throw error;

  return (
    <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
      {loaded && <Text style={{ color: 'white', fontFamily: 'JetBrainsMono_400Regular' }}>Vanguard</Text>}
    </View>
  );
}
