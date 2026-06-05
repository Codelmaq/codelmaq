"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from '@/hooks/useRouter';
import { 
  Lock, 
  User, 
  Shield, 
  UserPlus, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Sun, 
  Moon, 
  QrCode, 
  HelpCircle,
  CheckCircle2, 
  XCircle,
  Sparkles,
  Camera,
  RotateCcw,
  Inspect
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { mapDBToEmployee } from '@/lib/mapper';

// Web Audio API feedback
const playBeep = (type: 'success' | 'double' | 'error' = 'success') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'double') {
      // High-low bip
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.08);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.05); // E6
        gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.15);
      }, 80);
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.warn('Audio Context block:', e);
  }
};

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // View mode: 'form' or 'qr-reader'
  const [authMode, setAuthMode] = useState<'form' | 'qr-reader'>('form');

  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [nome, setNome] = useState('');
  const [role, setRole] = useState<'administrador' | 'colaborador'>('colaborador');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // QR Scanning States
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { setUsuario } = useAuthStore();
  const router = useRouter();

  // Load and apply theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.classList.add(initialTheme);
    document.documentElement.classList.remove(initialTheme === 'dark' ? 'light' : 'dark');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.add(nextTheme);
    document.documentElement.classList.remove(theme);
  };

  // Redirect if user is already authenticated
  useEffect(() => {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.usuario) {
          const u = parsed.state.usuario;
          router.push(u.role === 'administrador' ? '/dashboard' : '/parte-diaria');
        }
      } catch (err) {
        console.error('Error reading saved session:', err);
      }
    }
  }, [router]);

  // Handle URL recoveries from Supabase hash
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash && window.location.hash.includes('type=recovery')) {
        setIsUpdatingPassword(true);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Form Validation Validators
  const isEmailValid = (e: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  };

  // Live password strength verification rules
  const getPasswordStrength = (pwd: string) => {
    const rules = {
      length: pwd.length >= 6,
      hasLetter: /[a-zA-Z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
    };
    const passedCount = Object.values(rules).filter(Boolean).length;
    return { rules, passedCount };
  };

  const { rules: pwdRules, passedCount: pwdPassedCount } = getPasswordStrength(password);

  // Authenticate using manual credentials or fallbacks
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    // Strict input validations
    if (!isEmailValid(email)) {
      setError('Por favor, insira um endereço de e-mail válido.');
      setLoading(false);
      playBeep('error');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve conter pelo menos 6 caracteres.');
      setLoading(false);
      playBeep('error');
      return;
    }

    try {
      // 1. Check for hardcoded development bypass credentials
      if (email.toLowerCase() === 'admin@codelmaq.com.br' && password === '123456') {
        const defaultAdmin = {
          id: '00000000-0000-4000-a000-000000000000',
          nome: 'Administrador Principal',
          email: 'admin@codelmaq.com.br',
          role: 'administrador' as const,
          status: 'aprovado' as const
        };
        setUsuario(defaultAdmin);
        playBeep('success');
        router.push('/dashboard');
        return;
      }

      if (email.toLowerCase() === 'operador@codelmaq.com.br' && password === '123456') {
        const defaultColab = {
          id: '11111111-1111-4111-b111-111111111111',
          nome: 'Carlos Silva (Operador)',
          email: 'operador@codelmaq.com.br',
          role: 'colaborador' as const,
          status: 'aprovado' as const
        };
        setUsuario(defaultColab);
        playBeep('success');
        router.push('/parte-diaria');
        return;
      }

      if (email.toLowerCase() === 'tesseractescoladesign@gmail.com' && password === '123456') {
        const defaultAdmin = {
          id: '00000000-0000-4000-a000-000000000000',
          nome: 'Tesseract Designer',
          email: 'tesseractescoladesign@gmail.com',
          role: 'administrador' as const,
          status: 'aprovado' as const
        };
        setUsuario(defaultAdmin);
        playBeep('success');
        router.push('/dashboard');
        return;
      }

      // Check legacy credentials error to prevent legacy access
      if (email.toLowerCase() === 'admin' || email.toLowerCase() === 'colab') {
        throw new Error("O sistema agora utiliza e-mail real. Por favor, utilize os e-mails padrões: admin@codelmaq.com.br ou operador@codelmaq.com.br");
      }

      if (isLogin) {
        // Run against Supabase database instance
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          if (loginError.message === 'Invalid login credentials') {
            throw new Error('E-mail ou senha incorretos. Verifique suas credenciais de acesso.');
          }
          throw loginError;
        }

        if (data.user) {
          let { data: perfil, error: perfilError } = await supabase
            .from('funcionarios')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (perfilError) {
            // Self-healing: create profile if missing
            const isOwner = data.user.email?.toLowerCase() === 'ale.codelmaq1986@gmail.com';
            const newPerfil = {
              id: data.user.id,
              nome: data.user.email?.split('@')[0] || 'Usuário',
              email: data.user.email,
              funcao: isOwner ? ('administrador' as const) : ('colaborador' as const),
              status: isOwner ? ('aprovado' as const) : ('pendente' as const)
            };

            const { data: createdPerfil, error: createError } = await supabase
              .from('funcionarios')
              .insert([newPerfil])
              .select()
              .single();

            if (createError) {
              console.error('Error creating profile layout:', createError);
              perfil = newPerfil;
            } else {
              perfil = createdPerfil;
            }
          }

          if (perfil) {
            const mappedUser = mapDBToEmployee(perfil);
            setUsuario(mappedUser);
            playBeep('success');
            if (mappedUser.status === 'aprovado') {
              router.push(mappedUser.role === 'administrador' ? '/dashboard' : '/parte-diaria');
            } else {
              router.push('/aguardando-aprovacao');
            }
          }
        }
      } else {
        // Sign Up Flow
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome,
              role,
            }
          }
        });

        if (signUpError) {
          if (signUpError.message === 'User already registered') {
            throw new Error('Este e-mail já está cadastrado por outro usuário.');
          }
          throw signUpError;
        }

        if (data.user) {
          const profileData = {
            id: data.user.id,
            nome,
            role,
            status: 'pendente' as const,
            email: email
          };

          const { error: insertError } = await supabase
            .from('funcionarios')
            .insert([profileData]);

          if (insertError) {
            console.error('Database user mapping error:', insertError);
          }

          setSuccessMessage('Sua conta foi submetida com sucesso! Aguarde a aprovação de um Administrador.');
          setIsLogin(true);
          playBeep('double');
          setEmail('');
          setPassword('');
        }
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      setError(err.message || 'Código de resposta inválido do servidor. Tente novamente.');
      playBeep('error');
    } finally {
      setLoading(false);
    }
  };

  // Password Recovery handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (!isEmailValid(email)) {
        throw new Error('Insira um e-mail válido para receber a redefinição.');
      }

      const { data: userExists, error: checkError } = await supabase
        .from('funcionarios')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!userExists && email !== 'admin@codelmaq.com.br' && email !== 'operador@codelmaq.com.br') {
        throw new Error('E-mail não cadastrado na base de dados.');
      }

      const redirectUrl = `${window.location.origin}/login`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) throw resetError;
      setSuccessMessage('E-mail enviado com instruções de redefinição. Verifique também sua caixa de Spam.');
      playBeep('double');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao enviar reparação de senha.');
      playBeep('error');
    } finally {
      setLoading(false);
    }
  };

  // Password recovery confirmation
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (newPassword.length < 6) {
        throw new Error('A nova senha precisa ter mais de 5 caracteres.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;
      setSuccessMessage('Senha redefinida com sucesso! Você já pode entrar.');
      setIsUpdatingPassword(false);
      setIsLogin(true);
      setNewPassword('');
      playBeep('success');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro de transmissão.');
      playBeep('error');
    } finally {
      setLoading(false);
    }
  };

  // Activate device camera (QR code real scanner option)
  const startRealScanner = async () => {
    setCameraPermissionError(null);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Real camera not accessible due to container permissions:', err);
      setCameraPermissionError('Acesso à webcam indisponível ou bloqueado por permissões de sandbox do navegador. Por favor use os Crachás de Simulação.');
      setCameraActive(false);
    }
  };

  const stopRealScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopRealScanner();
  }, []);

  // Virtual badge mock DB for simulating exact scanning matches
  const mockBadges = [
    {
      code: 'CODELMAQ-OP-001',
      title: 'Crachá de Alexandre Reis',
      subtitle: 'Administrador Senior',
      color: 'from-yellow-500 to-yellow-600',
      tag: 'ADMINISTRADOR',
      user: {
        id: '00000000-0000-4000-a000-000000000000',
        nome: 'Alexandre Reis',
        email: 'admin@codelmaq.com.br',
        role: 'administrador' as const,
        status: 'aprovado' as const
      }
    },
    {
      code: 'CODELMAQ-OP-002',
      title: 'Crachá de Carlos Silva',
      subtitle: 'Operador de Escavadeira Heavy-Duty',
      color: 'from-amber-500 to-orange-600',
      tag: 'OP. MÁQUINA',
      user: {
        id: '11111111-1111-4111-b111-111111111111',
        nome: 'Carlos Silva',
        email: 'operador@codelmaq.com.br',
        role: 'colaborador' as const,
        status: 'aprovado' as const
      }
    },
    {
      code: 'CODELMAQ-EQ-CAT320',
      title: 'QR Code da Escavadeira CAT 320',
      subtitle: 'Ativo #CAT320 • Hidráulica Premium',
      color: 'from-blue-600 to-cyan-500',
      tag: 'MÁQUINA',
      type: 'equipment',
      details: {
        id: 'CAT320',
        nome: 'Escavadeira Caterpillar 320',
        placa: 'CAT-320-FD',
        empresa: 'Codelmaq Engenharia',
        status: 'Operacional'
      }
    }
  ];

  // Perform virtual scanner sweep simulation
  const handleVirtualScan = (badge: typeof mockBadges[0]) => {
    setIsScanning(true);
    setScanResult(null);
    playBeep('success');

    // Simulate scanning laser run time
    setTimeout(() => {
      setIsScanning(false);
      setScanResult(badge);
      
      if ('user' in badge) {
        // Double beep on scan matches
        playBeep('double');
        
        // Auto sign in user after successful operator crachá reading
        setTimeout(() => {
          setUsuario(badge.user);
          router.push(badge.user.funcao === 'administrador' ? '/dashboard' : '/parte-diaria');
        }, 1200);
      } else {
        // Scanning equipment - double beep for recognition
        playBeep('double');
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#101010] p-4 text-[#f0f0f0] overflow-x-hidden relative transition-colors duration-300 light:bg-[#f5f4ff] light:text-[#1a1a2e]">
      
      {/* Radiant Glow Lights (Ambient Glassmorphism backdrop) */}
      <div className="absolute -top-48 -left-48 w-96 h-96 bg-[#eab308] rounded-full blur-[160px] opacity-20 pointer-events-none"></div>
      <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-[#eab308] rounded-full blur-[160px] opacity-15 pointer-events-none"></div>

      {/* Floating Theme Switcher Button */}
      <button 
        id="theme-toggle"
        onClick={toggleTheme}
        className="fixed top-6 right-6 p-3 rounded-full bg-white dark:bg-[#151515]/5 border border-white/10 text-[#eab308] hover:text-white hover:bg-white dark:bg-[#151515]/10 hover:shadow-[0_0_15px_rgba(161,122,240,0.4)] transition-all cursor-pointer backdrop-blur-lg z-50 light:bg-white dark:bg-[#151515] light:border-[#eab308]/20 light:text-[#eab308] light:shadow-sm"
        title="Alternar Tema"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative z-10 my-4">
        
        {/* Left Side: System Information Header */}
        <div className="md:col-span-5 space-y-6 flex flex-col justify-center h-full p-2 md:pr-4">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#151515]/5 border border-white/10 text-xs font-semibold uppercase tracking-widest text-[#eab308] light:bg-[#eab308]/5 light:border-[#eab308]/10 light:text-[#eab308]">
              <Sparkles className="h-3 w.5-3 w-3 animate-pulse" />
              SISTEMA CORPORATIVO
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#f0f0f0] font-heading light:text-[#1a1a2e]">
              CODELMAQ <span className="text-[#eab308] block md:inline light:text-[#eab308]">FROTAS</span>
            </h1>
            <p className="text-sm text-[#9ca3af] leading-relaxed max-w-sm light:text-[#6b7280]">
              Ambiente de engenharia para gestão de ativos, auditoria de revisões técnicas e partes diárias de operadores com acesso assistido por QR Code.
            </p>
          </div>

          {/* Quick instructions indicator boxes */}
          <div className="space-y-3 hidden md:block">
            <div className="p-3 bg-white dark:bg-[#151515]/5 rounded-xl border border-white/10 flex items-start gap-3 light:bg-white dark:bg-[#151515] light:border-[#eab308]/10">
              <ShieldCheck className="h-5 w-5 text-[#eab308] mt-0.5" />
              <div>
                <h4 className="text-xs font-bold font-heading text-white light:text-[#1a1a2e]">SEGURANÇA ATIVA</h4>
                <p className="text-[11px] text-[#9ca3af]">Controle operacional auditado via hash criptográfico.</p>
              </div>
            </div>
            
            <div className="p-3 bg-white dark:bg-[#151515]/5 rounded-xl border border-white/10 flex items-start gap-3 light:bg-white dark:bg-[#151515] light:border-[#eab308]/10">
              <QrCode className="h-5 w-5 text-[#eab308] mt-0.5" />
              <div>
                <h4 className="text-xs font-bold font-heading text-white light:text-[#1a1a2e]">ACESSO QR INSTANTÂNEO</h4>
                <p className="text-[11px] text-[#9ca3af]">Use seu cartão de operador físico ou simule-o no painel direito.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authenticator Pane */}
        <div className="md:col-span-7 bg-[rgba(161,122,240,0.06)] backdrop-blur-xl border border-[rgba(161,122,240,0.2)] p-6 md:p-8 rounded-3xl shadow-[0_8px_32px_rgba(161,122,240,0.1)] light:bg-white dark:bg-[#151515] light:border-[#eab308]/20 light:shadow-md transition-all duration-300">
          
          {/* Dual-Control authentication mode tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5 mb-6 light:bg-[#f5f4ff] light:border-transparent">
            <button
              id="tab-auth-form"
              onClick={() => {
                setAuthMode('form');
                stopRealScanner();
              }}
              className={`py-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'form' 
                  ? 'bg-[#eab308] text-white shadow-lg shadow-[#eab308]/30 light:bg-[#eab308]' 
                  : 'text-[#9ca3af] hover:text-white light:text-[#6b7280] light:hover:text-[#1a1a2e]'
              }`}
            >
              <User className="h-4 w-4" />
              E-mail & Senha
            </button>
            <button
              id="tab-auth-qr"
              onClick={() => {
                setAuthMode('qr-reader');
              }}
              className={`py-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'qr-reader' 
                  ? 'bg-[#eab308] text-white shadow-lg shadow-[#eab308]/30 light:bg-[#eab308]' 
                  : 'text-[#9ca3af] hover:text-white light:text-[#6b7280] light:hover:text-[#1a1a2e]'
              }`}
            >
              <QrCode className="h-4 w-4" />
              Leitor Crachá QR
            </button>
          </div>

          <AnimatePresence mode="wait">
            
            {/* View 1: Standard Credential Sign In or Register */}
            {authMode === 'form' && (
              <motion.div
                key="form-mode"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-bold font-heading text-white light:text-[#1a1a2e]">
                    {isUpdatingPassword
                      ? 'Redefinir Senha Segura'
                      : isForgotPassword 
                        ? 'Serviço de Recuperação' 
                        : isLogin 
                          ? 'Acesso Autorizado' 
                          : 'Novo Credenciamento'}
                  </h3>
                  <p className="text-xs text-[#9ca3af] mt-1 light:text-[#6b7280]">
                    {isUpdatingPassword
                      ? 'Digite uma senha segura com no mínimo 6 caracteres.'
                      : isForgotPassword
                        ? 'Forneça seu endereço de e-mail para validar.'
                        : isLogin
                          ? 'Identifique-se com suas credenciais de operador cadastradas.'
                          : 'Preencha seus dados para solicitar pendência de operador.'}
                  </p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-3 text-xs animate-pulse">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Aviso de Segurança:</span> {error}
                    </div>
                  </div>
                )}

                {successMessage && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-start gap-3 text-xs">
                    <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Acesso Liberado:</span> {successMessage}
                    </div>
                  </div>
                )}

                <form onSubmit={isUpdatingPassword ? handleUpdatePassword : isForgotPassword ? handleResetPassword : handleAuth} className="space-y-4">
                  
                  {/* Name field (Only present when registering) */}
                  {!isLogin && !isForgotPassword && !isUpdatingPassword && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">Nome Completo</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#9ca3af]">
                          <User className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          required
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm focus:border-[#eab308] focus:ring-1 focus:ring-[#eab308] outline-none transition-all light:bg-[#f5f4ff] light:border-transparent light:text-black light:focus:bg-white dark:bg-[#151515]"
                          placeholder="Ex: Carlos Alexandre Reis"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email Field */}
                  {!isUpdatingPassword && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">Endereço de E-mail</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#9ca3af]">
                          <User className="h-4 w-4" />
                        </span>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm focus:border-[#eab308] focus:ring-1 focus:ring-[#eab308] outline-none transition-all light:bg-[#f5f4ff] light:border-transparent light:text-black light:focus:bg-white dark:bg-[#151515]"
                          placeholder="operador@codelmaq.com.br"
                        />
                      </div>
                    </div>
                  )}

                  {/* Password / New Password section */}
                  {isUpdatingPassword ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">Nova Senha de Operador</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#9ca3af]">
                          <Lock className="h-4 w-4" />
                        </span>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm focus:border-[#eab308] focus:ring-1 focus:ring-[#eab308] outline-none transition-all light:bg-[#f5f4ff] light:border-transparent light:text-black light:focus:bg-white dark:bg-[#151515]"
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                    </div>
                  ) : (
                    !isForgotPassword && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">
                          <label>Senha Provedora</label>
                          {isLogin && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsForgotPassword(true);
                                setError(null);
                                setSuccessMessage(null);
                              }}
                              className="text-[#eab308] hover:underline focus:outline-none cursor-pointer light:text-[#eab308]"
                            >
                              Esqueci a Senha
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#9ca3af]">
                            <Lock className="h-4 w-4" />
                          </span>
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm focus:border-[#eab308] focus:ring-1 focus:ring-[#eab308] outline-none transition-all light:bg-[#f5f4ff] light:border-transparent light:text-black light:focus:bg-white dark:bg-[#151515]"
                            placeholder="••••••••"
                          />
                        </div>

                        {/* Live password verification feedback */}
                        {password.length > 0 && (
                          <div className="mt-2 p-3 bg-black/30 rounded-xl border border-white/5 space-y-1.5 text-[11px] light:bg-[#f5f4ff] light:border-transparent">
                            <span className="text-[#9ca3af] font-semibold">Critérios de Força:</span>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="flex items-center gap-1.5">
                                {pwdRules.length ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-[#9ca3af]" />}
                                <span className={pwdRules.length ? 'text-emerald-400 font-medium' : 'text-[#9ca3af]'}>Mínimo 6 dígitos</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {pwdRules.hasLetter ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-[#9ca3af]" />}
                                <span className={pwdRules.hasLetter ? 'text-emerald-400 font-medium' : 'text-[#9ca3af]'}>Possui letra</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {pwdRules.hasNumber ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-[#9ca3af]" />}
                                <span className={pwdRules.hasNumber ? 'text-emerald-400 font-medium' : 'text-[#9ca3af]'}>Possui número</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {/* Role picker for new accounts */}
                  {!isLogin && !isForgotPassword && !isUpdatingPassword && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">Função Operativa Requerida</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRole('colaborador')}
                          className={`py-2 px-3 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            role === 'colaborador' 
                              ? 'bg-yellow-500/15 border-[#eab308] text-[#eab308] shadow-[0_0_10px_rgba(161,122,240,0.1)] light:bg-[#eab308]/10 light:border-[#eab308]' 
                              : 'bg-transparent border-white/10 text-[#9ca3af] hover:border-white/20 light:border-[#6b7280]/20 light:text-[#6b7280]'
                          }`}
                        >
                          Colaborador / Operador
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('administrador')}
                          className={`py-2 px-3 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            role === 'administrador' 
                              ? 'bg-yellow-500/15 border-[#eab308] text-[#eab308] shadow-[0_0_10px_rgba(161,122,240,0.1)] light:bg-[#eab308]/10 light:border-[#eab308]' 
                              : 'bg-transparent border-white/10 text-[#9ca3af] hover:border-white/20 light:border-[#6b7280]/20 light:text-[#6b7280]'
                          }`}
                        >
                          Gestor / Administrador
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold uppercase tracking-wider text-black bg-[#eab308] hover:bg-[#ca8a04] shadow-[0_4px_14px_rgba(161,122,240,0.3)] hover:shadow-[0_4px_24px_rgba(161,122,240,0.5)] focus:outline-none focus:ring-2 focus:ring-[#eab308]/30 transition-all transition-shadow disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer light:bg-[#eab308] light:text-white"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {isUpdatingPassword
                          ? 'Salvar Nova Senha'
                          : isForgotPassword 
                            ? 'Enviar Link de Recuperação' 
                            : isLogin 
                              ? 'Entrar no Sistema' 
                              : 'Registrar Novo Usuário'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Switch panel buttons */}
                <div className="flex flex-col space-y-3 pt-4 border-t border-white/5">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <button
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setIsForgotPassword(false);
                        setIsUpdatingPassword(false);
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-center font-bold text-[#eab308] hover:underline cursor-pointer light:text-[#eab308]"
                    >
                      {isLogin ? 'Solicitar Cadastro' : 'Fazer Login Existing'}
                    </button>
                    {isForgotPassword && (
                      <button
                        onClick={() => {
                          setIsForgotPassword(false);
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-center text-[#9ca3af] hover:underline cursor-pointer"
                      >
                        Voltar para Login
                      </button>
                    )}
                  </div>

                  {/* Developer Quick-Login Hint Card */}
                  {isLogin && !isForgotPassword && !isUpdatingPassword && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#151515]/5 border border-white/10 space-y-3 light:bg-[#f5f4ff] light:border-transparent">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#eab308] light:text-[#eab308]">
                        <HelpCircle className="h-3.5 w-3.5" />
                        Acesso de Desenvolvimento Rápido
                      </div>
                      <p className="text-[11px] text-[#9ca3af] light:text-[#6b7280]">
                        Utilize os botões abaixo para preencher instantaneamente as credenciais de bypass padrão:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setEmail('admin@codelmaq.com.br');
                            setPassword('123456');
                            playBeep('success');
                          }}
                          className="py-1.5 px-3 rounded-lg bg-black/40 border border-white/5 hover:border-[#eab308]/30 hover:bg-[#eab308]/10 text-[10px] text-white font-bold transition-all cursor-pointer light:bg-white dark:bg-[#151515] light:border-[#eab308]/20 light:text-[#eab308]"
                        >
                          E-mail Admin
                        </button>
                        <button
                          onClick={() => {
                            setEmail('operador@codelmaq.com.br');
                            setPassword('123456');
                            playBeep('success');
                          }}
                          className="py-1.5 px-3 rounded-lg bg-black/40 border border-white/5 hover:border-[#eab308]/30 hover:bg-[#eab308]/10 text-[10px] text-white font-bold transition-all cursor-pointer light:bg-white dark:bg-[#151515] light:border-[#eab308]/20 light:text-[#eab308]"
                        >
                          E-mail Operador
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* View 2: High-tech QR Scanner Simulator view */}
            {authMode === 'qr-reader' && (
              <motion.div
                key="qr-mode"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-bold font-heading text-white flex items-center gap-2 light:text-[#1a1a2e]">
                    <QrCode className="h-6 w-6 text-[#eab308] light:text-[#eab308]" />
                    Leitor de Crachá QR Code
                  </h3>
                  <p className="text-xs text-[#9ca3af] mt-1 light:text-[#6b7280]">
                    Aponte seu crachá com o código de barras para a webcam ou selecione um crachá de simulação abaixo.
                  </p>
                </div>

                {/* Digital Camera Frame & Scanning Grid Overlay */}
                <div className="relative aspect-video w-full rounded-2xl bg-black border border-white/10 overflow-hidden flex flex-col items-center justify-center">
                  
                  {cameraActive ? (
                    <video 
                      ref={videoRef} 
                      className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                      playsInline
                      muted
                    />
                  ) : (
                    <div className="text-center p-6 space-y-3 z-10">
                      <div className="mx-auto h-12 w-12 rounded-full bg-white dark:bg-[#151515]/10 border border-white/20 flex items-center justify-center text-[#9ca3af] animate-pulse">
                        <Camera className="h-6 w-6" />
                      </div>
                      <p className="text-[11px] text-[#9ca3af] font-medium max-w-xs">
                        Leitor de câmera pronto para decodificação de imagens de crachás.
                      </p>
                      <button
                        onClick={startRealScanner}
                        className="py-1.5 px-3 bg-[#eab308]/10 hover:bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/20 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                      >
                        Ativar Câmera
                      </button>
                    </div>
                  )}

                  {/* Real camera permissions problem warning guard */}
                  {cameraPermissionError && (
                    <div className="absolute inset-x-4 bottom-4 p-3 bg-red-500/90 text-white rounded-xl text-[10px] leading-relaxed z-15 backdrop-blur-md">
                      {cameraPermissionError}
                    </div>
                  )}

                  {/* Neon laser sweeping overlay (scanning target effect) */}
                  <div className="absolute inset-0 pointer-events-none z-20 border-2 border-dashed border-[#eab308]/20 m-6 flex items-center justify-center">
                    
                    {/* Retro sci-fi glowing scan lines */}
                    <div className="w-[12%] h-[12%] border-t-2 border-l-2 border-[#eab308] absolute top-0 left-0"></div>
                    <div className="w-[12%] h-[12%] border-t-2 border-r-2 border-[#eab308] absolute top-0 right-0"></div>
                    <div className="w-[12%] h-[12%] border-b-2 border-l-2 border-[#eab308] absolute bottom-0 left-0"></div>
                    <div className="w-[12%] h-[12%] border-b-2 border-r-2 border-[#eab308] absolute bottom-0 right-0"></div>

                    {isScanning && (
                      <motion.div 
                        initial={{ y: -80 }}
                        animate={{ y: 80 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#eab308] to-transparent shadow-[0_0_12px_#eab308]" 
                      />
                    )}
                  </div>

                  {/* Active scan status HUD text */}
                  {isScanning && (
                    <div className="absolute top-3 left-3 bg-black/70 border border-red-500/20 text-red-400 text-[10px] px-2 py-1 rounded-md uppercase tracking-wider font-bold animate-pulse z-30">
                      ● SCANNING DIGITAL BADGE HASH
                    </div>
                  )}
                </div>

                {/* Mock Physical Badges Grid (The Badge Simulator) */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#9ca3af] flex items-center gap-1">
                    <Inspect className="h-4 w-4" />
                    Gaveta de Crachás de Simulação
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {mockBadges.map((badge, idx) => (
                      <button
                        key={badge.code}
                        disabled={isScanning}
                        onClick={() => handleVirtualScan(badge)}
                        className={`p-3.5 rounded-2xl border text-left bg-black/30 hover:bg-black/50 hover:border-[#eab308]/40 transition-all cursor-pointer relative overflow-hidden group disabled:opacity-50 ${
                          scanResult?.code === badge.code ? 'border-[#eab308] ring-1 ring-[#eab308]/30' : 'border-white/5'
                        }`}
                      >
                        <div className="absolute top-0 right-0 p-1 px-2 rounded-bl-xl bg-white dark:bg-[#151515]/5 text-[9px] font-black tracking-wider text-[#eab308] uppercase">
                          {badge.tag}
                        </div>
                        <p className="text-[10px] font-mono text-[#9ca3af]">{badge.code}</p>
                        <h4 className="text-xs font-bold font-heading text-white mt-1 group-hover:text-[#eab308] transition-colors">{badge.title}</h4>
                        <p className="text-[10px] text-[#9ca3af] truncate mt-0.5">{badge.subtitle}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scanning results HUD box display */}
                <AnimatePresence>
                  {scanResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 rounded-2xl bg-white dark:bg-[#151515]/5 border border-white/10 space-y-3 light:bg-[#f5f4ff] light:border-transparent text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-[#eab308] light:text-[#eab308] flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          Resultado de Leitura
                        </span>
                        <span className="text-[10px] font-mono text-[#9ca3af] bg-black/40 px-2 py-0.5 rounded-full">{scanResult.code}</span>
                      </div>

                      {'user' in scanResult ? (
                        <div className="grid grid-cols-2 gap-3 p-3 bg-black/30 rounded-xl light:bg-white dark:bg-[#151515]">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-[#9ca3af]">Operador Identificado</p>
                            <p className="text-xs font-bold text-white light:text-black mt-0.5">{scanResult.user.nome}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-[#9ca3af]">Função</p>
                            <p className="text-xs font-semibold text-[#eab308] light:text-[#eab308] uppercase mt-0.5">{scanResult.user.role}</p>
                          </div>
                          <div className="col-span-2 pt-2 border-t border-white/5 flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#eab308]" />
                            <p className="text-[10px] text-[#9ca3af] italic">Carregando painel de controle de {scanResult.user.nome}...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-black/30 rounded-xl light:bg-white dark:bg-[#151515] space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-[#9ca3af]">Ativo de Frota Reconhecido</p>
                              <p className="text-xs font-bold text-[#eab308] light:text-[#eab308] mt-0.5">{scanResult.details.nome}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-[#9ca3af]">Ativo Id</p>
                              <p className="text-xs font-semibold text-white light:text-black mt-0.5">{scanResult.details.id}</p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-white/5 flex gap-2">
                            <button
                              onClick={() => {
                                // Scanned machine, we can navigate directly if they are logged in or prompt login page with targetMachine preset
                                playBeep('success');
                                alert(`A máquina ${scanResult.details.nome} foi identificada com sucesso! Para abrir vistorias e check-lists desta máquina, faça login como Operador antes de submeter.`);
                              }}
                              className="py-1.5 px-3 rounded-lg bg-white dark:bg-[#151515]/10 hover:bg-[#eab308]/20 text-xs font-bold text-white tracking-wide transition-all cursor-pointer"
                            >
                              Ver Ficha Técnica do Ativo
                            </button>
                            <button
                              onClick={() => {
                                // Simulated association
                                playBeep('double');
                                alert(`Simulação: Equipamento ${scanResult?.details?.id} vinculado ao operador ativo.`);
                              }}
                              className="py-1.5 px-3 rounded-lg bg-[#eab308] hover:bg-[#ca8a04] text-xs font-bold text-black tracking-wide transition-all cursor-pointer"
                            >
                              Registrar Parte Diária Desta Máquina
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
