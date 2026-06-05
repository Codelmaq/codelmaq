"use client";
import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Folder, FileCode, Cpu, ShieldAlert, Cpu as Layers,
  ChevronRight, Copy, Check, Info, Layout, Play, RefreshCw, 
  Settings, User, CheckSquare, ClipboardPlus, Award, Eye, EyeOff,
  Signal, Battery, Wifi, CheckCircle2, Sliders, LogIn, LogOut,
  MapPin, Send, Plus, Users, Clock, Flame
} from 'lucide-react';

export default function MobileApkHub() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'structure' | 'code' | 'patterns'>('simulator');
  const [simulatedScreen, setSimulatedScreen] = useState<'login' | 'checklist' | 'diario' | 'desempenho'>('login');
  
  // Simulated State for interactive screens
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('theme.ts');

  // Input states in simulator
  const [simEmail, setSimEmail] = useState('ale.codelmaq1986@gmail.com');
  const [simPass, setSimPass] = useState('••••••••');
  const [showPass, setShowPass] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  
  // Checklist mock details
  const [checklistValues, setChecklistValues] = useState({
    oleo: true,
    freios: true,
    pneus: true,
    luzes: false,
    vazamentos: true
  });
  const [selectedMachine, setSelectedMachine] = useState('Escavadeira Caterpillar 320D');
  const [checklistSaved, setChecklistSaved] = useState(false);

  // Registro Diario mock details
  const [startHorimeter, setStartHorimeter] = useState('14520.5');
  const [endHorimeter, setEndHorimeter] = useState('14528.2');
  const [fluidObs, setFluidObs] = useState('Adicionado 2L de líquido de arrefecimento.');
  const [diarioSaved, setDiarioSaved] = useState(false);

  // Desempenho dynamic mock data
  const [feedbackEffect, setFeedbackEffect] = useState(false);
  const [operatorPoints, setOperatorPoints] = useState(2450);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getThemeCode = () => {
    return `// theme.ts - Configuração Base para Aplicativo Mobile (Expo / React Native)
import { StyleSheet, Dimensions } from 'react-native';

export const COLORS = {
  background: '#101010',       // Dark premium canvas
  surface: '#18181A',          // Elevated card color
  surfaceElevated: '#222225',  // Focus state cards
  primary: '#eab308',          // Accent Brand Purple
  primaryLight: 'rgba(161, 122, 240, 0.12)',
  textPrimary: '#F0F0F0',
  textSecondary: '#9A9A9F',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  border: 'rgba(161, 122, 240, 0.15)',
};

export const SPACING = {
  xs: 6,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
};

export const TYPOGRAPHY = {
  h1: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 28,
    color: '#F0F0F0',
    letterSpacing: 0.5,
  },
  button: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#9A9A9F',
    lineHeight: 20,
  }
};`;
  };

  const getLoginScreenCode = () => {
    return `// LoginScreen.tsx - UI/UX Mobile de Alto Nível
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../theme';
import { Eye, EyeOff, Lock, User } from 'lucide-react-native';

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={TYPOGRAPHY.h1}>CODELMAQ FROTA</Text>
        <Text style={styles.subtitle}>Conecte sua conta para iniciar os registros de campo.</Text>

        <View style={styles.inputWrapper}>
          <User color={COLORS.textSecondary} size={18} style={styles.icon} />
          <TextInput
            placeholder="E-mail funcional"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Lock color={COLORS.textSecondary} size={18} style={styles.icon} />
          <TextInput
            placeholder="Sua senha"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff color={COLORS.textSecondary} size={18} /> : <Eye color={COLORS.textSecondary} size={18} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={onLoginSuccess}>
          <Text style={[TYPOGRAPHY.button, styles.buttonText]}>Entrar no Sistema</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', padding: SPACING.lg },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  subtitle: { ...TYPOGRAPHY.body, marginTop: SPACING.xs, marginBottom: SPACING.md },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.sm, height: 50, marginBottom: SPACING.sm },
  icon: { marginRight: SPACING.sm },
  input: { flex: 1, color: COLORS.textPrimary, fontFamily: 'Inter_400Regular' },
  button: { backgroundColor: COLORS.primary, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: SPACING.sm, elevation: 4 },
  buttonText: { color: COLORS.background, fontWeight: 'bold' }
});`;
  };

  const getChecklistCode = () => {
    return `// ChecklistScreen.tsx - Inspeção Pré-Operacional de Equipamentos Pesados
import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../theme';
import { Check, X, ShieldAlert } from 'lucide-react-native';

const CHECKLIST_ITEMS = [
  { id: 'oleo', title: 'Nível de Óleo do Carter & Hidráulico' },
  { id: 'freios', title: 'Freio de Serviço & Estacionamento' },
  { id: 'pneus', title: 'Pressão e Estado de Arrepiamento de Pneus / Esteiras' },
  { id: 'luzes', title: 'Setas, Faróis de Trabalho & Giroflex' },
  { id: 'vazamentos', title: 'Vazamentos Visíveis de Mangueiras / Pistões' }
];

export default function ChecklistScreen() {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const toggleItem = (itemId: string, status: boolean) => {
    setAnswers(prev => ({ ...prev, [itemId]: status }));
  };

  const handleSave = () => {
    const unselected = CHECKLIST_ITEMS.filter(it => answers[it.id] === undefined);
    if (unselected.length > 0) {
      Alert.alert('Inspeção Incompleta', 'Todos os pontos devem ser checados antes de iniciar.');
      return;
    }
    Alert.alert('Sucesso', 'Checklist pré-operacional registrado e enviado via API offline-first.');
  };

  return (
    <View style={styles.container}>
      <Text style={TYPOGRAPHY.h1}>INSPEÇÃO PRÉ-OPERACIONAL</Text>
      <Text style={styles.subtitle}>Execute antes de iniciar o motor ou movimentá-lo.</Text>

      <FlatList
        data={CHECKLIST_ITEMS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.itemText}>{item.title}</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={[styles.miniBtn, answers[item.id] === true && styles.btnPass]} 
                onPress={() => toggleItem(item.id, true)}
              >
                <Check size={16} color={answers[item.id] === true ? COLORS.background : COLORS.success} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.miniBtn, answers[item.id] === false && styles.btnFail]} 
                onPress={() => toggleItem(item.id, false)}
              >
                <X size={16} color={answers[item.id] === false ? COLORS.background : COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
        <Text style={[TYPOGRAPHY.button, styles.submitBtnText]}>Enviar Inspeção</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  subtitle: { ...TYPOGRAPHY.body, marginBottom: SPACING.md },
  itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: 12, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  itemText: { flex: 1, color: COLORS.textPrimary, fontFamily: 'Inter_400Regular', marginRight: SPACING.sm },
  buttonGroup: { flexDirection: 'row', gap: 6 },
  miniBtn: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surfaceElevated },
  btnPass: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  btnFail: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  submitBtn: { backgroundColor: COLORS.primary, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: SPACING.md },
  submitBtnText: { color: COLORS.background, fontWeight: 'bold' }
});`;
  };

  const getDiarioCode = () => {
    return `// DiarioScreen.tsx - Registro Diário / Relatório de Horímetro e Produtividade
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../theme';

export default function DiarioScreen() {
  const [startHour, setStartHour] = useState('');
  const [endHour, setEndHour] = useState('');
  const [dieselAdd, setDieselAdd] = useState('');
  const [observations, setObservations] = useState('');

  const sendDiary = () => {
    if (!startHour || !endHour) {
      Alert.alert('Dados faltantes', 'É obrigatório declarar horímetro inicial e final.');
      return;
    }
    Alert.alert('Confirmado', 'Registro diário de bordo armazenado na fila de sincronização local.');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={TYPOGRAPHY.h1}>PARTE DIÁRIA (DIÁRIO DE OBRA)</Text>
      <Text style={styles.subtitle}>Informe as horas de operação e abastecimento com precisão.</Text>

      <View style={styles.formCard}>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Horímetro Inicial ⏱️</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ex: 14520.0" 
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="decimal-pad"
              value={startHour}
              onChangeText={setStartHour}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Horímetro Final 🏁</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ex: 14528.0" 
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="decimal-pad"
              value={endHour}
              onChangeText={setEndHour}
            />
          </View>
        </View>

        <Text style={[styles.label, { marginTop: SPACING.md }]}>Diesel Adicionado (Litros) ⛽</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Deixe em branco se não abasteceu" 
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="numeric"
          value={dieselAdd}
          onChangeText={setDieselAdd}
        />

        <Text style={[styles.label, { marginTop: SPACING.md }]}>Eventos / Observações Técnicas 📝</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="Ocoorrências, quebras, paralisações..." 
          placeholderTextColor={COLORS.textSecondary}
          multiline
          numberOfLines={4}
          value={observations}
          onChangeText={setObservations}
        />

        <TouchableOpacity style={styles.btn} onPress={sendDiary}>
          <Text style={[TYPOGRAPHY.button, styles.btnText]}>Salvar Registro Diário</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  subtitle: { ...TYPOGRAPHY.body, marginBottom: SPACING.md },
  formCard: { backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  label: { color: COLORS.textPrimary, fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: SPACING.xs },
  input: { backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, height: 48, color: COLORS.textPrimary, paddingHorizontal: SPACING.sm },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: SPACING.sm },
  btn: { backgroundColor: COLORS.primary, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: SPACING.lg },
  btnText: { color: COLORS.background, fontWeight: 'bold' }
});`;
  };

  const getDesempenhoCode = () => {
    return `// DesempenhoScreen.tsx - Gamificação das Metas de Campo & Pontuações
import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../theme';
import { Award, ShieldAlert, Zap } from 'lucide-react-native';

export default function DesempenhoScreen() {
  const points = 2450;
  
  return (
    <ScrollView style={styles.container}>
      <Text style={TYPOGRAPHY.h1}>DESEMPENHO EM CAMPO</Text>
      <Text style={styles.subtitle}>Sua assiduidade e segurança geram bônus de destaque.</Text>

      {/* Badge Trophy Card */}
      <View style={styles.badgeHub}>
        <Award size={48} color={COLORS.primary} />
        <Text style={styles.pointsText}>{points}</Text>
        <Text style={styles.desc}>Seus Pontos Acumulados</Text>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>Operador Diamante</Text>
        </View>
      </View>

      {/* Grid of indicators */}
      <View style={styles.grid}>
        <View style={styles.metricCard}>
          <Zap size={18} color="#F59E0B" />
          <Text style={styles.metricTitle}>Checklists diários</Text>
          <Text style={styles.metricVal}>100% em dia</Text>
        </View>
        <View style={styles.metricCard}>
          <ShieldAlert size={18} color="#10B981" />
          <Text style={styles.metricTitle}>Incidências</Text>
          <Text style={styles.metricVal}>Zero ocorrências</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  subtitle: { ...TYPOGRAPHY.body, marginBottom: SPACING.md },
  badgeHub: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: SPACING.lg, alignItems: 'center', marginVertical: SPACING.sm },
  pointsText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 42, color: COLORS.primary, marginTop: SPACING.xs },
  desc: { color: COLORS.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 13 },
  rankBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: 99, marginTop: SPACING.sm },
  rankText: { color: COLORS.primary, fontFamily: 'Inter_500Medium', fontSize: 12, fontWeight: 'bold' },
  grid: { flexDirection: 'row', gap: 12, marginTop: SPACING.sm },
  metricCard: { flex: 1, backgroundColor: COLORS.surface, borderSize: 1, borderColor: COLORS.border, borderRadius: 12, padding: SPACING.md, gap: 4 },
  metricTitle: { color: COLORS.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular' },
  metricVal: { color: COLORS.textPrimary, fontSize: 15, fontFamily: 'Inter_500Medium', fontWeight: 'bold' }
});`;
  };

  const getCodeContent = () => {
    switch (selectedFile) {
      case 'theme.ts': return getThemeCode();
      case 'LoginScreen.tsx': return getLoginScreenCode();
      case 'ChecklistScreen.tsx': return getChecklistCode();
      case 'DiarioScreen.tsx': return getDiarioCode();
      case 'DesempenhoScreen.tsx': return getDesempenhoCode();
      default: return getThemeCode();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 dark:text-gray-100 flex items-center">
            <Smartphone className="mr-2 text-yellow-500" size={28} />
            Mobile APK - Blueprint & Centro de Design
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1 font-medium select-none">
            Visão de arquitetura de alta performance concebida para rodar perfeitamente como aplicativo nativo offline-first no campo.
          </p>
        </div>
        
        {/* Control Mode selector */}
        <div className="flex bg-white dark:bg-[#151515] dark:bg-black/40 border border-gray-200 dark:border-white/10 dark:border-neutral-800 p-1 rounded-xl shadow-sm self-end">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-heading transition-all ${
              activeTab === 'simulator' 
                ? 'bg-yellow-600 text-white shadow-md' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-50 dark:hover:text-gray-100'
            }`}
          >
            <Play size={13} /> Simulador APK
          </button>
          <button
            onClick={() => setActiveTab('structure')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-heading transition-all ${
              activeTab === 'structure' 
                ? 'bg-yellow-600 text-white shadow-md' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-50 dark:hover:text-gray-100'
            }`}
          >
            <Folder size={13} /> Estrutura de Pastas
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-heading transition-all ${
              activeTab === 'code' 
                ? 'bg-yellow-600 text-white shadow-md' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-50 dark:hover:text-gray-100'
            }`}
          >
            <FileCode size={13} /> Códigos Fonte Expo
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-heading transition-all ${
              activeTab === 'patterns' 
                ? 'bg-yellow-600 text-white shadow-md' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-50 dark:hover:text-gray-100'
            }`}
          >
            <Cpu size={13} /> Padrões Clean Code
          </button>
        </div>
      </div>

      {/* Inner Screen layouts container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Dynamic Display based on active tab */}
        <div className="lg:col-span-8 space-y-6">
          
          {activeTab === 'simulator' && (
            <div className="bg-white dark:bg-[#151515] dark:bg-neutral-900 border border-gray-200 dark:border-white/10 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 dark:text-gray-200 font-heading">
                  Painel de Controle da Simulação
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Explore o fluxo real do operador clicando nos botões abaixo ou diretamente dentro das interações do smartphone.
                </p>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                <button
                  onClick={() => setSimulatedScreen('login')}
                  className={`py-2.5 px-1.5 rounded-xl border font-heading text-xs text-center font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    simulatedScreen === 'login'
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold'
                      : 'border-gray-200 dark:border-white/10 dark:border-neutral-800 hover:bg-gray-50 dark:bg-[#101010] dark:hover:bg-neutral-800 text-gray-500 dark:text-gray-400 dark:text-gray-400'
                  }`}
                >
                  <LogIn size={16} /> Login
                </button>
                <button
                  onClick={() => setSimulatedScreen('checklist')}
                  className={`py-2.5 px-1.5 rounded-xl border font-heading text-xs text-center font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    simulatedScreen === 'checklist'
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold'
                      : 'border-gray-200 dark:border-white/10 dark:border-neutral-800 hover:bg-gray-50 dark:bg-[#101010] dark:hover:bg-neutral-800 text-gray-500 dark:text-gray-400 dark:text-gray-400'
                  }`}
                >
                  <CheckSquare size={16} /> Checklist
                </button>
                <button
                  onClick={() => setSimulatedScreen('diario')}
                  className={`py-2.5 px-1.5 rounded-xl border font-heading text-xs text-center font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    simulatedScreen === 'diario'
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold'
                      : 'border-gray-200 dark:border-white/10 dark:border-neutral-800 hover:bg-gray-50 dark:bg-[#101010] dark:hover:bg-neutral-800 text-gray-500 dark:text-gray-400 dark:text-gray-400'
                  }`}
                >
                  <ClipboardPlus size={16} /> Registro Diário
                </button>
                <button
                  onClick={() => setSimulatedScreen('desempenho')}
                  className={`py-2.5 px-1.5 rounded-xl border font-heading text-xs text-center font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    simulatedScreen === 'desempenho'
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold'
                      : 'border-gray-200 dark:border-white/10 dark:border-neutral-800 hover:bg-gray-50 dark:bg-[#101010] dark:hover:bg-neutral-800 text-gray-500 dark:text-gray-400 dark:text-gray-400'
                  }`}
                >
                  <Award size={16} /> Desempenho
                </button>
              </div>

              {/* Explanatory banner helper */}
              <div className="bg-yellow-600/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-yellow-800 dark:text-yellow-300 font-medium">
                <Info size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Toque e Sinta:</strong> A tela do celular ao lado é completamente funcional. Você pode preencher campos, alternar interruptores pré-inspeção, arrastar sliders e assinar com o mouse para ver como ficaria no aparelho do seu operador de logística em minas ou canteiros de obras rurais.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="bg-[#101010] border border-yellow-500/15 rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-100 font-heading">Estrutura de Pastas Mobile Recomendada</h3>
                <p className="text-xs text-gray-400 mt-1">Navegação e organização modular seguindo arquitetura limpa (Clean Architecture) para Expo / React Native.</p>
              </div>

              {/* Directory structure diagram */}
              <div className="bg-black p-4 rounded-xl font-mono text-xs text-gray-300 space-y-3 max-h-[500px] overflow-y-auto">
                <div>📁 codelmaq-mobile-app</div>
                <div className="pl-4 text-yellow-400">├── 📁 .expo (configurações locais)</div>
                <div className="pl-4">├── 📁 app (Expo Router - Rotas Nativas)</div>
                <div className="pl-8 text-emerald-400">├── 📄 _layout.tsx (Configuração de tema, Fontes Rajdhani/Inter e Provedores)</div>
                <div className="pl-8">├── 📄 index.tsx (Tela de Boot / Redirect)</div>
                <div className="pl-8">├── 📄 login.tsx (Tela de Login de Operador)</div>
                <div className="pl-8">├── 📄 (tabs) (Área Logada - Navegação por abas inferiores)</div>
                <div className="pl-12">├── 📄 _layout.tsx (Configurações do Bottom Tab Navigator)</div>
                <div className="pl-12">├── 📄 checklist.tsx (Inspeção Pré-Operacional)</div>
                <div className="pl-12">├── 📄 diario.tsx (Registro Diário / Parte Diária)</div>
                <div className="pl-12">├── 📄 desempenho.tsx (Gamificação / Dashboard de Produtividade)</div>
                <div className="pl-4">├── 📁 components (Componentes Modulares Reutilizáveis)</div>
                <div className="pl-8">├── 📄 CustomButton.tsx (Toques táteis mínimos de 44px)</div>
                <div className="pl-8">├── 📄 CustomInput.tsx (Inputs de alta visibilidade)</div>
                <div className="pl-8">├── 📄 OfflineBanner.tsx (Alerta autônomo sem conexão)</div>
                <div className="pl-4">├── 📁 hooks (Hooks Customizados)</div>
                <div className="pl-8 text-yellow-400">├── 📄 useOfflineSync.ts (Controlador de upload e fila local SQL)</div>
                <div className="pl-4">├── 📁 services (Conectores externos)</div>
                <div className="pl-8">├── 📄 supabase.ts (Configurações do Supabase JS Mobile)</div>
                <div className="pl-8">├── 📄 db.ts (SQLite local com WatermelonDB ou Expo SQLite)</div>
                <div className="pl-4 text-yellow-400">├── 📄 theme.ts (Definição centralizada de cores, tipografia e espaçamento)</div>
                <div className="pl-4">├── 📄 app.json (Configuração para build do APK no EAS Build)</div>
                <div className="pl-4">├── 📄 package.json</div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="bg-[#101010] border border-yellow-500/15 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-yellow-500/15 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-100 font-heading">Códigos de Alta Fidelidade (TypeScript)</h3>
                  <p className="text-xs text-gray-400 mt-1">Implementações prontas para desenvolvimento mobile nativo.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {['theme.ts', 'LoginScreen.tsx', 'ChecklistScreen.tsx', 'DiarioScreen.tsx', 'DesempenhoScreen.tsx'].map(f => (
                    <button
                      key={f}
                      onClick={() => setSelectedFile(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                        selectedFile === f
                          ? 'bg-yellow-600/20 border-yellow-500 text-yellow-300 font-bold'
                          : 'border-neutral-800 text-gray-400 hover:text-white hover:bg-neutral-900'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code viewer */}
              <div className="relative flex-1">
                <button
                  onClick={() => handleCopy(getCodeContent(), selectedFile)}
                  className="absolute top-4 right-4 bg-[#18181A] hover:bg-[#222225] border border-yellow-500/20 text-yellow-400 p-2 rounded-lg transition-colors flex items-center justify-center text-xs gap-1.5"
                >
                  {copiedText === selectedFile ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copiar Código
                    </>
                  )}
                </button>
                <pre className="p-4 bg-black rounded-xl text-[11px] font-mono text-gray-300 overflow-x-auto overflow-y-auto max-h-[500px]">
                  <code>{getCodeContent()}</code>
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'patterns' && (
            <div className="bg-white dark:bg-[#151515] dark:bg-neutral-900 border border-gray-200 dark:border-white/10 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-6 text-gray-700 dark:text-gray-200 dark:text-gray-300">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 dark:text-gray-100 font-heading">Guia de Boas Práticas e Padrões Mobile</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">Conceitos avançados para garantir que sua APK seja rápida, estável e amada pelos operadores em campo.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Rule 1 */}
                <div className="bg-gray-50 dark:bg-[#101010] dark:bg-neutral-800/40 p-5 rounded-2xl border border-gray-100 dark:border-white/5 dark:border-neutral-800 space-y-2">
                  <div className="flex gap-2.5 items-center text-yellow-600 dark:text-yellow-400 font-bold font-heading text-base">
                    <CheckSquare size={20} />
                    <span>Toques Táteis de 44px</span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 dark:text-gray-400">
                    Operadores de maquinário pesado em campo costumam usar luvas ou ter mãos sujas. Botões pequenos geram toques incorretos (fat finger syndrome). Todos os botões em telas mobile devem ter altura mímina de <strong>44 a 50px</strong> com margens de separação generosas.
                  </p>
                </div>

                {/* Rule 2 */}
                <div className="bg-gray-50 dark:bg-[#101010] dark:bg-neutral-800/40 p-5 rounded-2xl border border-gray-100 dark:border-white/5 dark:border-neutral-800 space-y-2">
                  <div className="flex gap-2.5 items-center text-yellow-600 dark:text-yellow-400 font-bold font-heading text-base">
                    <Wifi size={20} />
                    <span>Sincronização Offline-First</span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 dark:text-gray-400">
                    O sinal 4G/5G oscila ou desaparece em mineradoras, portos e rodovias em obras. O app deve salvar a parte diária no banco embarcado (SQLite) e subir no backend Supabase instantaneamente quando a rede retornar, usando notificações amigáveis.
                  </p>
                </div>

                {/* Grid Item 3 */}
                <div className="bg-gray-50 dark:bg-[#101010] dark:bg-neutral-800/40 p-5 rounded-2xl border border-gray-100 dark:border-white/5 dark:border-neutral-800 space-y-2">
                  <div className="flex gap-2.5 items-center text-yellow-600 dark:text-yellow-400 font-bold font-heading text-base">
                    <Sliders size={20} />
                    <span>Entrada de Dados Simplificada</span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 dark:text-gray-400">
                    Evite ao máximo que o operador transcreva textos extensos. Priorize controles deslizantes (Sliders) para níveis de diesel, botões de toque rústicos (Passa/Falha) para checklists, e seleção rápida guiada por fotos do veículo.
                  </p>
                </div>

                {/* Grid Item 4 */}
                <div className="bg-gray-50 dark:bg-[#101010] dark:bg-neutral-800/40 p-5 rounded-2xl border border-gray-100 dark:border-white/5 dark:border-neutral-800 space-y-2">
                  <div className="flex gap-2.5 items-center text-yellow-600 dark:text-yellow-400 font-bold font-heading text-base">
                    <Award size={20} />
                    <span>Gamificação Real-Time</span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 dark:text-gray-400">
                    Estímulos audiovisuais geram engajamento. Ao fechar um checklist completo no horário estipulado, mostre partículas e anime a contagem de pontos do operador. Isso incentiva o compromisso do trabalhador com a integridade física da frota.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Right Side: Virtual Premium Smartphone Simulator */}
        <div className="lg:col-span-4 flex justify-center">
          
          <div className="relative w-[340px] h-[680px] bg-[#09090b] rounded-[50px] p-[13px] shadow-[0_0_50px_rgba(161,122,240,0.15)] border-4 border-neutral-800">
            {/* Speaker & Notch */}
            <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-32 h-[22px] bg-black rounded-3xl z-40 flex items-center justify-between px-4">
              <div className="w-1.5 h-1.5 bg-[#18181b] rounded-full"></div>
              <div className="w-14 h-1 bg-[#18181b] rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-[#18181b] rounded-full border border-[#27272a]"></div>
            </div>

            {/* Inner Phone Frame */}
            <div className="relative w-full h-full bg-[#101010] rounded-[38px] overflow-hidden flex flex-col text-[#F0F0F0] font-sans border border-neutral-900">
              
              {/* Virtual Status Bar */}
              <div className="h-10 bg-black text-gray-400 text-[11px] px-6 pt-3 flex justify-between items-center z-30 font-medium tracking-tight">
                <span>09:41</span>
                <div className="flex items-center gap-1">
                  <Signal size={11} className="text-yellow-400" />
                  <Wifi size={11} className="text-yellow-400" />
                  <Battery size={13} className="text-yellow-400" />
                </div>
              </div>

              {/* Dynamic Viewport inside simulated phone */}
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col justify-between">
                
                {simulatedScreen === 'login' && (
                  <div className="flex-1 flex flex-col justify-center space-y-6 py-6">
                    <div className="text-center space-y-2">
                      <div className="inline-flex w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-2xl items-center justify-center shadow-lg shadow-yellow-500/5">
                        <Smartphone size={24} />
                      </div>
                      <h3 className="text-2xl font-bold font-heading text-white tracking-widest uppercase">
                        CODELMAQ
                      </h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 max-w-[200px] mx-auto font-medium leading-relaxed">
                        Sistema Inteligente de Controle de Campo & Logística
                      </p>
                    </div>

                    {isLogged ? (
                      <div className="bg-yellow-950/20 border border-yellow-500/25 p-5 rounded-2xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
                        <CheckCircle2 size={36} className="text-yellow-400 mx-auto animate-bounce" />
                        <div>
                          <p className="text-xs text-white font-bold font-heading">Você está autenticado!</p>
                          <p className="text-[10px] text-gray-400 mt-1 font-medium">{simEmail}</p>
                        </div>
                        <button
                          onClick={() => {
                            setIsLogged(false);
                            setSimEmail('ale.codelmaq1986@gmail.com');
                          }}
                          className="w-full bg-[#18181A] hover:bg-[#222225] text-yellow-400 border border-yellow-500/20 py-2.5 rounded-xl text-xs font-bold font-heading transition-all"
                        >
                          Trocar Operador
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">MATRÍCULA / E-MAIL</label>
                          <div className="flex items-center bg-zinc-950/60 border border-yellow-500/10 focus-within:border-yellow-500/40 rounded-xl px-3 py-2 text-xs transition-colors">
                            <User size={14} className="text-gray-500 dark:text-gray-400 mr-2" />
                            <input 
                              type="email" 
                              value={simEmail} 
                              onChange={(e) => setSimEmail(e.target.value)}
                              className="bg-transparent text-white w-full outline-none focus:ring-0" 
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">SENHA DE ACESSO</label>
                          <div className="flex items-center bg-zinc-950/60 border border-yellow-500/10 focus-within:border-yellow-500/40 rounded-xl px-3 py-2 text-xs transition-colors">
                            <LogIn size={14} className="text-gray-500 dark:text-gray-400 mr-2" />
                            <input 
                              type={showPass ? "text" : "password"} 
                              value={simPass} 
                              onChange={(e) => setSimPass(e.target.value)}
                              className="bg-transparent text-white w-full outline-none focus:ring-0" 
                            />
                            <button onClick={() => setShowPass(!showPass)}>
                              {showPass ? <EyeOff size={14} className="text-gray-500 dark:text-gray-400" /> : <Eye size={14} className="text-gray-500 dark:text-gray-400" />}
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (simEmail) setIsLogged(true);
                          }}
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-xl text-xs font-extrabold tracking-wider uppercase font-heading transition-all shadow-lg shadow-yellow-600/20 active:scale-95"
                        >
                          Conectar no Campo
                        </button>

                        <p className="text-[9px] text-center text-gray-500 dark:text-gray-400 leading-normal font-medium">
                          Segurança garantida sob criptografia SSL AES-256 e sincronizador offline ativo.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {simulatedScreen === 'checklist' && (
                  <div className="flex-1 flex flex-col justify-between py-2 space-y-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-bold font-heading text-white">Inspeção Diária</h4>
                        <p className="text-[9px] text-gray-500 dark:text-gray-400">Checklist pré-operatório de segurança</p>
                      </div>

                      {/* Machine selector */}
                      <div className="bg-zinc-900 border border-yellow-500/10 rounded-xl p-2.5">
                        <label className="text-[8px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">Equipamento Ativo</label>
                        <select 
                          value={selectedMachine}
                          onChange={(e) => setSelectedMachine(e.target.value)}
                          className="w-full bg-transparent text-xs text-white outline-none border-none focus:ring-0 font-medium pr-2 mt-0.5"
                        >
                          <option className="bg-black" value="Escavadeira Caterpillar 320D">CAT Escavadeira 320D</option>
                          <option className="bg-black" value="Motoniveladora John Deere 670G">John Deere 670G</option>
                          <option className="bg-black" value="Caminhão Basculante Volvo FMX">Volvo FMX Caçamba</option>
                        </select>
                      </div>

                      {/* Checklist table */}
                      <div className="space-y-2">
                        {/* Item 1 */}
                        <div className="bg-[#18181B] border border-yellow-500/5 hover:border-yellow-500/15 p-2 rounded-xl flex items-center justify-between text-xs transition-colors">
                          <span className="text-[10px] text-gray-300 pr-2">A) Fluídos e Oleos</span>
                          <div className="flex gap-1.5 shrink-0">
                            <button 
                              onClick={() => setChecklistValues(v=> ({...v, oleo: true}))}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all ${
                                checklistValues.oleo 
                                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' 
                                  : 'border-zinc-800 text-zinc-500'
                              }`}
                            >
                              OK
                            </button>
                            <button 
                              onClick={() => setChecklistValues(v=> ({...v, oleo: false}))}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all ${
                                !checklistValues.oleo 
                                  ? 'bg-red-650/20 border-red-500 text-red-400' 
                                  : 'border-zinc-800 text-zinc-500'
                              }`}
                            >
                              FALHA
                            </button>
                          </div>
                        </div>

                        {/* Item 2 */}
                        <div className="bg-[#18181B] border border-yellow-500/5 hover:border-yellow-500/15 p-2 rounded-xl flex items-center justify-between text-xs transition-colors">
                          <span className="text-[10px] text-gray-300 pr-2">B) Freio & Parada</span>
                          <div className="flex gap-1.5 shrink-0">
                            <button 
                              onClick={() => setChecklistValues(v=> ({...v, freios: true}))}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all ${
                                checklistValues.freios 
                                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' 
                                  : 'border-zinc-800 text-zinc-500'
                              }`}
                            >
                              OK
                            </button>
                            <button 
                              onClick={() => setChecklistValues(v=> ({...v, freios: false}))}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all ${
                                !checklistValues.freios 
                                  ? 'bg-red-650/20 border-red-500 text-red-400' 
                                  : 'border-zinc-800 text-zinc-500'
                              }`}
                            >
                              FALHA
                            </button>
                          </div>
                        </div>

                        {/* Item 3 */}
                        <div className="bg-[#18181B] border border-yellow-500/5 hover:border-yellow-500/15 p-2 rounded-xl flex items-center justify-between text-xs transition-colors">
                          <span className="text-[10px] text-gray-300 pr-2">C) Lanternas & Setas</span>
                          <div className="flex gap-1.5 shrink-0">
                            <button 
                              onClick={() => setChecklistValues(v=> ({...v, luzes: true}))}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all ${
                                checklistValues.luzes 
                                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' 
                                  : 'border-zinc-800 text-zinc-500'
                              }`}
                            >
                              OK
                            </button>
                            <button 
                              onClick={() => setChecklistValues(v=> ({...v, luzes: false}))}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all ${
                                !checklistValues.luzes 
                                  ? 'bg-red-650/20 border-red-500 text-red-500' 
                                  : 'border-zinc-800 text-zinc-500'
                              }`}
                            >
                              FALHA
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {checklistSaved ? (
                      <div className="bg-emerald-900/20 border border-emerald-500/20 text-center p-3 rounded-2xl space-y-1">
                        <p className="text-[10px] text-emerald-400 font-bold font-heading">Inspeção Enviada!</p>
                        <p className="text-[8px] text-zinc-400 font-medium leading-relaxed">Você gerou <strong>+50 pontos</strong> na rodada diária.</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setChecklistSaved(true);
                          setOperatorPoints(p => p + 50);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 font-extrabold uppercase font-heading text-xs tracking-wider py-3 rounded-xl transition-all shadow-md shadow-emerald-700/15"
                      >
                        Enviar Checklist (+50 XP)
                      </button>
                    )}
                  </div>
                )}

                {simulatedScreen === 'diario' && (
                  <div className="flex-1 flex flex-col justify-between py-2 space-y-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-bold font-heading text-white">Diário de Bordo</h4>
                        <p className="text-[9px] text-gray-500 dark:text-gray-400">Horímetro inicial e final da operação</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-zinc-900 border border-yellow-500/5 p-2 rounded-xl">
                          <label className="text-[8px] uppercase font-bold text-gray-500 dark:text-gray-400 block mb-0.5">HORÍMETRO INI</label>
                          <input 
                            type="text" 
                            value={startHorimeter}
                            onChange={(e) => setStartHorimeter(e.target.value)}
                            className="bg-transparent font-mono text-xs w-full text-white font-bold outline-none border-b border-yellow-500/10 focus:border-yellow-500"
                          />
                        </div>

                        <div className="bg-zinc-900 border border-yellow-500/5 p-2 rounded-xl">
                          <label className="text-[8px] uppercase font-bold text-gray-500 dark:text-gray-400 block mb-0.5">HORÍMETRO FIM</label>
                          <input 
                            type="text" 
                            value={endHorimeter}
                            onChange={(e) => setEndHorimeter(e.target.value)}
                            className="bg-transparent font-mono text-xs w-full text-white font-bold outline-none border-b border-yellow-500/10 focus:border-yellow-500"
                          />
                        </div>
                      </div>

                      <div className="bg-[#18181B] border border-yellow-500/5 p-2.5 rounded-xl space-y-1">
                        <label className="text-[8px] uppercase font-bold text-gray-500 dark:text-gray-400 block">OBSERVAÇÕES DO DIA</label>
                        <textarea 
                          rows={2}
                          value={fluidObs}
                          onChange={(e) => setFluidObs(e.target.value)}
                          className="bg-zinc-950/40 w-full rounded-lg text-[9px] text-gray-300 p-2 outline-none border border-zinc-800/80 focus:border-yellow-500"
                        />
                      </div>

                      {/* Digit Signature Simulator */}
                      <div className="bg-[#18181B] border border-yellow-500/5 p-2.5 rounded-xl space-y-1.5">
                        <label className="text-[8px] uppercase font-bold text-gray-500 dark:text-gray-400 block">ASSINATURA DIGITAL OPERADOR</label>
                        <div className="h-14 bg-zinc-950/90 rounded-lg flex items-center justify-center border border-dashed border-zinc-800 select-none relative cursor-pointer group hover:border-yellow-500/50 transition-colors">
                          <span className="text-[8px] text-zinc-600 group-hover:text-yellow-400 py-1 font-bold">Desenhar Assinatura com Toque / Mouse</span>
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 50">
                            <path d="M 10,25 Q 35,5 50,25 T 90,25" fill="none" stroke="rgba(161, 122, 240, 0.4)" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {diarioSaved ? (
                      <div className="bg-yellow-900/20 border border-yellow-500/25 p-3 rounded-2xl text-center">
                        <p className="text-[10px] text-yellow-400 font-bold font-heading">Registro Salvo Offline!</p>
                        <p className="text-[8px] text-zinc-400 font-medium">Armazenado com sucesso na fila interna.</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setDiarioSaved(true);
                          setOperatorPoints(p => p + 100);
                        }}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-extrabold uppercase font-heading text-xs tracking-wider py-3 rounded-xl transition-all shadow-md shadow-yellow-600/15"
                      >
                        Salvar Diário (+100 XP)
                      </button>
                    )}
                  </div>
                )}

                {simulatedScreen === 'desempenho' && (
                  <div className="flex-1 flex flex-col justify-between py-2 space-y-4">
                    <div className="space-y-4">
                      <div className="text-center">
                        <h4 className="text-sm font-bold font-heading text-white">Seu Score de Campo</h4>
                        <p className="text-[9px] text-gray-500 dark:text-gray-400">Ranking semanal de conformidade logística</p>
                      </div>

                      {/* Gamified trophy section */}
                      <div className="bg-zinc-900/80 border border-yellow-500/15 rounded-2xl p-4 text-center space-y-2 relative overflow-hidden flex flex-col justify-center items-center">
                        <span className="absolute top-2 right-2 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                        </span>
                        
                        <Award size={36} className="text-yellow-400 animate-pulse" />
                        <div>
                          <p className="text-3xl font-extrabold font-mono text-yellow-400 tracking-tight">{operatorPoints}</p>
                          <p className="text-[8px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mt-0.5">Pontuação Líquida</p>
                        </div>

                        <div className="bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20 mt-1">
                          <span className="text-[9px] text-yellow-400 font-extrabold uppercase tracking-wide">OPERADOR OURO</span>
                        </div>
                      </div>

                      {/* Small achievements achievements checklist metrics */}
                      <div className="space-y-1.5 text-xs">
                        <div className="bg-[#18181B] p-2 rounded-xl flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <CheckSquare size={12} className="text-emerald-400" />
                            <span className="text-[9px] text-zinc-300">Checklist Pré-Operacional</span>
                          </div>
                          <span className="text-[9px] text-emerald-400 font-bold">100% OK</span>
                        </div>

                        <div className="bg-[#18181B] p-2 rounded-xl flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-yellow-400" />
                            <span className="text-[9px] text-zinc-300">Apontamento Semanal</span>
                          </div>
                          <span className="text-[9px] text-yellow-400 font-bold">8/8 Dias</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setFeedbackEffect(true);
                        setOperatorPoints(p => p + 25);
                        setTimeout(() => setFeedbackEffect(false), 800);
                      }}
                      disabled={feedbackEffect}
                      className="w-full bg-zinc-900 border border-yellow-500/20 hover:bg-[#18181B] py-2.5 rounded-xl text-xs font-bold font-heading text-yellow-400 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw size={12} className={feedbackEffect ? "animate-spin" : ""} />
                      Simular Resgate de Ponto
                    </button>
                  </div>
                )}

              </div>

              {/* Bottom Phone Gestures Bar */}
              <div className="h-10 bg-black flex justify-between items-center px-12 pb-3 pt-1 z-30">
                <button 
                  onClick={() => {
                    const order: Array<'login' | 'checklist' | 'diario' | 'desempenho'> = ['login', 'checklist', 'diario', 'desempenho'];
                    const currentIdx = order.indexOf(simulatedScreen);
                    const nextIdx = (currentIdx - 1 + order.length) % order.length;
                    setSimulatedScreen(order[nextIdx]);
                  }}
                  className="p-1 h-8 text-gray-500 dark:text-gray-400 hover:text-white flex items-center"
                >
                  <span className="border-t border-l border-current w-2 h-2 rotate-45 transform"></span>
                </button>
                <div className="w-24 h-1 bg-zinc-700/80 rounded-full"></div>
                <button 
                  onClick={() => {
                    const order: Array<'login' | 'checklist' | 'diario' | 'desempenho'> = ['login', 'checklist', 'diario', 'desempenho'];
                    const currentIdx = order.indexOf(simulatedScreen);
                    const nextIdx = (currentIdx + 1) % order.length;
                    setSimulatedScreen(order[nextIdx]);
                  }}
                  className="p-1 h-8 text-gray-500 dark:text-gray-400 hover:text-white flex items-center"
                >
                  <span className="border-t border-r border-current w-2 h-2 -rotate-45 transform"></span>
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
