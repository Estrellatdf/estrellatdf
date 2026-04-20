import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, User, BookOpen, Menu, X, ChevronRight,
  GraduationCap, FileSpreadsheet, Lock, Eye, Calendar,
  CheckCircle, XCircle, MessageSquare, LogOut, AlertTriangle, Bug, Download, BarChart2,
  Bell, Megaphone, Clock, Settings, ShieldAlert, RefreshCw, ClipboardList, Phone, MapPin, UserCheck,
  LayoutList, ShieldCheck
} from 'lucide-react';

// Importaciones de Firebase
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from 'firebase/auth';
import {
  initializeFirestore, collection, doc, setDoc, deleteDoc, onSnapshot,
  persistentLocalCache, persistentMultipleTabManager
} from 'firebase/firestore';

// --- CONFIGURACIÓN ---
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
  // persistentMultipleTabManager usa BroadcastChannel que NO existe en Safari/iOS < 15.4
  // Se usa solo si el navegador lo soporta, sino fallback a caché simple
  try {
    db = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch (cacheErr) {
    // Fallback para Safari / iOS: sin multipleTabManager
    db = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache()
    });
  }
} catch (e) {
  console.error("Error inicialización:", e);
  initError = e.message;
}

const appId = "escuela-v1";

const generateStudentCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

