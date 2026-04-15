import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCjlHnUb4CPnuut3KJfJwlfVjRWFXnGlDg",
  authDomain: "tution-update1.firebaseapp.com",
  projectId: "tution-update1",
  storageBucket: "tution-update1.firebasestorage.app",
  messagingSenderId: "955451162351",
  appId: "1:955451162351:web:ad2a3fd79ef6bb90ea651a"
};

const COLLECTIONS = {
  students: "students",
  schedules: "schedules"
};

const isConfigured = Object.values(firebaseConfig).every(
  (value) => value && !String(value).startsWith("PASTE_YOUR_")
);

let db = null;
let auth = null;

if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

function ensureConfigured() {
  if (!db || !auth) {
    throw new Error("Firebase config missing in firebase-api.js");
  }
}

export function isFirebaseReady() {
  return Boolean(db && auth);
}

export function watchTeacherAuthState(callback) {
  ensureConfigured();
  return onAuthStateChanged(auth, callback);
}

export async function signInTeacher(email, password) {
  ensureConfigured();
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function signOutTeacher() {
  ensureConfigured();
  await signOut(auth);
}

export async function getStudents() {
  ensureConfigured();
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.students), orderBy("createdAt", "asc")));
  return snapshot.docs.map((studentDoc) => ({
    firestoreId: studentDoc.id,
    ...studentDoc.data()
  }));
}

export async function addStudentRecord(student) {
  ensureConfigured();
  const duplicateQuery = query(collection(db, COLLECTIONS.students), where("id", "==", student.id));
  const duplicateSnapshot = await getDocs(duplicateQuery);

  if (!duplicateSnapshot.empty) {
    throw new Error("Student ID already exists in Firestore");
  }

  const docRef = await addDoc(collection(db, COLLECTIONS.students), {
    ...student,
    createdAt: serverTimestamp()
  });

  return docRef.id;
}

export async function deleteStudentRecord(firestoreId) {
  ensureConfigured();
  await deleteDoc(doc(db, COLLECTIONS.students, firestoreId));
}

export async function updateStudentRecord(firestoreId, student) {
  ensureConfigured();
  await updateDoc(doc(db, COLLECTIONS.students, firestoreId), {
    ...student,
    updatedAt: serverTimestamp()
  });
}

export async function getSchedules() {
  ensureConfigured();
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.schedules), orderBy("createdAt", "asc")));
  return snapshot.docs.map((scheduleDoc) => ({
    firestoreId: scheduleDoc.id,
    ...scheduleDoc.data()
  }));
}

export async function addScheduleRecord(schedule) {
  ensureConfigured();
  const docRef = await addDoc(collection(db, COLLECTIONS.schedules), {
    ...schedule,
    createdAt: serverTimestamp()
  });

  return docRef.id;
}

export async function deleteScheduleRecord(firestoreId) {
  ensureConfigured();
  await deleteDoc(doc(db, COLLECTIONS.schedules, firestoreId));
}

export async function updateScheduleRecord(firestoreId, schedule) {
  ensureConfigured();
  await updateDoc(doc(db, COLLECTIONS.schedules, firestoreId), {
    ...schedule,
    updatedAt: serverTimestamp()
  });
}
