import {
  addScheduleRecord,
  addStudentRecord,
  deleteScheduleRecord,
  deleteStudentRecord,
  getSchedules,
  getStudents,
  isFirebaseReady,
  signInTeacher,
  signOutTeacher,
  updateScheduleRecord,
  updateStudentRecord,
  watchTeacherAuthState
} from "./firebase-api.js";

let students = [];
let schedules = [];
let editingStudentIndex = null;

const username = document.getElementById("username");
const password = document.getElementById("password");
const studentId = document.getElementById("studentId");
const studentName = document.getElementById("studentName");
const studentList = document.getElementById("studentList");
const classDate = document.getElementById("classDate");
const classTime = document.getElementById("classTime");
const classDay = document.getElementById("classDay");
const studentCheckList = document.getElementById("studentCheckList");
const scheduleList = document.getElementById("scheduleList");
const loginStudentId = document.getElementById("loginStudentId");
const studentData = document.getElementById("studentData");
const whatsappMsg = document.getElementById("whatsappMsg");
const feePending = document.getElementById("feePending");
const studentSubmitBtn = document.getElementById("studentSubmitBtn");
const studentCancelBtn = document.getElementById("studentCancelBtn");

const FIREBASE_WARNING = "Firebase config missing. Open firebase-api.js and paste your Firebase web app config.";
const RESET_STUDENT_IDS = ["81", "82", "7"];
const INITIAL_STUDENTS = [
  { id: "101", name: "Anushak Kumari", feePending: false },
  { id: "9", name: "Rahul Kumar", feePending: false },
  { id: "102", name: "Abhishek Francis", feePending: false },
  { id: "81", name: "Saket Kumar", feePending: false },
  { id: "82", name: "Ashwin Kumar", feePending: false },
  { id: "7", name: "Arpit Kumar", feePending: false }
];

window.teacherLogin = teacherLogin;
window.showStudentPage = showStudentPage;
window.logout = logout;
window.addStudent = addStudent;
window.deleteStudent = deleteStudent;
window.editStudent = editStudent;
window.cancelStudentEdit = cancelStudentEdit;
window.saveSchedule = saveSchedule;
window.deleteSchedule = deleteSchedule;
window.loadStudentData = loadStudentData;
window.sendWhatsApp = sendWhatsApp;

initializeScheduleDefaults();
initializeAppData();

async function initializeAppData() {
  if (!isFirebaseReady()) {
    console.warn(FIREBASE_WARNING);
    return;
  }

  try {
    initializeTeacherAuth();
    await refreshFirestoreData();
    await resetSpecificStudents();
    await seedInitialStudents();
  } catch (error) {
    console.error(error);
    alert("Unable to load Firestore data. Check your Firebase config and Firestore rules.");
  }
}

function showPage(id) {
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

async function teacherLogin() {
  const u = username.value.trim();
  const p = password.value.trim();

  if (!u || !p) {
    alert("Enter teacher email and password");
    return;
  }

  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  try {
    await signInTeacher(u, p);
    await refreshFirestoreData();
    showPage("teacherPage");
  } catch (error) {
    console.error(error);
    alert("Teacher login failed. Check Firebase Authentication email/password credentials.");
  }
}

function showStudentPage() {
  showPage("studentPage");
}

function logout() {
  if (!isFirebaseReady()) {
    showPage("loginPage");
    return;
  }

  signOutTeacher()
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      showPage("loginPage");
    });
}

async function addStudent() {
  const id = studentId.value.trim();
  const name = studentName.value.trim();
  const fee = feePending.checked;

  if (!id || !name) {
    alert("Enter Student ID and Name");
    return;
  }

  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  try {
    if (editingStudentIndex !== null) {
      await saveStudentUpdate(editingStudentIndex, { id, name, feePending: fee });
    } else {
      if (students.find((student) => student.id === id)) {
        alert("Student ID already exists");
        return;
      }

      const firestoreId = await addStudentRecord({ id, name, feePending: fee });
      students.push({ firestoreId, id, name, feePending: fee });
    }

    showStudents();
    showStudentCheckList();
    resetStudentForm();
  } catch (error) {
    console.error(error);
    alert(error.message || "Unable to save student to Firestore");
  }
}

