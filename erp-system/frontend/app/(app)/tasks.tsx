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
import type { Task, Project, Employee } from '../../types';

const PV: Record<string, string> = { low: 'default', medium: 'info', high: 'warning', critical: 'error' };
const SV: Record<string, string> = { todo: 'default', in_progress: 'warning', review: 'primary', done: 'success' };
const SC = ['todo', 'in_progress', 'review', 'done'];

export default function TasksScreen() {
  const { data, get } = useApi<any>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selProj, setSelProj] = useState('');
  const [priority, setPriority] = useState('medium');
  const [selAssignees, setSelAssignees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => get('/tasks');

  useEffect(() => {
    load();
    api.get('/projects').then(r => setProjects(r.data.data || r.data || [])).catch(() => {});
    api.get('/employees').then(r => setEmployees(r.data.data || r.data || [])).catch(() => {});
  }, []);

  const tasks: Task[] = data?.data ?? data ?? [];

  const openForm = () => {
    setTitle(''); setDesc(''); setDueDate(''); setSelProj(''); setPriority('medium'); setSelAssignees([]);
    setShowForm(true);
  };

  const toggleAssignee = (id: string) => {
    setSelAssignees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const create = async () => {
    if (!title.trim() || !selProj) {
      const m = 'Title and project are required';
      Platform.OS === 'web' ? alert(m) : Alert.alert('Error', m);
      return;
    }
    setSaving(true);
    try {
      await api.post('/tasks', {
        title: title.trim(),
        description: desc.trim() || undefined,
        project_id: selProj,
        priority,
        due_date: dueDate.trim() || undefined,
        assignee_ids: selAssignees.length > 0 ? selAssignees : undefined,
      });
      setShowForm(false);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally { setSaving(false); }
  };

  const cycleStatus = async (t: Task) => {
    const next = SC[(SC.indexOf(t.status) + 1) % SC.length];
    try { await api.patch(`/tasks/${t.id}/status`, { status: next }); load(); } catch {}
  };

  const del = (id: string, n: string) => {
    const d = async () => { try { await api.delete(`/tasks/${id}`); load(); } catch {} };
    Platform.OS === 'web' ? (confirm(`Delete "${n}"?`) && d()) : Alert.alert('Delete', `Delete "${n}"?`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: d }]);
  };

  return (
    <View style={st.root}>
      <Header title="Tasks" />
      <View style={st.toolbar}>
        <View>
          <Text style={st.tTitle}>{tasks.length} tasks</Text>
          <Text style={st.tSub}>Click status badge to change</Text>
        </View>
        <Button title="New" onPress={openForm} size="sm" icon={<Ionicons name="add" size={15} color={Colors.black} />} />
      </View>
      <FlatList
        data={tasks}
        keyExtractor={i => i.id}
        contentContainerStyle={st.fl}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card style={st.card}>
            <View style={st.topRow}>
              <Text style={st.taskTitle} numberOfLines={1}>{item.title}</Text>
              <View style={st.acts}>
                <TouchableOpacity onPress={() => cycleStatus(item)}>
                  <Badge label={item.status.replace('_', ' ')} variant={SV[item.status] as any} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => del(item.id, item.title)} style={st.xBtn}>
                  <Ionicons name="close" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            {item.description && <Text style={st.desc} numberOfLines={1}>{item.description}</Text>}
            <View style={st.metaRow}>
              <Badge label={item.priority} variant={PV[item.priority] as any} />
              {item.project_name && <View style={st.mi}><Ionicons name="folder-outline" size={12} color={Colors.textMuted} /><Text style={st.mt}>{item.project_name}</Text></View>}
              {item.due_date && <View style={st.mi}><Ionicons name="calendar-outline" size={12} color={Colors.textMuted} /><Text style={st.mt}>{new Date(item.due_date).toLocaleDateString()}</Text></View>}
            </View>
          </Card>
        )}
        ListEmptyComponent={<View style={st.empty}><Text style={st.emptyT}>No tasks</Text></View>}
      />

      <ModalForm visible={showForm} onClose={() => setShowForm(false)} title="New Task">
        <Input label="Title" placeholder="e.g. Implement search" value={title} onChangeText={setTitle} />
        <Input label="Description" placeholder="Details..." value={desc} onChangeText={setDesc} multiline numberOfLines={2} />
        <Input label="Due Date" placeholder="YYYY-MM-DD" value={dueDate} onChangeText={setDueDate} />

        <Text style={st.selectLabel}>Project</Text>
        <View style={st.chipRow}>
          {projects.map(p => (
            <TouchableOpacity key={p.id} style={[st.chip, selProj === p.id && st.chipActive]} onPress={() => setSelProj(p.id)}>
              <Text style={[st.chipText, selProj === p.id && st.chipTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={st.selectLabel}>Priority</Text>
        <View style={st.chipRow}>
          {['low','medium','high','critical'].map(p => (
            <TouchableOpacity key={p} style={[st.chip, priority === p && st.chipActive]} onPress={() => setPriority(p)}>
              <Text style={[st.chipText, priority === p && st.chipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={st.selectLabel}>Assignees</Text>
        <View style={st.chipRow}>
          {employees.filter(e => e.status === 'active').slice(0, 12).map(e => (
            <TouchableOpacity key={e.id} style={[st.chip, selAssignees.includes(e.id) && st.chipActive]} onPress={() => toggleAssignee(e.id)}>
              <Text style={[st.chipText, selAssignees.includes(e.id) && st.chipTextActive]}>
                {e.first_name} {e.last_name[0]}.
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 12 }} />
        <Button title="Create Task" onPress={create} loading={saving} fullWidth size="lg" />
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
  card: { padding: Spacing.base, gap: Spacing.xs },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { color: Colors.text, fontSize: FontSizes.base, fontWeight: '600', flex: 1, marginRight: Spacing.sm },
  acts: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  xBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  desc: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap', marginTop: 2 },
  mi: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  mt: { color: Colors.textMuted, fontSize: FontSizes.xs },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyT: { color: Colors.textMuted },
  selectLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '500', marginBottom: Spacing.sm, marginTop: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgSurface },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  chipText: { color: Colors.textSecondary, fontSize: FontSizes.sm, textTransform: 'capitalize' },
  chipTextActive: { color: Colors.primaryLight, fontWeight: '600' },
});
