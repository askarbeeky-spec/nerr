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
import type { Employee } from '../../types';

const SV: Record<string, string> = { active: 'success', inactive: 'error', on_leave: 'warning' };

interface Dept { id: string; name: string; }
interface Pos { id: string; title: string; }

const formatSom = (amount?: number) =>
  amount != null ? `${amount.toLocaleString('ru-RU')} сом` : null;

export default function EmployeesScreen() {
  const { data, get } = useApi<any>();
  const [showForm, setShowForm] = useState(false);
  const [fN, setFN] = useState('');
  const [lN, setLN] = useState('');
  const [salary, setSalary] = useState('');
  const [selDept, setSelDept] = useState('');
  const [selPos, setSelPos] = useState('');
  const [depts, setDepts] = useState<Dept[]>([]);
  const [positions, setPositions] = useState<Pos[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => get('/employees');

  useEffect(() => {
    load();
    api.get('/departments').then(r => setDepts(r.data.data || r.data || [])).catch(() => {});
  }, []);

  // Load positions when department changes
  useEffect(() => {
    if (selDept) {
      api.get(`/departments/${selDept}`).then(r => {
        const d = r.data.data || r.data;
        setPositions(d?.positions || []);
      }).catch(() => setPositions([]));
    } else {
      setPositions([]);
    }
    setSelPos('');
  }, [selDept]);

  const list: Employee[] = data?.data ?? data ?? [];

  const openForm = () => {
    setFN(''); setLN(''); setSalary(''); setSelDept(''); setSelPos('');
    setShowForm(true);
  };

  const create = async () => {
    if (!fN.trim() || !lN.trim()) return;
    setSaving(true);
    try {
      await api.post('/employees', {
        first_name: fN.trim(),
        last_name: lN.trim(),
        department_id: selDept || undefined,
        position_id: selPos || undefined,
        salary: salary ? parseFloat(salary) : undefined,
        hire_date: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to create employee';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const del = (id: string, n: string) => {
    const d = async () => { try { await api.delete(`/employees/${id}`); load(); } catch {} };
    Platform.OS === 'web'
      ? (confirm(`Delete ${n}?`) && d())
      : Alert.alert('Delete', `Delete ${n}?`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: d }]);
  };

  const gc = (n: string) => {
    const c = ['#10B981','#3B82F6','#A78BFA','#F59E0B','#EF4444','#EC4899'];
    let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
    return c[Math.abs(h) % c.length];
  };

  return (
    <View style={st.root}>
      <Header title="People" />
      <View style={st.toolbar}>
        <View>
          <Text style={st.tTitle}>{list.length} members</Text>
          <Text style={st.tSub}>Manage your team</Text>
        </View>
        <Button title="Add" onPress={openForm} size="sm" icon={<Ionicons name="add" size={15} color={Colors.black} />} />
      </View>
      <FlatList
        data={list}
        keyExtractor={i => i.id}
        contentContainerStyle={st.fl}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card style={st.card}>
            <View style={st.row}>
              <View style={[st.av, { backgroundColor: gc(item.first_name) + '18' }]}>
                <Text style={[st.avT, { color: gc(item.first_name) }]}>{item.first_name[0]}{item.last_name[0]}</Text>
              </View>
              <View style={st.info}>
                <Text style={st.name}>{item.first_name} {item.last_name}</Text>
                <Text style={st.sub}>{item.department_name || 'No dept'} · {item.position_title || 'No position'}</Text>
                {item.salary != null && (
                  <Text style={st.salary}>{formatSom(item.salary)}</Text>
                )}
              </View>
              <Badge label={item.status} variant={SV[item.status] as any} />
              <TouchableOpacity onPress={() => del(item.id, `${item.first_name} ${item.last_name}`)} style={st.xBtn}>
                <Ionicons name="close" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={<View style={st.empty}><Text style={st.emptyT}>No people</Text></View>}
      />

      {/* ── Add Person Modal ── */}
      <ModalForm visible={showForm} onClose={() => setShowForm(false)} title="Add Person">
        <Input label="First Name" placeholder="e.g. Arman" value={fN} onChangeText={setFN} />
        <Input label="Last Name" placeholder="e.g. Serikov" value={lN} onChangeText={setLN} />
        <Input label="Зарплата (сом)" placeholder="e.g. 45000" value={salary} onChangeText={setSalary} keyboardType="numeric" />

        {/* Department selector */}
        <Text style={st.selectLabel}>Department</Text>
        <View style={st.chipRow}>
          {depts.map(d => (
            <TouchableOpacity
              key={d.id}
              style={[st.chip, selDept === d.id && st.chipActive]}
              onPress={() => setSelDept(selDept === d.id ? '' : d.id)}
            >
              <Text style={[st.chipText, selDept === d.id && st.chipTextActive]}>{d.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Position selector — shown only when dept is selected */}
        {positions.length > 0 && (
          <>
            <Text style={st.selectLabel}>Position</Text>
            <View style={st.chipRow}>
              {positions.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[st.chip, selPos === p.id && st.chipActive]}
                  onPress={() => setSelPos(selPos === p.id ? '' : p.id)}
                >
                  <Text style={[st.chipText, selPos === p.id && st.chipTextActive]}>{p.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 12 }} />
        <Button title="Create Person" onPress={create} loading={saving} fullWidth size="lg" />
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
  card: { padding: Spacing.base },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  av: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avT: { fontSize: 12, fontWeight: '700' },
  info: { flex: 1 },
  name: { color: Colors.text, fontSize: FontSizes.base, fontWeight: '600' },
  sub: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 1 },
  salary: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '700', marginTop: 2 },
  xBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyT: { color: Colors.textMuted },
  // Form
  selectLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '500', marginBottom: Spacing.sm, marginTop: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bgSurface,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  chipText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  chipTextActive: { color: Colors.primaryLight, fontWeight: '600' },
});
