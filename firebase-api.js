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
  schedules: "schedules",
  teacherProfiles: "teacherProfiles",
  attendanceHistory: "attendanceHistory",
  homework: "homework"
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
  const snapshot = await getDocs(collection(db, COLLECTIONS.students));
  return sortByCreatedAtAsc(snapshot.docs.map((studentDoc) => ({
    firestoreId: studentDoc.id,
    ...studentDoc.data()
  })));
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
  const snapshot = await getDocs(collection(db, COLLECTIONS.schedules));
  return sortByCreatedAtAsc(snapshot.docs.map((scheduleDoc) => ({
    firestoreId: scheduleDoc.id,
    ...scheduleDoc.data()
  })));
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

export async function getTeacherProfile() {
  ensureConfigured();
  const teacherProfileRef = doc(db, COLLECTIONS.teacherProfiles, "primary");
  const snapshot = await getDocSafe(teacherProfileRef);
  if (!snapshot.exists()) {
    return null;
  }

  return {
    firestoreId: snapshot.id,
    ...snapshot.data()
  };
}

export async function updateTeacherProfile(profile) {
  ensureConfigured();
  const teacherProfileRef = doc(db, COLLECTIONS.teacherProfiles, "primary");
  await updateDocSafe(teacherProfileRef, {
    ...profile,
    updatedAt: serverTimestamp()
  });
}

async function getDocSafe(ref) {
  const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  return getDoc(ref);
}

async function updateDocSafe(ref, data) {
  const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  await setDoc(ref, data, { merge: true });
}

// Attendance History Functions
export async function getAttendanceHistory(studentId) {
  ensureConfigured();
  const requestedStudentId = String(studentId || "").trim();
  const normalizedStudentId = String(studentId || "").trim().toLowerCase();
  const attendanceQuery = query(
    collection(db, COLLECTIONS.attendanceHistory),
    where("studentIdNormalized", "==", normalizedStudentId)
  );
  const snapshot = await getDocs(attendanceQuery);
  const recordsById = new Map(snapshot.docs.map((doc) => [doc.id, {
    firestoreId: doc.id,
    ...doc.data()
  }]));

  if (requestedStudentId) {
    const legacyQuery = query(
      collection(db, COLLECTIONS.attendanceHistory),
      where("studentId", "==", requestedStudentId)
    );
    const legacySnapshot = await getDocs(legacyQuery);
    legacySnapshot.docs.forEach((doc) => {
      recordsById.set(doc.id, {
        firestoreId: doc.id,
        ...doc.data()
      });
    });
  }

  const records = Array.from(recordsById.values());
  records.sort((firstRecord, secondRecord) => String(secondRecord.date || "").localeCompare(String(firstRecord.date || "")));
  return records;
}

export async function addAttendanceRecord(attendanceData) {
  ensureConfigured();
  const studentId = String(attendanceData.studentId || "").trim();
  const docRef = await addDoc(collection(db, COLLECTIONS.attendanceHistory), {
    ...attendanceData,
    studentId,
    studentIdNormalized: studentId.toLowerCase(),
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function setAttendanceRecordForDate(attendanceData) {
  ensureConfigured();
  const studentId = String(attendanceData.studentId || "").trim();
  const normalizedStudentId = studentId.toLowerCase();
  const safeStudentId = encodeURIComponent(normalizedStudentId);
  const safeDate = encodeURIComponent(String(attendanceData.date || ""));
  const attendanceRef = doc(db, COLLECTIONS.attendanceHistory, `${safeStudentId}_${safeDate}`);
  await updateDocSafe(attendanceRef, {
    ...attendanceData,
    studentId,
    studentIdNormalized: normalizedStudentId,
    updatedAt: serverTimestamp()
  });
  return attendanceRef.id;
}

export async function deleteAttendanceHistoryOlderThan(cutoffDate) {
  ensureConfigured();
  const attendanceQuery = query(
    collection(db, COLLECTIONS.attendanceHistory),
    where("date", "<", cutoffDate)
  );
  const snapshot = await getDocs(attendanceQuery);
  await Promise.all(snapshot.docs.map((attendanceDoc) => deleteDoc(attendanceDoc.ref)));
  return snapshot.size;
}

export async function getAttendanceHistoryByDateRange(studentId, startDate, endDate) {
  ensureConfigured();
  const attendanceQuery = query(
    collection(db, COLLECTIONS.attendanceHistory),
    where("studentId", "==", studentId),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc")
  );
  const snapshot = await getDocs(attendanceQuery);
  return snapshot.docs.map((doc) => ({
    firestoreId: doc.id,
    ...doc.data()
  }));
}

// Homework Functions
export async function addHomeworkRecord(homework) {
  ensureConfigured();
  const docRef = await addDoc(collection(db, COLLECTIONS.homework), {
    ...homework,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function getHomeworkByStudent(studentId) {
  ensureConfigured();
  const normalizedStudentId = String(studentId || "").trim().toLowerCase();
  const homeworkQuery = query(
    collection(db, COLLECTIONS.homework),
    where("studentIdNormalized", "==", normalizedStudentId)
  );
  const snapshot = await getDocs(homeworkQuery);
  return sortByCreatedAtDesc(snapshot.docs.map((doc) => ({
    firestoreId: doc.id,
    ...doc.data()
  })));
}

export async function getAllHomework() {
  ensureConfigured();
  const snapshot = await getDocs(collection(db, COLLECTIONS.homework));
  return sortByCreatedAtDesc(snapshot.docs.map((doc) => ({
    firestoreId: doc.id,
    ...doc.data()
  })));
}

export async function updateHomeworkRecord(firestoreId, homework) {
  ensureConfigured();
  await updateDoc(doc(db, COLLECTIONS.homework, firestoreId), {
    ...homework,
    updatedAt: serverTimestamp()
  });
}

export async function deleteHomeworkRecord(firestoreId) {
  ensureConfigured();
  await deleteDoc(doc(db, COLLECTIONS.homework, firestoreId));
}

function sortByCreatedAtAsc(records) {
  return [...records].sort((firstRecord, secondRecord) => {
    return getCreatedAtMillis(firstRecord) - getCreatedAtMillis(secondRecord);
  });
}

function sortByCreatedAtDesc(records) {
  return [...records].sort((firstRecord, secondRecord) => {
    return getCreatedAtMillis(secondRecord) - getCreatedAtMillis(firstRecord);
  });
}

function getCreatedAtMillis(record) {
  const createdAt = record?.createdAt;
  if (createdAt && typeof createdAt.toMillis === "function") {
    return createdAt.toMillis();
  }

  if (createdAt?.seconds) {
    return Number(createdAt.seconds) * 1000;
  }

  const parsedDate = Date.parse(createdAt || record?.assignedDate || record?.date || "");
  return Number.isNaN(parsedDate) ? 0 : parsedDate;
}
