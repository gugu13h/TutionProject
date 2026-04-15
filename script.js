import {
  addScheduleRecord,
  addStudentRecord,
  deleteScheduleRecord,
  deleteStudentRecord,
  getSchedules,
  getStudents,
  isFirebaseReady
} from "./firebase-api.js";

let students = [];
let schedules = [];

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

const USER = "teacher";
const PASS = "12345";
const FIREBASE_WARNING = "Firebase config missing. Open firebase-api.js and paste your Firebase web app config.";

window.teacherLogin = teacherLogin;
window.showStudentPage = showStudentPage;
window.logout = logout;
window.addStudent = addStudent;
window.deleteStudent = deleteStudent;
window.saveSchedule = saveSchedule;
window.deleteSchedule = deleteSchedule;
window.loadStudentData = loadStudentData;
window.sendWhatsApp = sendWhatsApp;

initializeAppData();

async function initializeAppData() {
  if (!isFirebaseReady()) {
    console.warn(FIREBASE_WARNING);
    return;
  }

  try {
    await refreshFirestoreData();
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

  if (u !== USER || p !== PASS) {
    alert("Wrong Login (teacher / 12345)");
    return;
  }

  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  await refreshFirestoreData();
  showPage("teacherPage");
}

function showStudentPage() {
  showPage("studentPage");
}

function logout() {
  showPage("loginPage");
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

  if (students.find((student) => student.id === id)) {
    alert("Student ID already exists");
    return;
  }

  try {
    const firestoreId = await addStudentRecord({ id, name, feePending: fee });
    students.push({ firestoreId, id, name, feePending: fee });
    showStudents();
    showStudentCheckList();
    studentId.value = "";
    studentName.value = "";
    feePending.checked = false;
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
        <button onclick="deleteStudent(${index})" style="margin-left:10px;">Remove</button>
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
    classDate.value = "";
    classTime.value = "";
    classDay.value = "";
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
        <strong>Time:</strong> ${schedule.time}<br>
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
            <strong>Class Time:</strong> ${schedule.time}<br>
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
