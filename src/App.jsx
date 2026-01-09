import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, User, BookOpen, Menu, X, ChevronRight,
  GraduationCap, FileSpreadsheet, Lock, Eye, Calendar,
  CheckCircle, XCircle, MessageSquare, LogOut, AlertTriangle, Bug, Download,
  Bell, Megaphone, Clock, Settings, ShieldAlert, ChevronLeft, ChevronDown
} from 'lucide-react';

// Importaciones de Firebase
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken
} from 'firebase/auth';
import {
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot
} from 'firebase/firestore';

// --- CONFIGURACIÓN (TUS LLAVES REALES) ---
const firebaseConfig = {
  apiKey: "AIzaSyDpo89i5887oP6uhkzsDdIAsKAFji2OqbY",
  authDomain: "estrellatdf---19-de-agosto.firebaseapp.com",
  projectId: "estrellatdf---19-de-agosto",
  storageBucket: "estrellatdf---19-de-agosto.firebasestorage.app",
  messagingSenderId: "312841032306",
  appId: "1:312841032306:web:bfaddeca92567b73e968eb",
  measurementId: "G-XEPFR2H731"
};

// --- INICIALIZACIÓN SEGURA ---
let firebaseApp, auth, db;
let initError = null;

try {
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApps()[0];
  }
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
} catch (e) {
  console.error("Error inicialización:", e);
  initError = e.message;
}

const appId = "escuela-v1";

// --- UTILIDADES ---
const generateStudentCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

const getTodayString = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

const PALETTE = [
  'bg-blue-50 border-blue-100',
  'bg-green-50 border-green-100',
  'bg-yellow-50 border-yellow-100',
  'bg-purple-50 border-purple-100',
  'bg-pink-50 border-pink-100',
  'bg-orange-50 border-orange-100',
];

