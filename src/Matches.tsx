import { StyleSheet, Text, View } from 'react-native';
import { TEAM, formatTime, matchStatus, matchTime, teamFlags, type Alliance, type Match } from './schedule';

const colors = { red: '#f07777', blue: '#79b6ff' };

export function TeamMatch({ match, alliance }: { match: Match; alliance: Alliance }) {
  const order: Alliance[] = [alliance, alliance === 'red' ? 'blue' : 'red'];
  const playedAt = match.timestamps.actual ?? match.timestamps.estimated;

  return (
    <View accessible style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.title}>{match.name.replace(/\s+/g, ' ')}</Text>
        <Text style={styles.status}>{matchStatus(match, alliance)}</Text>
      </View>
      <Text style={styles.meta}>{matchTime(match)} · Field {match.field}</Text>
      {order.map((color, index) => (
        <View key={color} style={styles.alliance}>
          <View style={styles.lineup}>
            <Text style={[styles.label, { color: colors[color] }]}>
              {color === 'red' ? 'Red' : 'Blue'} · {index === 0 ? 'Your alliance' : 'Opponents'}
            </Text>
            {match.teams[color].map(team => (
              <Text key={team.number} style={styles.team}>
                <Text style={team.number === TEAM && styles.bold}>{team.number}</Text>
                {'  '}<Text style={styles.name}>{team.name.trim()}</Text>
                {teamFlags(team).map(flag => <Text key={flag.key} style={styles.flag}> · {flag.label}</Text>)}
              </Text>
            ))}
          </View>
          <Text style={styles.score}>{match.results[color].score ?? '—'}</Text>
        </View>
      ))}
      {playedAt !== null && playedAt !== match.timestamps.scheduled && (
        <Text style={[styles.meta, styles.scheduled]}>Scheduled {formatTime(match.timestamps.scheduled)}</Text>
      )}
    </View>
  );
}

export function EventMatch({ match }: { match: Match }) {
  return (
    <View accessible style={styles.row}>
      <View style={styles.heading}>
        <Text style={styles.title}>{match.name.replace(/\s+/g, ' ')}</Text>
        <Text style={styles.status}>{matchStatus(match)}</Text>
      </View>
      <Text style={styles.meta}>{matchTime(match)} · Field {match.field}</Text>
      {(['red', 'blue'] as const).map(color => (
        <View key={color} style={styles.compactAlliance}>
          <Text style={[styles.label, styles.colorLabel, { color: colors[color] }]}>{color === 'red' ? 'Red' : 'Blue'}</Text>
          <View style={styles.numbers}>
            {match.teams[color].map(team => (
              <Text
                key={team.number}
                accessibilityLabel={`${team.number}, ${team.name.trim()}${teamFlags(team).map(flag => `, ${flag.label}`).join('')}`}
                style={styles.number}>
                {team.number}
                {teamFlags(team).map(flag => <Text key={flag.key} style={styles.flag}> {flag.short}</Text>)}
              </Text>
            ))}
          </View>
          <Text style={[styles.compactScore, match.results[color].win === true && styles.bold]}>
            {match.results[color].score ?? '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1c1c1e', padding: 14, borderRadius: 12 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { flex: 1, color: '#e1e1e1', fontFamily: 'JetBrainsMono_700Bold', fontSize: 16 },
  status: { color: '#e1e1e1', fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, paddingTop: 2, flexShrink: 1 },
  meta: { color: '#9a9a9a', fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, marginTop: 6 },
  alliance: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  lineup: { flex: 1 },
  label: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 13 },
  team: { color: '#e1e1e1', fontFamily: 'JetBrainsMono_400Regular', fontSize: 14, lineHeight: 21, marginTop: 4 },
  name: { fontSize: 13 },
  flag: { color: '#9a9a9a', fontSize: 12 },
  bold: { fontFamily: 'JetBrainsMono_700Bold' },
  score: { color: '#e1e1e1', fontFamily: 'JetBrainsMono_700Bold', fontSize: 24, fontVariant: ['tabular-nums'] },
  scheduled: { marginTop: 14 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ffffff26' },
  compactAlliance: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10 },
  colorLabel: { minWidth: 40, paddingTop: 1 },
  numbers: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  number: { color: '#e1e1e1', fontFamily: 'JetBrainsMono_400Regular', fontSize: 14 },
  compactScore: { color: '#e1e1e1', fontFamily: 'JetBrainsMono_400Regular', fontSize: 16, fontVariant: ['tabular-nums'] },
});