const normalizeText = (text) => {
  if (!text) return "";
  return text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
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
  const [staff, setStaff] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [appSettings, setAppSettings] = useState({ teacherPassword: null, courses: {} });

  const [viewMode, setViewMode] = useState('portal');
  const [authPassword, setAuthPassword] = useState('');
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(initError);
  const [showMenu, setShowMenu] = useState(false);

  // Profesor
  const [currentSubjectId, setCurrentSubjectId] = useState(null);
  const [currentTrimester, setCurrentTrimester] = useState(1);
  const [activeTab, setActiveTab] = useState('grades');

  // Formularios materias
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newParallel, setNewParallel] = useState('');
  const [newSubjectCourse, setNewSubjectCourse] = useState('');
  const [newSubjectTeacher, setNewSubjectTeacher] = useState('');

  // Formularios estudiantes/actividades
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentList, setNewStudentList] = useState('');
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');

  // Personal
  const [isManagingStaff, setIsManagingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Docente');
  const [newStaffTutoring, setNewStaffTutoring] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('');
  const [newStaffAuth, setNewStaffAuth] = useState(false);
  const [newStaffSecKey, setNewStaffSecKey] = useState('');

  // Cursos y paralelos
  const [isManagingCourses, setIsManagingCourses] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newParallelName, setNewParallelName] = useState('');
  const [selectedCourseForParallel, setSelectedCourseForParallel] = useState('');

  // Modal de seguridad
  const [securityModal, setSecurityModal] = useState({ isOpen: false, onConfirm: null, message: '', requiresKey: false });
  const [securityKeyInput, setSecurityKeyInput] = useState('');

  // Comunicados
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [newAnnounceTitle, setNewAnnounceTitle] = useState('');
  const [newAnnounceBody, setNewAnnounceBody] = useState('');
  const [newAnnounceType, setNewAnnounceType] = useState('info');
  const [newAnnounceRecipient, setNewAnnounceRecipient] = useState('all');

  // Contraseña
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [oldPassInput, setOldPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');

  // Vista estudiante
  const [viewingStudent, setViewingStudent] = useState(null);
  const [viewingSubject, setViewingSubject] = useState(null);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [viewingStudentDetails, setViewingStudentDetails] = useState(null);
  const [showOtherSubjects, setShowOtherSubjects] = useState(false);



  // Perfil representante
  const [parentProfiles, setParentProfiles] = useState({});
  const [showParentForm, setShowParentForm] = useState(false);
  const [isEditingParentForm, setIsEditingParentForm] = useState(false);
  const [parentFormData, setParentFormData] = useState({
    representante1: { name: '', relation: 'Madre', cedula: '', phone: '', email: '', occupation: '' },
    representante2: { name: '', relation: 'Padre', cedula: '', phone: '', email: '', occupation: '' },
    studentAddress: '', studentPhone: '', studentNotes: '',
    studentCedula: '', studentBloodType: '', studentBirthDate: ''
  });
  const [viewingProfileCode, setViewingProfileCode] = useState(null);

  // Años Lectivos
  const [showYearManager, setShowYearManager] = useState(false);
  const [newYearName, setNewYearName] = useState('');
  const [newYearConfirm, setNewYearConfirm] = useState(false);
  const [schoolYears, setSchoolYears] = useState([]);
  const [viewingArchivedYear, setViewingArchivedYear] = useState(null);
  const [viewingArchivedSubject, setViewingArchivedSubject] = useState(null);
  // ── AUTH ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initError) { setLoading(false); return; }
    if (!auth) { setErrorMsg("No se pudo conectar a Firebase."); setLoading(false); return; }

    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (err) {
        console.error("Auth error:", err);
        setErrorMsg(err.code === 'auth/operation-not-allowed'
          ? "⚠️ Habilita 'Anónimo' en Firebase Authentication."
          : `Error de Autenticación: ${err.message}`);
        setLoading(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── DATA ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !db) return;

    const unsubSub = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'subjects'),
      (snapshot) => {
        const data = snapshot.docs.map(d => {
          const sub = d.data();
          if (!sub.announcements) sub.announcements = [];
          return { id: d.id, ...sub };
        });
        setSubjects(data);
        setLoading(false);
      },
      (error) => {
        if (error.code === 'permission-denied') setErrorMsg("⚠️ Acceso denegado: Revisa las Reglas de Firestore.");
        setLoading(false);
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (!data.courses) data.courses = {};
          setAppSettings(data);
        } else {
          setAppSettings({ teacherPassword: null, courses: {} });
        }
      }
    );

    const unsubStaff = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'staff'),
      (snapshot) => setStaff(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubParent = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'parentProfiles'),
      (snapshot) => {
        const map = {};
        snapshot.docs.forEach(d => { map[d.id] = d.data(); });
        setParentProfiles(map);
      }
    );

    const unsubYears = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'schoolYears'),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setSchoolYears(data);
      }
    );

    return () => { unsubSub(); unsubSettings(); unsubStaff(); unsubParent(); unsubYears(); };
  }, [user]);

  // ── DB HELPERS ────────────────────────────────────────────────────────────
  const logAudit = async (action, target, details) => {
    try {
      const id = "log_" + Date.now();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'audit_logs', id), {
        id, user: currentUser?.name || 'Desconocido', role: currentUser?.role || 'Desconocido',
        action, target, details, timestamp: new Date().toISOString()
      });
    } catch (e) { console.error("Audit error", e); }
  };

  const runSecureAction = (message, onConfirmFn, requirePassword = false) => {
    if (requirePassword) {
      if (currentUser?.role === 'Administrativo' && !currentUser.isAuthorized) {
        alert("Acceso denegado. No tienes autorización del Rector para modificar datos.");
        return;
      }
      setSecurityModal({ isOpen: true, message, onConfirm: onConfirmFn, requiresKey: true });
      return;
    }

    if (currentUser?.role === 'Rector') {
      setSecurityModal({ isOpen: true, message, onConfirm: onConfirmFn, requiresKey: false });
    } else if (currentUser?.role === 'Administrativo') {
      if (!currentUser.isAuthorized) {
        alert("Acceso denegado. No tienes autorización del Rector para modificar datos.");
        return;
      }
      setSecurityModal({ isOpen: true, message, onConfirm: onConfirmFn, requiresKey: true });
    } else {
      if (confirm(message)) onConfirmFn();
    }
  };

  const confirmSecureAction = () => {
    if (securityModal.requiresKey) {
      const expectedKey = currentUser?.role === 'Administrativo' ? currentUser?.securityKey : currentUser?.password;
      if (securityKeyInput !== expectedKey) {
        alert("Contraseña o clave de seguridad incorrecta. Acción cancelada.");
        return;
      }
    }
    const fn = securityModal.onConfirm;
    setSecurityModal({ isOpen: false, onConfirm: null, message: '', requiresKey: false });
    setSecurityKeyInput('');
    if (fn) fn();
  };

  const saveSubject = async (data) => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'subjects', data.id.toString()), data);
  };

  const deleteSubjectDB = (id) => {
    runSecureAction("¿Eliminar esta asignatura y todos sus datos?", async () => {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'subjects', id.toString()));
      if (currentSubjectId === id) setCurrentSubjectId(null);
      logAudit("DELETE_SUBJECT", id, "Asignatura eliminada");
    });
  };

  const updateSettings = async (data) => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general'), data);
  };

  const saveSettings = async (newSet) => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general'), newSet);
      setAppSettings(newSet);
    } catch (e) { alert("Error al guardar: " + e.message); }
  };

  // ── AÑOS LECTIVOS ─────────────────────────────────────────────────────────
  // Crea un nuevo año lectivo: archiva datos del actual y limpia para el nuevo.
  const createNewSchoolYear = async () => {
    if (!newYearName.trim()) return alert('Escribe el nombre del nuevo año lectivo.');
    if (!newYearConfirm) return alert('Debes marcar la casilla de confirmación.');

    const archiveId = 'year_' + Date.now();
    // Archivar materias actuales (con sus notas/asistencia)
    const snapshot = subjects.map(sub => ({
      ...sub,
      archivedAt: new Date().toISOString(),
      schoolYear: appSettings.schoolYear || 'Sin nombre'
    }));

    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schoolYears', archiveId), {
      id: archiveId,
      name: appSettings.schoolYear || 'Año anterior',
      createdAt: new Date().toISOString(),
      subjects: snapshot
    });

    // Eliminar todas las materias del año actual para empezar en blanco
    for (const sub of subjects) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'subjects', sub.id.toString()));
    }

    // Actualizar nombre del año lectivo activo
    await updateSettings({ ...appSettings, schoolYear: newYearName.trim() });

    setShowYearManager(false);
    setNewYearName('');
    setNewYearConfirm(false);
    setCurrentSubjectId(null);
    alert(`✅ Nuevo año lectivo "${newYearName.trim()}" iniciado. El año anterior fue archivado.`);
  };

  // ── LOGIN DOCENTE ─────────────────────────────────────────────────────────
  const handleTeacherLogin = () => {
    if (staff.length === 0) {
      if (!appSettings.teacherPassword) {
        if (authPassword.length < 4) return alert("Mínimo 4 caracteres para la clave maestra inicial");
        updateSettings({ teacherPassword: authPassword, courses: {} });
        const firstRector = { id: 'rector_init', name: 'Administrador Inicial', role: 'Rector', password: authPassword };
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', 'rector_init'), firstRector);
        setCurrentUser(firstRector);
        setViewMode('teacher');
      } else {
        if (authPassword === appSettings.teacherPassword) {
          setCurrentUser({ name: 'Admin Temporal', role: 'Rector' });
          setViewMode('teacher');
        } else alert("Contraseña incorrecta.");
      }
      return;
    }
    const matches = staff.filter(s => s.password === authPassword);
    if (matches.length > 0) {
      const found = matches.find(m => m.role === 'Rector')
        || matches.find(m => m.role === 'Administrativo')
        || matches[0];
      setCurrentUser({ ...found });
      setViewMode('teacher');
    } else {
      alert("Contraseña no válida o usuario no registrado.");
    }
  };

  const handleEmergencyRector = async () => {
    if (authPassword === appSettings.teacherPassword || authPassword === "rector2026") {
      const id = "rector_master";
      const masterRector = { id, name: 'Rector Principal', role: 'Rector', password: authPassword };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', id), masterRector);
      setCurrentUser(masterRector);
      setViewMode('teacher');
      alert("✅ Acceso de Emergencia concedido.");
    } else {
      alert("Clave de emergencia incorrecta.");
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser?.id) return;
    if (newPassInput.length < 4) return alert("❌ La nueva contraseña debe tener mínimo 4 caracteres.");
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', currentUser.id),
        { ...currentUser, password: newPassInput }, { merge: true });
      setCurrentUser({ ...currentUser, password: newPassInput });
      alert("✅ ¡Contraseña actualizada!");
      setIsChangingPass(false); setOldPassInput(''); setNewPassInput('');
    } catch (e) { alert("Error al actualizar: " + e.message); }
  };

  // ── LOGIN ESTUDIANTE (BUG #1 CORREGIDO) ──────────────────────────────────
  // ANTES: setViewMode('student_view') solo ocurría dentro del if(existingProfile).
  //        Si era la primera vez, abría el form pero nunca cambiaba a student_view.
  // AHORA: El form de representante se muestra como overlay DENTRO de student_view.
  //        El viewMode siempre cambia a 'student_view' si el código es válido.
  const handleStudentLogin = () => {
    try {
      if (!studentCodeInput) return;
      const code = studentCodeInput.trim().toUpperCase();

      let studentName = null;
      for (const sub of subjects) {
        const s = (sub.students || []).find(st => st.code === code);
        if (s) { studentName = s.name; break; }
      }
      if (!studentName) return alert("Código no encontrado. Verifica que el docente ya lo haya registrado.");

      const foundMatches = [];
      for (const sub of subjects) {
        const s = (sub.students || []).find(
          st => st.name?.trim().toLowerCase() === studentName?.trim().toLowerCase()
        );
        if (s) foundMatches.push({ student: s, subject: sub });
      }

      if (foundMatches.length === 0) {
        return alert("El código es válido pero el estudiante aún no tiene materias visibles.");
      }

      const theStudent = { ...foundMatches[0].student, code };
      setStudentSubjects(foundMatches);
      setViewingStudent(theStudent);
      setViewingSubject(foundMatches[0].subject);
      setCurrentTrimester(1);

      const existingProfile = parentProfiles[code];
      if (existingProfile) {
        setParentFormData(existingProfile.formData || {
          representante1: { name: '', relation: 'Madre', cedula: '', phone: '', email: '', occupation: '' },
          representante2: { name: '', relation: 'Padre', cedula: '', phone: '', email: '', occupation: '' },
          studentAddress: '', studentPhone: '', studentNotes: '',
          studentCedula: '', studentBloodType: '', studentBirthDate: ''
        });
        setShowParentForm(false);
      } else {
        setParentFormData({
          representante1: { name: '', relation: 'Madre', cedula: '', phone: '', email: '', occupation: '' },
          representante2: { name: '', relation: 'Padre', cedula: '', phone: '', email: '', occupation: '' },
          studentAddress: '', studentPhone: '', studentNotes: '',
          studentCedula: '', studentBloodType: '', studentBirthDate: ''
        });
        setShowParentForm(true); // mostrar form como overlay
      }

      // SIEMPRE cambiamos a student_view independientemente de si es primera vez
      setViewMode('student_view');

    } catch (err) {
      alert("Error en el login: " + err.message);
    }
  };

  // ── PERMISOS ──────────────────────────────────────────────────────────────
  const isRector = currentUser?.role === 'Rector';
  const isAdmin = currentUser?.role === 'Administrativo';
  const isDocente = currentUser?.role === 'Docente';

  const visibleSubjects = subjects.filter(sub => {
    if (!currentUser) return false;
    if (isRector || isAdmin) return true;
    if (isDocente) {
      if (sub.teacherId === currentUser.id) return true;
      const tutorCourse = (currentUser.tutoringCourse || '').trim().toLowerCase();
      const subParallel = (sub.parallel || '').trim().toLowerCase();
      if (tutorCourse && subParallel && tutorCourse === subParallel) return true;
    }
    return false;
  });

  const canEditGrades = (sub) => {
    if (!currentUser || !sub) return false;
    if (isRector || isAdmin) return false;
    return String(sub.teacherId) === String(currentUser.id);
  };

  const currentSubject = visibleSubjects.find(s => s.id === currentSubjectId);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const addSubject = () => {
    if (!newSubjectName || !newParallel || !newSubjectCourse) return alert("Selecciona curso, paralelo y materia.");
    const teacherId = isDocente ? currentUser.id : newSubjectTeacher;
    const selectedDoc = staff.find(d => d.id === teacherId);
    const newSub = {
      id: Date.now(),
      name: newSubjectName,
      parallel: `${newSubjectCourse} ${newParallel}`,
      courseName: newSubjectCourse,
      parallelName: newParallel,
      teacherId,
      teacherName: selectedDoc?.name || (isDocente ? currentUser.name : ''),
      students: [],
      activities: { 1: [], 2: [], 3: [] },
      grades: { 1: {}, 2: {}, 3: {} },
      attendance: {},
      announcements: []
    };
    saveSubject(newSub);
    setCurrentSubjectId(newSub.id);
    setIsAddingSubject(false);
    setNewSubjectName(''); setNewParallel(''); setNewSubjectCourse(''); setNewSubjectTeacher('');
  };

  const updateSubjectInfo = () => {
    if (!currentSubject || !newSubjectName) return;
    const teacherId = newSubjectTeacher || currentSubject.teacherId;
    const selectedDoc = staff.find(d => d.id === teacherId);
    saveSubject({ ...currentSubject, name: newSubjectName, parallel: newParallel, teacherId, teacherName: selectedDoc?.name || '' });
    setIsAddingSubject(false); setIsEditingSubject(false);
    setNewSubjectName(''); setNewParallel(''); setNewSubjectTeacher('');
  };

  const addStaffMember = async () => {
    if (!newStaffName || !newStaffPass) return alert("Nombre y contraseña son obligatorios.");
    const id = "staff_" + Date.now();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', id), {
      id, name: newStaffName, email: newStaffEmail, role: newStaffRole, password: newStaffPass,
      tutoringCourse: newStaffTutoring,
      isAuthorized: newStaffRole === 'Administrativo' ? newStaffAuth : true,
      securityKey: newStaffRole === 'Administrativo' ? newStaffSecKey : null
    });
    setNewStaffName(''); setNewStaffEmail(''); setNewStaffPass(''); setNewStaffTutoring('');
    setNewStaffAuth(false); setNewStaffSecKey('');
  };

  const addStudentsBulk = () => {
    if (!newStudentList || !currentSubject) return;
    const names = newStudentList.split('\n').map(n => n.trim()).filter(n => n.length);
    const existingStudentsMap = new Map();
    subjects.forEach(sub => {
      (sub.students || []).forEach(st => {
        const norm = normalizeText(st.name);
        if (!existingStudentsMap.has(norm)) existingStudentsMap.set(norm, st);
      });
    });
    const newStus = names.map(n => {
      const norm = normalizeText(n);
      if (existingStudentsMap.has(norm)) {
        const ex = existingStudentsMap.get(norm);
        return { id: ex.id, name: ex.name, code: ex.code };
      }
      return { id: "s_" + Date.now() + Math.random().toString(36).substr(2, 5), name: n, code: generateStudentCode() };
    });
    const currentIds = new Set(currentSubject.students.map(s => s.id));
    const filtered = newStus.filter(s => !currentIds.has(s.id));
    if (filtered.length === 0) alert("Los estudiantes seleccionados ya estaban en la materia.");
    saveSubject({ ...currentSubject, students: [...currentSubject.students, ...filtered] });
    setIsAddingStudent(false); setNewStudentList('');
  };

  const addActivity = () => {
    if (!newActivityName || !currentSubject) return;
    const acts = currentSubject.activities[currentTrimester] || [];
    saveSubject({ ...currentSubject, activities: { ...currentSubject.activities, [currentTrimester]: [...acts, { id: "a_" + Date.now(), name: newActivityName }] } });
    setIsAddingActivity(false); setNewActivityName('');
  };

  const deleteActivity = (actId) => {
    runSecureAction("¿Eliminar esta actividad y sus calificaciones?", () => {
      const acts = currentSubject.activities[currentTrimester] || [];
      const newActs = acts.filter(a => a.id !== actId);
      const newGrades = { ...currentSubject.grades };
      if (newGrades[currentTrimester]) {
        Object.keys(newGrades[currentTrimester]).forEach(sid => {
          if (newGrades[currentTrimester][sid]) delete newGrades[currentTrimester][sid][actId];
        });
      }
      saveSubject({ ...currentSubject, activities: { ...currentSubject.activities, [currentTrimester]: newActs }, grades: newGrades });
      logAudit("DELETE_ACTIVITY", actId, "Actividad de " + currentSubject.name);
    });
  };

  const deleteStudent = (studentId, studentName) => {
    runSecureAction(`¿Eliminar a "${studentName}" y todas sus calificaciones/asistencias?`, () => {
      const newStudents = currentSubject.students.filter(s => s.id !== studentId);
      const newGrades = { ...currentSubject.grades };
      [1, 2, 3].forEach(tri => { if (newGrades[tri]?.[studentId]) delete newGrades[tri][studentId]; });
      const newAttendance = { ...currentSubject.attendance };
      if (newAttendance[studentId]) delete newAttendance[studentId];
      saveSubject({ ...currentSubject, students: newStudents, grades: newGrades, attendance: newAttendance });
      logAudit("DELETE_STUDENT", studentId, "Estudiante " + studentName);
    }, true);
  };

  const addAnnouncement = () => {
    if (!newAnnounceTitle || !currentSubject) return;
    const isGlobal = newAnnounceRecipient === 'all' && isRector;
    let recipName = isGlobal ? "Todos los Cursos" : "Todos";
    if (newAnnounceRecipient !== 'all') {
      const s = currentSubject.students.find(st => st.id === newAnnounceRecipient);
      if (s) recipName = s.name;
    }
    const newAnn = {
      id: "msg_" + Date.now(), title: newAnnounceTitle, body: newAnnounceBody,
      type: newAnnounceType, recipient: newAnnounceRecipient,
      recipientName: recipName, isGlobal, date: new Date().toLocaleDateString()
    };
    const currentList = Array.isArray(currentSubject.announcements) ? currentSubject.announcements : [];
    saveSubject({ ...currentSubject, announcements: [newAnn, ...currentList] });

    // Enviar correo por mailto si hay correos de representantes
    let bccEmails = [];
    if (newAnnounceRecipient === 'all') {
      currentSubject.students.forEach(st => {
        const profile = parentProfiles[st.code]?.formData;
        if (profile?.representante1?.email) bccEmails.push(profile.representante1.email);
        if (profile?.representante2?.email) bccEmails.push(profile.representante2.email);
      });
    } else {
      const st = currentSubject.students.find(st => st.id === newAnnounceRecipient);
      if (st) {
        const profile = parentProfiles[st.code]?.formData;
        if (profile?.representante1?.email) bccEmails.push(profile.representante1.email);
        if (profile?.representante2?.email) bccEmails.push(profile.representante2.email);
      }
    }
    bccEmails = [...new Set(bccEmails)].filter(e => e.includes('@'));

    if (bccEmails.length > 0) {
      const subject = encodeURIComponent(`Comunicado U.E. 19 de Agosto: ${newAnnounceTitle}`);
      const body = encodeURIComponent(`${newAnnounceBody}\n\nEnviado por: ${currentUser?.name} (${currentUser?.role})`);
      const bcc = bccEmails.join(',');
      window.open(`mailto:?bcc=${bcc}&subject=${subject}&body=${body}`, '_blank');
    }

    setIsAddingAnnouncement(false); setNewAnnounceTitle(''); setNewAnnounceBody(''); setNewAnnounceRecipient('all');
  };

  const deleteAnnouncement = (id) => {
    if (!confirm("¿Borrar comunicado?")) return;
    saveSubject({ ...currentSubject, announcements: (currentSubject.announcements || []).filter(a => a.id !== id) });
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
    saveSubject({ ...currentSubject, attendance: { ...att, [sId]: { ...stu, [d]: { ...day, [f]: v } } } });
  };

  const calculateStats = (sub, tri, sId) => {
    if (!sub) return { wAct: '0.00', wEx: '0.00', fin: '0.00' };
    const acts = (sub.activities?.[tri]) || [];
    const gr = (sub.grades?.[tri]?.[sId]) || {};
    let sum = 0; acts.forEach(a => sum += (gr[a.id] || 0));
    const avg = acts.length ? sum / acts.length : 0;
    const ex = parseFloat(gr['exam_final'] || 0);
    const proj = gr['project_final'];
    const weight30 = (proj !== undefined && proj !== null && proj !== '')
      ? ((ex + parseFloat(proj)) / 2) * 0.3
      : ex * 0.3;
    return {
      wAct: (avg * 0.7).toFixed(2),
      wEx: weight30.toFixed(2),
      fin: ((avg * 0.7) + weight30).toFixed(2)
    };
  };

  // ── EXPORTAR ──────────────────────────────────────────────────────────────
  const exportGradesCSV = () => {
    const acts = currentSubject.activities[currentTrimester] || [];
    let csv = "Estudiante;Codigo;" + acts.map(a => `"${a.name}"`).join(";") + ";70%;Examen;Proyecto;30%;Final\n";
    currentSubject.students.forEach(s => {
      const st = calculateStats(currentSubject, currentTrimester, s.id);
      const gr = currentSubject.grades[currentTrimester]?.[s.id] || {};
      csv += `"${s.name}";"${s.code}";` + acts.map(a => gr[a.id] || 0).join(";")
        + `;"${st.wAct}";"${gr['exam_final'] || 0}";"${gr['project_final'] || ''}";"${st.wEx}";"${st.fin}"\n`;
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv' }));
    link.download = `Notas_${currentSubject.name}_T${currentTrimester}.csv`; link.click();
  };

  const exportAttendanceCSV = () => {
    if (!currentSubject) return;
    const allDates = new Set();
    currentSubject.students.forEach(s => Object.keys(currentSubject?.attendance?.[s.id] || {}).forEach(d => allDates.add(d)));
    const sortedDates = Array.from(allDates).sort();
    let csv = "Estudiante;Codigo;" + sortedDates.join(";") + ";% Asistencia\n";
    currentSubject.students.forEach(s => {
      const att = currentSubject?.attendance?.[s.id] || {};
      let presentCount = 0, totalRecorded = 0;
      const rowData = sortedDates.map(date => {
        const r = att[date];
        if (!r) return "-";
        totalRecorded++; if (r.status === 'P') presentCount++;
        return `"${r.status === 'P' ? 'P' : 'F'}${r.note ? ` (${r.note.replace(/"/g, "'")})` : ''}"`;
      });
      const pct = totalRecorded > 0 ? Math.round((presentCount / totalRecorded) * 100) : 0;
      csv += `"${s.name}";"${s.code}";` + rowData.join(";") + `;"${pct}%"\n`;
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv' }));
    link.download = `Asistencia_${currentSubject.name}.csv`; link.click();
  };

  // ── HELPERS UI CURSOS ─────────────────────────────────────────────────────
  const getCourseParallels = (courseName) => {
    const cData = appSettings.courses?.[courseName];
    return Array.isArray(cData) ? cData : (cData?.parallels || []);
  };

  const getCourseSubjects = (courseName) => {
    const cData = appSettings.courses?.[courseName];
    return Array.isArray(cData?.subjects) ? cData.subjects : [];
  };

  // ── ERROR / LOADING ───────────────────────────────────────────────────────
  if (errorMsg) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full border-l-4 border-red-500">
        <div className="flex items-center gap-2 mb-4 text-red-600"><Bug size={32} /><h2 className="text-xl font-bold">Atención Requerida</h2></div>
        <p className="mb-4 font-bold text-gray-800">{errorMsg}</p>
        <button onClick={() => window.location.reload()} className="mt-6 w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">Recargar</button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="h-screen flex items-center justify-center text-indigo-600 font-bold bg-gray-50">
      Conectando U.E. 19 de Agosto...
    </div>
  );

  // ── PORTAL LOGIN ──────────────────────────────────────────────────────────
  if (viewMode === 'portal') return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 text-white font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[120px]" />

      <div className="bg-slate-900/40 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-lg border border-white/10 text-center relative z-10">
        <div className="bg-gradient-to-tr from-indigo-500 to-emerald-500 p-2 rounded-2xl inline-block mb-6 shadow-xl">
          <img src="/vite.svg" width="112" height="112" alt="Logo" className="drop-shadow-lg" />
        </div>
        <h1 className="text-5xl font-black mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">U.E. 19 de Agosto</h1>
        <p className="text-slate-400 mb-10 text-lg font-medium">Gestión Académica de Vanguardia</p>

        <div className="space-y-4">
          {/* Acceso docente */}
          <div className="bg-black/30 p-5 rounded-xl text-left border border-white/10">
            <label className="text-xs uppercase font-bold text-indigo-300 block mb-2 flex items-center gap-2"><Lock size={14} /> Acceso Personal (Docente / Admin)</label>
            <div className="flex gap-2">
              <input type="password" value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTeacherLogin()}
                className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Contraseña" />
              <button onClick={handleTeacherLogin} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-medium transition">Entrar</button>
            </div>
            <button onClick={handleEmergencyRector} className="mt-2 text-[10px] text-indigo-400 hover:text-indigo-200 underline opacity-30 hover:opacity-100 transition">
              Acceso de Emergencia (Rector)
            </button>
          </div>

          {/* Acceso padres */}
          <div className="bg-black/30 p-5 rounded-xl text-left border border-white/10">
            <label className="text-xs uppercase font-bold text-green-300 block mb-2 flex items-center gap-2"><Eye size={14} /> Acceso Padres / Representantes</label>
            <div className="flex gap-2">
              <input value={studentCodeInput}
                onChange={e => setStudentCodeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStudentLogin()}
                className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 uppercase"
                placeholder="Código del estudiante (ej. ABC123)" />
              <button onClick={handleStudentLogin} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-medium transition">Ver</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── VISTA ESTUDIANTE / PADRES ─────────────────────────────────────────────
  if (viewMode === 'student_view' && viewingStudent && viewingSubject) {
    const st = calculateStats(viewingSubject, typeof currentTrimester === 'number' ? currentTrimester : 1, viewingStudent.id);

    const allAnnouncements = subjects.flatMap(sub => (sub.announcements || []).map(ann => ({ ...ann, sourceSubject: sub.name })));
    const filteredAnnouncements = allAnnouncements.filter(ann => {
      if (ann.isGlobal) return true;
      if (ann.sourceSubject === viewingSubject.name)
        return !ann.recipient || ann.recipient === 'all' || ann.recipient === viewingStudent.id;
      return false;
    });
    const uniqueAnnouncements = Array.from(new Map(filteredAnnouncements.map(ann => [ann.id, ann])).values())
      .sort((a, b) => b.id.localeCompare(a.id));

    return (
      <div className="min-h-screen bg-slate-50 font-sans text-gray-800 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-500/20"><User size={28} /></div>
            <div>
              <h1 className="text-xl font-black text-gray-900 leading-tight uppercase tracking-tight">{viewingStudent.name}</h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Cód: {viewingStudent.code}</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Portal Académico</span>
              </div>
            </div>
          </div>
          <button onClick={() => { setViewMode('portal'); setStudentSubjects([]); setViewingStudent(null); }}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-xl font-bold text-sm hover:scale-105 transition active:scale-95 shadow-lg shadow-slate-900/20">
            <LogOut size={18} /> Salir
          </button>
        </header>

        <div className="flex-1 max-w-6xl mx-auto w-full p-6 space-y-8">

          {/* Boleta consolidada */}
          <section className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><FileSpreadsheet className="text-emerald-500" /> Cuadro General de Calificaciones</h2>
                <p className="text-sm font-bold text-indigo-600 mt-0.5">Estudiante: <span className="text-slate-700">{viewingStudent.name}</span></p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400">Año Lectivo {appSettings.schoolYear || 'Oficial'}</span>
                <button onClick={() => { setIsEditingParentForm(true); setShowParentForm(true); }}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                  <Settings size={12} /> Editar Datos del Representante
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4">Asignatura</th>
                    <th className="px-4 py-4 text-center">1º Trim</th>
                    <th className="px-4 py-4 text-center">2º Trim</th>
                    <th className="px-4 py-4 text-center">3º Trim</th>
                    <th className="px-4 py-4 text-center bg-indigo-50/30">Suma Final</th>
                    <th className="px-6 py-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {studentSubjects.map(m => {
                    const s1 = calculateStats(m.subject, 1, m.student.id);
                    const s2 = calculateStats(m.subject, 2, m.student.id);
                    const s3 = calculateStats(m.subject, 3, m.student.id);
                    const total = (parseFloat(s1.fin) || 0) + (parseFloat(s2.fin) || 0) + (parseFloat(s3.fin) || 0);
                    const pass = total >= 21;
                    const isSelected = viewingSubject.id === m.subject.id;
                    return (
                      <tr key={m.subject.id}
                        className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${isSelected ? 'bg-indigo-50/40' : ''}`}
                        onClick={() => { setViewingSubject(m.subject); setViewingStudent(m.student); setCurrentTrimester(1); }}>
                        <td className="px-6 py-5">
                          <div className={`font-bold transition-colors ${isSelected ? 'text-indigo-700' : 'text-slate-700 group-hover:text-indigo-600'}`}>{m.subject.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{m.subject.parallel} • {m.subject.teacherName || 'Docente'}</div>
                        </td>
                        <td className="px-4 py-5 text-center font-mono font-bold text-slate-600">{s1.fin}</td>
                        <td className="px-4 py-5 text-center font-mono font-bold text-slate-600">{s2.fin}</td>
                        <td className="px-4 py-5 text-center font-mono font-bold text-slate-600">{s3.fin}</td>
                        <td className="px-4 py-5 text-center bg-indigo-50/30">
                          <span className={`text-lg font-black ${pass ? 'text-indigo-600' : 'text-red-500'}`}>{total.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter shadow-sm ${pass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {pass ? 'Aprobado' : 'Supletorio'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 flex justify-center border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase italic">* Haz clic en una materia para ver el detalle de actividades y asistencia.</p>
            </div>
          </section>

          {/* Detalle materia seleccionada */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              {/* Actividades */}
              <div className="bg-white rounded-[2rem] shadow-lg border border-slate-100 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><LayoutList className="text-indigo-500" /> {viewingSubject.name}</h3>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(t => (
                      <button key={t} onClick={() => setCurrentTrimester(t)}
                        className={`px-4 py-1.5 text-xs font-black rounded-lg transition ${currentTrimester === t ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        {t}º Trim
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 mb-6 grid grid-cols-3 gap-2 text-center border border-slate-100">
                  <div><div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Actividades</div><div className="font-black text-indigo-600 text-xl">{st.wAct}</div></div>
                  <div><div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Exam/Proy</div><div className="font-black text-orange-500 text-xl">{st.wEx}</div></div>
                  <div><div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Promedio</div><div className="font-black text-gray-900 text-xl">{st.fin}</div></div>
                </div>

                <ul className="space-y-3">
                  {(viewingSubject.activities[currentTrimester] || []).map(act => {
                    const grade = viewingSubject.grades[currentTrimester]?.[viewingStudent.id]?.[act.id];
                    return (
                      <li key={act.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-50 bg-slate-50/30">
                        <span className="text-sm font-bold text-slate-600">{act.name}</span>
                        <span className={`font-mono font-black text-base ${grade < 7 ? 'text-red-500' : 'text-slate-800'}`}>{grade !== undefined ? grade : '-'}</span>
                      </li>
                    );
                  })}
                  {(viewingSubject.activities[currentTrimester] || []).length === 0 &&
                    <li className="text-center py-6 text-slate-400 italic text-sm">No hay actividades en este periodo.</li>}
                </ul>
              </div>

              {/* Asistencia */}
              <div className="bg-white rounded-[2rem] shadow-lg border border-slate-100 p-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Calendar className="text-emerald-500" /> Asistencia</h3>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {Object.entries(viewingSubject?.attendance?.[viewingStudent.id] || {}).sort().reverse().map(([d, v]) => (
                    <div key={d} className="flex justify-between items-center p-3 rounded-xl border border-slate-50">
                      <div>
                        <div className="font-bold text-slate-700 text-sm">{d}</div>
                        {v.note && <div className="text-[10px] text-slate-400 italic">Nota: {v.note}</div>}
                      </div>
                      <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter ${v.status === 'P' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {v.status === 'P' ? 'Presente' : 'Falta'}
                      </span>
                    </div>
                  ))}
                  {Object.keys(viewingSubject.attendance[viewingStudent.id] || {}).length === 0 &&
                    <p className="text-slate-400 text-sm text-center py-10">Sin registros de asistencia.</p>}
                </div>
              </div>
            </div>

            {/* Comunicados */}
            <div className="bg-white rounded-[2rem] shadow-lg border border-slate-100 p-6 flex flex-col">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Megaphone className="text-orange-500" /> Avisos y Eventos</h3>
              <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                {uniqueAnnouncements.length === 0 ? (
                  <div className="text-center py-20 text-slate-300">
                    <Bell size={60} className="mx-auto mb-4 opacity-10" />
                    <p className="font-bold uppercase tracking-widest text-xs">No hay avisos recientes</p>
                  </div>
                ) : uniqueAnnouncements.map(ann => (
                  <div key={ann.id} className={`p-5 rounded-3xl border shadow-sm ${ann.type === 'urgent' ? 'bg-red-50/50 border-red-100' : ann.type === 'event' ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black text-slate-800 leading-tight pr-4">{ann.title}</h4>
                      <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">{ann.date}</span>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-line mb-3 font-medium">{ann.body}</p>
                    <div className="flex gap-2">
                      {ann.recipient !== 'all' && <span className="text-[8px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Personal</span>}
                      {ann.isGlobal && <span className="text-[8px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Global</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Formulario registro/edición de representante — overlay dentro de student_view */}
        {showParentForm && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl p-8 my-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">
                    {isEditingParentForm ? 'Actualizar Datos del Representante' : 'Registro de Representante'}
                  </h2>
                  <p className="text-slate-500 font-medium mt-1">
                    Estudiante: <strong className="text-indigo-600">{viewingStudent?.name}</strong>
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest border ${isEditingParentForm ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                  {isEditingParentForm ? 'Edición' : 'Paso Obligatorio'}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Datos del estudiante */}
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <User size={18} /> 1. Datos del Estudiante
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cédula del Estudiante</label>
                        <input className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-indigo-500 outline-none transition"
                          value={parentFormData.studentCedula}
                          onChange={e => setParentFormData({ ...parentFormData, studentCedula: e.target.value })}
                          placeholder="Ej. 1712345678" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fecha de Nacimiento</label>
                        <input type="date" className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-indigo-500 outline-none transition"
                          value={parentFormData.studentBirthDate}
                          onChange={e => setParentFormData({ ...parentFormData, studentBirthDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo de Sangre</label>
                        <select className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-indigo-500 outline-none transition"
                          value={parentFormData.studentBloodType}
                          onChange={e => setParentFormData({ ...parentFormData, studentBloodType: e.target.value })}>
                          <option value="">Seleccionar...</option>
                          <option value="A+">A+</option><option value="A-">A-</option>
                          <option value="B+">B+</option><option value="B-">B-</option>
                          <option value="AB+">AB+</option><option value="AB-">AB-</option>
                          <option value="O+">O+</option><option value="O-">O-</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Teléfono de Contacto</label>
                        <input className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-indigo-500 outline-none transition"
                          value={parentFormData.studentPhone}
                          onChange={e => setParentFormData({ ...parentFormData, studentPhone: e.target.value })}
                          placeholder="Ej. 0998877665" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Dirección Domiciliaria</label>
                      <input className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-indigo-500 outline-none transition"
                        value={parentFormData.studentAddress}
                        onChange={e => setParentFormData({ ...parentFormData, studentAddress: e.target.value })}
                        placeholder="Ej. Calle Principal y Av. Central" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Observaciones / Datos Médicos</label>
                      <textarea className="w-full border-2 border-slate-100 rounded-xl p-3 h-24 focus:border-indigo-500 outline-none transition resize-none"
                        value={parentFormData.studentNotes}
                        onChange={e => setParentFormData({ ...parentFormData, studentNotes: e.target.value })}
                        placeholder="Alergias, condiciones especiales, etc." />
                    </div>
                  </div>
                </div>

                {/* Representantes */}
                <div className="space-y-8">
                  <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={18} /> 2. Representantes Legales
                  </h3>
                  {/* Representante 1 */}
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 space-y-4">
                    <span className="text-[10px] bg-slate-900 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest">Primario</span>
                    <input className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Nombre completo"
                      value={parentFormData.representante1.name}
                      onChange={e => setParentFormData({ ...parentFormData, representante1: { ...parentFormData.representante1, name: e.target.value } })} />
                    <div className="grid grid-cols-2 gap-3">
                      <input className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none"
                        placeholder="Cédula"
                        value={parentFormData.representante1.cedula}
                        onChange={e => setParentFormData({ ...parentFormData, representante1: { ...parentFormData.representante1, cedula: e.target.value } })} />
                      <select className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none"
                        value={parentFormData.representante1.relation}
                        onChange={e => setParentFormData({ ...parentFormData, representante1: { ...parentFormData.representante1, relation: e.target.value } })}>
                        <option>Madre</option><option>Padre</option><option>Abuelo/a</option><option>Tío/a</option><option>Otro</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none"
                        placeholder="Teléfono" value={parentFormData.representante1.phone || ''}
                        onChange={e => setParentFormData({ ...parentFormData, representante1: { ...parentFormData.representante1, phone: e.target.value } })} />
                      <input className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none"
                        placeholder="Correo electrónico" value={parentFormData.representante1.email || ''}
                        onChange={e => setParentFormData({ ...parentFormData, representante1: { ...parentFormData.representante1, email: e.target.value } })} />
                    </div>
                  </div>
                  {/* Representante 2 */}
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 space-y-4 opacity-80 focus-within:opacity-100 transition-opacity">
                    <span className="text-[10px] bg-slate-400 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest">Secundario (Opcional)</span>
                    <input className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Nombre completo"
                      value={parentFormData.representante2.name}
                      onChange={e => setParentFormData({ ...parentFormData, representante2: { ...parentFormData.representante2, name: e.target.value } })} />
                    <div className="grid grid-cols-2 gap-3">
                      <input className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none"
                        placeholder="Cédula"
                        value={parentFormData.representante2.cedula}
                        onChange={e => setParentFormData({ ...parentFormData, representante2: { ...parentFormData.representante2, cedula: e.target.value } })} />
                      <select className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none"
                        value={parentFormData.representante2.relation}
                        onChange={e => setParentFormData({ ...parentFormData, representante2: { ...parentFormData.representante2, relation: e.target.value } })}>
                        <option>Padre</option><option>Madre</option><option>Tío/a</option><option>Abuelo/a</option><option>Otro</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none"
                        placeholder="Teléfono" value={parentFormData.representante2.phone || ''}
                        onChange={e => setParentFormData({ ...parentFormData, representante2: { ...parentFormData.representante2, phone: e.target.value } })} />
                      <input className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none"
                        placeholder="Correo electrónico" value={parentFormData.representante2.email || ''}
                        onChange={e => setParentFormData({ ...parentFormData, representante2: { ...parentFormData.representante2, email: e.target.value } })} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row justify-end gap-4 border-t pt-8">
                <button onClick={() => {
                  setShowParentForm(false);
                  setIsEditingParentForm(false);
                  if (!isEditingParentForm) { setViewMode('portal'); setViewingStudent(null); }
                }}
                  className="px-8 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition">
                  {isEditingParentForm ? 'Cancelar' : 'Salir'}
                </button>
                <button onClick={async () => {
                  if (!parentFormData.representante1.name || !parentFormData.representante1.cedula || !parentFormData.representante1.email)
                    return alert("El Representante 1 (nombre, cédula y correo) es obligatorio.");
                  const code = viewingStudent?.code || studentCodeInput.trim().toUpperCase();
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'parentProfiles', code), { formData: parentFormData });
                  setParentProfiles({ ...parentProfiles, [code]: { formData: parentFormData } });
                  setShowParentForm(false);
                  setIsEditingParentForm(false);
                  alert(isEditingParentForm ? "✅ Datos actualizados correctamente." : "🎉 Perfil registrado. Bienvenido al portal.");
                }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-600/30 transition-all active:scale-95">
                  {isEditingParentForm ? 'Guardar Cambios' : 'Guardar y Continuar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── VISTA DOCENTE / ADMIN / RECTOR ────────────────────────────────────────
  // BUG #2 FIX: En el primer ingreso del docente, si no hay currentSubject seleccionado
  // el render llegaba a JSX que usaba <LayoutList> y <ShieldCheck> que NO estaban importados,
  // causando un ReferenceError que aparece como pantalla en blanco.
  // Solución: se agregaron al import en la línea 2.
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      {/* HEADER */}
      <header className="bg-indigo-700 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <h1 className="font-black text-2xl flex items-center gap-3 tracking-tighter">
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20 shadow-inner">
            <img src="/vite.svg" width="28" height="28" alt="Logo" className="drop-shadow-md" />
          </div>
          <div className="flex flex-col">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">U.E. 19 de Agosto</span>
            {appSettings.schoolYear && <span className="text-[10px] text-indigo-300 font-medium leading-none">{appSettings.schoolYear}</span>}
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30 ml-2 animate-pulse uppercase tracking-widest hidden sm:inline">v3.0</span>
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">{currentUser?.role}</span>
            <span className="text-sm font-bold leading-tight">{currentUser?.name}</span>
          </div>
          {(isRector || isAdmin) && (
            <button onClick={() => setIsManagingStaff(true)}
              className="flex items-center gap-1 text-sm bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded transition font-bold shadow-sm">
              <User size={16} /> <span className="hidden sm:inline">Staff</span>
            </button>
          )}
          <button onClick={() => setIsChangingPass(true)}
            className="flex items-center gap-1 text-sm bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded transition">
            <Settings size={16} />
          </button>
          <button onClick={() => { setCurrentUser(null); setViewMode('portal'); setCurrentSubjectId(null); }}
            className="flex items-center gap-1 text-sm bg-indigo-800 hover:bg-indigo-900 px-3 py-1.5 rounded transition">
            <LogOut size={16} /> Salir
          </button>
          <button className="md:hidden" onClick={() => setShowMenu(!showMenu)}><Menu /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className={`${showMenu ? 'fixed inset-0 z-40 bg-white' : 'hidden'} lg:block lg:static lg:w-80 bg-white shadow-xl flex-shrink-0 flex flex-col z-40 border-r border-gray-200`}>
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Panel de Control</h2>
            {showMenu && <button onClick={() => setShowMenu(false)} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20} /></button>}
          </div>

          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {/* Botones de acción */}
            <div className="space-y-2 mb-4">
              {isAdmin && (
                <>
                  <button onClick={() => { setIsManagingStaff(true); setShowMenu(false); }}
                    className="w-full bg-emerald-600 text-white py-3 px-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all font-bold shadow active:scale-95">
                    <User size={18} /> Gestionar Personal
                  </button>
                  <button onClick={() => { setIsManagingCourses(true); setShowMenu(false); }}
                    className="w-full bg-orange-600 text-white py-3 px-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-orange-700 transition-all font-bold shadow active:scale-95">
                    <BookOpen size={18} /> Cursos y Materias
                  </button>
                  <button onClick={() => { setNewYearName(''); setNewYearConfirm(false); setShowYearManager(true); setShowMenu(false); }}
                    className="w-full bg-violet-600 text-white py-3 px-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-violet-700 transition-all font-bold shadow active:scale-95">
                    <Calendar size={18} /> Años Lectivos
                  </button>
                </>
              )}
              {(isDocente || isAdmin) && (
                <button onClick={() => { setNewSubjectName(''); setNewParallel(''); setNewSubjectCourse(''); setNewSubjectTeacher(''); setIsEditingSubject(false); setIsAddingSubject(true); setShowMenu(false); }}
                  className="w-full bg-indigo-600 text-white py-3 px-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all font-bold shadow active:scale-95">
                  <Plus size={18} /> Nueva Asignatura
                </button>
              )}
              {isRector && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 font-medium">
                  👁️ Modo visualización — solo lectura
                </div>
              )}
            </div>

            {/* Lista de materias */}
            {isRector ? (() => {
              const parallels = [...new Set(visibleSubjects.map(s => s.parallel))].sort();
              return (
                <div className="space-y-5">
                  {parallels.map(p => (
                    <div key={p}>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <div className="h-px flex-1 bg-indigo-100" />
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">{p || 'Sin Paralelo'}</span>
                        <div className="h-px flex-1 bg-indigo-100" />
                      </div>
                      {visibleSubjects.filter(s => s.parallel === p).map(s => (
                        <button key={s.id} onClick={() => { setCurrentSubjectId(s.id); setShowMenu(false); }}
                          className={`w-full text-left p-3 rounded-xl flex justify-between items-center transition-all mb-1 ${currentSubjectId === s.id ? 'bg-indigo-600 text-white shadow-lg translate-x-1' : 'hover:bg-slate-50 text-slate-600 hover:translate-x-1'}`}>
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="font-bold text-sm truncate">{s.name}</div>
                            <div className={`text-[10px] ${currentSubjectId === s.id ? 'text-indigo-200' : 'text-slate-400'}`}>{s.teacherName || 'Sin docente'}</div>
                          </div>
                          <Eye size={14} className={currentSubjectId === s.id ? 'text-white' : 'text-slate-300'} />
                        </button>
                      ))}
                    </div>
                  ))}
                  {visibleSubjects.length === 0 && <div className="text-xs text-slate-400 px-3 py-2 italic">No hay materias registradas.</div>}
                </div>
              );
            })() : (() => {
              const mySubjects = visibleSubjects.filter(s => s.teacherId === currentUser?.id);
              const otherSubjects = visibleSubjects.filter(s => s.teacherId !== currentUser?.id);
              return (
                <>
                  <div className="px-2 mb-1">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {isAdmin ? 'Todas las Asignaturas' : 'Mis Asignaturas'}
                    </h3>
                  </div>
                  {(isAdmin ? visibleSubjects : mySubjects).map(s => (
                    <button key={s.id} onClick={() => { setCurrentSubjectId(s.id); setShowMenu(false); }}
                      className={`w-full text-left p-4 rounded-2xl flex justify-between items-center transition-all duration-300 ${currentSubjectId === s.id ? 'bg-indigo-600 text-white shadow-xl translate-x-1' : 'hover:bg-slate-50 text-slate-600 hover:translate-x-1'}`}>
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="font-bold text-base truncate">{s.name}</div>
                        <div className={`text-xs ${currentSubjectId === s.id ? 'text-indigo-200' : 'text-slate-400'} font-medium`}>
                          {s.parallel}{s.teacherName ? ` • ${s.teacherName}` : ''}
                        </div>
                      </div>
                      {currentSubjectId === s.id && <ChevronRight size={18} />}
                    </button>
                  ))}
                  {!isAdmin && mySubjects.length === 0 && <div className="text-xs text-slate-400 px-3 py-2 italic">No tienes materias asignadas.</div>}

                  {isDocente && otherSubjects.length > 0 && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <button onClick={() => setShowOtherSubjects(!showOtherSubjects)} className="w-full flex justify-between items-center px-2 mb-2 group">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Materias de Tutoría</h3>
                        <span className="text-xs text-slate-400 font-bold group-hover:text-indigo-600 px-2 py-0.5 bg-gray-100 rounded-md">{showOtherSubjects ? 'Ocultar ▲' : 'Ver ▼'}</span>
                      </button>
                      {showOtherSubjects && otherSubjects.map(s => (
                        <button key={s.id} onClick={() => { setCurrentSubjectId(s.id); setShowMenu(false); }}
                          className={`w-full text-left p-3 rounded-xl flex justify-between items-center transition-all mb-1 ${currentSubjectId === s.id ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'hover:bg-slate-50 text-slate-500'}`}>
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="font-bold text-sm truncate">{s.name}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{s.parallel}</div>
                          </div>
                          <Eye size={14} className="text-gray-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 p-4 lg:p-10 overflow-auto bg-slate-50 w-full">
          {currentSubject ? (
            <div className="max-w-[1600px] mx-auto space-y-8">
              {/* Encabezado materia */}
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    {currentSubject.name}
                    <span className="bg-indigo-100 text-indigo-800 text-sm px-3 py-1 rounded-full font-medium">{currentSubject.parallel}</span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 mt-1">
                    <p className="text-gray-500 text-sm">{currentSubject.students.length} Estudiantes</p>
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold">Docente: {currentSubject.teacherName || 'Sin asignar'}</span>
                    {isAdmin && (
                      <button onClick={() => {
                        setNewSubjectName(currentSubject.name);
                        setNewParallel(currentSubject.parallel);
                        setNewSubjectTeacher(currentSubject.teacherId || '');
                        setIsEditingSubject(true);
                        setIsAddingSubject(true);
                      }} className="text-[10px] bg-slate-800 text-white px-3 py-1 rounded-full font-bold hover:bg-black transition uppercase tracking-widest shadow-sm">
                        Reasignar Docente / Editar
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-lg shadow-inner overflow-x-auto">
                  {[['grades', 'Notas', FileSpreadsheet], ['attendance', 'Asistencia', Calendar], ['announcements', 'Comunicados', Megaphone]].map(([tab, label, Icon]) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}>
                      <Icon size={18} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* TAB NOTAS */}
              {activeTab === 'grades' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-220px)]">
                  <div className="p-3 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap items-center gap-1 bg-white border border-gray-200 px-1 py-1 rounded-lg shadow-sm">
                      {[1, 2, 3, 'Anual'].map(t => (
                        <button key={t} onClick={() => setCurrentTrimester(t)}
                          className={`px-4 py-1.5 text-sm rounded-md transition font-bold ${currentTrimester === t ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
                          {t === 'Anual' ? 'Resumen Anual' : `${t}º Trimestre`}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      {currentTrimester !== 'Anual' && (
                        <>
                          <button onClick={exportGradesCSV} className="text-sm bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-1 shadow-sm transition"><Download size={16} /> Excel</button>
                          {canEditGrades(currentSubject) && (
                            <>
                              <button onClick={() => setIsAddingActivity(true)} className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 shadow-sm transition"><Plus size={16} /> Actividad</button>
                              <button onClick={() => setIsAddingStudent(true)} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 shadow-sm transition"><User size={16} /> Estudiante</button>
                            </>
                          )}
                        </>
                      )}
                      {canEditGrades(currentSubject) && (
                        <button onClick={() => deleteSubjectDB(currentSubject.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition" title="Borrar Clase"><Trash2 size={18} /></button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    {currentTrimester === 'Anual' ? (() => {
                      const annualStudents = currentSubject.students.map(s => {
                        const s1 = calculateStats(currentSubject, 1, s.id);
                        const s2 = calculateStats(currentSubject, 2, s.id);
                        const s3 = calculateStats(currentSubject, 3, s.id);
                        const sum = (parseFloat(s1.fin) || 0) + (parseFloat(s2.fin) || 0) + (parseFloat(s3.fin) || 0);
                        return { s, s1, s2, s3, sum };
                      }).sort((a, b) => b.sum - a.sum);
                      const sortedSums = [...new Set(annualStudents.map(x => x.sum))].sort((a, b) => b - a);
                      return (
                        <table className="w-full text-sm text-left border-collapse">
                          <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 shadow-sm">
                            <tr>
                              <th className="p-4 w-10 text-center font-bold border-b border-gray-300">#</th>
                              <th className="p-4 min-w-[250px] font-bold border-b border-gray-300 border-r">Estudiante</th>
                              <th className="p-4 text-center font-bold border-b border-gray-300 border-r w-24">1º Trim</th>
                              <th className="p-4 text-center font-bold border-b border-gray-300 border-r w-24">2º Trim</th>
                              <th className="p-4 text-center font-bold border-b border-gray-300 border-r w-24">3º Trim</th>
                              <th className="p-4 text-center font-bold border-b border-gray-300 border-r w-32 bg-indigo-50 text-indigo-900">Suma Final</th>
                              <th className="p-4 text-center font-bold border-b border-gray-300">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {annualStudents.map((data, i) => {
                              const rank = sortedSums.indexOf(data.sum);
                              const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '';
                              const isPassing = data.sum >= 21;
                              return (
                                <tr key={data.s.id} className={`border-b border-gray-100 ${PALETTE[i % PALETTE.length]} hover:brightness-95`}>
                                  <td className="p-4 text-center text-gray-400 font-mono text-xs">{i + 1}</td>
                                  <td className="p-4 font-bold text-gray-800 border-r border-gray-200/50">
                                    {medal && <span className="text-xl mr-2">{medal}</span>}{data.s.name}
                                  </td>
                                  <td className="p-4 border-r border-gray-200/50 text-center font-bold text-gray-700">{data.s1.fin}</td>
                                  <td className="p-4 border-r border-gray-200/50 text-center font-bold text-gray-700">{data.s2.fin}</td>
                                  <td className="p-4 border-r border-gray-200/50 text-center font-bold text-gray-700">{data.s3.fin}</td>
                                  <td className="p-4 border-r border-gray-200/50 text-center font-black text-2xl bg-indigo-50/50 text-indigo-700">{data.sum.toFixed(2)}</td>
                                  <td className="p-4 text-center font-bold">
                                    {isPassing
                                      ? <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-xs uppercase font-black border border-green-200">Aprobado</span>
                                      : <span className="bg-red-100 text-red-700 px-4 py-2 rounded-full text-xs uppercase font-black border border-red-200">Supletorio</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })() : (
                      <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 shadow-sm">
                          <tr>
                            <th className="p-3 w-10 text-center font-bold border-b border-gray-300">#</th>
                            <th className="p-3 min-w-[250px] font-bold border-b border-gray-300 border-r">Estudiante</th>
                            {(currentSubject.activities[currentTrimester] || []).map((a, i) => (
                              <th key={a.id} className="p-0 text-center min-w-[80px] w-20 border-b border-gray-300 border-r bg-gray-50 relative group h-40 align-bottom overflow-hidden">
                                <div className="flex flex-col items-center justify-end h-full pb-4">
                                  <span className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Act {i + 1}</span>
                                  <div className="font-bold text-xs mb-2 px-1 text-gray-700" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={a.name}>{a.name}</div>
                                  {canEditGrades(currentSubject) && <button onClick={() => deleteActivity(a.id)} className="absolute top-1 right-1 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>}
                                </div>
                              </th>
                            ))}
                            {[['70% (D)', 'bg-indigo-50 border-indigo-100 text-indigo-700'], ['EXAMEN', 'bg-orange-50 border-orange-100 text-orange-700'], ['PROYECTO', 'bg-green-50 border-green-100 text-green-700'], ['30% (E)', 'bg-indigo-50 border-indigo-100 text-indigo-700'], ['FINAL', 'bg-gray-800 border-gray-900 text-white']].map(([h, cls]) => (
                              <th key={h} className={`p-0 text-center min-w-[64px] border-b border-r relative h-40 align-bottom ${cls.split(' ')[0]} ${cls.split(' ')[1]}`}>
                                <div className="flex flex-col items-center justify-end h-full w-full pb-4">
                                  <span className={`font-bold text-xs whitespace-nowrap px-1 ${cls.split(' ')[2]}`} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{h}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {currentSubject.students.map((s, i) => {
                            const st = calculateStats(currentSubject, currentTrimester, s.id);
                            const editable = canEditGrades(currentSubject);
                            return (
                              <tr key={s.id} className={`border-b border-gray-100 ${PALETTE[i % PALETTE.length]} hover:brightness-95`}>
                                <td className="p-3 text-center text-gray-400 font-mono text-xs">{i + 1}</td>
                                <td className="p-3 font-medium text-gray-800 border-r border-gray-200/50 relative group leading-tight">
                                  {s.name.split(' ').reduce((acc, w, idx) => { if (idx % 2 === 0) acc.push([w]); else acc[acc.length - 1].push(w); return acc; }, []).map((line, i) => <div key={i}>{line.join(' ')}</div>)}
                                  <div className="text-[10px] text-gray-400 font-mono">CÓD: {s.code}</div>
                                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setViewingProfileCode(s.code)} className="text-indigo-500 hover:text-indigo-700 bg-white/90 p-1 rounded-md shadow-sm" title="Ver Perfil"><Eye size={12} /></button>
                                    {editable && <button onClick={() => deleteStudent(s.id, s.name)} className="text-red-400 hover:text-red-600 bg-white/90 p-1 rounded-md shadow-sm"><Trash2 size={12} /></button>}
                                  </div>
                                </td>
                                {(currentSubject.activities[currentTrimester] || []).map(a => (
                                  <td key={a.id} className="p-1 border-r border-gray-200/50 text-center">
                                    <input type="number" disabled={!editable}
                                      className={`w-16 min-w-[64px] text-center p-2 text-base font-bold rounded border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white/70 shadow-sm ${!editable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      value={currentSubject.grades[currentTrimester]?.[s.id]?.[a.id] ?? ''}
                                      onChange={e => updateGrade(s.id, a.id, e.target.value)} />
                                  </td>
                                ))}
                                <td className="p-2 text-center font-bold text-indigo-700 bg-indigo-50/50 border-r border-indigo-100">{st.wAct}</td>
                                <td className="p-1 text-center bg-orange-50/50 border-r border-orange-100">
                                  <input type="number" disabled={!editable}
                                    className={`w-16 min-w-[64px] text-center p-2 text-base font-bold rounded border border-orange-200 focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white shadow-sm ${!editable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    value={currentSubject.grades[currentTrimester]?.[s.id]?.['exam_final'] ?? ''}
                                    onChange={e => updateGrade(s.id, 'exam_final', e.target.value)} />
                                </td>
                                <td className="p-1 text-center bg-green-50/50 border-r border-green-100">
                                  <input type="number" disabled={!editable} placeholder="-"
                                    className={`w-16 min-w-[64px] text-center p-2 text-base font-bold rounded border border-green-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white shadow-sm ${!editable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    value={currentSubject.grades[currentTrimester]?.[s.id]?.['project_final'] ?? ''}
                                    onChange={e => updateGrade(s.id, 'project_final', e.target.value)} />
                                </td>
                                <td className="p-2 text-center font-bold text-indigo-700 bg-indigo-50/50 border-r border-indigo-100">{st.wEx}</td>
                                <td className={`p-2 text-center font-bold text-white ${parseFloat(st.fin) < 7 ? 'bg-red-500' : 'bg-gray-800'}`}>{st.fin}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                    {currentSubject.students.length === 0 && <div className="text-center p-10 text-gray-400 italic">No hay estudiantes. {canEditGrades(currentSubject) ? 'Agrega una lista para comenzar.' : ''}</div>}
                  </div>
                </div>
              )}

              {/* TAB ASISTENCIA */}
              {activeTab === 'attendance' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-220px)]">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center sticky top-0 z-20">
                    <h3 className="font-bold flex items-center gap-2 text-gray-700"><Calendar className="text-indigo-600" /> Asistencia del Día: <span className="bg-white px-3 py-1 rounded border shadow-sm text-indigo-700">{today}</span></h3>
                    <button onClick={exportAttendanceCSV} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow transition"><Download size={16} /> Exportar Historial</button>
                  </div>
                  <div className="flex-1 overflow-auto p-4 space-y-3">
                    {(isRector || isAdmin) && (
                      <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><BarChart2 size={14} /> Resumen de Faltas</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {currentSubject.students.map(s => {
                            const totalAbsences = Object.values(currentSubject?.attendance?.[s.id] || {}).filter(v => v.status === 'A').length;
                            return (
                              <div key={s.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                                <span className="text-sm font-bold text-slate-700 truncate pr-2">{s.name}</span>
                                <span className={`text-xs font-black px-2 py-1 rounded-lg ${totalAbsences > 5 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{totalAbsences} Faltas</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {currentSubject.students.map((s, i) => {
                      const att = (currentSubject?.attendance?.[s.id] || {})[today] || { status: 'P', note: '' };
                      const editable = canEditGrades(currentSubject);
                      return (
                        <div key={s.id} className={`flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border border-gray-200 shadow-sm ${PALETTE[i % PALETTE.length]}`}>
                          <div className="md:w-1/3 min-w-[200px]">
                            <div className="font-bold text-gray-800 text-lg flex items-center gap-2">
                              {s.name}
                              <button onClick={() => setViewingStudentDetails(s)} className="text-indigo-500 hover:text-indigo-700 p-1"><Eye size={16} /></button>
                            </div>
                            <div className="text-xs text-gray-500 font-mono">Cód: {s.code}</div>
                          </div>
                          <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-lg border border-gray-200 shadow-sm">
                            <button disabled={!editable} onClick={() => updateAttendance(s.id, today, 'status', 'P')} className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${att.status === 'P' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:bg-gray-100'} ${!editable ? 'opacity-50' : ''}`}><CheckCircle size={16} /> Asistió</button>
                            <button disabled={!editable} onClick={() => updateAttendance(s.id, today, 'status', 'A')} className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${att.status === 'A' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:bg-gray-100'} ${!editable ? 'opacity-50' : ''}`}><XCircle size={16} /> Falta</button>
                          </div>
                          <div className="flex-1 relative">
                            <MessageSquare size={16} className="absolute top-3 left-3 text-gray-400" />
                            <input disabled={!editable}
                              className={`w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white/90 shadow-sm ${!editable ? 'opacity-50' : ''}`}
                              placeholder={!editable ? "Solo lectura" : "Observación..."}
                              value={att.note || ''}
                              onChange={e => updateAttendance(s.id, today, 'note', e.target.value)} />
                          </div>
                        </div>
                      );
                    })}
                    {currentSubject.students.length === 0 && <div className="text-center p-10 text-gray-400">Sin estudiantes.</div>}
                  </div>
                </div>
              )}

              {/* TAB COMUNICADOS */}
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
                        <h4 className="font-bold text-gray-800 text-lg mb-1">{ann.title}</h4>
                        <div className="text-xs text-gray-500 flex gap-2 mb-2">
                          <span className="bg-white px-2 py-0.5 rounded border shadow-sm">{ann.date}</span>
                          <span className={`px-2 py-0.5 rounded font-bold ${ann.recipient === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>{ann.recipient === 'all' ? 'Para: Todos' : `Para: ${ann.recipientName}`}</span>
                        </div>
                        <p className="text-gray-600 text-sm whitespace-pre-line">{ann.body}</p>
                      </div>
                    ))}
                    {(currentSubject.announcements || []).length === 0 && <div className="col-span-full text-center p-10 text-gray-400 italic bg-gray-50 rounded-lg border border-dashed border-gray-300">No hay comunicados publicados.</div>}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
              <BookOpen size={80} className="mb-6 opacity-20 text-indigo-300" />
              <p className="text-xl font-medium text-gray-600">Bienvenido, {currentUser?.name}</p>
              <p className="text-sm">Rol: <strong>{currentUser?.role}</strong>{currentUser?.tutoringCourse ? ` | Tutor de ${currentUser.tutoringCourse}` : ''}</p>
              <div className="mt-6 max-w-sm w-full">
                <div className="p-4 bg-white border rounded-xl text-left border-l-4 border-indigo-500">
                  <h4 className="font-bold text-gray-700 text-xs uppercase mb-1">Tu Acceso</h4>
                  <p className="text-sm text-gray-500">
                    {isDocente ? 'Edita las notas de TUS materias y ve las del curso si eres tutor.' :
                      isRector ? 'Visualiza todo el sistema (solo lectura) y envía comunicados.' :
                        'Gestiona personal, estándares, materias y comunicados.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: Historial de Asistencia Individual */}
      {viewingStudentDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <div><h3 className="text-xl font-bold text-gray-800">{viewingStudentDetails.name}</h3><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Historial de Asistencia</p></div>
              <button onClick={() => setViewingStudentDetails(null)}><X /></button>
            </div>
            <div className="overflow-y-auto pr-2 space-y-3">
              {Object.entries(currentSubject?.attendance?.[viewingStudentDetails.id] || {}).sort().reverse().map(([d, v]) => (
                <div key={d} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-center min-w-[80px]">
                    <div className="text-xs font-bold text-gray-400">{d.split('-')[0]}</div>
                    <div className="text-sm font-bold text-gray-700">{d.split('-').slice(1).join('/')}</div>
                  </div>
                  <div className="flex-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${v.status === 'P' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{v.status === 'P' ? 'Presente' : 'Ausente'}</span>
                    {v.note && <p className="text-xs text-gray-600 mt-1 italic border-l-2 border-indigo-200 pl-2">"{v.note}"</p>}
                  </div>
                </div>
              ))}
              {Object.keys(currentSubject?.attendance?.[viewingStudentDetails.id] || {}).length === 0 && <div className="text-center py-10 text-gray-400 italic">Sin registros.</div>}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setViewingStudentDetails(null)} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 transition">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Gestionar Asignatura */}
      {isAddingSubject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800">{isEditingSubject ? 'Editar Asignatura' : 'Nueva Asignatura'}</h3>

            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Curso y Paralelo</label>
            <div className="flex gap-2 mb-3">
              <select className="w-1/2 border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={newSubjectCourse}
                onChange={e => { setNewSubjectCourse(e.target.value); setNewParallel(''); setNewSubjectName(''); }}>
                <option value="">-- Curso --</option>
                {Object.keys(appSettings.courses || {}).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="w-1/2 border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={newParallel} onChange={e => setNewParallel(e.target.value)} disabled={!newSubjectCourse}>
                <option value="">-- Paralelo --</option>
                {getCourseParallels(newSubjectCourse).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Materia</label>
            <select className="w-full border border-gray-300 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} disabled={!newSubjectCourse}>
              <option value="">{newSubjectCourse ? '-- Seleccionar Materia --' : '-- Primero selecciona un curso --'}</option>
              {getCourseSubjects(newSubjectCourse).filter(s => s.trim()).map(s => <option key={s} value={s.trim()}>{s.trim()}</option>)}
            </select>

            {isAdmin && (
              <>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Docente Asignado</label>
                <select className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  value={newSubjectTeacher} onChange={e => setNewSubjectTeacher(e.target.value)}>
                  <option value="">-- Sin Asignar --</option>
                  {staff.filter(s => s.role === 'Docente').map(d => <option key={d.id} value={d.id}>{d.name}{d.tutoringCourse ? ` (Tutor ${d.tutoringCourse})` : ''}</option>)}
                </select>
              </>
            )}
            {isDocente && (
              <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-4">
                Se asignará automáticamente a: <strong>{currentUser.name}</strong>
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => { setIsAddingSubject(false); setIsEditingSubject(false); setNewSubjectName(''); setNewParallel(''); setNewSubjectCourse(''); setNewSubjectTeacher(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition font-bold">Cancelar</button>
              {isEditingSubject
                ? <button onClick={updateSubjectInfo} className="bg-slate-900 hover:bg-black text-white px-6 py-2 rounded-lg font-bold shadow transition">Guardar Cambios</button>
                : <button onClick={addSubject} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">Crear Asignatura</button>}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Inscribir Estudiantes */}
      {isAddingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-2 text-gray-800">Inscribir Estudiantes</h3>
            <p className="text-sm text-gray-500 mb-3">Copia y pega tu lista de Excel aquí (un nombre por línea).</p>
            <textarea className="border border-gray-300 w-full h-48 p-3 rounded-lg mb-4 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder={"Juan Perez\nMaria Lopez\nCarlos Ruiz"} value={newStudentList} onChange={e => setNewStudentList(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsAddingStudent(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
              <button onClick={addStudentsBulk} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">Procesar Lista</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nueva Actividad */}
      {isAddingActivity && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Nueva Actividad (Trimestre {currentTrimester})</h3>
            <input className="border border-gray-300 w-full p-3 rounded-lg mb-6 focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Nombre (ej. Lección 1)" value={newActivityName} onChange={e => setNewActivityName(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsAddingActivity(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
              <button onClick={addActivity} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Gestionar Personal */}
      {isManagingStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Gestionar Personal ({staff.length})</h3>
              <button onClick={() => setIsManagingStaff(false)}><X /></button>
            </div>
            {isAdmin && (
              <div className="bg-gray-50 p-4 rounded-xl mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="border p-2 rounded text-sm" placeholder="Nombre completo" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} />
                <input className="border p-2 rounded text-sm" placeholder="Contraseña de acceso" value={newStaffPass} onChange={e => setNewStaffPass(e.target.value)} />
                <input className="border p-2 rounded text-sm" placeholder="Correo institucional" value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)} />
                <select className="border p-2 rounded text-sm" value={newStaffRole} onChange={e => setNewStaffRole(e.target.value)}>
                  <option value="Docente">Docente</option>
                  <option value="Rector">Rector</option>
                  <option value="Administrativo">Administrativo</option>
                </select>
                <select className="border p-2 rounded text-sm" value={newStaffTutoring} onChange={e => setNewStaffTutoring(e.target.value)}>
                  <option value="">-- Sin Tutoría --</option>
                  {Object.keys(appSettings.courses || {}).flatMap(c => getCourseParallels(c).map(p => {
                    const label = `${c} ${p}`;
                    const already = staff.find(s => s.tutoringCourse === label);
                    return <option key={label} value={label} disabled={!!already}>{label}{already ? ` (${already.name})` : ''}</option>;
                  }))}
                </select>
                {newStaffRole === 'Administrativo' && (
                  <div className="md:col-span-2 bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-2">
                    <label className="flex items-center gap-2 font-bold text-sm text-emerald-400 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 accent-emerald-500" checked={newStaffAuth} onChange={e => setNewStaffAuth(e.target.checked)} />
                      Autorizado por Rector para modificar datos
                    </label>
                    <input className="border border-slate-600 p-3 rounded-lg text-sm w-full font-mono outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-900 text-white placeholder-slate-500"
                      placeholder="Clave de Seguridad" value={newStaffSecKey} onChange={e => setNewStaffSecKey(e.target.value)} />
                    <p className="text-xs text-slate-400 italic">Se pedirá cada vez que intente borrar registros.</p>
                  </div>
                )}
                <button onClick={addStaffMember} className="bg-indigo-600 text-white py-2 rounded-lg font-bold md:col-span-2 hover:bg-indigo-500 transition">Añadir al Sistema</button>
              </div>
            )}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Nombre</th>
                    <th className="p-2 text-left">Correo</th>
                    <th className="p-2 text-left">Rol</th>
                    <th className="p-2 text-left">Tutoría</th>
                    <th className="p-2 text-left">Clave</th>
                    {isAdmin && <th className="p-2" />}
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.id} className="border-b">
                      <td className="p-2 font-medium">{s.name}</td>
                      <td className="p-2 text-xs text-gray-500">{s.email || '-'}</td>
                      <td className="p-2"><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${s.role === 'Rector' ? 'bg-red-100 text-red-700' : s.role === 'Administrativo' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{s.role}</span></td>
                      <td className="p-2">{s.tutoringCourse || '-'}</td>
                      <td className="p-2 font-mono text-xs italic text-gray-400">{s.password}</td>
                      {isAdmin && <td className="p-2"><button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', s.id))} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo Comunicado */}
      {isAddingAnnouncement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Publicar Comunicado</h3>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destinatario</label>
            <select className="w-full border border-gray-300 rounded-lg p-2 mb-3 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
              value={newAnnounceRecipient} onChange={e => setNewAnnounceRecipient(e.target.value)}>
              <option value="all">📢 Todos los estudiantes</option>
              <optgroup label="Estudiante Específico">
                {currentSubject.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
            </select>
            <input className="border border-gray-300 w-full p-3 rounded-lg mb-3 focus:ring-2 focus:ring-orange-500 outline-none font-bold" placeholder="Título" value={newAnnounceTitle} onChange={e => setNewAnnounceTitle(e.target.value)} />
            <textarea className="border border-gray-300 w-full p-3 rounded-lg mb-4 h-24 focus:ring-2 focus:ring-orange-500 outline-none resize-none" placeholder="Mensaje..." value={newAnnounceBody} onChange={e => setNewAnnounceBody(e.target.value)} />
            <div className="flex gap-2 mb-6">
              {['info', 'event', 'urgent'].map(t => (
                <button key={t} onClick={() => setNewAnnounceType(t)} className={`flex-1 py-2 rounded-lg border text-sm font-bold ${newAnnounceType === t ? t === 'urgent' ? 'bg-red-100 border-red-400 text-red-700' : t === 'event' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-200 border-gray-400' : 'border-gray-200'}`}>
                  {t === 'info' ? 'Info' : t === 'event' ? 'Evento' : 'Urgente'}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsAddingAnnouncement(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
              <button onClick={addAnnouncement} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">Publicar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cambiar Contraseña */}
      {isChangingPass && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center gap-2 mb-4 text-indigo-700"><ShieldAlert size={24} /><h3 className="text-xl font-bold">Cambiar Contraseña</h3></div>
            <p className="text-sm text-gray-500 mb-4">Ingresa tu nueva contraseña de acceso.</p>
            <label className="text-xs font-bold text-gray-500 uppercase">Nueva Contraseña</label>
            <input className="border border-gray-300 w-full p-3 rounded-lg mb-6 focus:ring-2 focus:ring-indigo-500 outline-none" type="password" placeholder="Mínimo 4 caracteres" value={newPassInput} onChange={e => setNewPassInput(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setIsChangingPass(false); setOldPassInput(''); setNewPassInput(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
              <button onClick={handleChangePassword} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow transition">Actualizar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Seguridad */}
      {securityModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm border-t-4 border-red-500">
            <div className="flex items-center gap-3 text-red-600 mb-4"><AlertTriangle size={32} /><h3 className="font-bold text-xl">Advertencia</h3></div>
            <p className="text-gray-700 font-medium mb-6">{securityModal.message}</p>
            {securityModal.requiresKey && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Clave de Seguridad / Contraseña</label>
                <input type="password" value={securityKeyInput} onChange={e => setSecurityKeyInput(e.target.value)}
                  className="w-full border-2 border-red-200 focus:border-red-500 p-3 rounded-lg outline-none font-mono" placeholder="••••" autoFocus />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setSecurityModal({ isOpen: false }); setSecurityKeyInput(''); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold">Cancelar</button>
              <button onClick={confirmSecureAction} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold shadow">Sí, Continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cursos y Paralelos */}
      {isManagingCourses && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800"><BookOpen className="text-orange-500" /> Gestión Académica: Cursos y Materias</h3>
              <div className="flex items-center gap-4">
                <button onClick={() => saveSettings(appSettings)} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 shadow-lg active:scale-95 transition-all">Guardar Todo</button>
                <button onClick={() => setIsManagingCourses(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">Cerrar</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-3 gap-6 p-1">
              {/* Col 1: Cursos */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="font-bold mb-3">1. Crear Curso</h4>
                <div className="flex gap-2 mb-4">
                  <input className="flex-1 p-2 rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Ej. Octavo Básico" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} />
                  <button className="bg-orange-600 text-white px-4 rounded font-bold hover:bg-orange-700" onClick={() => {
                    if (!newCourseName) return;
                    const tree = { ...(appSettings.courses || {}) };
                    if (!tree[newCourseName]) tree[newCourseName] = { parallels: [], subjects: [] };
                    updateSettings({ ...appSettings, courses: tree });
                    setNewCourseName('');
                    logAudit("CREATE_COURSE", newCourseName, "Curso creado");
                  }}>Añadir</button>
                </div>
                <ul className="space-y-2">
                  {Object.keys(appSettings.courses || {}).map(c => (
                    <li key={c} className={`flex justify-between items-center p-3 bg-white rounded-lg border shadow-sm cursor-pointer transition ${selectedCourseForParallel === c ? 'border-orange-400 bg-orange-50' : 'hover:border-orange-300'}`} onClick={() => setSelectedCourseForParallel(c)}>
                      <span className="font-bold text-gray-700">{c}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-bold">{getCourseParallels(c).length} Paralelos</span>
                        <button onClick={e => {
                          e.stopPropagation(); runSecureAction("¿Eliminar este curso?", () => {
                            const tree = { ...appSettings.courses }; delete tree[c];
                            updateSettings({ ...appSettings, courses: tree });
                            if (selectedCourseForParallel === c) setSelectedCourseForParallel('');
                            logAudit("DELETE_COURSE", c, "Eliminado");
                          }, true);
                        }} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Col 2: Paralelos */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="font-bold mb-3">2. Paralelos en: <span className="text-orange-600">{selectedCourseForParallel || 'Ninguno'}</span></h4>
                {selectedCourseForParallel ? (
                  <>
                    <div className="flex gap-2 mb-4">
                      <input className="w-20 p-2 rounded border text-center font-bold text-xl uppercase focus:outline-none focus:ring-2 focus:ring-orange-400"
                        placeholder="A" value={newParallelName} onChange={e => setNewParallelName(e.target.value.toUpperCase())} maxLength={3} />
                      <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 rounded font-bold flex-1" onClick={() => {
                        if (!newParallelName) return;
                        const tree = { ...appSettings.courses };
                        const cData = tree[selectedCourseForParallel];
                        const parallels = Array.isArray(cData) ? cData : (cData?.parallels || []);
                        if (!parallels.includes(newParallelName)) {
                          tree[selectedCourseForParallel] = Array.isArray(cData) ? { parallels: [...parallels, newParallelName].sort(), subjects: [] } : { ...cData, parallels: [...parallels, newParallelName].sort() };
                          updateSettings({ ...appSettings, courses: tree });
                          logAudit("CREATE_PARALLEL", newParallelName, "En " + selectedCourseForParallel);
                        }
                        setNewParallelName('');
                      }}>Añadir Paralelo</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getCourseParallels(selectedCourseForParallel).map(p => (
                        <div key={p} className="bg-white border-2 border-orange-200 px-4 py-2 rounded-xl text-lg font-black text-orange-800 flex items-center gap-3 shadow-sm">
                          {p}
                          <button onClick={() => runSecureAction("¿Eliminar este paralelo?", () => {
                            const tree = { ...appSettings.courses };
                            const cData = tree[selectedCourseForParallel];
                            const parallels = (Array.isArray(cData) ? cData : (cData?.parallels || [])).filter(x => x !== p);
                            tree[selectedCourseForParallel] = Array.isArray(cData) ? parallels : { ...cData, parallels };
                            updateSettings({ ...appSettings, courses: tree });
                            logAudit("DELETE_PARALLEL", p, "De " + selectedCourseForParallel);
                          }, true)} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="text-center text-gray-400 mt-10 p-6 bg-white rounded-xl border border-dashed">Haz clic en un curso para gestionar sus paralelos</div>}
              </div>

              {/* Col 3: Materias */}
              <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 flex flex-col">
                <h4 className="font-black text-slate-800 mb-1 flex items-center gap-2"><Settings size={18} className="text-indigo-500" /> 3. Materias del Curso</h4>
                {selectedCourseForParallel ? (
                  <>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">Materias para <strong>{selectedCourseForParallel}</strong> — una por línea</p>
                    <textarea className="flex-1 w-full border border-slate-300 rounded-2xl p-4 bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm resize-none shadow-inner min-h-[200px]"
                      placeholder={"Matemáticas\nLenguaje\nHistoria"}
                      value={getCourseSubjects(selectedCourseForParallel).join('\n')}
                      onChange={e => {
                        const subjects = e.target.value.split('\n');
                        const tree = { ...appSettings.courses };
                        const cData = tree[selectedCourseForParallel];
                        const parallels = Array.isArray(cData) ? cData : (cData?.parallels || []);
                        tree[selectedCourseForParallel] = { ...(Array.isArray(cData) ? { parallels } : cData), subjects };
                        setAppSettings({ ...appSettings, courses: tree });
                      }} />
                  </>
                ) : <div className="text-center text-gray-400 mt-10 p-6 bg-white rounded-xl border border-dashed">Selecciona un curso para ver sus materias</div>}
                <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-medium italic">Estas materias aparecerán al crear una asignatura para este nivel.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Años Lectivos */}
      {showYearManager && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="text-violet-500" /> Gestión de Años Lectivos
                </h3>
                <p className="text-xs text-slate-400 mt-1">Año activo: <strong className="text-indigo-600">{appSettings.schoolYear || 'No definido'}</strong></p>
              </div>
              <button onClick={() => setShowYearManager(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
            </div>

            {/* Crear nuevo año */}
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 mb-6">
              <h4 className="font-black text-violet-800 text-sm uppercase tracking-widest mb-1 flex items-center gap-2">
                <Plus size={16} /> Iniciar Nuevo Año Lectivo
              </h4>
              <p className="text-xs text-violet-600 mb-4">
                El año actual (<strong>{appSettings.schoolYear || 'sin nombre'}</strong>) será archivado con todas sus notas y asistencia.
                El nuevo año iniciará en blanco, sin materias ni estudiantes.
              </p>
              <input
                className="w-full border-2 border-violet-200 rounded-xl p-3 mb-3 focus:border-violet-500 outline-none font-bold text-slate-800 bg-white"
                placeholder="Nombre del nuevo año (ej. 2025 – 2026)"
                value={newYearName}
                onChange={e => setNewYearName(e.target.value)} />
              <label className="flex items-start gap-3 cursor-pointer mb-4 bg-white border border-violet-200 rounded-xl p-4">
                <input type="checkbox" className="mt-0.5 w-5 h-5 accent-violet-600 flex-shrink-0"
                  checked={newYearConfirm} onChange={e => setNewYearConfirm(e.target.checked)} />
                <span className="text-sm text-slate-700 font-medium">
                  Entiendo que esto archivará el año actual y eliminará todas las asignaturas activas. El nuevo año iniciará completamente en blanco. El personal se conserva.
                </span>
              </label>
              <button
                onClick={createNewSchoolYear}
                disabled={!newYearName.trim() || !newYearConfirm}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-black shadow-lg shadow-violet-600/20 transition active:scale-95">
                Archivar Año Actual e Iniciar Nuevo
              </button>
            </div>

            {/* Historial de años archivados */}
            <div className="flex-1 overflow-auto">
              <h4 className="font-black text-slate-500 text-xs uppercase tracking-widest mb-3">Años Lectivos Archivados ({schoolYears.length})</h4>
              {schoolYears.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Clock size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-bold">No hay años archivados aún.</p>
                  <p className="text-xs mt-1">Cuando inicies un nuevo año lectivo, el actual se guardará aquí.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {schoolYears.map(yr => (
                    <div key={yr.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center hover:border-violet-200 transition-colors">
                      <div>
                        <div className="font-black text-slate-700">{yr.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Archivado: {yr.createdAt ? new Date(yr.createdAt).toLocaleDateString() : '—'}
                          {' · '}{(yr.subjects || []).length} asignaturas
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingArchivedYear(yr)}
                          className="text-xs bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                          <Eye size={12} /> Ver Notas
                        </button>
                        <button
                          onClick={() => runSecureAction(`¿Eliminar el archivo del año "${yr.name}"? Esta acción no se puede deshacer.`, async () => {
                            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schoolYears', yr.id));
                            logAudit("DELETE_YEAR", yr.id, `Año ${yr.name} eliminado`);
                          })}
                          className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* MODAL: Ver Año Archivado */}
      {viewingArchivedYear && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="text-violet-500" /> Archivo: {viewingArchivedYear.name}
                </h3>
                {viewingArchivedSubject && (
                  <p className="text-sm font-bold text-indigo-600 mt-1">
                    Materia: {viewingArchivedSubject.name} ({viewingArchivedSubject.parallel})
                  </p>
                )}
              </div>
              <button onClick={() => {
                if (viewingArchivedSubject) setViewingArchivedSubject(null);
                else setViewingArchivedYear(null);
              }} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
            </div>

            <div className="flex-1 overflow-auto">
              {!viewingArchivedSubject ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(viewingArchivedYear.subjects || []).map(sub => (
                    <button key={sub.id} onClick={() => setViewingArchivedSubject(sub)}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left hover:border-violet-300 hover:shadow-md transition">
                      <div className="font-black text-slate-700">{sub.name}</div>
                      <div className="text-xs font-bold text-indigo-600 mb-2">{sub.parallel}</div>
                      <div className="text-[10px] text-slate-400">{sub.students?.length || 0} estudiantes registrados</div>
                      <div className="mt-3 text-xs bg-white border border-slate-200 text-center py-1.5 rounded-lg font-bold text-slate-600">
                        Ver Notas Anuales
                      </div>
                    </button>
                  ))}
                  {(viewingArchivedYear.subjects || []).length === 0 && (
                    <p className="text-slate-500 italic col-span-full">No hay materias en este archivo.</p>
                  )}
                </div>
              ) : (() => {
                const annualStudents = (viewingArchivedSubject.students || []).map(s => {
                  const s1 = calculateStats(viewingArchivedSubject, 1, s.id);
                  const s2 = calculateStats(viewingArchivedSubject, 2, s.id);
                  const s3 = calculateStats(viewingArchivedSubject, 3, s.id);
                  const sum = (parseFloat(s1.fin) || 0) + (parseFloat(s2.fin) || 0) + (parseFloat(s3.fin) || 0);
                  return { s, s1, s2, s3, sum };
                }).sort((a, b) => b.sum - a.sum);
                const sortedSums = [...new Set(annualStudents.map(x => x.sum))].sort((a, b) => b - a);

                return (
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-4 w-10 text-center font-bold border-b border-gray-300">#</th>
                        <th className="p-4 min-w-[200px] font-bold border-b border-gray-300 border-r">Estudiante</th>
                        <th className="p-4 text-center font-bold border-b border-gray-300 border-r w-24">1º Trim</th>
                        <th className="p-4 text-center font-bold border-b border-gray-300 border-r w-24">2º Trim</th>
                        <th className="p-4 text-center font-bold border-b border-gray-300 border-r w-24">3º Trim</th>
                        <th className="p-4 text-center font-bold border-b border-gray-300 border-r w-28 bg-indigo-50 text-indigo-900">Suma</th>
                        <th className="p-4 text-center font-bold border-b border-gray-300">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {annualStudents.map((data, i) => {
                        const rank = sortedSums.indexOf(data.sum);
                        const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '';
                        const isPassing = data.sum >= 21;
                        return (
                          <tr key={data.s.id} className={`border-b border-gray-100 hover:brightness-95 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                            <td className="p-4 text-center text-gray-400 font-mono text-xs">{i + 1}</td>
                            <td className="p-4 font-bold text-gray-800 border-r border-gray-200/50">
                              {medal && <span className="text-xl mr-2">{medal}</span>}{data.s.name}
                            </td>
                            <td className="p-4 border-r border-gray-200/50 text-center font-bold text-gray-700">{data.s1.fin}</td>
                            <td className="p-4 border-r border-gray-200/50 text-center font-bold text-gray-700">{data.s2.fin}</td>
                            <td className="p-4 border-r border-gray-200/50 text-center font-bold text-gray-700">{data.s3.fin}</td>
                            <td className="p-4 border-r border-gray-200/50 text-center font-black text-xl bg-indigo-50/50 text-indigo-700">{data.sum.toFixed(2)}</td>
                            <td className="p-4 text-center font-bold">
                              {isPassing
                                ? <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] uppercase font-black border border-green-200">Aprobado</span>
                                : <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] uppercase font-black border border-red-200">Supletorio</span>}
                            </td>
                          </tr>
                        );
                      })}
                      {annualStudents.length === 0 && (
                        <tr><td colSpan="7" className="p-4 text-center text-gray-500 italic">No hay estudiantes en esta materia.</td></tr>
                      )}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {/* MODAL: Vista de Perfil para Docente */}
      {viewingProfileCode && (() => {
        const profile = parentProfiles[viewingProfileCode]?.formData;
        const studentName = currentSubject?.students.find(s => s.code === viewingProfileCode)?.name || "Estudiante";
        
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{studentName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-indigo-600 font-bold text-[10px] bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-widest">CÓDIGO: {viewingProfileCode}</span>
                    <span className="text-slate-400 font-bold text-[10px] bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-widest">Ficha de Datos</span>
                  </div>
                </div>
                <button onClick={() => setViewingProfileCode(null)} className="p-3 hover:bg-slate-100 rounded-full transition shadow-sm text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>

              {!profile ? (
                <div className="flex-1 p-20 text-center flex flex-col items-center justify-center">
                  <div className="bg-amber-50 text-amber-600 p-10 rounded-[2.5rem] border border-amber-100 shadow-inner">
                    <div className="bg-white p-4 rounded-full inline-block mb-6 shadow-sm"><User size={48} className="opacity-40" /></div>
                    <h4 className="text-lg font-black mb-2 uppercase tracking-tight">Sin Registro</h4>
                    <p className="font-medium text-sm text-amber-700/60 max-w-xs mx-auto italic">Este estudiante aún no ha completado el registro de su perfil en el portal de padres.</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                  {/* Datos Estudiante */}
                  <section>
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                      <div className="h-px w-8 bg-indigo-200" /> Datos del Estudiante
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cédula Identidad</div>
                        <div className="font-black text-slate-800 text-lg">{profile.studentCedula || '-'}</div>
                      </div>
                      <div className="bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Grupo Sanguíneo</div>
                        <div className="font-black text-red-600 text-lg">{profile.studentBloodType || '-'}</div>
                      </div>
                      <div className="bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nacimiento</div>
                        <div className="font-black text-slate-800 text-lg">{profile.studentBirthDate || '-'}</div>
                      </div>
                      <div className="bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Teléfono</div>
                        <div className="font-black text-slate-800">{profile.studentPhone || '-'}</div>
                      </div>
                      <div className="md:col-span-2 bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Domicilio Actual</div>
                        <div className="font-bold text-slate-800 text-sm">{profile.studentAddress || '-'}</div>
                      </div>
                      <div className="md:col-span-3 bg-indigo-50/40 p-6 rounded-[2rem] border border-indigo-100/50">
                        <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Bug size={14} /> Observaciones Médicas / Alergias</div>
                        <div className="text-sm text-slate-600 font-medium whitespace-pre-line leading-relaxed">{profile.studentNotes || 'Sin información médica adicional.'}</div>
                      </div>
                    </div>
                  </section>

                  {/* Representantes */}
                  <section>
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                      <div className="h-px w-8 bg-emerald-200" /> Contactos de Emergencia
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {[profile.representante1, profile.representante2].map((rep, idx) => (
                        <div key={idx} className={`p-8 rounded-[2.5rem] border transition-all duration-300 ${idx === 0 ? 'bg-white border-indigo-100 shadow-xl shadow-indigo-500/5' : 'bg-slate-50/50 border-slate-100 opacity-90'}`}>
                          <div className="flex justify-between items-start mb-6">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${idx === 0 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-400 text-white'}`}>
                              {idx === 0 ? 'Representante Primario' : 'Representante Secundario'}
                            </span>
                            {idx === 1 && !rep?.name && <span className="text-[9px] font-bold text-slate-400 italic">No registrado</span>}
                          </div>
                          
                          {rep?.name ? (
                            <div className="space-y-4">
                              <div>
                                <div className="text-xl font-black text-slate-900 leading-tight mb-1">{rep.name}</div>
                                <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{rep.relation}</div>
                              </div>
                              <div className="h-px bg-slate-100 w-full" />
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                  <div className="text-[8px] font-black text-slate-400 uppercase mb-0.5">ID / Cédula</div>
                                  <div className="text-xs font-black text-slate-700">{rep.cedula}</div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                  <div className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Celular</div>
                                  <div className="text-xs font-black text-slate-700">{rep.phone}</div>
                                </div>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <div className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Email Contacto</div>
                                <div className="text-xs font-black text-indigo-600 break-all">{rep.email}</div>
                              </div>
                            </div>
                          ) : idx === 0 ? (
                            <div className="text-slate-400 italic text-sm py-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">Datos no disponibles</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}
              
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button onClick={() => setViewingProfileCode(null)} 
                  className="bg-slate-900 hover:bg-black text-white px-12 py-4 rounded-[1.5rem] font-black transition shadow-xl active:scale-95">
                  Cerrar Ficha
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