function showStudents() {
  studentList.innerHTML = "";
  students.forEach((student, index) => {
    studentList.innerHTML += `
      <div class="box">
        ${student.name} (ID:${student.id})<br>
        Fee Status: <strong>${student.feePending ? "Pending" : "Clear"}</strong>
        <div class="box-actions">
          <button class="ghost-btn" onclick="editStudent(${index})">Edit</button>
          <button class="delete" onclick="deleteStudent(${index})">Remove</button>
        </div>
      </div>
    `;
  });
}

async function deleteStudent(index) {
  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  try {
    await deleteStudentRecord(students[index].firestoreId);
    students.splice(index, 1);
    if (editingStudentIndex === index) {
      resetStudentForm();
    } else if (editingStudentIndex !== null && editingStudentIndex > index) {
      editingStudentIndex -= 1;
    }
    showStudents();
    showStudentCheckList();
  } catch (error) {
    console.error(error);
    alert("Unable to delete student from Firestore");
  }
}

function showStudentCheckList() {
  studentCheckList.innerHTML = "";
  students.forEach((student, index) => {
    studentCheckList.innerHTML += `
      <label>
        <input type="checkbox" id="student_${index}" value="${index}">
        ${student.name} (ID:${student.id}) ${student.feePending ? "(Pending)" : ""}
      </label>
    `;
  });
}

function editStudent(index) {
  const student = students[index];
  editingStudentIndex = index;
  studentId.value = student.id;
  studentName.value = student.name;
  feePending.checked = student.feePending;
  studentSubmitBtn.textContent = "Update Student";
  studentCancelBtn.style.display = "block";
  studentId.focus();
}

function cancelStudentEdit() {
  resetStudentForm();
}

async function saveSchedule() {
  const date = classDate.value;
  const time = classTime.value;
  const day = classDay.value;

  if (!date || !time || !day) {
    alert("Fill Date, Time, and Day");
    return;
  }

  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  const selectedStudents = [];
  students.forEach((student, index) => {
    const checkbox = document.getElementById(`student_${index}`);
    if (checkbox && checkbox.checked) {
      selectedStudents.push(student);
    }
  });

  if (selectedStudents.length === 0) {
    alert("Select at least one student for the class");
    return;
  }

  const schedulePayload = {
    date,
    time,
    day,
    students: selectedStudents.map(({ firestoreId, ...student }) => student)
  };

  try {
    const firestoreId = await addScheduleRecord(schedulePayload);
    schedules.push({ firestoreId, ...schedulePayload });
    loadSchedules();
    setScheduleFieldsToDate(new Date());
    classTime.value = "";
    showStudentCheckList();
  } catch (error) {
    console.error(error);
    alert("Unable to save schedule to Firestore");
  }
}

function loadSchedules() {
  scheduleList.innerHTML = "";
  schedules.forEach((schedule, index) => {
    scheduleList.innerHTML += `
      <div class="box">
        <strong>Date:</strong> ${schedule.date}<br>
        <strong>Time:</strong> ${formatTime12Hour(schedule.time)}<br>
        <strong>Day:</strong> ${schedule.day}<br>
        <strong>Students:</strong><br>
        ${schedule.students.map((student) => `- ${student.name} (${student.id}) ${student.feePending ? "Pending" : ""}`).join("<br>")}
        <br><button class="delete" onclick="deleteSchedule(${index})" style="margin-top:10px;">Delete Class</button>
      </div>
    `;
  });
}

async function deleteSchedule(index) {
  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  try {
    await deleteScheduleRecord(schedules[index].firestoreId);
    schedules.splice(index, 1);
    loadSchedules();
  } catch (error) {
    console.error(error);
    alert("Unable to delete schedule from Firestore");
  }
}

function loadStudentData() {
  const id = loginStudentId.value.trim();
  studentData.innerHTML = "";

  let found = false;

  schedules.forEach((schedule) => {
    schedule.students.forEach((student) => {
      if (student.id === id) {
        found = true;
        studentData.innerHTML += `
          <div class="box">
            <strong>Name:</strong> ${student.name}<br>
            <strong>Class Date:</strong> ${schedule.date}<br>
            <strong>Class Time:</strong> ${formatTime12Hour(schedule.time)}<br>
            <strong>Day:</strong> ${schedule.day}<br>
            <strong>Fee Status:</strong> ${student.feePending ? '<span style="color:red;">Pending</span>' : "Clear"}
          </div>
        `;
      }
    });
  });

  if (!found) {
    studentData.innerHTML = "<strong>No record found</strong>";
  }
}

