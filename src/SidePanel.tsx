import { CircleQuestionMark, Info, Settings } from 'lucide-react-native';
import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const SidePanelContext = createContext(() => {});

const events = ['USMOKSKCMM6', 'USMOKSKCMM7', 'USMOKSKCMM8', 'USMOKSKCMLT'];
const utilities = [
  { label: 'Help', icon: CircleQuestionMark },
  { label: 'About', icon: Info },
  { label: 'Settings', icon: Settings },
];

export default function SidePanel({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const width = Math.min(useWindowDimensions().width * 0.88, 420);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  function close() {
    Animated.timing(progress, { toValue: 0, duration: reduceMotion ? 0 : 200, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  }

  return (
    <SidePanelContext.Provider value={() => setVisible(true)}>
      <View style={styles.root} accessibilityElementsHidden={visible} importantForAccessibility={visible ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        presentationStyle="overFullScreen"
        onRequestClose={close}
        onShow={() => Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 0 : 160, useNativeDriver: true }).start()}>
        <View style={styles.root} accessibilityViewIsModal onAccessibilityEscape={close}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
            <Pressable style={styles.root} onPress={close} accessibilityRole="button" accessibilityLabel="Close side panel" />
          </Animated.View>
          <Animated.View
            style={[
              styles.panel,
              {
                width,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
                transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] }) }],
              },
            ]}>
            <View style={styles.rail}>
              <View accessible accessibilityLabel="Vanguard" accessibilityRole="image" style={styles.icon}>
                <Text style={styles.monogram}>V</Text>
              </View>
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
          </Animated.View>
        </View>
      </Modal>
    </SidePanelContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
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
  heading: { color: '#bdbdbd', fontFamily: 'JetBrainsMono_400Regular', fontSize: 16, marginTop: 32, marginBottom: 20 },
  event: { color: '#e1e1e1', fontFamily: 'JetBrainsMono_400Regular', fontSize: 16, paddingBottom: 20 },
});
