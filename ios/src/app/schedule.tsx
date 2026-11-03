import { ListFilter } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import Header from '../Header';
import { EventMatch, TeamMatch } from '../Matches';
import Switcher from '../Switcher';
import { EVENT, TEAM, fetchSchedule, matchKey, scheduleSections, teamAlliance, type Match } from '../schedule';

export default function Schedule() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const list = useRef<SectionList<Match>>(null);

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError('');
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const schedule = await fetchSchedule(controller.signal);
      if (request.current === controller) setMatches(schedule);
    } catch {
      if (request.current === controller) {
        setError(controller.signal.aborted
          ? 'request timed out'
          : 'fuck you lmao');
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setPending(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [load]);

  const competing = selectedIndex === 0;
  const sections = scheduleSections(matches ?? [], competing);
  const count = sections.reduce((total, section) => total + section.data.length, 0);
  const team = matches?.flatMap(match => [...match.teams.red, ...match.teams.blue]).find(team => team.number === TEAM);

  return (
    <View style={styles.screen}>
      <Header title={EVENT}>
        <View style={styles.controls}>
          <Switcher selectedIndex={selectedIndex} onChange={index => {
            setSelectedIndex(index);
            list.current?.getScrollResponder()?.scrollTo({ y: 0, animated: false });
          }} />
          <View style={styles.filter}>
            <ListFilter color="#e1e1e1" size={16} strokeWidth={2} accessible={false} />
            <Text style={styles.filterText}>Filter</Text>
          </View>
        </View>
      </Header>
      <SectionList
        ref={list}
        sections={sections}
        keyExtractor={matchKey}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        stickySectionHeadersEnabled={false}
        refreshing={pending && matches !== null}
        onRefresh={() => void load()}
        ListHeaderComponent={
          <View style={styles.intro}>
            {/* <Text style={styles.team}>{TEAM}{team && ` · ${team.name.trim()}`}</Text> */}
            {matches !== null && <Text style={styles.count}>{count} {count === 1 ? 'match' : 'matches'}{!competing && ' in the event'}</Text>}
            {!!error && (
              <View style={styles.message} accessibilityLiveRegion="polite">
                <Text style={styles.messageText}>{error}</Text>
                <Pressable accessibilityRole="button" onPress={() => void load()} disabled={pending} style={styles.retry}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.section}>
            <Text style={styles.date}>{section.date}</Text>
            <Text accessibilityRole="header" style={styles.phase}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const alliance = teamAlliance(item);
          return alliance ? <TeamMatch match={item} alliance={alliance} /> : <EventMatch match={item} />;
        }}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        ListEmptyComponent={
          pending && matches === null ? (
            <View style={styles.message}>
              <ActivityIndicator color="#e1e1e1" accessibilityLabel="Loading schedule" />
              <Text style={styles.empty}>Loading schedule…</Text>
            </View>
          ) : !error ? (
            <Text style={styles.empty}>{competing && matches?.length
              ? `No matches for ${TEAM} at this event.`
              : 'No matches have been scheduled for this event.'}</Text>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 8, transform: [{ translateX: 3 }] },
  filterText: { color: '#e1e1e1', fontFamily: 'JetBrainsMono_400Regular', fontSize: 16, letterSpacing: -0.5 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
  intro: { paddingTop: 20, paddingBottom: 4 },
  team: { color: '#e1e1e1', fontFamily: 'JetBrainsMono_700Bold', fontSize: 16 },
  count: { color: '#9a9a9a', fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, marginTop: 6 },
  section: { paddingTop: 24, paddingBottom: 12, gap: 6 },
  date: { color: '#9a9a9a', fontFamily: 'JetBrainsMono_400Regular', fontSize: 13 },
  phase: { color: '#e1e1e1', fontFamily: 'JetBrainsMono_700Bold', fontSize: 16 },
  gap: { height: 12 },
  message: { paddingVertical: 20 },
  messageText: { color: '#e1e1e1', fontFamily: 'JetBrainsMono_400Regular', fontSize: 14, lineHeight: 21 },
  retry: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, marginLeft: -12 },
  retryText: { color: '#e1e1e1', fontFamily: 'JetBrainsMono_700Bold', fontSize: 14 },
  empty: { color: '#9a9a9a', fontFamily: 'JetBrainsMono_400Regular', fontSize: 14, lineHeight: 21, paddingTop: 20 },
});

