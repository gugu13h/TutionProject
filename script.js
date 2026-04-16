import {
  addScheduleRecord,
  addStudentRecord,
  deleteScheduleRecord,
  deleteStudentRecord,
  getSchedules,
  getStudents,
  getTeacherProfile,
  isFirebaseReady,
  signInTeacher,
  signOutTeacher,
  updateTeacherProfile,
  updateScheduleRecord,
  updateStudentRecord,
  watchTeacherAuthState
} from "./firebase-api.js";
import { uploadImageToCloudinary } from "./cloudinary-api.js";

let students = [];
let schedules = [];
let editingStudentIndex = null;
let teacherProfile = null;
let currentRatingStudentIndex = null;
let selectedMathsRating = 0;
let selectedScienceRating = 0;

const username = document.getElementById("username");
const password = document.getElementById("password");
const studentId = document.getElementById("studentId");
const studentName = document.getElementById("studentName");
const studentPhotoFile = document.getElementById("studentPhotoFile");
const studentCycleStartDay = document.getElementById("studentCycleStartDay");
const studentCycleEndDay = document.getElementById("studentCycleEndDay");
const studentList = document.getElementById("studentList");
const classDate = document.getElementById("classDate");
const classTime = document.getElementById("classTime");
const classDay = document.getElementById("classDay");
const studentCheckList = document.getElementById("studentCheckList");
const scheduleList = document.getElementById("scheduleList");
const loginStudentId = document.getElementById("loginStudentId");
const studentData = document.getElementById("studentData");
const studentRecordModal = document.getElementById("studentRecordModal");
const studentModalBody = document.getElementById("studentModalBody");
const teacherLoginPhoto = document.getElementById("teacherLoginPhoto");
const teacherDashboardPhoto = document.getElementById("teacherDashboardPhoto");
const teacherPhotoFile = document.getElementById("teacherPhotoFile");
const whatsappMsg = document.getElementById("whatsappMsg");
const feePending = document.getElementById("feePending");
const studentSubmitBtn = document.getElementById("studentSubmitBtn");
const studentCancelBtn = document.getElementById("studentCancelBtn");
const studentRegisterForm = document.getElementById("studentRegisterForm");
const newRegisterBtn = document.getElementById("newRegisterBtn");
const newRegisterBtnText = document.getElementById("newRegisterBtnText");
const studentRegisterCloseBtn = document.getElementById("studentRegisterCloseBtn");
const scheduleForm = document.getElementById("scheduleForm");
const newScheduleBtn = document.getElementById("newScheduleBtn");
const newScheduleBtnText = document.getElementById("newScheduleBtnText");
const scheduleCloseBtn = document.getElementById("scheduleCloseBtn");
const ratingModal = document.getElementById("ratingModal");
const ratingModalTitle = document.getElementById("ratingModalTitle");
const currentRatingDisplay = document.getElementById("currentRatingDisplay");

const FIREBASE_WARNING = "Firebase config missing. Open firebase-api.js and paste your Firebase web app config.";
const DEFAULT_TEACHER_PHOTO = "https://placehold.co/300x300/f2efe6/8b5e34?text=Teacher";
const DEFAULT_STUDENT_PHOTO = "https://placehold.co/300x300/e8f5f1/1f6f66?text=Student";
const DEFAULT_FEE_CYCLE_START_DAY = 1;
const DEFAULT_FEE_CYCLE_END_DAY = 30;
const RESET_STUDENT_IDS = ["81", "82", "7"];
const INITIAL_STUDENTS = [
  { id: "101", name: "Anushak Kumari", feePending: false, photoUrl: "", feeCycleStartDay: DEFAULT_FEE_CYCLE_START_DAY, feeCycleEndDay: DEFAULT_FEE_CYCLE_END_DAY, subjectRatings: { maths: 0, science: 0 } },
  { id: "9", name: "Rahul Kumar", feePending: false, photoUrl: "", feeCycleStartDay: DEFAULT_FEE_CYCLE_START_DAY, feeCycleEndDay: DEFAULT_FEE_CYCLE_END_DAY, subjectRatings: { maths: 0, science: 0 } },
  { id: "102", name: "Abhishek Francis", feePending: false, photoUrl: "", feeCycleStartDay: DEFAULT_FEE_CYCLE_START_DAY, feeCycleEndDay: DEFAULT_FEE_CYCLE_END_DAY, subjectRatings: { maths: 0, science: 0 } },
  { id: "81", name: "Saket Kumar", feePending: false, photoUrl: "", feeCycleStartDay: DEFAULT_FEE_CYCLE_START_DAY, feeCycleEndDay: DEFAULT_FEE_CYCLE_END_DAY, subjectRatings: { maths: 0, science: 0 } },
  { id: "82", name: "Ashwin Kumar", feePending: false, photoUrl: "", feeCycleStartDay: DEFAULT_FEE_CYCLE_START_DAY, feeCycleEndDay: DEFAULT_FEE_CYCLE_END_DAY, subjectRatings: { maths: 0, science: 0 } },
  { id: "7", name: "Arpit Kumar", feePending: false, photoUrl: "", feeCycleStartDay: DEFAULT_FEE_CYCLE_START_DAY, feeCycleEndDay: DEFAULT_FEE_CYCLE_END_DAY, subjectRatings: { maths: 0, science: 0 } }
];

