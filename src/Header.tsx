import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Bell, Search } from 'lucide-react-native';
import { useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SidePanelContext } from './SidePanel';

export default function Header({ title, children }: { title: string; children?: ReactNode }) {
  const openPanel = useContext(SidePanelContext);
  const glass = isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.header}>
      <View style={styles.row}>
        <Pressable onPress={openPanel} accessibilityRole="button" accessibilityLabel={`${title}, open side panel`} hitSlop={6} style={styles.identity}>
          <View style={styles.icon}>
            <Text style={styles.monogram}>V</Text>
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.title}>
            {title}
          </Text>
        </Pressable>
        <GlassView
          glassEffectStyle={glass ? 'regular' : 'none'}
          isInteractive
          colorScheme="dark"
          style={[styles.actions, !glass && styles.fallback]}>
          <View
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            style={styles.button}>
            <Bell color="white" size={24} strokeWidth={1.5} />
          </View>
          <View
            accessibilityLabel="Search"
            accessibilityRole="button"
            style={styles.button}>
            <Search color="white" size={24} strokeWidth={1.5} />
          </View>
        </GlassView>
      </View>
      {children && <View style={styles.controls}>{children}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#212121' },
  controls: { paddingHorizontal: 20, paddingBottom: 8 }, // paddingBottom: 12
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 0, paddingBottom: 12, transform: [{ translateX: 3 }] }, // paddingBottom: 20
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3478C5', alignItems: 'center', justifyContent: 'center' },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  monogram: { color: 'white', fontFamily: 'JetBrainsMono_400Regular', fontSize: 22 },
  title: { flex: 1, color: 'white', fontFamily: 'JetBrainsMono_700Bold', fontSize: 28, letterSpacing: -0.5 },
  actions: { flexDirection: 'row', gap: 0, flexShrink: 0, borderRadius: 20 },
  button: { width: 48, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  fallback: { backgroundColor: '#2C2C2E', borderWidth: 1, borderColor: '#414143' },
});
