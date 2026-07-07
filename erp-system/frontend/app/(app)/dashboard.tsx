import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/layout/Header';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useApi } from '../../hooks/useApi';
import { Colors } from '../../constants/colors';
import { FontSizes, Spacing, BorderRadius } from '../../constants/typography';
import type { DashboardStats } from '../../types';

export default function DashboardScreen() {
  const { data: stats, get } = useApi<DashboardStats>();
  useEffect(() => { get('/reports/dashboard'); }, []);
  const s = stats;

  return (
    <View style={styles.root}>
      <Header title="Overview" />
      <PageWrapper>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Dashboard</Text>
          <View style={styles.heroPill}>
            <View style={styles.liveDot} />
            <Text style={styles.heroSub}>Live</Text>
          </View>
        </View>

        {/* Top row — 2 large cards */}
        <View style={styles.rowTwo}>
          <Card style={styles.bigCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: Colors.primaryMuted }]}>  
                <Ionicons name="people" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.cardLabel}>People</Text>
            </View>
            <Text style={styles.bigNumber}>{s?.employees.total ?? '—'}</Text>
            <View style={styles.miniStats}>
              <View style={styles.miniRow}>
                <View style={[styles.miniDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.miniText}>{s?.employees.active ?? 0} active</Text>
              </View>
              <View style={styles.miniRow}>
                <View style={[styles.miniDot, { backgroundColor: Colors.warning }]} />
                <Text style={styles.miniText}>{(s?.employees.total ?? 0) - (s?.employees.active ?? 0)} other</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.bigCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: Colors.infoBg }]}>  
                <Ionicons name="layers" size={18} color={Colors.info} />
              </View>
              <Text style={styles.cardLabel}>Projects</Text>
            </View>
            <Text style={styles.bigNumber}>{s?.projects.total ?? '—'}</Text>
            <View style={styles.miniStats}>
              <View style={styles.miniRow}>
                <View style={[styles.miniDot, { backgroundColor: Colors.info }]} />
                <Text style={styles.miniText}>{s?.projects.active ?? 0} active</Text>
              </View>
              <View style={styles.miniRow}>
                <View style={[styles.miniDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.miniText}>{(s?.projects.total ?? 0) - (s?.projects.active ?? 0)} completed</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Middle row — 2 small cards */}
        <View style={styles.rowTwo}>
          <Card style={styles.smallCard}>
            <View style={styles.smallCardInner}>
              <View style={[styles.iconCircle, { backgroundColor: Colors.accentMuted }]}>
                <Ionicons name="grid" size={16} color={Colors.accent} />
              </View>
              <View>
                <Text style={styles.smallNumber}>{s?.departments.total ?? '—'}</Text>
                <Text style={styles.smallLabel}>Teams</Text>
              </View>
            </View>
          </Card>
          <Card style={styles.smallCard}>
            <View style={styles.smallCardInner}>
              <View style={[styles.iconCircle, { backgroundColor: Colors.warningBg }]}>
                <Ionicons name="checkbox" size={16} color={Colors.warning} />
              </View>
              <View>
                <Text style={styles.smallNumber}>{s?.tasks.total ?? '—'}</Text>
                <Text style={styles.smallLabel}>Total Tasks</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Pipeline — full width */}
        {s && (
          <Card style={styles.pipelineCard}>
            <Text style={styles.sectionTitle}>Task Pipeline</Text>
            
            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View style={[styles.seg, { flex: s.tasks.done, backgroundColor: Colors.primary, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }]} />
              <View style={[styles.seg, { flex: s.tasks.review, backgroundColor: Colors.accent }]} />
              <View style={[styles.seg, { flex: s.tasks.in_progress, backgroundColor: Colors.warning }]} />
              <View style={[styles.seg, { flex: s.tasks.todo, backgroundColor: Colors.bgElevated, borderTopRightRadius: 4, borderBottomRightRadius: 4 }]} />
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              <LegendItem color={Colors.primary} label="Done" count={s.tasks.done} />
              <LegendItem color={Colors.accent} label="Review" count={s.tasks.review} />
              <LegendItem color={Colors.warning} label="Active" count={s.tasks.in_progress} />
              <LegendItem color={Colors.textMuted} label="Backlog" count={s.tasks.todo} />
            </View>
          </Card>
        )}

        {/* Completion rate */}
        {s && (
          <Card style={styles.completionCard}>
            <View style={styles.completionRow}>
              <View>
                <Text style={styles.sectionTitle}>Completion Rate</Text>
                <Text style={styles.completionSub}>Based on {s.tasks.total} total tasks</Text>
              </View>
              <View style={styles.percentCircle}>
                <Text style={styles.percentText}>
                  {s.tasks.total > 0 ? Math.round((s.tasks.done / s.tasks.total) * 100) : 0}%
                </Text>
              </View>
            </View>
          </Card>
        )}
      </PageWrapper>
    </View>
  );
}

function LegendItem({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendCount}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.lg, marginBottom: Spacing.xl },
  heroTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  heroSub: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '600' },

  rowTwo: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },

  bigCard: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.base },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: '500' },
  bigNumber: { fontSize: 36, fontWeight: '800', color: Colors.text, letterSpacing: -1.5, marginBottom: Spacing.sm },
  miniStats: { gap: 4 },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniDot: { width: 5, height: 5, borderRadius: 2.5 },
  miniText: { fontSize: FontSizes.xs, color: Colors.textMuted },

  smallCard: { flex: 1 },
  smallCardInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  smallNumber: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  smallLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },

  pipelineCard: { marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text, letterSpacing: -0.3, marginBottom: Spacing.base },
  progressBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2, marginBottom: Spacing.lg },
  seg: { minWidth: 4 },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },
  legendCount: { fontSize: FontSizes.sm, color: Colors.text, fontWeight: '700' },

  completionCard: { marginBottom: Spacing.md },
  completionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completionSub: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  percentCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primaryMuted, borderWidth: 2, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  percentText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.primary },
});
