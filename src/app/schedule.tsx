import { ListFilter } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Header from '../Header';
import Switcher from '../Switcher';

export default function Schedule() {
  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <Header title="USMOKSKCMM6">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Switcher />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, transform: [{ translateX: 3 }] }}>
            <ListFilter color="#e1e1e1" size={16} strokeWidth={2} accessible={false} />
            <Text style={{ color: '#e1e1e1', fontFamily: 'JetBrainsMono_400Regular', fontSize: 16, letterSpacing: -0.5 }}>Filter</Text>
          </View>
        </View>
      </Header>
    </View>
  );
}

