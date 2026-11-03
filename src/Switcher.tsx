import NativeControl, { type SegmentedControlProps } from '@react-native-segmented-control/segmented-control';
import { selectionAsync } from 'expo-haptics';
import { type ComponentType, useState } from 'react';
import { Platform } from 'react-native';

// The package's legacy class declaration is incompatible with current React types.
const SegmentedControl = NativeControl as unknown as ComponentType<SegmentedControlProps>;

export default function Switcher() {
  const [selected, setSelected] = useState(0);

  return (
    <SegmentedControl
      values={['Compete', 'Overall']}
      selectedIndex={selected}
      onChange={event => {
        const next = event.nativeEvent.selectedSegmentIndex;
        if (next === selected) return;
        setSelected(next);
        void selectionAsync().catch(() => {});
      }}
      appearance="dark"
      fontStyle={{ fontFamily: Platform.OS === 'ios' ? 'JetBrainsMono-Bold' : 'JetBrainsMono_700Bold', fontSize: 14, color: '#e1e1e1' }}
      activeFontStyle={{ fontFamily: Platform.OS === 'ios' ? 'JetBrainsMono-Bold' : 'JetBrainsMono_700Bold', fontSize: 14, color: '#e1e1e1' }}
      style={{ width: 149, maxWidth: '100%', marginLeft: -6 }}
    />
  );
}