export default function EstrellaTDF() {
  // --- TRUCO DE DISEÑO AUTOMÁTICO (CDN) ---
  useEffect(() => {
    const existingScript = document.getElementById('tailwindcss');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'tailwindcss';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [appSettings, setAppSettings] = useState({ teacherPassword: null });

  const [viewMode, setViewMode] = useState('portal');
  const [authPassword, setAuthPassword] = useState('');
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(initError);
  const [showMenu, setShowMenu] = useState(false);

  // Estados de Profesor
  const [currentSubjectId, setCurrentSubjectId] = useState(null);
  const [currentTrimester, setCurrentTrimester] = useState(1);
  const [activeTab, setActiveTab] = useState('grades');
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  // Formularios
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newParallel, setNewParallel] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentList, setNewStudentList] = useState('');
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');

  // Estados para Comunicados
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [newAnnounceTitle, setNewAnnounceTitle] = useState('');
  const [newAnnounceBody, setNewAnnounceBody] = useState('');
  const [newAnnounceType, setNewAnnounceType] = useState('info');
  const [newAnnounceRecipient, setNewAnnounceRecipient] = useState('all');

  // Estado para Cambiar Contraseña
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [oldPassInput, setOldPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');

  // --- NUEVOS ESTADOS v2 ---
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear().toString());
  const [selectedYearView, setSelectedYearView] = useState(new Date().getFullYear().toString());

  // Tareas
  const [isAddingHomework, setIsAddingHomework] = useState(false);
  const [newHWTitle, setNewHWTitle] = useState('');
  const [newHWDesc, setNewHWDesc] = useState('');
  const [newHWDate, setNewHWDate] = useState(getTodayString());

  // Chatbot
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: '¡Hola! Soy StarAssistant. ¿En qué puedo ayudarte hoy? Consultame sobre notas, asistencia o tareas.' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Vista Estudiante (Multi-Asignatura)
  const [studentMatches, setStudentMatches] = useState([]);
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(0);

  // --- 1. AUTENTICACIÓN ---
  useEffect(() => {
    if (initError) { setLoading(false); return; }
    if (!auth) { setErrorMsg("No se pudo conectar a Firebase."); setLoading(false); return; }

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
        if (err.code === 'auth/operation-not-allowed') {
          setErrorMsg("⚠️ Error: Habilita 'Anónimo' en Firebase Authentication.");
        } else {
          setErrorMsg(`Error de Autenticación: ${err.message}`);
        }
        setLoading(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u && !loading) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. DATOS ---
  useEffect(() => {
    if (!user || !db) return;

    const subCol = collection(db, 'artifacts', appId, 'public', 'data', 'subjects');
    const unsubSub = onSnapshot(subCol, (snapshot) => {
      try {
        const data = snapshot.docs.map(d => {
          const sub = d.data();
          if (!sub.announcements) sub.announcements = [];
          if (!sub.assignments) sub.assignments = [];
          if (!sub.year) sub.year = "2025"; // Retrocompatibilidad
          return { id: d.id, ...sub };
        });
        setSubjects(data);
        setLoading(false);
      } catch (e) { console.error(e); }
    }, (error) => {
      if (error.code === 'permission-denied') setErrorMsg("⚠️ Acceso denegado: Revisa las Reglas de Firestore.");
      setLoading(false);
    });

    const settingsDoc = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general');
    const unsubSettings = onSnapshot(settingsDoc, (docSnap) => {
      if (docSnap.exists()) {
        const s = docSnap.data();
        if (!s.availableYears) s.availableYears = [new Date().getFullYear().toString()];
        setAppSettings(s);
        if (s.activeYear) setCurrentYear(s.activeYear);
      }
      else setAppSettings({ teacherPassword: null, availableYears: [new Date().getFullYear().toString()] });
    });

    return () => { unsubSub(); unsubSettings(); };
  }, [user]);

  // --- HELPERS DB ---
  const saveSubject = async (data) => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'subjects', data.id.toString()), data);
  };

  const deleteSubjectDB = async (id) => {
    const pwd = prompt("⚠️ ZONA DE PELIGRO ⚠️\n\nPara eliminar esta CLASE y todos sus datos, ingrese su contraseña:");
    if (pwd !== appSettings.teacherPassword) return alert("Contraseña incorrecta. No se borró nada.");
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'subjects', id.toString()));
    if (currentSubjectId === id) setCurrentSubjectId(null);
  };

  const updateSettings = async (data) => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general'), data);
  };

  // --- LOGICA ---
  const handleTeacherLogin = () => {
    if (!appSettings.teacherPassword) {
      if (authPassword.length < 4) return alert("Mínimo 4 caracteres");
      updateSettings({ teacherPassword: authPassword });
      setViewMode('teacher');
    } else {
      authPassword === appSettings.teacherPassword ? setViewMode('teacher') : alert("Incorrecto");
    }
  };

  const handleChangePassword = () => {
    if (oldPassInput !== appSettings.teacherPassword) return alert("❌ Error: La contraseña ACTUAL no es correcta.");
    if (newPassInput.length < 4) return alert("❌ Error: La NUEVA contraseña es muy corta.");
    updateSettings({ teacherPassword: newPassInput });
    alert("✅ ¡Contraseña actualizada exitosamente!");
    setIsChangingPass(false); setOldPassInput(''); setNewPassInput('');
  };

  const handleStudentLogin = () => {
    if (!studentCodeInput) return;
    const code = studentCodeInput.trim().toUpperCase();
    const matches = [];
    subjects.forEach(sub => {
      const found = sub.students.find(s => s.code === code);
      if (found) matches.push({ subject: sub, student: found });
    });
    if (matches.length > 0) {
      setStudentMatches(matches);
      setSelectedSubjectIndex(0);
      setViewMode('student_view');
    } else {
      alert("Código no encontrado. Verifique e intente nuevamente.");
    }
  };

  // --- CRUD FUNCTIONS ---
  const currentSubject = subjects.find(s => s.id === currentSubjectId);

  const addSubject = () => {
    if (!newSubjectName) return;
    const newSub = {
      id: Date.now(),
      name: newSubjectName,
      parallel: newParallel,
      year: currentYear,
      students: [],
      activities: { 1: [], 2: [], 3: [] },
      grades: { 1: {}, 2: {}, 3: {} },
      attendance: {},
      announcements: [],
      assignments: []
    };
    saveSubject(newSub); setCurrentSubjectId(newSub.id); setIsAddingSubject(false); setNewSubjectName(''); setNewParallel('');
  };

  const addHomework = () => {
    if (!newHWTitle || !currentSubject) return;
    const newHW = {
      id: "hw_" + Date.now(),
      title: newHWTitle,
      description: newHWDesc,
      dueDate: newHWDate,
      createdAt: getTodayString()
    };
    const currentHW = currentSubject.assignments || [];
    saveSubject({ ...currentSubject, assignments: [newHW, ...currentHW] });
    setIsAddingHomework(false); setNewHWTitle(''); setNewHWDesc('');
  };

  const deleteHomework = (id) => {
    if (!confirm("¿Borrar tarea?")) return;
    const currentHW = currentSubject.assignments || [];
    saveSubject({ ...currentSubject, assignments: currentHW.filter(h => h.id !== id) });
  };

  const handleAssistantChat = () => {
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user', text: chatInput };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');

    // Lógica simple de respuestas del Asistente
    setTimeout(() => {
      let response = "No estoy seguro de cómo responder a eso. ¿Puedes intentar con 'notas', 'tareas' o 'asistencia'?";
      const input = chatInput.toLowerCase();

      if (input.includes('hola') || input.includes('buenos dias')) {
        response = "¡Hola! Estoy aquí para ayudarte con la información escolar. Prueba preguntando por 'tareas' o 'notas'.";
      } else if (input.includes('nota') || input.includes('calificacion') || input.includes('promedio')) {
        response = "Puedes ver las notas en la sección 'Calificaciones'. Recuerda que el promedio se calcula con el 70% de actividades y 30% del examen.";
      } else if (input.includes('tarea') || input.includes('deber')) {
        response = "Las tareas pendientes aparecen en el panel principal. ¡Asegúrate de entregarlas a tiempo!";
      } else if (input.includes('asistencia') || input.includes('falta')) {
        response = "El registro de asistencia se actualiza diariamente. Puedes ver el historial en tu panel.";
      }

      setChatMessages([...newMessages, { role: 'assistant', text: response }]);
    }, 600);
  };

  const addStudentsBulk = () => {
    if (!newStudentList || !currentSubject) return;
    const names = newStudentList.split('\n').map(n => n.trim()).filter(n => n.length);
    const newStus = names.map(name => {
      let existingCode = null;
      for (const sub of subjects) {
        const found = sub.students.find(s => s.name.toLowerCase() === name.toLowerCase());
        if (found) { existingCode = found.code; break; }
      }
      return { id: "s_" + Date.now() + Math.random().toString(36).substr(2, 5), name: name, code: existingCode || generateStudentCode() };
    });
    saveSubject({ ...currentSubject, students: [...currentSubject.students, ...newStus] });
    setIsAddingStudent(false); setNewStudentList('');
  };

  const addActivity = () => {
    if (!newActivityName || !currentSubject) return;
    const acts = currentSubject.activities[currentTrimester] || [];
    saveSubject({ ...currentSubject, activities: { ...currentSubject.activities, [currentTrimester]: [...acts, { id: "a_" + Date.now(), name: newActivityName }] } });
    setIsAddingActivity(false); setNewActivityName('');
  };

  const deleteActivity = (actId) => {
    const pwd = prompt("⚠️ ZONA DE PELIGRO ⚠️\n\nPara eliminar esta ACTIVIDAD, ingrese su contraseña:");
    if (pwd !== appSettings.teacherPassword) return alert("Contraseña incorrecta. Cancelado.");
    const acts = currentSubject.activities[currentTrimester] || [];
    const newActs = acts.filter(a => a.id !== actId);
    const newGrades = { ...currentSubject.grades };
    if (newGrades[currentTrimester]) {
      Object.keys(newGrades[currentTrimester]).forEach(studentId => {
        if (newGrades[currentTrimester][studentId]) delete newGrades[currentTrimester][studentId][actId];
      });
    }
    saveSubject({ ...currentSubject, activities: { ...currentSubject.activities, [currentTrimester]: newActs }, grades: newGrades });
  };

  const addAnnouncement = () => {
    if (!newAnnounceTitle || !currentSubject) return;
    let recipName = "Todos";
    if (newAnnounceRecipient !== 'all') {
      const s = currentSubject.students.find(st => st.id === newAnnounceRecipient);
      if (s) recipName = s.name;
    }
    const newAnn = {
      id: "msg_" + Date.now(),
      title: newAnnounceTitle, body: newAnnounceBody, type: newAnnounceType,
      recipient: newAnnounceRecipient, recipientName: recipName, date: new Date().toLocaleDateString()
    };
    const currentList = currentSubject.announcements || [];
    saveSubject({ ...currentSubject, announcements: [newAnn, ...currentList] });
    setIsAddingAnnouncement(false); setNewAnnounceTitle(''); setNewAnnounceBody(''); setNewAnnounceRecipient('all');
  };

  const deleteAnnouncement = (id) => {
    if (!confirm("¿Borrar comunicado?")) return;
    const currentList = currentSubject.announcements || [];
    saveSubject({ ...currentSubject, announcements: currentList.filter(a => a.id !== id) });
  };

  const updateGrade = (sId, aId, val) => {
    let v = parseFloat(val); if (isNaN(v) || v < 0) v = 0; if (v > 10) v = 10;
    const tri = currentSubject.grades[currentTrimester] || {};
    const stu = tri[sId] || {};
    saveSubject({ ...currentSubject, grades: { ...currentSubject.grades, [currentTrimester]: { ...tri, [sId]: { ...stu, [aId]: v } } } });
  };

  const updateAttendance = (sId, d, f, v) => {
    const stu = currentSubject.attendance[sId] || {};
    const day = stu[d] || { status: 'P', note: '' };
    saveSubject({ ...currentSubject, attendance: { ...currentSubject.attendance, [sId]: { ...stu, [d]: { ...day, [f]: v } } } });
  };

  const calculateStats = (sub, tri, sId) => {
    const acts = sub.activities[tri] || [];
    const gr = sub.grades[tri]?.[sId] || {};
    let sum = 0; acts.forEach(a => sum += (gr[a.id] || 0));
    const avg = acts.length ? sum / acts.length : 0;
    const ex = gr['exam_final'] || 0;
    return {
      avgAct: avg.toFixed(2),
      wAct: (avg * 0.7).toFixed(2),
      rawEx: ex,
      wEx: (ex * 0.3).toFixed(2),
      fin: ((avg * 0.7) + (ex * 0.3)).toFixed(2)
    };
  };

  // --- EXPORTAR (CORREGIDO PARA ESPAÑOL: Usa punto y coma) ---
  const exportGradesCSV = () => {
    const acts = currentSubject.activities[currentTrimester] || [];
    // Usamos ; como separador
    let csv = "Estudiante;Codigo;" + acts.map(a => `"${a.name}"`).join(";") + ";Promedio Act.;70%;Nota Examen;30%;Final\n";

    currentSubject.students.forEach(s => {
      const st = calculateStats(currentSubject, currentTrimester, s.id);
      const gr = currentSubject.grades[currentTrimester]?.[s.id] || {};

      // Reemplazamos puntos por comas en las notas para Excel español (opcional, pero ayuda)
      const fmt = (n) => n.toString().replace('.', ',');

      csv += `"${s.name}";${s.code};` +
        acts.map(a => fmt(gr[a.id] || 0)).join(";") +
        `;${fmt(st.avgAct)};${fmt(st.wAct)};${fmt(st.rawEx)};${fmt(st.wEx)};${fmt(st.fin)}\n`;
    });

    const link = document.createElement("a");
    // UTF-8 BOM para tildes
    link.href = URL.createObjectURL(new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv' }));
    link.download = `Notas_${currentSubject.name}_T${currentTrimester}.csv`; link.click();
  };

  const exportAttendanceCSV = () => {
    const allDates = new Set();
    currentSubject.students.forEach(s => {
      const studentDates = currentSubject.attendance[s.id] || {};
      Object.keys(studentDates).forEach(d => allDates.add(d));
    });
    const sortedDates = Array.from(allDates).sort();

    // Separador ;
    let csv = "Estudiante;Codigo;" + sortedDates.join(";") + ";% Asistencia\n";

    currentSubject.students.forEach(s => {
      const studentAtt = currentSubject.attendance[s.id] || {};
      let presentCount = 0; let totalRecorded = 0;
      const rowData = sortedDates.map(date => {
        const record = studentAtt[date];
        if (!record) return "-";
        totalRecorded++; if (record.status === 'P') presentCount++;
        let cell = record.status === 'P' ? 'P' : 'F';
        if (record.note) cell += ` (${record.note})`;
        return `"${cell}"`;
      });
      const percentage = totalRecorded > 0 ? Math.round((presentCount / totalRecorded) * 100) : 0;
      csv += `"${s.name}";${s.code};` + rowData.join(";") + `;${percentage}%\n`;
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv' }));
    link.download = `Asistencia_Consolidada_${currentSubject.name}.csv`; link.click();
  };

  // --- NAVEGACIÓN FECHA ---
  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // --- RENDERIZADO ---
  if (errorMsg) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full border-l-4 border-red-500">
        <div className="flex items-center gap-2 mb-4 text-red-600"><Bug size={32} /><h2 className="text-xl font-bold">Atención Requerida</h2></div>
        <p className="mb-4 font-bold text-gray-800">{errorMsg}</p>
        <button onClick={() => window.location.reload()} className="mt-6 w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">Recargar</button>
      </div>
    </div>
  );

  if (loading) return <div className="h-screen flex items-center justify-center text-indigo-600 font-bold bg-gray-50">Conectando EstrellaTDF...</div>;

  // --- PORTAL LOGIN ---
  if (viewMode === 'portal') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-800 flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 text-center">
          <div className="bg-indigo-500 p-4 rounded-full inline-block mb-4 shadow-lg"><GraduationCap size={48} className="text-white" /></div>
          <h1 className="text-4xl font-bold mb-2">EstrellaTDF</h1>
          <p className="text-indigo-200 mb-8 font-light">Plataforma Académica Integral</p>
          <div className="space-y-4">
            <div className="bg-black/30 p-5 rounded-xl text-left border border-white/10">
              <label className="text-xs uppercase font-bold text-indigo-300 block mb-2 flex items-center gap-2"><Lock size={14} /> Acceso Docente</label>
              <div className="flex gap-2">
                <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="Contraseña" />
                <button onClick={handleTeacherLogin} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-medium transition">Entrar</button>
              </div>
            </div>
            <div className="bg-black/30 p-5 rounded-xl text-left border border-white/10">
              <label className="text-xs uppercase font-bold text-green-300 block mb-2 flex items-center gap-2"><Eye size={14} /> Acceso Padres</label>
              <div className="flex gap-2">
                <input value={studentCodeInput} onChange={e => setStudentCodeInput(e.target.value)} className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 uppercase" placeholder="Código (ej. ABC123)" />
                <button onClick={handleStudentLogin} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-medium transition">Ver</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA ESTUDIANTE / PADRES ---
  if (viewMode === 'student_view' && studentMatches.length > 0) {
    const currentMatch = studentMatches[selectedSubjectIndex];
    const viewingSubject = currentMatch.subject;
    const viewingStudent = currentMatch.student;

    const st = calculateStats(viewingSubject, currentTrimester, viewingStudent.id);
    const myAnnouncements = (viewingSubject.announcements || []).filter(ann =>
      !ann.recipient || ann.recipient === 'all' || ann.recipient === viewingStudent.id
    );

    return (
      <div className="min-h-screen bg-gray-50 font-sans text-gray-800 p-4 relative">
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
          <div className="flex items-center gap-3 w-full">
            <div className="bg-green-100 p-3 rounded-full text-green-700"><User size={24} /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{viewingStudent.name}</h1>
              <p className="text-sm text-gray-500">Panel Estudiantil - Código: {viewingStudent.code}</p>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {studentMatches.map((match, idx) => (
              <button
                key={match.subject.id}
                onClick={() => setSelectedSubjectIndex(idx)}
                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${selectedSubjectIndex === idx ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {match.subject.name}
              </button>
            ))}
          </div>

          <button onClick={() => setViewMode('portal')} className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition ml-4"><LogOut size={18} /> Salir</button>
        </header>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500 pb-20">
          <div className="space-y-6">
            {/* Sección de Tareas (NUEVO) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-indigo-500">
              <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><BookOpen className="text-indigo-500" /> Tareas Pendientes</h3>
              <div className="space-y-3">
                {(viewingSubject.assignments || []).length === 0 ? (
                  <p className="text-gray-400 text-sm italic text-center py-4">No hay tareas asignadas.</p>
                ) : (
                  (viewingSubject.assignments || []).map(hw => (
                    <div key={hw.id} className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-indigo-900">{hw.title}</h4>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded shadow-sm text-indigo-500 font-bold">Entrega: {hw.dueDate}</span>
                      </div>
                      <p className="text-sm text-indigo-700 whitespace-pre-line">{hw.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2"><FileSpreadsheet className="text-indigo-500" /> Calificaciones: {viewingSubject.name}</h3>
                <div className="flex gap-1">{[1, 2, 3].map(t => <button key={t} onClick={() => setCurrentTrimester(t)} className={`px-2 py-1 text-xs rounded ${currentTrimester === t ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>{t}º</button>)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 flex justify-between text-center">
                <div><div className="text-xs text-gray-500">Actividades</div><div className="font-bold text-indigo-700 text-lg">{st.wAct}</div></div>
                <div><div className="text-xs text-gray-500">Examen</div><div className="font-bold text-orange-600 text-lg">{st.wEx}</div></div>
                <div><div className="text-xs text-gray-500">FINAL</div><div className={`font-bold text-xl ${parseFloat(st.fin) < 7 ? 'text-red-600' : 'text-green-600'}`}>{st.fin}</div></div>
              </div>
              <ul className="space-y-2 text-sm">
                {(viewingSubject.activities[currentTrimester] || []).map(act => {
                  const grade = viewingSubject.grades[currentTrimester]?.[viewingStudent.id]?.[act.id];
                  return (
                    <li key={act.id} className="flex justify-between border-b pb-2">
                      <span>{act.name}</span>
                      <span className={`font-mono font-bold ${grade < 7 ? 'text-red-500' : 'text-gray-700'}`}>{grade !== undefined ? grade : '-'}</span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><Calendar className="text-indigo-500" /> Historial de Asistencia</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {Object.entries(viewingSubject.attendance[viewingStudent.id] || {}).sort().reverse().map(([d, v]) => (
                  <div key={d} className="flex flex-col border-b pb-2 last:border-0">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">{d}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${v.status === 'P' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{v.status === 'P' ? 'ASISTIÓ' : 'FALTA'}</span>
                    </div>
                    {v.note && <p className="text-xs text-gray-500 mt-1 italic bg-yellow-50 p-1 rounded">"{v.note}"</p>}
                  </div>
                ))}
                {Object.keys(viewingSubject.attendance[viewingStudent.id] || {}).length === 0 && <p className="text-gray-400 text-sm text-center">No hay registros aún.</p>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full">
              <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><Megaphone className="text-orange-500" /> Comunicados y Avisos</h3>
              <div className="space-y-4">
                {myAnnouncements.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-lg text-gray-400">
                    <Bell size={40} className="mx-auto mb-2 opacity-20" />
                    <p>No hay comunicados recientes.</p>
                  </div>
                ) : (
                  myAnnouncements.map(ann => (
                    <div key={ann.id} className={`p-4 rounded-lg border-l-4 ${ann.type === 'urgent' ? 'bg-red-50 border-red-500' : ann.type === 'event' ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-400'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-gray-800">{ann.title}</h4>
                        <span className="text-[10px] text-gray-400">{ann.date}</span>
                      </div>
                      {ann.recipient !== 'all' && <div className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded inline-block mb-2 font-bold">Mensaje Personal</div>}
                      <p className="text-sm text-gray-600 whitespace-pre-line">{ann.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* STARASSISTANT CHATBOT WINDOW */}
        {showChat && (
          <div className="fixed bottom-20 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-[60] animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-full"><Megaphone size={16} /></div>
                <span className="font-bold text-sm">StarAssistant</span>
              </div>
              <button onClick={() => setShowChat(false)}><X size={20} /></button>
            </div>
            <div className="flex-1 h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {chatMessages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-700 rounded-tl-none border border-gray-100'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-white border-t flex gap-2">
              <input
                className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Pregunta algo..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAssistantChat()}
              />
              <button onClick={handleAssistantChat} className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition shadow-md">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* FLOATING BUTTON */}
        <button
          onClick={() => setShowChat(!showChat)}
          className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center gap-2 group"
        >
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap text-sm font-bold">¿Dudas? Pregúntame</span>
          <MessageSquare size={24} />
        </button>
      </div>
    );
  }

  // --- VISTA DOCENTE ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      <header className="bg-indigo-700 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <h1 className="font-bold text-xl flex items-center gap-2"><GraduationCap className="text-yellow-300" /> EstrellaTDF <span className="opacity-50 font-normal text-sm hidden sm:inline">| Panel Docente</span></h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsChangingPass(true)} className="flex items-center gap-1 text-sm bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded transition" title="Cambiar Contraseña"><Settings size={16} /></button>
          <button onClick={() => setViewMode('portal')} className="flex items-center gap-1 text-sm bg-indigo-800 hover:bg-indigo-900 px-3 py-1.5 rounded transition"><LogOut size={16} /> Salir</button>
          <button className="md:hidden" onClick={() => setShowMenu(!showMenu)}><Menu /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${showMenu ? 'fixed inset-0 z-40 bg-white' : 'hidden'} md:block md:static md:w-72 bg-white shadow-xl flex-shrink-0 flex flex-col z-40 border-r border-gray-200`}>
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mis Clases</h2>
            {showMenu && <button onClick={() => setShowMenu(false)}><X size={20} /></button>}
          </div>
          <div className="p-3 bg-indigo-900 border-b border-white/10">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-indigo-300 uppercase font-bold block">Año Lectivo</label>
              <button
                onClick={() => {
                  const y = prompt("Ingrese el nuevo año (ej: 2026):");
                  if (y && !appSettings.availableYears?.includes(y)) {
                    updateSettings({ ...appSettings, availableYears: [...(appSettings.availableYears || []), y].sort().reverse() });
                  }
                }}
                className="text-[10px] bg-indigo-700 hover:bg-indigo-600 text-white px-1.5 py-0.5 rounded flex items-center gap-1 transition"
              >
                <Plus size={10} /> Nuevo Año
              </button>
            </div>
            <select
              className="w-full bg-indigo-800 text-white border-none rounded p-2 text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
              value={selectedYearView}
              onChange={(e) => setSelectedYearView(e.target.value)}
            >
              {[...new Set([
                ...(appSettings.availableYears || []),
                ...subjects.map(s => s.year),
                new Date().getFullYear().toString(),
                "2025"
              ])].filter(Boolean).sort().reverse().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="p-3 space-y-2 overflow-y-auto flex-1">
            <button onClick={() => setIsAddingSubject(true)} className="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-100 transition shadow-sm font-medium">
              <Plus size={18} /> Nueva Asignatura
            </button>
            {subjects.filter(s => s.year === selectedYearView).map(s => (
              <button key={s.id} onClick={() => { setCurrentSubjectId(s.id); setShowMenu(false); }} className={`w-full text-left p-3 rounded-lg flex justify-between items-center transition duration-200 ${currentSubjectId === s.id ? 'bg-indigo-600 text-white shadow-md transform scale-[1.02]' : 'hover:bg-gray-100 text-gray-700'}`}>
                <div><div className="font-bold text-sm">{s.name}</div><div className={`text-xs ${currentSubjectId === s.id ? 'text-indigo-200' : 'text-gray-400'}`}>{s.parallel}</div></div>
                {currentSubjectId === s.id && <ChevronRight size={16} />}
              </button>
            ))}
            {subjects.filter(s => s.year === selectedYearView).length === 0 && <p className="text-center text-gray-400 text-xs py-4">Sin materias en este año.</p>}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto bg-gray-50 relative">
          {currentSubject ? (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    {currentSubject.name} <span className="bg-indigo-100 text-indigo-800 text-sm px-3 py-1 rounded-full font-medium">{currentSubject.parallel}</span>
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">{currentSubject.students.length} Estudiantes inscritos</p>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-lg shadow-inner overflow-x-auto">
                  <button onClick={() => setActiveTab('grades')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'grades' ? 'bg-white text-indigo-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}><FileSpreadsheet size={18} /> Notas</button>
                  <button onClick={() => setActiveTab('attendance')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'attendance' ? 'bg-white text-indigo-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}><Calendar size={18} /> Asistencia</button>
                  <button onClick={() => setActiveTab('homework')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'homework' ? 'bg-white text-indigo-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}><BookOpen size={18} /> Tareas</button>
                  <button onClick={() => setActiveTab('announcements')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'announcements' ? 'bg-white text-indigo-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}><Megaphone size={18} /> Comunicados</button>
                </div>
              </div>

              {activeTab === 'grades' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-220px)]">
                  <div className="p-3 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex items-center gap-1 bg-white border border-gray-200 px-1 py-1 rounded-lg shadow-sm">
                      {[1, 2, 3].map(t => <button key={t} onClick={() => setCurrentTrimester(t)} className={`px-4 py-1.5 text-sm rounded-md transition font-medium ${currentTrimester === t ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>{t}º Trimestre</button>)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={exportGradesCSV} className="text-sm bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-1 shadow-sm transition"><Download size={16} /> Excel</button>
                      <button onClick={() => setIsAddingActivity(true)} className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 shadow-sm transition"><Plus size={16} /> Actividad</button>
                      <button onClick={() => setIsAddingStudent(true)} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 shadow-sm transition"><User size={16} /> Estudiante</button>
                      <button onClick={() => deleteSubjectDB(currentSubject.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition" title="Borrar Clase (Con Contraseña)"><Trash2 size={18} /></button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="p-3 w-10 text-center font-bold border-b border-gray-300">#</th>
                          <th className="p-3 min-w-[250px] font-bold border-b border-gray-300 border-r">Estudiante</th>
                          {(currentSubject.activities[currentTrimester] || []).map((a, i) => (
                            <th key={a.id} className="p-2 text-center min-w-[100px] border-b border-gray-300 border-r bg-gray-50 relative group">
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] uppercase tracking-wider text-gray-400">Act {i + 1}</span>
                                <span className="font-bold truncate max-w-[90px]" title={a.name}>{a.name}</span>
                                <button onClick={() => deleteActivity(a.id)} className="absolute -top-1 right-1 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={10} /></button>
                              </div>
                            </th>
                          ))}
                          <th className="p-2 text-center w-20 bg-indigo-50 border-b border-indigo-100 border-r">70%</th>
                          <th className="p-2 text-center w-20 bg-orange-50 border-b border-orange-100 border-r">30%</th>
                          <th className="p-2 text-center w-20 bg-gray-800 text-white font-bold">FINAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentSubject.students.map((s, i) => {
                          const st = calculateStats(currentSubject, currentTrimester, s.id);
                          const rowClass = PALETTE[i % PALETTE.length];
                          return (
                            <tr key={s.id} className={`border-b border-gray-100 ${rowClass} transition hover:brightness-95`}>
                              <td className="p-3 text-center text-gray-400 font-mono text-xs">{i + 1}</td>
                              <td className="p-3 font-medium text-gray-800 border-r border-gray-200/50 relative group">
                                {s.name}
                                <div className="text-[10px] text-gray-400 font-mono">CÓD: {s.code}</div>
                              </td>
                              {(currentSubject.activities[currentTrimester] || []).map(a => (
                                <td key={a.id} className="p-1 border-r border-gray-200/50 text-center">
                                  <input type="number" className="w-14 text-center p-1 rounded border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white/70 shadow-sm" value={currentSubject.grades[currentTrimester]?.[s.id]?.[a.id] ?? ''} onChange={e => updateGrade(s.id, a.id, e.target.value)} />
                                </td>
                              ))}
                              <td className="p-2 text-center font-bold text-indigo-700 bg-indigo-50/50 border-r border-indigo-100">{st.wAct}</td>
                              <td className="p-1 text-center bg-orange-50/50 border-r border-orange-100">
                                <input type="number" className="w-14 text-center p-1 rounded border border-orange-200 focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white shadow-sm" value={currentSubject.grades[currentTrimester]?.[s.id]?.['exam_final'] ?? ''} onChange={e => updateGrade(s.id, 'exam_final', e.target.value)} />
                              </td>
                              <td className={`p-2 text-center font-bold text-white ${parseFloat(st.fin) < 7 ? 'bg-red-500' : 'bg-gray-800'}`}>{st.fin}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {currentSubject.students.length === 0 && <div className="text-center p-10 text-gray-400 italic">No hay estudiantes. Agrega una lista para comenzar.</div>}
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-220px)]">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center sticky top-0 z-20 gap-3">
                    <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-lg border">
                      <button onClick={() => changeDate(-1)} className="p-1 hover:bg-white rounded shadow-sm transition"><ChevronLeft size={20} /></button>
                      <Calendar className="text-indigo-600" />
                      <input
                        type="date"
                        className="bg-transparent border-none text-sm font-bold text-gray-700 outline-none"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                      <button onClick={() => changeDate(1)} className="p-1 hover:bg-white rounded shadow-sm transition"><ChevronRight size={20} /></button>
                    </div>
                    <button onClick={exportAttendanceCSV} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow transition w-full sm:w-auto justify-center"><Download size={16} /> Reporte Completo</button>
                  </div>

                  <div className="flex-1 overflow-auto p-4 space-y-3">
                    {currentSubject.students.map((s, i) => {
                      const att = currentSubject.attendance[s.id]?.[selectedDate] || { status: 'P', note: '' };
                      const rowClass = PALETTE[i % PALETTE.length];
                      return (
                        <div key={s.id} className={`flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border border-gray-200 shadow-sm ${rowClass} transition hover:shadow-md`}>
                          <div className="md:w-1/3 min-w-[200px]">
                            <div className="font-bold text-gray-800 text-lg">{s.name}</div>
                            <div className="text-xs text-gray-500 font-mono">Cód: {s.code}</div>
                          </div>

                          <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-lg border border-gray-200 shadow-sm">
                            <button onClick={() => updateAttendance(s.id, selectedDate, 'status', 'P')} className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${att.status === 'P' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:bg-gray-100'}`}><CheckCircle size={16} /> Asistió</button>
                            <button onClick={() => updateAttendance(s.id, selectedDate, 'status', 'A')} className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${att.status === 'A' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:bg-gray-100'}`}><XCircle size={16} /> Falta</button>
                          </div>

                          <div className="flex-1 w-full md:w-auto relative">
                            <MessageSquare size={16} className="absolute top-3 left-3 text-gray-400" />
                            <input
                              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white/90 shadow-sm"
                              placeholder="Escribir observación (visible para el representante)..."
                              value={att.note || ''}
                              onChange={(e) => updateAttendance(s.id, selectedDate, 'note', e.target.value)}
                            />
                          </div>
                        </div>
                      )
                    })}
                    {currentSubject.students.length === 0 && <div className="text-center p-10 text-gray-400">Sin estudiantes.</div>}
                  </div>
                </div>
              )}

              {activeTab === 'homework' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-gray-700"><BookOpen className="text-indigo-500" /> Gestión de Tareas</h3>
                    <button onClick={() => setIsAddingHomework(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow"><Plus size={18} /> Nueva Tarea</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(currentSubject.assignments || []).map(hw => (
                      <div key={hw.id} className="p-5 rounded-lg border border-gray-200 bg-gray-50 shadow-sm relative group">
                        <button onClick={() => deleteHomework(hw.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16} /></button>
                        <h4 className="font-bold text-gray-800 text-lg mb-1">{hw.title}</h4>
                        <div className="flex gap-2 text-[10px] mb-3">
                          <span className="bg-white px-2 py-0.5 rounded border border-gray-200 font-bold text-indigo-600">Entrega: {hw.dueDate}</span>
                          <span className="text-gray-400">Creado: {hw.createdAt}</span>
                        </div>
                        <p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed">{hw.description}</p>
                      </div>
                    ))}
                    {(currentSubject.assignments || []).length === 0 && <div className="col-span-full text-center p-10 text-gray-400 italic bg-gray-50 rounded-lg border border-dashed border-gray-300">No hay tareas publicadas.</div>}
                  </div>
                </div>
              )}

              {activeTab === 'announcements' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-gray-700"><Megaphone className="text-orange-500" /> Tablón de Anuncios</h3>
                    <button onClick={() => setIsAddingAnnouncement(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow"><Plus size={18} /> Nuevo Aviso</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(currentSubject.announcements || []).map(ann => (
                      <div key={ann.id} className={`p-5 rounded-lg border-l-4 shadow-sm relative group ${ann.type === 'urgent' ? 'bg-red-50 border-red-500' : ann.type === 'event' ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-400'}`}>
                        <button onClick={() => deleteAnnouncement(ann.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16} /></button>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-gray-800 text-lg">{ann.title}</h4>
                            <div className="text-xs text-gray-500 mt-1 flex gap-2">
                              <span className="bg-white px-2 py-0.5 rounded border shadow-sm">{ann.date}</span>
                              <span className={`px-2 py-0.5 rounded font-bold ${ann.recipient === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                {ann.recipient === 'all' ? 'Para: Todos' : `Para: ${ann.recipientName}`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed mt-2">{ann.body}</p>
                      </div>
                    ))}
                    {(currentSubject.announcements || []).length === 0 && <div className="col-span-full text-center p-10 text-gray-400 italic bg-gray-50 rounded-lg border border-dashed border-gray-300">No hay comunicados publicados.</div>}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center bg-gray-50">
              <BookOpen size={80} className="mb-6 opacity-20 text-indigo-300" />
              <p className="text-xl font-medium text-gray-600">Bienvenido a EstrellaTDF</p>
              <p className="text-sm">Selecciona una clase del menú o crea una nueva para comenzar.</p>
            </div>
          )}
        </main>
      </div>

      {/* MODALES BONITOS */}
      {isAddingSubject && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200"><h3 className="text-xl font-bold mb-4 text-gray-800">Nueva Asignatura</h3><input className="border border-gray-300 w-full p-3 rounded-lg mb-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nombre (ej. Matemáticas)" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} autoFocus /><input className="border border-gray-300 w-full p-3 rounded-lg mb-6 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Paralelo (ej. 10mo A)" value={newParallel} onChange={e => setNewParallel(e.target.value)} /><div className="flex justify-end gap-2"><button onClick={() => setIsAddingSubject(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button><button onClick={addSubject} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">Crear</button></div></div></div>}
      {isAddingStudent && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200"><h3 className="text-xl font-bold mb-2 text-gray-800">Inscribir Estudiantes</h3><p className="text-sm text-gray-500 mb-3">Copia y pega tu lista de Excel aquí.</p><textarea className="border border-gray-300 w-full h-48 p-3 rounded-lg mb-4 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder={"Juan Perez\nMaria Lopez\nCarlos Ruiz"} value={newStudentList} onChange={e => setNewStudentList(e.target.value)} autoFocus /><div className="flex justify-end gap-2"><button onClick={() => setIsAddingStudent(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button><button onClick={addStudentsBulk} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">Procesar Lista</button></div></div></div>}
      {isAddingActivity && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200"><h3 className="text-xl font-bold mb-4 text-gray-800">Nueva Actividad (Tri {currentTrimester})</h3><input className="border border-gray-300 w-full p-3 rounded-lg mb-6 focus:ring-2 focus:ring-green-500 outline-none" placeholder="Nombre (ej. Lección 1)" value={newActivityName} onChange={e => setNewActivityName(e.target.value)} autoFocus /><div className="flex justify-end gap-2"><button onClick={() => setIsAddingActivity(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button><button onClick={addActivity} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">Guardar</button></div></div></div>}

      {/* MODAL NUEVO COMUNICADO */}
      {isAddingAnnouncement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Publicar Comunicado</h3>

            {/* Destinatario */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destinatario</label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                value={newAnnounceRecipient}
                onChange={e => setNewAnnounceRecipient(e.target.value)}
              >
                <option value="all">📢 Para todos los estudiantes</option>
                <optgroup label="Estudiante Específico">
                  {currentSubject.students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <input className="border border-gray-300 w-full p-3 rounded-lg mb-3 focus:ring-2 focus:ring-orange-500 outline-none font-bold" placeholder="Título (ej. Citación)" value={newAnnounceTitle} onChange={e => setNewAnnounceTitle(e.target.value)} />
            <textarea className="border border-gray-300 w-full p-3 rounded-lg mb-4 h-24 focus:ring-2 focus:ring-orange-500 outline-none resize-none" placeholder="Escribe el mensaje..." value={newAnnounceBody} onChange={e => setNewAnnounceBody(e.target.value)} />

            <div className="flex gap-2 mb-6">
              <button onClick={() => setNewAnnounceType('info')} className={`flex-1 py-2 rounded-lg border text-sm font-bold ${newAnnounceType === 'info' ? 'bg-gray-200 border-gray-400' : 'border-gray-200'}`}>Info</button>
              <button onClick={() => setNewAnnounceType('event')} className={`flex-1 py-2 rounded-lg border text-sm font-bold ${newAnnounceType === 'event' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200'}`}>Evento</button>
              <button onClick={() => setNewAnnounceType('urgent')} className={`flex-1 py-2 rounded-lg border text-sm font-bold ${newAnnounceType === 'urgent' ? 'bg-red-100 border-red-400 text-red-700' : 'border-gray-200'}`}>Urgente</button>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsAddingAnnouncement(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
              <button onClick={addAnnouncement} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">Publicar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVA TAREA */}
      {isAddingHomework && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Crear Tarea</h3>
            <input className="border border-gray-300 w-full p-3 rounded-lg mb-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold" placeholder="Título de la tarea" value={newHWTitle} onChange={e => setNewHWTitle(e.target.value)} autoFocus />
            <textarea className="border border-gray-300 w-full p-3 rounded-lg mb-3 h-32 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Instrucciones detalladas..." value={newHWDesc} onChange={e => setNewHWDesc(e.target.value)} />
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha de Entrega</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none" value={newHWDate} onChange={e => setNewHWDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsAddingHomework(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
              <button onClick={addHomework} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">Publicar Tarea</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CAMBIAR CONTRASEÑA */}
      {isChangingPass && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2 mb-4 text-indigo-700"><ShieldAlert size={24} /><h3 className="text-xl font-bold">Cambiar Contraseña</h3></div>
            <p className="text-sm text-gray-500 mb-4">Ingresa la nueva contraseña que usarás para entrar y para autorizar borrados.</p>

            {/* Contraseña Antigua */}
            <label className="text-xs font-bold text-gray-500 uppercase">Contraseña Actual</label>
            <input className="border border-gray-300 w-full p-3 rounded-lg mb-3 focus:ring-2 focus:ring-indigo-500 outline-none" type="password" placeholder="Clave actual" value={oldPassInput} onChange={e => setOldPassInput(e.target.value)} autoFocus />

            {/* Nueva Contraseña */}
            <label className="text-xs font-bold text-gray-500 uppercase">Nueva Contraseña</label>
            <input className="border border-gray-300 w-full p-3 rounded-lg mb-6 focus:ring-2 focus:ring-indigo-500 outline-none" type="password" placeholder="Nueva clave segura" value={newPassInput} onChange={e => setNewPassInput(e.target.value)} />

            <div className="flex justify-end gap-2">
              <button onClick={() => { setIsChangingPass(false); setOldPassInput(''); setNewPassInput(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
              <button onClick={handleChangePassword} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">Actualizar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}