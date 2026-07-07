import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ModalForm } from '../../components/ui/ModalForm';
import { useApi } from '../../hooks/useApi';
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { FontSizes, Spacing, BorderRadius } from '../../constants/typography';
import type { Project, Employee } from '../../types';

const SV: Record<string, string> = { active: 'success', completed: 'info', on_hold: 'warning', cancelled: 'error' };

export default function ProjectsScreen() {
  const { data, get } = useApi<any>();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selManager, setSelManager] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => get('/projects');

  useEffect(() => {
    load();
    api.get('/employees').then(r => setEmployees(r.data.data || r.data || [])).catch(() => {});
  }, []);

  const list: Project[] = data?.data ?? data ?? [];

  const openForm = () => {
    setName(''); setDesc(''); setEndDate(''); setSelManager('');
    setShowForm(true);
  };

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post('/projects', {
        name: name.trim(),
        description: desc.trim() || undefined,
        start_date: new Date().toISOString().split('T')[0],
        end_date: endDate.trim() || undefined,
        manager_id: selManager || undefined,
      });
      setShowForm(false);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally { setSaving(false); }
  };

  const del = (id: string, n: string) => {
    const d = async () => { try { await api.delete(`/projects/${id}`); load(); } catch {} };
    Platform.OS === 'web'
      ? (confirm(`Delete "${n}"?`) && d())
      : Alert.alert('Delete', `Delete "${n}"?`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: d }]);
  };

  return (
    <View style={st.root}>
      <Header title="Projects" />
      <View style={st.toolbar}>
        <View>
          <Text style={st.tTitle}>{list.length} projects</Text>
          <Text style={st.tSub}>Track progress</Text>
        </View>
        <Button title="New" onPress={openForm} size="sm" icon={<Ionicons name="add" size={15} color={Colors.black} />} />
      </View>
      <FlatList
        data={list}
        keyExtractor={i => i.id}
        contentContainerStyle={st.fl}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card style={st.card}>
            <View style={st.topRow}>
              <View style={st.titleRow}>
                <View style={st.iconBox}><Ionicons name="folder-open" size={16} color={Colors.primary} /></View>
                <Text style={st.projName} numberOfLines={1}>{item.name}</Text>
              </View>
              <View style={st.actions}>
                <Badge label={item.status} variant={SV[item.status] as any} />
                <TouchableOpacity onPress={() => del(item.id, item.name)} style={st.xBtn}>
                  <Ionicons name="close" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            {item.description && <Text style={st.desc} numberOfLines={2}>{item.description}</Text>}
            <View style={st.meta}>
              <View style={st.metaItem}>
                <Ionicons name="checkbox-outline" size={13} color={Colors.textMuted} />
                <Text style={st.metaText}>{item.task_count} tasks</Text>
              </View>
              {item.manager_name && (
                <View style={st.metaItem}>
                  <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
                  <Text style={st.metaText}>{item.manager_name}</Text>
                </View>
              )}
              {item.end_date && (
                <View style={st.metaItem}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                  <Text style={st.metaText}>{new Date(item.end_date).toLocaleDateString()}</Text>
                </View>
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={<View style={st.empty}><Text style={st.emptyT}>No projects</Text></View>}
      />

      <ModalForm visible={showForm} onClose={() => setShowForm(false)} title="New Project">
        <Input label="Project Name" placeholder="e.g. Mobile App v3.0" value={name} onChangeText={setName} />
        <Input label="Description" placeholder="Brief description..." value={desc} onChangeText={setDesc} multiline numberOfLines={2} />
        <Input label="End Date" placeholder="YYYY-MM-DD" value={endDate} onChangeText={setEndDate} />

        <Text style={st.selectLabel}>Manager</Text>
        <View style={st.chipRow}>
          {employees.filter(e => e.status === 'active').slice(0, 10).map(e => (
            <TouchableOpacity
              key={e.id}
              style={[st.chip, selManager === e.id && st.chipActive]}
              onPress={() => setSelManager(selManager === e.id ? '' : e.id)}
            >
              <Text style={[st.chipText, selManager === e.id && st.chipTextActive]}>
                {e.first_name} {e.last_name[0]}.
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 12 }} />
        <Button title="Create Project" onPress={create} loading={saving} fullWidth size="lg" />
      </ModalForm>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base },
  tTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  tSub: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 1 },
  fl: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, paddingBottom: 60 },
  card: { padding: Spacing.base, gap: Spacing.sm },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  iconBox: { width: 30, height: 30, borderRadius: BorderRadius.sm, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  projName: { color: Colors.text, fontSize: FontSizes.base, fontWeight: '600', flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  xBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  desc: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 18 },
  meta: { flexDirection: 'row', gap: Spacing.lg, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { color: Colors.textMuted, fontSize: FontSizes.xs },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyT: { color: Colors.textMuted },
  selectLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '500', marginBottom: Spacing.sm, marginTop: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgSurface },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  chipText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  chipTextActive: { color: Colors.primaryLight, fontWeight: '600' },
});