window.teacherLogin = teacherLogin;
window.showStudentPage = showStudentPage;
window.logout = logout;
window.addStudent = addStudent;
window.deleteStudent = deleteStudent;
window.editStudent = editStudent;
window.cancelStudentEdit = cancelStudentEdit;
window.toggleStudentRegisterForm = toggleStudentRegisterForm;
window.saveSchedule = saveSchedule;
window.deleteSchedule = deleteSchedule;
window.loadStudentData = loadStudentData;
window.closeStudentModal = closeStudentModal;
window.sendWhatsApp = sendWhatsApp;
window.uploadTeacherPhoto = uploadTeacherPhoto;
window.setStudentRating = setStudentRating;
window.submitStudentRating = submitStudentRating;
window.setRating = setRating;
window.closeRatingModal = closeRatingModal;
window.toggleStudentRating = toggleStudentRating;

initializeScheduleDefaults();
initializeStudentModal();
initializeStudentRegisterForm();
initializeScheduleForm();
initializeAppData();

async function initializeAppData() {
  if (!isFirebaseReady()) {
    console.warn(FIREBASE_WARNING);
    return;
  }

  try {
    initializeTeacherAuth();
    await loadTeacherProfile();
    await refreshFirestoreData();
    await normalizeAllStudentFeeCycles();
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
  const cycleStartDay = Number(studentCycleStartDay.value);
  const cycleEndDay = Number(studentCycleEndDay.value);

  if (!id || !name) {
    alert("Enter Student ID and Name");
    return;
  }

  if (!Number.isInteger(cycleStartDay) || !Number.isInteger(cycleEndDay) || cycleStartDay < 1 || cycleEndDay < 1 || cycleStartDay > 31 || cycleEndDay > 31) {
    alert("Enter valid student fee cycle days between 1 and 31");
    return;
  }

  if (cycleStartDay > cycleEndDay) {
    alert("Student fee cycle start day should be less than or equal to end day");
    return;
  }

  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  try {
    let photoUrl = editingStudentIndex !== null ? students[editingStudentIndex].photoUrl || "" : "";

    if (studentPhotoFile.files[0]) {
      photoUrl = await uploadImageToCloudinary(studentPhotoFile.files[0], "tuition-project/students");
    }

    const studentPayload = {
      id,
      name,
      feePending: fee,
      photoUrl,
      feeCycleStartDay: cycleStartDay,
      feeCycleEndDay: cycleEndDay,
      subjectRatings: editingStudentIndex !== null ? students[editingStudentIndex].subjectRatings || { maths: 0, science: 0 } : { maths: 0, science: 0 }
    };

    if (editingStudentIndex !== null) {
      await saveStudentUpdate(editingStudentIndex, studentPayload);
    } else {
      if (students.find((student) => student.id === id)) {
        alert("Student ID already exists");
        return;
      }

      const firestoreId = await addStudentRecord(studentPayload);
      students.push({ firestoreId, ...studentPayload });
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
    const ratings = student.subjectRatings || { maths: 0, science: 0 };
    const overallRating = Math.round((ratings.maths + ratings.science) / 2 * 10) / 10;
    const overallText = overallRating === 0 ? "Not Rated" : `${overallRating} / 10`;
    
    studentList.innerHTML += `
      <div class="box">
        <img class="profile-avatar record-photo" src="${student.photoUrl || DEFAULT_STUDENT_PHOTO}" alt="${student.name} photo">
        ${student.name} (ID:${student.id})<br>
        Fee Cycle: <strong>${student.feeCycleStartDay || DEFAULT_FEE_CYCLE_START_DAY} to ${student.feeCycleEndDay || DEFAULT_FEE_CYCLE_END_DAY}</strong><br>
        Fee Status: <strong>${getFeeStatusText(student)}</strong><br>
        Overall Rating: <strong>${overallText}</strong>
        <div class="box-actions">
          <button class="ghost-btn" onclick="editStudent(${index})">Edit</button>
          <button class="ghost-btn" onclick="setStudentRating(${index})">Rating</button>
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
  openStudentRegisterForm();
  studentId.value = student.id;
  studentName.value = student.name;
  feePending.checked = student.feePending;
  studentCycleStartDay.value = student.feeCycleStartDay || DEFAULT_FEE_CYCLE_START_DAY;
  studentCycleEndDay.value = student.feeCycleEndDay || DEFAULT_FEE_CYCLE_END_DAY;
  studentPhotoFile.value = "";
  studentSubmitBtn.textContent = "Update Student";
  studentCancelBtn.style.display = "block";
  studentId.focus();
}

function cancelStudentEdit() {
  resetStudentForm();
}

function toggleStudentRegisterForm() {
  if (studentRegisterForm.classList.contains("active")) {
    resetStudentForm();
    return;
  }

  openStudentRegisterForm();
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
  studentModalBody.innerHTML = "";

  const matchedRecords = [];

  schedules.forEach((schedule) => {
    schedule.students.forEach((student) => {
      if (student.id === id) {
        const ratings = student.subjectRatings || { maths: 0, science: 0 };
        const overallRating = Math.round((ratings.maths + ratings.science) / 2 * 10) / 10;
        const mathsText = ratings.maths === 0 ? "Not Rated" : `${ratings.maths} / 10`;
        const scienceText = ratings.science === 0 ? "Not Rated" : `${ratings.science} / 10`;
        const overallText = overallRating === 0 ? "Not Rated" : `${overallRating} / 10`;
        
        const studentRecordHtml = `
          <div class="box">
            <img class="profile-avatar record-photo" src="${student.photoUrl || DEFAULT_STUDENT_PHOTO}" alt="${student.name} photo">
            <strong>Name:</strong> ${student.name}<br>
            <strong>Class Date:</strong> ${schedule.date}<br>
            <strong>Class Time:</strong> ${formatTime12Hour(schedule.time)}<br>
            <strong>Day:</strong> ${schedule.day}<br>
            <strong>Fee Status:</strong> ${formatFeeStatusHtml(student)}<br>
            <button class="secondary-btn compact-btn" onclick="toggleStudentRating(this)" style="margin-top: 10px; width: 100%;">Show More</button>
            <div class="rating-details" style="display: none; margin-top: 10px; padding: 12px; background: rgba(15, 118, 110, 0.1); border-radius: 10px; border-left: 4px solid #0f766e;">
              <strong>📐 Maths Rating:</strong> ${mathsText}<br>
              <strong>🔬 Science Rating:</strong> ${scienceText}<br>
            <strong style="color: #0f766e; font-size: 1.1rem;">📊 Overall Rating: ${overallText}</strong>
            </div>
          </div>
        `;
        matchedRecords.push(studentRecordHtml);
      }
    });
  });

  if (matchedRecords.length === 0) {
    studentData.innerHTML = "<strong>No record found</strong>";
    studentModalBody.innerHTML = '<div class="box"><strong>No record found</strong></div>';
    openStudentModal();
    return;
  }

  const recordsMarkup = matchedRecords.join("");
  studentData.innerHTML = recordsMarkup;
  studentModalBody.innerHTML = recordsMarkup;
  openStudentModal();
}

function toggleStudentRating(button) {
  const ratingDetails = button.nextElementSibling;
  const isVisible = ratingDetails.style.display !== "none";
  ratingDetails.style.display = isVisible ? "none" : "block";
  button.textContent = isVisible ? "Show More" : "Show Less";
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
  studentPhotoFile.value = "";
  studentCycleStartDay.value = DEFAULT_FEE_CYCLE_START_DAY;
  studentCycleEndDay.value = DEFAULT_FEE_CYCLE_END_DAY;
  feePending.checked = false;
  studentSubmitBtn.textContent = "Add Student";
  studentCancelBtn.style.display = "none";
  closeStudentRegisterForm();
}

function openStudentRegisterForm() {
  studentRegisterForm.classList.add("active");
  newRegisterBtnText.textContent = editingStudentIndex !== null ? "Close Form" : "Hide Form";
}

function closeStudentRegisterForm() {
  studentRegisterForm.classList.remove("active");
  newRegisterBtnText.textContent = "New Register";
}

function toggleScheduleForm() {
  if (scheduleForm.classList.contains("active")) {
    closeScheduleForm();
    return;
  }

  openScheduleForm();
}

function openScheduleForm() {
  scheduleForm.classList.add("active");
  newScheduleBtnText.textContent = "Close Form";
}

function closeScheduleForm() {
  scheduleForm.classList.remove("active");
  newScheduleBtnText.textContent = "New Schedule";
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

function initializeStudentModal() {
  studentRecordModal.addEventListener("click", (event) => {
    if (event.target === studentRecordModal) {
      closeStudentModal();
    }
  });
}

function initializeStudentRegisterForm() {
  closeStudentRegisterForm();
  studentCycleStartDay.value = DEFAULT_FEE_CYCLE_START_DAY;
  studentCycleEndDay.value = DEFAULT_FEE_CYCLE_END_DAY;

  if (newRegisterBtn) {
    newRegisterBtn.addEventListener("click", toggleStudentRegisterForm);
  }

  if (studentRegisterCloseBtn) {
    studentRegisterCloseBtn.addEventListener("click", () => {
      resetStudentForm();
    });
  }
}

function initializeScheduleForm() {
  closeScheduleForm();

  if (newScheduleBtn) {
    newScheduleBtn.addEventListener("click", toggleScheduleForm);
  }

  if (scheduleCloseBtn) {
    scheduleCloseBtn.addEventListener("click", () => {
      closeScheduleForm();
    });
  }
}

function openStudentModal() {
  studentRecordModal.classList.add("active");
  studentRecordModal.setAttribute("aria-hidden", "false");
}

function closeStudentModal() {
  studentRecordModal.classList.remove("active");
  studentRecordModal.setAttribute("aria-hidden", "true");
}

function setStudentRating(index) {
  currentRatingStudentIndex = index;
  const ratings = students[index].subjectRatings || { maths: 0, science: 0 };
  selectedMathsRating = ratings.maths || 0;
  selectedScienceRating = ratings.science || 0;
  ratingModalTitle.textContent = `${students[index].name} - Subject Ratings`;
  updateRatingStars();
  openRatingModal();
}

function setRating(subject, rating) {
  if (subject === "maths") {
    selectedMathsRating = rating;
  } else if (subject === "science") {
    selectedScienceRating = rating;
  }
  updateRatingStars();
}

function updateRatingStars() {
  // Update Maths stars
  const mathsStars = document.querySelectorAll(".maths-rating .star");
  mathsStars.forEach((star, index) => {
    if (index < selectedMathsRating) {
      star.style.opacity = "1";
    } else {
      star.style.opacity = "0.5";
    }
  });
  
  // Update Science stars
  const scienceStars = document.querySelectorAll(".science-rating .star");
  scienceStars.forEach((star, index) => {
    if (index < selectedScienceRating) {
      star.style.opacity = "1";
    } else {
      star.style.opacity = "0.5";
    }
  });
  
  // Update display
  const mathsDisplay = selectedMathsRating === 0 ? "Not Rated" : `${selectedMathsRating} / 10`;
  const scienceDisplay = selectedScienceRating === 0 ? "Not Rated" : `${selectedScienceRating} / 10`;
  const overallRating = Math.round((selectedMathsRating + selectedScienceRating) / 2 * 10) / 10;
  const overallDisplay = overallRating === 0 ? "Not Calculated" : `${overallRating} / 10`;
  
  const mathsDisplayEl = document.getElementById("mathsRatingDisplay");
  const scienceDisplayEl = document.getElementById("scienceRatingDisplay");
  const overallDisplayEl = document.getElementById("overallRatingDisplay");
  
  if (mathsDisplayEl) mathsDisplayEl.textContent = mathsDisplay;
  if (scienceDisplayEl) scienceDisplayEl.textContent = scienceDisplay;
  if (overallDisplayEl) overallDisplayEl.textContent = overallDisplay;
}

async function submitStudentRating() {
  if (currentRatingStudentIndex === null) {
    alert("No student selected");
    return;
  }

  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  try {
    const currentStudent = students[currentRatingStudentIndex];
    const updatedStudent = {
      ...currentStudent,
      subjectRatings: {
        maths: selectedMathsRating,
        science: selectedScienceRating
      }
    };

    await updateStudentRecord(currentStudent.firestoreId, {
      id: updatedStudent.id,
      name: updatedStudent.name,
      feePending: updatedStudent.feePending,
      photoUrl: updatedStudent.photoUrl || "",
      feeCycleStartDay: updatedStudent.feeCycleStartDay,
      feeCycleEndDay: updatedStudent.feeCycleEndDay,
      subjectRatings: updatedStudent.subjectRatings
    });

    students[currentRatingStudentIndex] = updatedStudent;
    await syncStudentInSchedules(currentStudent.id, updatedStudent);
    showStudents();
    closeRatingModal();
    alert("Ratings saved successfully");
  } catch (error) {
    console.error(error);
    alert("Unable to save ratings");
  }
}

function openRatingModal() {
  ratingModal.classList.add("active");
  ratingModal.setAttribute("aria-hidden", "false");
}

function closeRatingModal() {
  ratingModal.classList.remove("active");
  ratingModal.setAttribute("aria-hidden", "true");
  currentRatingStudentIndex = null;
  selectedMathsRating = 0;
  selectedScienceRating = 0;
}

async function uploadTeacherPhoto() {
  if (!teacherPhotoFile.files[0]) {
    alert("Choose a teacher photo first");
    return;
  }

  try {
    const photoUrl = await uploadImageToCloudinary(teacherPhotoFile.files[0], "tuition-project/teachers");
    teacherProfile = {
      ...(teacherProfile || {}),
      photoUrl
    };
    await updateTeacherProfile(teacherProfile);
    applyTeacherProfile();
    teacherPhotoFile.value = "";
    alert("Teacher photo saved");
  } catch (error) {
    console.error(error);
    alert("Unable to upload teacher photo");
  }
}

async function loadTeacherProfile() {
  teacherProfile = await getTeacherProfile();
  applyTeacherProfile();
}

function applyTeacherProfile() {
  const teacherPhoto = teacherProfile?.photoUrl || DEFAULT_TEACHER_PHOTO;
  teacherLoginPhoto.src = teacherPhoto;
  teacherDashboardPhoto.src = teacherPhoto;
}

function getFeeStatusText(student) {
  if (!student.feePending) {
    return "Clear";
  }

  if (hasFeeCycleCrossed(new Date(), student)) {
    return `Pending - ${getPendingMonthLabel(new Date())}`;
  }

  return `Pending - Current Cycle`;
}

function formatFeeStatusHtml(student) {
  const feeStatus = getFeeStatusText(student);
  if (feeStatus.startsWith("Pending")) {
    return `<span style="color:red;">${feeStatus}</span>`;
  }

  return feeStatus;
}

function hasFeeCycleCrossed(date, student) {
  return date.getDate() > Number(student.feeCycleEndDay || DEFAULT_FEE_CYCLE_END_DAY);
}

async function normalizeAllStudentFeeCycles() {
  let studentsUpdated = false;

  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    const needsUpdate =
      Number(student.feeCycleStartDay) !== DEFAULT_FEE_CYCLE_START_DAY ||
      Number(student.feeCycleEndDay) !== DEFAULT_FEE_CYCLE_END_DAY;

    if (!needsUpdate) {
      continue;
    }

    const updatedStudent = {
      ...student,
      feeCycleStartDay: DEFAULT_FEE_CYCLE_START_DAY,
      feeCycleEndDay: DEFAULT_FEE_CYCLE_END_DAY
    };

    await updateStudentRecord(student.firestoreId, {
      id: updatedStudent.id,
      name: updatedStudent.name,
      feePending: updatedStudent.feePending,
      photoUrl: updatedStudent.photoUrl || "",
      feeCycleStartDay: updatedStudent.feeCycleStartDay,
      feeCycleEndDay: updatedStudent.feeCycleEndDay,
      subjectRatings: updatedStudent.subjectRatings || { maths: 0, science: 0 }
    });

    students[index] = updatedStudent;
    await syncStudentInSchedules(student.id, updatedStudent);
    studentsUpdated = true;
  }

  if (studentsUpdated) {
    showStudents();
    showStudentCheckList();
  }
}

function getPendingMonthLabel(date) {
  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });
}
