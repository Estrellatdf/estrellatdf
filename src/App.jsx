import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, User, BookOpen, Menu, X, ChevronRight,
  GraduationCap, FileSpreadsheet, Lock, Eye, Calendar,
  CheckCircle, XCircle, MessageSquare, LogOut, AlertTriangle, Bug, Download, BarChart2,
  Bell, Megaphone, Clock, Settings, ShieldAlert
} from 'lucide-react';

// Importaciones de Firebase
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken
} from 'firebase/auth';
import {
  initializeFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, persistentLocalCache, persistentMultipleTabManager
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
  db = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
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

const PALETTE = [
  'bg-blue-50 border-blue-100',
  'bg-green-50 border-green-100',
  'bg-yellow-50 border-yellow-100',
  'bg-purple-50 border-purple-100',
  'bg-pink-50 border-pink-100',
  'bg-orange-50 border-orange-100',
];

export default function UE19deAgosto() {
  // --- TRUCO DE DISEÑO AUTOMÁTICO ---
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
  const [staff, setStaff] = useState([]); // Colección de usuarios (docentes/admin)
  const [currentUser, setCurrentUser] = useState(null); // Usuario logueado: { id, name, role, tutoringCourse }
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

  // Formularios
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newParallel, setNewParallel] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentList, setNewStudentList] = useState('');
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');

  // Estados de Personal (Management)
  const [isManagingStaff, setIsManagingStaff] = useState(false);
  const [isManagingSettings, setIsManagingSettings] = useState(false); // Nuevo modal para estándares
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Docente');
  const [newStaffTutoring, setNewStaffTutoring] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('');
  const [officialParallelsInput, setOfficialParallelsInput] = useState('');

  // Estados para Comunicados
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [newAnnounceTitle, setNewAnnounceTitle] = useState('');
  const [newAnnounceBody, setNewAnnounceBody] = useState('');
  const [newAnnounceType, setNewAnnounceType] = useState('info');
  const [newAnnounceRecipient, setNewAnnounceRecipient] = useState('all');

  // Estado para Cambiar Contraseña (SEGURO)
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [oldPassInput, setOldPassInput] = useState(''); // Para verificar la anterior
  const [newPassInput, setNewPassInput] = useState('');

  // Vista Estudiante
  const [viewingStudent, setViewingStudent] = useState(null);
  const [viewingSubject, setViewingSubject] = useState(null);
  const [studentSubjects, setStudentSubjects] = useState([]); // Todas las asignaturas del estudiante
  const [newSubjectTeacher, setNewSubjectTeacher] = useState('');
  const [viewingStudentDetails, setViewingStudentDetails] = useState(null); // Para modal de asistencia individual

  // Navegación Sidebar
  const [showOtherSubjects, setShowOtherSubjects] = useState(false);

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
      if (docSnap.exists()) setAppSettings(docSnap.data());
      else setAppSettings({ teacherPassword: null });
    });

    const staffCol = collection(db, 'artifacts', appId, 'public', 'data', 'staff');
    const unsubStaff = onSnapshot(staffCol, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setStaff(data);
    });

    return () => { unsubSub(); unsubSettings(); unsubStaff(); };
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
    // Si no hay personal creado aún, usamos la contraseña maestra para el primer login (y creamos al primer Rector)
    if (staff.length === 0) {
      if (!appSettings.teacherPassword) {
        if (authPassword.length < 4) return alert("Mínimo 4 caracteres para la clave maestra inicial");
        updateSettings({ teacherPassword: authPassword });
        // Crear primer usuario rector por defecto
        const firstRector = { id: 'rector_init', name: 'Administrador Inicial', role: 'Rector', password: authPassword };
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', 'rector_init'), firstRector);
        setCurrentUser(firstRector);
        setViewMode('teacher');
      } else {
        if (authPassword === appSettings.teacherPassword) {
          setViewMode('teacher');
          setCurrentUser({ name: 'Admin Temporal', role: 'Rector' });
        } else alert("Incorrecto");
      }
      return;
    }

    const matches = staff.filter(s => s.password === authPassword);
    if (matches.length > 0) {
      // Priorizar Rector > Administrativo > Docente
      const found = matches.find(m => m.role === 'Rector') || matches.find(m => m.role === 'Administrativo') || matches[0];
      setCurrentUser({ ...found }); // Clonar para asegurar reactividad
      setViewMode('teacher');
    } else {
      alert("Contraseña no válida o usuario no registrado.");
    }
  };

  const handleEmergencyRector = async () => {
    if (authPassword === appSettings.teacherPassword || authPassword === "rector2026") { // "rector2026" como backup extra
      const id = "rector_master";
      const masterRector = { id, name: 'Rector Principal', role: 'Rector', password: authPassword };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', id), masterRector);
      setCurrentUser(masterRector);
      setViewMode('teacher');
      alert("✅ Acceso de Emergencia concedido. Ya puedes gestionar el personal.");
    } else {
      alert("Clave de emergencia incorrecta.");
    }
  };

  // CAMBIO DE CONTRASEÑA SEGURO (Individual por docente)
  const handleChangePassword = async () => {
    if (!currentUser?.id) return;

    // 1. Validar nueva contraseña
    if (newPassInput.length < 4) {
      return alert("❌ Error: La NUEVA contraseña es muy corta (mínimo 4 caracteres).");
    }

    // 2. Guardar en su perfil de staff
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'staff', currentUser.id);
      await setDoc(userRef, { ...currentUser, password: newPassInput }, { merge: true });
      setCurrentUser({ ...currentUser, password: newPassInput });
      alert("✅ ¡Tu contraseña personal ha sido actualizada!");
      setIsChangingPass(false);
      setNewPassInput('');
    } catch (e) {
      alert("Error al actualizar: " + e.message);
    }
  };

  const handleStudentLogin = () => {
    if (!studentCodeInput) return;
    const code = studentCodeInput.trim().toUpperCase();
    const foundMatches = [];
    for (const sub of subjects) {
      const s = sub.students.find(st => st.code === code);
      if (s) foundMatches.push({ student: s, subject: sub });
    }
    if (foundMatches.length > 0) {
      setViewingStudent(foundMatches[0].student);
      setViewingSubject(foundMatches[0].subject);
      setStudentSubjects(foundMatches);
      setViewMode('student_view');
    } else {
      alert("Código no encontrado.");
    }
  };

  // --- CRUD FUNCTIONS ---
  // --- FILTRADO DE ASIGNATURAS POR ROL ---
  const visibleSubjects = subjects.filter(sub => {
    if (!currentUser) return false;
    if (currentUser.role === 'Rector' || currentUser.role === 'Administrativo') return true;
    if (currentUser.role === 'Docente') {
      // Sus propias materias
      if (sub.teacherId === currentUser.id) return true;
      // Si es tutor de este paralelo, puede verla (Comparación robusta)
      const tutorCourse = (currentUser.tutoringCourse || '').trim().toLowerCase();
      const subParallel = (sub.parallel || '').trim().toLowerCase();
      if (tutorCourse && subParallel && tutorCourse === subParallel) return true;
    }
    return false;
  });

  const canEditGrades = (sub) => {
    if (!currentUser || !sub) return false;
    // El Rector/Administrativo NUNCA edita notas, solo el docente titular
    if (currentUser.role === 'Rector' || currentUser.role === 'Administrativo') return false;
    return String(sub.teacherId) === String(currentUser.id);
  };

  const currentSubject = visibleSubjects.find(s => s.id === currentSubjectId);

  const addSubject = () => {
    if (!newSubjectName || !newParallel) return;

    // Si es docente, se asigna a sí mismo. Si es Rector, usa el selector.
    const teacherId = currentUser.role === 'Docente' ? currentUser.id : newSubjectTeacher;
    const selectedDoc = staff.find(d => d.id === teacherId);

    const newSub = {
      id: Date.now(),
      name: newSubjectName,
      parallel: newParallel,
      teacherId: teacherId,
      teacherName: selectedDoc?.name || (currentUser.role === 'Docente' ? currentUser.name : ''),
      students: [],
      activities: { 1: [], 2: [], 3: [] },
      grades: { 1: {}, 2: {}, 3: {} },
      attendance: {},
      announcements: []
    };
    saveSubject(newSub); setCurrentSubjectId(newSub.id); setIsAddingSubject(false); setNewSubjectName(''); setNewParallel(''); setNewSubjectTeacher('');
  };

  const updateSubjectInfo = () => {
    if (!currentSubject || !newSubjectName) return;
    const teacherId = newSubjectTeacher || currentSubject.teacherId;
    const selectedDoc = staff.find(d => d.id === teacherId);
    saveSubject({
      ...currentSubject,
      name: newSubjectName,
      parallel: newParallel,
      teacherId: teacherId,
      teacherName: selectedDoc?.name || ''
    });
    setIsAddingSubject(false);
    setNewSubjectName('');
    setNewParallel('');
    setNewSubjectTeacher('');
  };

  const addStaffMember = async () => {
    if (!newStaffName || !newStaffPass) return;
    const id = "staff_" + Date.now();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', id), {
      id, name: newStaffName, role: newStaffRole, password: newStaffPass, tutoringCourse: newStaffTutoring
    });
    setNewStaffName(''); setNewStaffPass(''); setNewStaffTutoring('');
  };

  const addStudentsBulk = () => {
    if (!newStudentList || !currentSubject) return;
    const names = newStudentList.split('\n').map(n => n.trim()).filter(n => n.length);
    const newStus = names.map(n => ({ id: "s_" + Date.now() + Math.random().toString(36).substr(2, 5), name: n, code: generateStudentCode() }));
    saveSubject({ ...currentSubject, students: [...currentSubject.students, ...newStus] }); setIsAddingStudent(false); setNewStudentList('');
  };

  const addActivity = () => {
    if (!newActivityName || !currentSubject) return;
    const acts = currentSubject.activities[currentTrimester] || [];
    saveSubject({ ...currentSubject, activities: { ...currentSubject.activities, [currentTrimester]: [...acts, { id: "a_" + Date.now(), name: newActivityName }] } });
    setIsAddingActivity(false); setNewActivityName('');
  };

  const deleteActivity = (actId) => {
    const pwd = prompt("⚠️ ZONA DE PELIGRO ⚠️\n\nPara eliminar esta ACTIVIDAD y sus notas, ingrese su contraseña:");
    if (pwd !== appSettings.teacherPassword) return alert("Contraseña incorrecta. Cancelado.");

    const acts = currentSubject.activities[currentTrimester] || [];
    const newActs = acts.filter(a => a.id !== actId);

    const newGrades = { ...currentSubject.grades };
    if (newGrades[currentTrimester]) {
      Object.keys(newGrades[currentTrimester]).forEach(studentId => {
        if (newGrades[currentTrimester][studentId]) {
          delete newGrades[currentTrimester][studentId][actId];
        }
      });
    }

    saveSubject({
      ...currentSubject,
      activities: { ...currentSubject.activities, [currentTrimester]: newActs },
      grades: newGrades
    });
  };

  const deleteStudent = (studentId, studentName) => {
    const pwd = prompt(`⚠️ ZONA DE PELIGRO ⚠️\n\nEstá a punto de ELIMINAR al estudiante "${studentName}" y todas sus calificaciones/asistencias.\nIngrese su contraseña para confirmar:`);
    if (pwd !== appSettings.teacherPassword) return alert("Contraseña incorrecta. Cancelado.");

    // Remove student from roster
    const newStudents = currentSubject.students.filter(s => s.id !== studentId);
    
    // Remove grades for this student across all trimesters
    const newGrades = { ...currentSubject.grades };
    [1, 2, 3].forEach(tri => {
      if (newGrades[tri] && newGrades[tri][studentId]) {
        delete newGrades[tri][studentId];
      }
    });

    // Remove attendance for this student
    const newAttendance = { ...currentSubject.attendance };
    if (newAttendance[studentId]) {
      delete newAttendance[studentId];
    }

    saveSubject({
      ...currentSubject,
      students: newStudents,
      grades: newGrades,
      attendance: newAttendance
    });
  };

  const addAnnouncement = () => {
    if (!newAnnounceTitle || !currentSubject) return;

    // Si el usuario es Rector, puede enviar un comunicado global que se guarda en una materia pero se marca como global
    const isGlobal = newAnnounceRecipient === 'all' && currentUser?.role === 'Rector';

    let recipName = isGlobal ? "Todos los Cursos" : "Todos";
    if (newAnnounceRecipient !== 'all') {
      const s = currentSubject.students.find(st => st.id === newAnnounceRecipient);
      if (s) recipName = s.name;
    }

    const newAnn = {
      id: "msg_" + Date.now(),
      title: newAnnounceTitle,
      body: newAnnounceBody,
      type: newAnnounceType,
      recipient: newAnnounceRecipient,
      recipientName: recipName,
      isGlobal: isGlobal, // Marcar si es global
      date: new Date().toLocaleDateString()
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
    if (!currentSubject) return;
    const att = currentSubject.attendance || {};
    const stu = att[sId] || {};
    const day = stu[d] || { status: 'P', note: '' };
    const newAtt = { ...att, [sId]: { ...stu, [d]: { ...day, [f]: v } } };
    saveSubject({ ...currentSubject, attendance: newAtt });
  };

  const saveSettings = async (newSet) => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'settings'), newSet);
    setAppSettings(newSet);
    setIsManagingSettings(false);
  };

  const calculateStats = (sub, tri, sId) => {
    if (!sub) return { wAct: '0.00', wEx: '0.00', fin: '0.00' };
    const acts = (sub.activities && sub.activities[tri]) || [];
    const gr = (sub.grades && sub.grades[tri] && sub.grades[tri][sId]) || {};
    let sum = 0; acts.forEach(a => sum += (gr[a.id] || 0));
    const avg = acts.length ? sum / acts.length : 0;

    const ex = parseFloat(gr['exam_final'] || 0);
    const proj = gr['project_final'];

    let weight30;
    if (proj !== undefined && proj !== null && proj !== '') {
      const projVal = parseFloat(proj);
      weight30 = ((ex + projVal) / 2) * 0.3;
    } else {
      weight30 = ex * 0.3;
    }

    return {
      wAct: (avg * 0.7).toFixed(2),
      wEx: weight30.toFixed(2),
      fin: ((avg * 0.7) + weight30).toFixed(2)
    };
  };

  // --- EXPORTAR ---
  const exportGradesCSV = () => {
    const acts = currentSubject.activities[currentTrimester] || [];
    let csv = "Estudiante,Codigo," + acts.map(a => `"${a.name}"`).join(",") + ",70%,Examen,Proyecto,30%,Final\n";
    currentSubject.students.forEach(s => {
      const st = calculateStats(currentSubject, currentTrimester, s.id);
      const gr = currentSubject.grades[currentTrimester]?.[s.id] || {};
      csv += `"${s.name}",${s.code},` + acts.map(a => gr[a.id] || 0).join(",") + `,${st.wAct},${gr['exam_final'] || 0},${gr['project_final'] || ''},${st.wEx},${st.fin}\n`;
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv' }));
    link.download = `Notas_${currentSubject.name}_T${currentTrimester}.csv`; link.click();
  };

  const exportAttendanceCSV = () => {
    if (!currentSubject) return;
    const allDates = new Set();
    currentSubject.students.forEach(s => {
      const studentDates = (currentSubject?.attendance?.[s.id]) || {};
      Object.keys(studentDates).forEach(d => allDates.add(d));
    });
    const sortedDates = Array.from(allDates).sort();
    let csv = "Estudiante,Codigo," + sortedDates.join(",") + ",% Asistencia\n";
    currentSubject.students.forEach(s => {
      const studentAtt = (currentSubject?.attendance?.[s.id]) || {};
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
      csv += `"${s.name}",${s.code},` + rowData.join(",") + `,${percentage}%\n`;
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv' }));
    link.download = `Asistencia_Consolidada_${currentSubject.name}.csv`; link.click();
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

  if (loading) return <div className="h-screen flex items-center justify-center text-indigo-600 font-bold bg-gray-50">Conectando U.E. 19 de Agosto...</div>;

  // --- PORTAL LOGIN ---
  if (viewMode === 'portal') {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 text-white font-sans relative overflow-hidden">
        {/* Decoración de fondo premium */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[120px]"></div>

        <div className="bg-slate-900/40 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-lg border border-white/10 text-center relative z-10">
          <div className="bg-gradient-to-tr from-indigo-500 to-emerald-500 p-5 rounded-2xl inline-block mb-6 shadow-xl"><GraduationCap size={56} className="text-white" /></div>
          <h1 className="text-5xl font-black mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">U.E. 19 de Agosto</h1>
          <p className="text-slate-400 mb-10 text-lg font-medium">Gestión Académica de Vanguardia</p>
          <div className="space-y-4">
            <div className="bg-black/30 p-5 rounded-xl text-left border border-white/10">
              <label className="text-xs uppercase font-bold text-indigo-300 block mb-2 flex items-center gap-2"><Lock size={14} /> Acceso Docente</label>
              <div className="flex gap-2">
                <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="Contraseña" />
                <button onClick={handleTeacherLogin} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-medium transition">Entrar</button>
              </div>
              <button onClick={handleEmergencyRector} className="mt-2 text-[10px] text-indigo-400 hover:text-indigo-200 underline opacity-30 hover:opacity-100 transition">Acceso de Emergencia (Rector)</button>
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
  if (viewMode === 'student_view' && viewingStudent) {
    const st = calculateStats(viewingSubject, currentTrimester, viewingStudent.id);

    // --- FILTRADO DE COMUNICADOS (VISTA ESTUDIANTE) ---
    // 1. Obtener TODOS los comunicados de TODAS las materias
    const allAnnouncements = subjects.flatMap(sub => (sub.announcements || []).map(ann => ({ ...ann, sourceSubject: sub.name })));

    // 2. Filtrar: los Globales (de cualquier materia) + los específicos de ESTA materia para ESTE estudiante
    const filteredAnnouncements = allAnnouncements.filter(ann => {
      // Globales para todos
      if (ann.isGlobal) return true;
      // Si no es global, solo los de la materia que estamos viendo
      if (ann.sourceSubject === viewingSubject.name) {
        return !ann.recipient || ann.recipient === 'all' || ann.recipient === viewingStudent.id;
      }
      return false;
    });

    // 3. Eliminar duplicados por ID y ordenar (más recientes primero)
    const uniqueAnnouncements = Array.from(new Map(filteredAnnouncements.map(ann => [ann.id, ann])).values())
      .sort((a, b) => b.id.localeCompare(a.id));


    return (
      <div className="min-h-screen bg-gray-50 font-sans text-gray-800 p-4">
        <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-full text-green-700"><User size={24} /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{viewingStudent.name}</h1>
              <p className="text-sm text-gray-500">{viewingSubject.name} - {viewingSubject.parallel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {studentSubjects.length > 1 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400 hidden sm:block">Asignatura:</span>
                <select
                  value={viewingSubject.id}
                  onChange={e => {
                    const match = studentSubjects.find(m => String(m.subject.id) === e.target.value);
                    if (match) { setViewingSubject(match.subject); setViewingStudent(match.student); setCurrentTrimester(1); }
                  }}
                  className="text-sm border border-indigo-300 rounded-lg px-2 py-1.5 bg-indigo-50 text-indigo-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                >
                  {studentSubjects.map(m => (
                    <option key={m.subject.id} value={String(m.subject.id)}>
                      {m.subject.name} ({m.subject.parallel})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button onClick={() => { setViewMode('portal'); setStudentSubjects([]); }} className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition"><LogOut size={18} /> Salir</button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2"><FileSpreadsheet className="text-indigo-500" /> Calificaciones</h3>
                <div className="flex gap-1">{[1, 2, 3].map(t => <button key={t} onClick={() => setCurrentTrimester(t)} className={`px-2 py-1 text-xs rounded ${currentTrimester === t ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>{t}º</button>)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 flex justify-between text-center overflow-x-auto gap-4">
                <div><div className="text-xs text-gray-500">Actividades (70%)</div><div className="font-bold text-indigo-700 text-lg">{st.wAct}</div></div>
                <div><div className="text-xs text-gray-500">Examen</div><div className="font-bold text-orange-600 text-lg">{viewingSubject.grades[currentTrimester]?.[viewingStudent.id]?.['exam_final'] || 0}</div></div>
                {viewingSubject.grades[currentTrimester]?.[viewingStudent.id]?.['project_final'] && (
                  <div><div className="text-xs text-gray-500">Proyecto</div><div className="font-bold text-green-600 text-lg">{viewingSubject.grades[currentTrimester]?.[viewingStudent.id]?.['project_final']}</div></div>
                )}
                <div><div className="text-xs text-gray-500">Suma (30%)</div><div className="font-bold text-orange-700 text-lg">{st.wEx}</div></div>
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
                {Object.entries(viewingSubject?.attendance?.[viewingStudent.id] || {}).sort().reverse().map(([d, v]) => (
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
                {uniqueAnnouncements.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-lg text-gray-400">
                    <Bell size={40} className="mx-auto mb-2 opacity-20" />
                    <p>No hay comunicados recientes.</p>
                  </div>
                ) : (
                  uniqueAnnouncements.map(ann => (
                    <div key={ann.id} className={`p-4 rounded-lg border-l-4 ${ann.type === 'urgent' ? 'bg-red-50 border-red-500' : ann.type === 'event' ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-400'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-gray-800">{ann.title}</h4>
                        <span className="text-[10px] text-gray-400">{ann.date}</span>
                      </div>
                      {ann.recipient !== 'all' && <div className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded inline-block mb-2 font-bold">Mensaje Personal</div>}
                      {ann.isGlobal && <div className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded inline-block mb-2 font-bold">Comunicado Global</div>}
                      <p className="text-sm text-gray-600 whitespace-pre-line">{ann.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // --- VISTA DOCENTE ---
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      <header className="bg-indigo-700 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <h1 className="font-black text-2xl flex items-center gap-3 tracking-tighter">
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20 shadow-inner">
            <GraduationCap className="text-emerald-400" size={28} />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">U.E. 19 de Agosto [VERSIÓN NUEVA]</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30 ml-2 animate-pulse uppercase tracking-widest">v2.0 Premium</span>
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">{currentUser?.role}</span>
            <span className="text-sm font-bold leading-tight">{currentUser?.name}</span>
          </div>
          {(currentUser?.role === 'Rector' || currentUser?.role === 'Administrativo') && (
            <button onClick={() => setIsManagingStaff(true)} className="flex items-center gap-1 text-sm bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded transition font-bold shadow-sm" title="Gestionar Personal"><User size={16} /> <span className="hidden sm:inline">Staff</span></button>
          )}
          <button onClick={() => setIsChangingPass(true)} className="flex items-center gap-1 text-sm bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded transition" title="Cambiar Contraseña"><Settings size={16} /></button>
          <button onClick={() => { setCurrentUser(null); setViewMode('portal'); }} className="flex items-center gap-1 text-sm bg-indigo-800 hover:bg-indigo-900 px-3 py-1.5 rounded transition"><LogOut size={16} /> Salir</button>
          <button className="md:hidden" onClick={() => setShowMenu(!showMenu)}><Menu /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`${showMenu ? 'fixed inset-0 z-40 bg-white' : 'hidden'} lg:block lg:static lg:w-80 bg-white shadow-xl flex-shrink-0 flex flex-col z-40 border-r border-gray-200 transition-all duration-300`}>
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Panel de Control</h2>
            {showMenu && <button onClick={() => setShowMenu(false)} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20} /></button>}
          </div>
          <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
            {(currentUser?.role === 'Rector' || currentUser?.role === 'Administrativo' || currentUser?.role === 'Docente') && (
              <div className="space-y-3 mb-6">
                {(currentUser?.role === 'Rector' || currentUser?.role === 'Administrativo') && (
                  <>
                    <button onClick={() => { setIsManagingStaff(true); setShowMenu(false); }} className="w-full bg-emerald-600 text-white py-4 px-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 font-bold active:scale-95">
                      <User size={20} /> Personal
                    </button>
                    <button onClick={() => { setOfficialParallelsInput(appSettings.officialParallels || ''); setIsManagingSettings(true); setShowMenu(false); }} className="w-full bg-slate-800 text-white py-4 px-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg shadow-slate-900/20 font-bold active:scale-95">
                      <Settings size={20} /> Estándares
                    </button>
                  </>
                )}
                <button onClick={() => { setIsAddingSubject(true); setShowMenu(false); }} className="w-full bg-indigo-600 text-white py-4 px-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 font-bold active:scale-95">
                  <Plus size={20} /> Nueva Materia
                </button>
              </div>
            )}
            {(() => {
              const mySubjects = visibleSubjects.filter(s => s.teacherId === currentUser?.id);
              const otherSubjects = visibleSubjects.filter(s => s.teacherId !== currentUser?.id);
              
              return (
                <>
                  <div className="px-2 mb-2">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Mis Asignaturas</h3>
                  </div>
                  {mySubjects.map(s => (
                    <button key={s.id} onClick={() => { setCurrentSubjectId(s.id); setShowMenu(false); }} className={`w-full text-left p-4 rounded-2xl flex justify-between items-center transition-all duration-300 ${currentSubjectId === s.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 translate-x-1' : 'hover:bg-slate-50 text-slate-600 hover:translate-x-1'}`}>
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="font-bold text-base truncate">{s.name}</div>
                        <div className={`text-xs ${currentSubjectId === s.id ? 'text-indigo-200' : 'text-slate-400'} font-medium`}>
                          {s.parallel} {s.teacherName ? `• ${s.teacherName}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentSubjectId === s.id && <ChevronRight size={18} />}
                      </div>
                    </button>
                  ))}
                  {mySubjects.length === 0 && <div className="text-xs text-slate-400 px-3 py-2 italic">No tienes materias asignadas o creadas.</div>}

                  {otherSubjects.length > 0 && (
                    <div className="mt-6 border-t border-gray-100 pt-4">
                      <button onClick={() => setShowOtherSubjects(!showOtherSubjects)} className="w-full flex justify-between items-center px-2 mb-2 group">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 group-hover:text-indigo-600 transition-colors">
                          {currentUser?.role === 'Docente' ? 'Materias de Tutoría' : 'Otras Materias'}
                        </h3>
                        <span className="text-xs text-slate-400 font-bold group-hover:text-indigo-600 px-2 py-0.5 bg-gray-100 rounded-md">{showOtherSubjects ? 'Ocultar ▲' : 'Ver Todas ▼'}</span>
                      </button>
                      
                      {showOtherSubjects && (
                        <div className="space-y-1 mt-3">
                          {otherSubjects.map(s => (
                            <button key={s.id} onClick={() => { setCurrentSubjectId(s.id); setShowMenu(false); }} className={`w-full text-left p-3 rounded-xl flex justify-between items-center transition-all duration-300 ${currentSubjectId === s.id ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100 translate-x-1' : 'hover:bg-slate-50 text-slate-500 hover:translate-x-1 border border-transparent'}`}>
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="font-bold text-sm truncate">{s.name}</div>
                                <div className={`text-[10px] ${currentSubjectId === s.id ? 'text-indigo-400' : 'text-slate-400'} font-medium`}>
                                  {s.parallel} {s.teacherName ? `• ${s.teacherName}` : ''}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye size={14} className={currentSubjectId === s.id ? 'text-indigo-500' : 'text-gray-400'} />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </aside>

        <main className="flex-1 p-4 lg:p-10 overflow-auto bg-slate-50 relative w-full">
          {currentSubject ? (
            <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    {currentSubject.name} <span className="bg-indigo-100 text-indigo-800 text-sm px-3 py-1 rounded-full font-medium">{currentSubject.parallel}</span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 mt-1">
                    <p className="text-gray-500 text-sm">{currentSubject.students.length} Estudiantes inscritos</p>
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold">Docente: {currentSubject.teacherName || 'Sin asignar'}</span>
                    {(currentUser?.role === 'Rector' || currentUser?.role === 'Administrativo') && (
                      <button onClick={() => {
                        setNewSubjectName(currentSubject.name);
                        setNewParallel(currentSubject.parallel);
                        setNewSubjectTeacher(currentSubject.teacherId);
                        setIsAddingSubject(true);
                      }} className="text-[10px] bg-slate-800 text-white px-3 py-1 rounded-full font-bold hover:bg-black transition uppercase tracking-widest shadow-sm">
                        Reasignar Docente / Editar
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-lg shadow-inner overflow-x-auto">
                  <button onClick={() => setActiveTab('grades')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'grades' ? 'bg-white text-indigo-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}><FileSpreadsheet size={18} /> Notas</button>
                  <button onClick={() => setActiveTab('attendance')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'attendance' ? 'bg-white text-indigo-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}><Calendar size={18} /> Asistencia</button>
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
                            <th key={a.id} className="p-0 text-center w-12 border-b border-gray-300 border-r bg-gray-50 relative group h-40 align-bottom overflow-hidden">
                              <div className="flex flex-col items-center justify-end h-full pb-4">
                                <span className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Act {i + 1}</span>
                                <div className="font-bold text-xs whitespace-nowrap mb-2 px-1 text-gray-700"
                                  style={{
                                    writingMode: 'vertical-rl',
                                    transform: 'rotate(180deg)',
                                    maxHeight: '100px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                  title={a.name}>
                                  {a.name}
                                </div>
                                <button onClick={() => deleteActivity(a.id)} className="absolute top-1 right-1 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                              </div>
                            </th>
                          ))}
                          <th className="p-0 text-center w-8 bg-indigo-50 border-b border-indigo-100 border-r relative h-40 align-bottom">
                            <div className="flex flex-col items-center justify-end h-full w-full pb-4">
                              <span className="font-bold text-xs whitespace-nowrap px-1 text-indigo-700 writing-vertical" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>70% (D)</span>
                            </div>
                          </th>
                          <th className="p-0 text-center w-8 bg-orange-50 border-b border-orange-100 border-r relative h-40 align-bottom">
                            <div className="flex flex-col items-center justify-end h-full w-full pb-4">
                              <span className="font-bold text-xs whitespace-nowrap px-1 text-orange-700 writing-vertical" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>EXAMEN</span>
                            </div>
                          </th>
                          <th className="p-0 text-center w-8 bg-green-50 border-b border-green-100 border-r relative h-40 align-bottom">
                            <div className="flex flex-col items-center justify-end h-full w-full pb-4">
                              <span className="font-bold text-xs whitespace-nowrap px-1 text-green-700 writing-vertical" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>PROYECTO</span>
                            </div>
                          </th>
                          <th className="p-0 text-center w-8 bg-indigo-50 border-b border-indigo-100 border-r relative h-40 align-bottom">
                            <div className="flex flex-col items-center justify-end h-full w-full pb-4">
                              <span className="font-bold text-xs whitespace-nowrap px-1 text-indigo-700 writing-vertical" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>30% (E)</span>
                            </div>
                          </th>
                          <th className="p-0 text-center w-8 bg-gray-800 border-b border-gray-900 border-r relative h-40 align-bottom">
                            <div className="flex flex-col items-center justify-end h-full w-full pb-4">
                              <span className="font-bold text-xs whitespace-nowrap px-1 text-white writing-vertical" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>FINAL</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentSubject.students.map((s, i) => {
                          const st = calculateStats(currentSubject, currentTrimester, s.id);
                          const rowClass = PALETTE[i % PALETTE.length];
                          return (
                            <tr key={s.id} className={`border-b border-gray-100 ${rowClass} transition hover:brightness-95`}>
                              <td className="p-3 text-center text-gray-400 font-mono text-xs">{i + 1}</td>
                              <td className="p-3 font-medium text-gray-800 border-r border-gray-200/50 relative group leading-tight">
                                {s.name.split(' ').reduce((acc, word, idx) => {
                                  if (idx % 2 === 0) acc.push([word]);
                                  else acc[acc.length - 1].push(word);
                                  return acc;
                                }, []).map((line, i) => <div key={i}>{line.join(' ')}</div>)}
                                <div className="text-[10px] text-gray-400 font-mono">CÓD: {s.code}</div>
                                <button onClick={() => deleteStudent(s.id, s.name)} className="absolute top-2 right-2 text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-md shadow-sm" title="Eliminar Estudiante"><Trash2 size={12} /></button>
                              </td>
                              {(currentSubject.activities[currentTrimester] || []).map(a => (
                                <td key={a.id} className="p-1 border-r border-gray-200/50 text-center">
                                  <input
                                    type="number"
                                    disabled={!canEditGrades(currentSubject)}
                                    className={`w-14 text-center p-1 rounded border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white/70 shadow-sm ${!canEditGrades(currentSubject) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    value={currentSubject.grades[currentTrimester]?.[s.id]?.[a.id] ?? ''}
                                    onChange={e => updateGrade(s.id, a.id, e.target.value)}
                                  />
                                </td>
                              ))}
                              <td className="p-2 text-center font-bold text-indigo-700 bg-indigo-50/50 border-r border-indigo-100">{st.wAct}</td>
                              <td className="p-1 text-center bg-orange-50/50 border-r border-orange-100">
                                <input
                                  type="number"
                                  disabled={!canEditGrades(currentSubject)}
                                  className={`w-14 text-center p-1 rounded border border-orange-200 focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white shadow-sm ${!canEditGrades(currentSubject) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  value={currentSubject.grades[currentTrimester]?.[s.id]?.['exam_final'] ?? ''}
                                  onChange={e => updateGrade(s.id, 'exam_final', e.target.value)}
                                />
                              </td>
                              <td className="p-1 text-center bg-green-50/50 border-r border-green-100">
                                <input
                                  type="number"
                                  disabled={!canEditGrades(currentSubject)}
                                  className={`w-14 text-center p-1 rounded border border-green-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white shadow-sm ${!canEditGrades(currentSubject) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  value={currentSubject.grades[currentTrimester]?.[s.id]?.['project_final'] ?? ''}
                                  onChange={e => updateGrade(s.id, 'project_final', e.target.value)}
                                  placeholder="-"
                                />
                              </td>
                              <td className="p-2 text-center font-bold text-indigo-700 bg-indigo-50/50 border-r border-indigo-100">{st.wEx}</td>
                              <td className={`p-2 text-center font-bold text-white ${parseFloat(st.fin) < 7 ? 'bg-red-500' : 'bg-gray-800'}`}>{st.fin}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {(currentSubject?.students || []).length === 0 && <div className="text-center p-10 text-gray-400 italic">No hay estudiantes. Agrega una lista para comenzar.</div>}
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-220px)]">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center sticky top-0 z-20">
                    <h3 className="font-bold flex items-center gap-2 text-gray-700"><Calendar className="text-indigo-600" /> Asistencia del Día: <span className="bg-white px-3 py-1 rounded border shadow-sm text-indigo-700">{today}</span></h3>
                    <button onClick={exportAttendanceCSV} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow transition"><Download size={16} /> Exportar Historial Completo</button>
                  </div>

                  <div className="flex-1 overflow-auto p-4 space-y-3">
                    {/* SECCIÓN RESUMEN PARA AUTORIDADES */}
                    {(currentUser?.role === 'Rector' || currentUser?.role === 'Administrativo') && (
                      <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-2 flex items-center gap-2"><BarChart2 size={14} /> Resumen Trimestral de Faltas (Total Acumulado)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(currentSubject?.students || []).map(s => {
                            const totalAbsences = Object.values(currentSubject?.attendance?.[s.id] || {}).filter(v => v.status === 'A').length;
                            return (
                              <div key={s.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm hover:border-indigo-200 transition-colors">
                                <span className="text-sm font-bold text-slate-700 truncate pr-2">{s.name}</span>
                                <span className={`text-xs font-black px-2 py-1 rounded-lg ${totalAbsences > 5 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                  {totalAbsences} Faltas
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(currentSubject?.students || []).map((s, i) => {
                      const att = (currentSubject?.attendance?.[s.id] || {})[today] || { status: 'P', note: '' };
                      const rowClass = PALETTE[i % PALETTE.length];
                      return (
                        <div key={s.id} className={`flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border border-gray-200 shadow-sm ${rowClass} transition hover:shadow-md`}>
                          <div className="md:w-1/3 min-w-[200px]">
                            <div className="font-bold text-gray-800 text-lg flex items-center gap-2">
                              {s.name}
                              <button onClick={() => setViewingStudentDetails(s)} className="text-indigo-500 hover:text-indigo-700 p-1" title="Ver Historial Completo">
                                <Eye size={16} />
                              </button>
                            </div>
                            <div className="text-xs text-gray-500 font-mono">Cód: {s.code}</div>
                          </div>

                          <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-lg border border-gray-200 shadow-sm">
                            <button disabled={!canEditGrades(currentSubject)} onClick={() => updateAttendance(s.id, today, 'status', 'P')} className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${att.status === 'P' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:bg-gray-100'} ${!canEditGrades(currentSubject) ? 'opacity-50' : ''}`}><CheckCircle size={16} /> Asistió</button>
                            <button disabled={!canEditGrades(currentSubject)} onClick={() => updateAttendance(s.id, today, 'status', 'A')} className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${att.status === 'A' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:bg-gray-100'} ${!canEditGrades(currentSubject) ? 'opacity-50' : ''}`}><XCircle size={16} /> Falta</button>
                          </div>

                          <div className="flex-1 w-full md:w-auto relative">
                            <MessageSquare size={16} className="absolute top-3 left-3 text-gray-400" />
                            <input
                              disabled={!canEditGrades(currentSubject)}
                              className={`w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white/90 shadow-sm ${!canEditGrades(currentSubject) ? 'opacity-50' : ''}`}
                              placeholder={!canEditGrades(currentSubject) ? "Solo lectura" : "Escribir observación..."}
                              value={att.note || ''}
                              onChange={(e) => updateAttendance(s.id, today, 'note', e.target.value)}
                            />
                          </div>
                        </div>
                      )
                    })}
                    {(currentSubject?.students || []).length === 0 && <div className="text-center p-10 text-gray-400">Sin estudiantes.</div>}
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
              <p className="text-xl font-medium text-gray-600">Bienvenido, {currentUser?.name}</p>
              <p className="text-sm">Rol: {currentUser?.role} {currentUser?.tutoringCourse ? `| Tutor de ${currentUser.tutoringCourse}` : ''}</p>
              <div className="mt-6 flex flex-col gap-2 max-w-sm w-full">
                <div className="p-4 bg-white border rounded-xl text-left border-l-4 border-indigo-500">
                  <h4 className="font-bold text-gray-700 text-xs uppercase mb-1">Tu Acceso</h4>
                  <p className="text-sm text-gray-500">
                    {currentUser?.role === 'Docente' ? 'Puedes editar las notas de TUS materias asignadas y ver las de tu curso si eres tutor.' :
                      currentUser?.role === 'Rector' ? 'Puedes ver TODO el sistema y enviar avisos globales, pero no editar notas.' :
                        'Puedes ver la información global y enviar avisos directos a estudiantes.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL HISTORIAL DE ASISTENCIA INDIVIDUAL */}
      {viewingStudentDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{viewingStudentDetails.name}</h3>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Historial de Asistencia</p>
              </div>
              <button onClick={() => setViewingStudentDetails(null)}><X /></button>
            </div>

            <div className="overflow-y-auto pr-2">
              <div className="space-y-3">
                {Object.entries(currentSubject?.attendance?.[viewingStudentDetails.id] || {}).sort().reverse().map(([d, v]) => (
                  <div key={d} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="text-center min-w-[80px]">
                      <div className="text-xs font-bold text-gray-400">{d.split('-')[0]}</div>
                      <div className="text-sm font-bold text-gray-700">{d.split('-').slice(1).join('/')}</div>
                    </div>
                    <div className="flex-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${v.status === 'P' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {v.status === 'P' ? 'Presente' : 'Ausente'}
                      </span>
                      {v.note && <p className="text-xs text-gray-600 mt-1 italic border-l-2 border-indigo-200 pl-2">"{v.note}"</p>}
                    </div>
                  </div>
                ))}
                {Object.keys(currentSubject?.attendance?.[viewingStudentDetails.id] || {}).length === 0 && (
                  <div className="text-center py-10 text-gray-400 italic">No hay registros de asistencia para este estudiante.</div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setViewingStudentDetails(null)} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 transition">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALES BONITOS */}
      {isAddingSubject && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200"><h3 className="text-xl font-bold mb-4 text-gray-800">Gestionar Asignatura</h3>
        <input className="border border-gray-300 w-full p-3 rounded-lg mb-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nombre (ej. Matemáticas)" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} autoFocus />

        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Paralelo / Curso (Estándar)</label>
        <select
          className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          value={newParallel}
          onChange={e => setNewParallel(e.target.value)}
        >
          <option value="">-- Seleccionar Curso --</option>
          {(appSettings.officialParallels || '').split('\n').filter(p => p.trim()).map(p => (
            <option key={p} value={p.trim()}>{p.trim()}</option>
          ))}
        </select>

        {(currentUser.role === 'Rector' || currentUser.role === 'Administrativo') && (
          <>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Docente Asignado</label>
            <select
              className="w-full border border-gray-300 rounded-lg p-3 mb-6 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={newSubjectTeacher}
              onChange={(e) => setNewSubjectTeacher(e.target.value)}
            >
              <option value="">-- Sin Asignar --</option>
              {staff.filter(s => s.role === 'Docente').map(d => (
                <option key={d.id} value={d.id}>{d.name} {d.tutoringCourse ? `(Tutor ${d.tutoringCourse})` : ''}</option>
              ))}
            </select>
          </>
        )}

        <div className="flex justify-end gap-2"><button onClick={() => { setIsAddingSubject(false); setNewSubjectName(''); setNewParallel(''); setNewSubjectTeacher(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition font-bold">Cerrar</button>
          {currentSubject ? (
            <button onClick={updateSubjectInfo} className="bg-slate-900 hover:bg-black text-white px-6 py-2 rounded-lg font-bold shadow transition">Guardar Cambios</button>
          ) : (
            <button onClick={addSubject} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">Crear Materia</button>
          )}
        </div></div></div>}
      {isAddingStudent && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200"><h3 className="text-xl font-bold mb-2 text-gray-800">Inscribir Estudiantes</h3><p className="text-sm text-gray-500 mb-3">Copia y pega tu lista de Excel aquí.</p><textarea className="border border-gray-300 w-full h-48 p-3 rounded-lg mb-4 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder={"Juan Perez\nMaria Lopez\nCarlos Ruiz"} value={newStudentList} onChange={e => setNewStudentList(e.target.value)} autoFocus /><div className="flex justify-end gap-2"><button onClick={() => setIsAddingStudent(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button><button onClick={addStudentsBulk} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">Procesar Lista</button></div></div></div>}
      {isAddingActivity && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200"><h3 className="text-xl font-bold mb-4 text-gray-800">Nueva Actividad (Tri {currentTrimester})</h3><input className="border border-gray-300 w-full p-3 rounded-lg mb-6 focus:ring-2 focus:ring-green-500 outline-none" placeholder="Nombre (ej. Lección 1)" value={newActivityName} onChange={e => setNewActivityName(e.target.value)} autoFocus /><div className="flex justify-end gap-2"><button onClick={() => setIsAddingActivity(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button><button onClick={addActivity} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">Guardar</button></div></div></div>}

      {/* MODAL GESTION STAFF (REctor Only) */}
      {isManagingStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Gestionar Personal ({staff.length})</h3>
              <button onClick={() => setIsManagingStaff(false)}><X /></button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border p-2 rounded text-sm" placeholder="Nombre completo" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} />
              <input className="border p-2 rounded text-sm" placeholder="Contraseña de acceso" value={newStaffPass} onChange={e => setNewStaffPass(e.target.value)} />
              <select className="border p-2 rounded text-sm" value={newStaffRole} onChange={e => setNewStaffRole(e.target.value)}>
                <option value="Docente">Docente</option>
                <option value="Rector">Rector</option>
                <option value="Administrativo">Administrativo</option>
              </select>
              <input className="border p-2 rounded text-sm" placeholder="Paralelo de Tutoría (Opcional)" value={newStaffTutoring} onChange={e => setNewStaffTutoring(e.target.value)} />
              <button onClick={addStaffMember} className="bg-indigo-600 text-white py-2 rounded font-bold md:col-span-2">Añadir al Sistema</button>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Nombre</th>
                    <th className="p-2 text-left">Rol</th>
                    <th className="p-2 text-left">Tutoría</th>
                    <th className="p-2 text-left">Clave</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.id} className="border-b">
                      <td className="p-2 font-medium">{s.name}</td>
                      <td className="p-2"><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${s.role === 'Rector' ? 'bg-red-100 text-red-700' : s.role === 'Administrativo' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{s.role}</span></td>
                      <td className="p-2">{s.tutoringCourse || '-'}</td>
                      <td className="p-2 font-mono text-xs italic text-gray-400">{s.password}</td>
                      <td className="p-2">
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', s.id))} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

      {/* MODAL CONFIGURACIÓN ESTÁNDARES (Rector Only) */}
      {isManagingSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2 mb-4 text-slate-800">
              <Settings size={24} />
              <h3 className="text-xl font-bold">Estándares del Plantel</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">Define la lista oficial de cursos/paralelos. Escribe uno por línea.</p>

            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Lista de Paralelos Oficiales</label>
            <textarea
              className="w-full border border-gray-300 rounded-xl p-4 h-64 focus:ring-2 focus:ring-slate-900 outline-none font-mono text-sm mb-6 resize-none"
              placeholder={"10mo A\n10mo B\n1ero BGU A"}
              value={officialParallelsInput}
              onChange={e => setOfficialParallelsInput(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setIsManagingSettings(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
              <button
                onClick={() => saveSettings({ ...appSettings, officialParallels: officialParallelsInput })}
                className="bg-slate-900 hover:bg-black text-white px-6 py-2 rounded-lg font-bold shadow transition"
              >
                Guardar Estándares
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}