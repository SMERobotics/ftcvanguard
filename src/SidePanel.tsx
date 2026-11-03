import { CircleQuestionMark, Info, Settings } from 'lucide-react-native';
import { createContext, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const SidePanelContext = createContext(() => {});

const events = ['USMOKSKCMM6', 'USMOKSKCMM7', 'USMOKSKCMM8', 'USMOKSKCMLT'];
const utilities = [
  { label: 'Help', icon: CircleQuestionMark },
  { label: 'About', icon: Info },
  { label: 'Settings', icon: Settings },
];

export default function SidePanel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const width = Math.min(useWindowDimensions().width * 0.88, 420);

  return (
    <SidePanelContext.Provider value={() => setOpen(true)}>
      <Drawer
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        drawerPosition="left"
        drawerType="front"
        swipeEdgeWidth={32}
        drawerStyle={{ width, backgroundColor: '#333333' }}
        overlayAccessibilityLabel="Close side panel"
        renderDrawerContent={() => (
          <View
            accessibilityViewIsModal={open}
            onAccessibilityEscape={() => setOpen(false)}
            style={[styles.panel, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.rail}>
              <Pressable onPress={() => setOpen(false)} accessibilityLabel="Close side panel" accessibilityRole="button" style={styles.icon}>
                <Text style={styles.monogram}>V</Text>
              </Pressable>
              <View style={styles.utilities}>
                {utilities.map(({ label, icon: Icon }) => (
                  <View key={label} accessible accessibilityLabel={label} accessibilityRole="image" style={styles.utility}>
                    <Icon color="#e1e1e1" size={24} strokeWidth={2} />
                  </View>
                ))}
              </View>
            </View>
            <ScrollView style={styles.content} contentContainerStyle={styles.contentInset}>
              <Text accessibilityRole="header" style={styles.title}>20181</Text>
              <Text style={styles.subtitle}>SME Lancers</Text>
              <Text accessibilityRole="header" style={styles.heading}>EVENTS</Text>
              {events.map(event => <Text key={event} style={styles.event}>{event}</Text>)}
            </ScrollView>
          </View>
        )}>
        {children}
      </Drawer>
    </SidePanelContext.Provider>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, flexDirection: 'row', backgroundColor: '#333333' },
  rail: { width: 72, alignItems: 'center', paddingTop: 20, paddingBottom: 12, borderRightWidth: 1, borderColor: '#414143'  },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3478C5', alignItems: 'center', justifyContent: 'center' },
  monogram: { color: 'white', fontFamily: 'JetBrainsMono_400Regular', fontSize: 22 },
  utilities: { marginTop: 'auto', gap: 8, paddingTop: 24 },
  utility: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  contentInset: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  title: { color: 'white', fontFamily: 'JetBrainsMono_700Bold', fontSize: 24, marginTop: -3 },
  subtitle: { color: '#bdbdbd', fontFamily: 'JetBrainsMono_400Regular', fontSize: 12, marginTop: -2 },
  heading: { color: '#9a9a9a', fontFamily: 'JetBrainsMono_400Regular', fontSize: 16, marginTop: 32, marginBottom: 20 },
  event: { color: '#e1e1e1', fontFamily: 'JetBrainsMono_400Regular', fontSize: 16, paddingBottom: 20 },
});