function sendWhatsApp() {
  const msg = whatsappMsg.value.trim();
  if (!msg) {
    alert("Write message");
    return;
  }

  const url = "https://wa.me/8864022272?text=" + encodeURIComponent(msg);
  window.open(url, "_blank");
}

async function refreshFirestoreData() {
  students = await getStudents();
  schedules = await getSchedules();
  showStudents();
  showStudentCheckList();
  loadSchedules();
}

async function seedInitialStudents() {
  let hasInserted = false;

  for (const student of INITIAL_STUDENTS) {
    const alreadyExists = students.some((existingStudent) => existingStudent.id === student.id);

    if (alreadyExists) {
      continue;
    }

    try {
      const firestoreId = await addStudentRecord(student);
      students.push({ firestoreId, ...student });
      hasInserted = true;
    } catch (error) {
      if (error.message !== "Student ID already exists in Firestore") {
        throw error;
      }
    }
  }

  if (hasInserted) {
    showStudents();
    showStudentCheckList();
    loadSchedules();
  }
}

async function resetSpecificStudents() {
  let hasDeleted = false;

  for (const student of [...students]) {
    if (!RESET_STUDENT_IDS.includes(student.id)) {
      continue;
    }

    await deleteStudentRecord(student.firestoreId);
    students = students.filter((existingStudent) => existingStudent.firestoreId !== student.firestoreId);
    hasDeleted = true;
  }

  if (hasDeleted) {
    showStudents();
    showStudentCheckList();
  }
}

function resetStudentForm() {
  editingStudentIndex = null;
  studentId.value = "";
  studentName.value = "";
  feePending.checked = false;
  studentSubmitBtn.textContent = "Add Student";
  studentCancelBtn.style.display = "none";
}

async function saveStudentUpdate(index, updatedStudent) {
  const currentStudent = students[index];
  const duplicateStudent = students.find(
    (student, studentIndex) => student.id === updatedStudent.id && studentIndex !== index
  );

  if (duplicateStudent) {
    throw new Error("Student ID already exists");
  }

  await updateStudentRecord(currentStudent.firestoreId, updatedStudent);

  students[index] = {
    firestoreId: currentStudent.firestoreId,
    ...updatedStudent
  };

  await syncStudentInSchedules(currentStudent.id, updatedStudent);
}

async function syncStudentInSchedules(previousStudentId, updatedStudent) {
  for (let index = 0; index < schedules.length; index += 1) {
    const schedule = schedules[index];
    let hasChanges = false;

    const updatedScheduleStudents = schedule.students.map((student) => {
      if (student.id !== previousStudentId) {
        return student;
      }

      hasChanges = true;
      return { ...updatedStudent };
    });

    if (!hasChanges) {
      continue;
    }

    const updatedSchedule = {
      date: schedule.date,
      time: schedule.time,
      day: schedule.day,
      students: updatedScheduleStudents
    };

    await updateScheduleRecord(schedule.firestoreId, updatedSchedule);
    schedules[index] = {
      firestoreId: schedule.firestoreId,
      ...updatedSchedule
    };
  }
}

function formatTime12Hour(timeValue) {
  if (!timeValue || !timeValue.includes(":")) {
    return timeValue;
  }

  const [hoursText, minutes] = timeValue.split(":");
  const hours = Number(hoursText);

  if (Number.isNaN(hours)) {
    return timeValue;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHour = hours % 12 || 12;
  return `${normalizedHour}:${minutes} ${period}`;
}

function initializeScheduleDefaults() {
  setScheduleFieldsToDate(new Date());
  classDate.addEventListener("change", handleClassDateChange);
}

function handleClassDateChange() {
  if (!classDate.value) {
    classDay.value = "";
    return;
  }

  setScheduleFieldsToDate(new Date(`${classDate.value}T00:00:00`));
}

function setScheduleFieldsToDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return;
  }

  classDate.value = formatDateInputValue(date);
  classDay.value = getDayName(date);
}

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayName(date) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return dayNames[date.getDay()];
}

function initializeTeacherAuth() {
  watchTeacherAuthState((user) => {
    if (user) {
      showPage("teacherPage");
      return;
    }

    const activePage = document.querySelector(".page.active");
    if (activePage && activePage.id === "teacherPage") {
      showPage("loginPage");
    }
  });
}
