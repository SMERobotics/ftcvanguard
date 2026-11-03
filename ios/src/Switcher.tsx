import NativeControl, { type SegmentedControlProps } from '@react-native-segmented-control/segmented-control';
import { selectionAsync } from 'expo-haptics';
import { type ComponentType } from 'react';
import { Platform } from 'react-native';

// The package's legacy class declaration is incompatible with current React types.
const SegmentedControl = NativeControl as unknown as ComponentType<SegmentedControlProps>;

export default function Switcher({ selectedIndex, onChange }: { selectedIndex: number; onChange: (index: number) => void }) {
  return (
    <SegmentedControl
      values={['Compete', 'Overall']}
      selectedIndex={selectedIndex}
      onChange={event => {
        const next = event.nativeEvent.selectedSegmentIndex;
        if (next === selectedIndex) return;
        onChange(next);
        void selectionAsync().catch(() => {});
      }}
      appearance="dark"
      fontStyle={{ fontFamily: Platform.OS === 'ios' ? 'JetBrainsMono-Bold' : 'JetBrainsMono_700Bold', fontSize: 14, color: '#e1e1e1' }}
      activeFontStyle={{ fontFamily: Platform.OS === 'ios' ? 'JetBrainsMono-Bold' : 'JetBrainsMono_700Bold', fontSize: 14, color: '#e1e1e1' }}
      style={{ width: 149, maxWidth: '100%', marginLeft: -6 }}
    />
  );
}
