import {
  addScheduleRecord,
  addStudentRecord,
  deleteScheduleRecord,
  deleteStudentRecord,
  deleteAttendanceHistoryOlderThan,
  getSchedules,
  getStudents,
  getTeacherProfile,
  isFirebaseReady,
  signInTeacher,
  signOutTeacher,
  updateTeacherProfile,
  updateScheduleRecord,
  updateStudentRecord,
  watchTeacherAuthState,
  setAttendanceRecordForDate,
  getAttendanceHistory
} from "./firebase-api.js";
import { uploadImageToCloudinary } from "./cloudinary-api.js";

let students = [];
let schedules = [];
let attendanceHistoryCache = {}; // Cache for attendance history: { studentId: [attendance records] }
let editingStudentIndex = null;
let editingScheduleId = null;
let teacherProfile = null;
let isTeacherLoggedIn = false;
let currentRatingStudentIndex = null;
let selectedMathsRating = 0;
let selectedScienceRating = 0;
let scheduleCleanupTimerId = null;
let attendanceCleanupTimerId = null;
let isCleaningExpiredSchedules = false;
let studentCountdownTimerId = null;
let teacherScheduleTimerId = null;
let noticeRotationTimerId = null;
let currentNoticeIndex = 0;

const username = document.getElementById("username");
const password = document.getElementById("password");
const studentId = document.getElementById("studentId");
const studentName = document.getElementById("studentName");
const studentPhotoFile = document.getElementById("studentPhotoFile");
const studentFeeAmount = document.getElementById("studentFeeAmount");
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
const feeReminderModal = document.getElementById("feeReminderModal");
const feeReminderText = document.getElementById("feeReminderText");
const teacherLoginPhoto = document.getElementById("teacherLoginPhoto");
const teacherLoginBackgroundPhoto = document.getElementById("teacherLoginBackgroundPhoto");
const teacherDashboardPhoto = document.getElementById("teacherDashboardPhoto");
const teacherPhotoFile = document.getElementById("teacherPhotoFile");
const aboutTeacherBtn = document.getElementById("aboutTeacherBtn");
const aboutTeacherPhoto = document.getElementById("aboutTeacherPhoto");
const teacherNoticeInputs = [
  document.getElementById("teacherNoticeInput1"),
  document.getElementById("teacherNoticeInput2"),
  document.getElementById("teacherNoticeInput3")
];
const homeNoticeText = document.getElementById("homeNoticeText");
const ranchiTemperature = document.getElementById("ranchiTemperature");
const ranchiWeatherText = document.getElementById("ranchiWeatherText");
const ranchiWeatherIcon = document.getElementById("ranchiWeatherIcon");
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
const scheduleSubmitBtn = document.getElementById("scheduleSubmitBtn");
const scheduleCancelBtn = document.getElementById("scheduleCancelBtn");
const ratingModal = document.getElementById("ratingModal");
const ratingModalTitle = document.getElementById("ratingModalTitle");
const currentRatingDisplay = document.getElementById("currentRatingDisplay");
const themeToggleBtn = document.getElementById("themeToggleBtn");

const FIREBASE_WARNING = "Firebase config missing. Open firebase-api.js and paste your Firebase web app config.";
const DEFAULT_TEACHER_PHOTO = "https://placehold.co/300x300/f2efe6/8b5e34?text=Teacher";
const DEFAULT_STUDENT_PHOTO = "https://placehold.co/300x300/e8f5f1/1f6f66?text=Student";
const DEFAULT_FEE_CYCLE_START_DAY = 1;
const DEFAULT_FEE_CYCLE_END_DAY = 30;
const TEACHER_WHATSAPP_NUMBER = "8864022272";
const TEACHER_WHATSAPP_COUNTRY_CODE = "91";
const SCHEDULE_AUTO_DELETE_AFTER_HOURS = 3;
const HOLIDAY_STUDENT_AUTO_DELETE_HOUR = 20;
const SCHEDULE_CLEANUP_INTERVAL_MS = 60 * 1000;
const ATTENDANCE_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const CLASS_TIMER_DURATION_MS = 60 * 60 * 1000;
const ATTENDANCE_RETENTION_MONTHS = 2;
const NOTICE_ROTATION_INTERVAL_MS = 5000;
const NOTICE_COLOR_CLASSES = ["notice-color-1", "notice-color-2", "notice-color-3"];
const DEFAULT_HOME_NOTICE = "No notice yet.";
const ABSENCE_REASON_OPTIONS = [
  "I am not in home",
  "I am not in Ranchi",
  "I am sick",
  "Due to bad weather I will not come",
  "I will come late today"
];
const RANCHI_WEATHER_URL = "https://api.open-meteo.com/v1/forecast?latitude=23.3441&longitude=85.3096&current=temperature_2m,weather_code,is_day&timezone=auto";
const WEATHER_THEME_CLASSES = [
  "weather-ready",
  "weather-sunny",
  "weather-cloudy",
  "weather-cold",
  "weather-rainy",
  "weather-foggy",
  "weather-thunder"
];
const WEATHER_ICON_CLASSES = [
  "weather-icon-sun",
  "weather-icon-moon",
  "weather-icon-cloud-sun",
  "weather-icon-drop"
];
const RESET_STUDENT_IDS = [];
const INITIAL_STUDENTS = [
  { id: "101", name: "Anushak Kumari", feePending: false, feeAmount: 0, feeHistory: {}, photoUrl: "", feeCycleStartDay: DEFAULT_FEE_CYCLE_START_DAY, feeCycleEndDay: DEFAULT_FEE_CYCLE_END_DAY, subjectRatings: { maths: 0, science: 0 } },
  { id: "102", name: "Abhishek Francis", feePending: false, feeAmount: 0, feeHistory: {}, photoUrl: "", feeCycleStartDay: DEFAULT_FEE_CYCLE_START_DAY, feeCycleEndDay: DEFAULT_FEE_CYCLE_END_DAY, subjectRatings: { maths: 0, science: 0 } },
  { id: "81", name: "Saket Kumar", feePending: false, feeAmount: 0, feeHistory: {}, photoUrl: "", feeCycleStartDay: DEFAULT_FEE_CYCLE_START_DAY, feeCycleEndDay: DEFAULT_FEE_CYCLE_END_DAY, subjectRatings: { maths: 0, science: 0 } },
  { id: "82", name: "Ashwin Kumar", feePending: false, feeAmount: 0, feeHistory: {}, photoUrl: "", feeCycleStartDay: DEFAULT_FEE_CYCLE_START_DAY, feeCycleEndDay: DEFAULT_FEE_CYCLE_END_DAY, subjectRatings: { maths: 0, science: 0 } },
  { id: "7", name: "Arpit Kumar", feePending: false, feeAmount: 0, feeHistory: {}, photoUrl: "", feeCycleStartDay: DEFAULT_FEE_CYCLE_START_DAY, feeCycleEndDay: DEFAULT_FEE_CYCLE_END_DAY, subjectRatings: { maths: 0, science: 0 } }
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
window.editSchedule = editSchedule;
window.cancelScheduleEdit = cancelScheduleEdit;
window.deleteSchedule = deleteSchedule;
window.loadStudentData = loadStudentData;
window.closeStudentModal = closeStudentModal;
window.closeFeeReminderModal = closeFeeReminderModal;
window.studentAttendance = studentAttendance;
window.showAbsenceReasonPicker = showAbsenceReasonPicker;
window.handleAbsenceReasonChange = handleAbsenceReasonChange;
window.sendStudentOtherAbsenceReason = sendStudentOtherAbsenceReason;
window.stopClassTimer = stopClassTimer;
window.removeStudentFromSchedule = removeStudentFromSchedule;
window.sendWhatsApp = sendWhatsApp;
window.openTeacherWhatsApp = openTeacherWhatsApp;
window.uploadTeacherPhoto = uploadTeacherPhoto;
window.saveTeacherNotice = saveTeacherNotice;
window.setStudentRating = setStudentRating;
window.submitStudentRating = submitStudentRating;
window.setRating = setRating;
window.closeRatingModal = closeRatingModal;
window.toggleStudentRating = toggleStudentRating;
window.toggleStudentMore = toggleStudentMore;
window.setStudentFeeMonthStatus = setStudentFeeMonthStatus;
window.toggleTeacherStudentDetails = toggleTeacherStudentDetails;
window.toggleThemeMode = toggleThemeMode;
window.toggleAttendanceMonth = toggleAttendanceMonth;
window.setAttendanceFromCalendar = setAttendanceFromCalendar;

initializeThemeMode();
initializeScheduleDefaults();
initializeStudentModal();
initializeFeeReminderModal();
initializeStudentRegisterForm();
initializeScheduleForm();
initializeAboutTeacherButton();
startScheduleCleanupLoop();
startAttendanceCleanupLoop();
startStudentCountdownLoop();
startTeacherScheduleLoop();
loadRanchiWeather();
initializeAppData();

async function initializeAppData() {
  if (!isFirebaseReady()) {
    console.warn(FIREBASE_WARNING);
    // Fallback: populate UI with initial in-memory students so app remains usable
    students = INITIAL_STUDENTS.map((s) => ({ ...s }));
    schedules = [];
    showStudents();
    showStudentCheckList();
    loadSchedules();
    applyTeacherProfile();
    return;
  }

  try {
    initializeTeacherAuth();
    await loadTeacherProfile();
    await refreshFirestoreData();
    await normalizeAllStudentFeeCycles();
    await seedInitialStudents();
  } catch (error) {
    console.error(error);
    alert("Unable to load Firestore data. Check your Firebase config and Firestore rules.");
  }
}

function initializeThemeMode() {
  const savedMode = localStorage.getItem("tuitionThemeMode") || "day";
  applyThemeMode(savedMode === "night" ? "night" : "day");

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleThemeMode);
  }
}

function toggleThemeMode() {
  const nextMode = document.body.classList.contains("theme-night") ? "day" : "night";
  applyThemeMode(nextMode);
}

function applyThemeMode(mode) {
  const isNight = mode === "night";
  document.body.classList.toggle("theme-night", isNight);
  localStorage.setItem("tuitionThemeMode", isNight ? "night" : "day");

  if (themeToggleBtn) {
    themeToggleBtn.setAttribute("aria-label", isNight ? "Switch to day mode" : "Switch to night mode");
  }
}

function showPage(id) {
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function captureUiPositionState() {
  const openTeacherStudentIds = Array.from(document.querySelectorAll(".teacher-student-card"))
    .filter((card) => !card.querySelector(".teacher-student-details")?.hidden)
    .map((card) => card.dataset.studentKey)
    .filter(Boolean);

  const openTeacherMoreIds = Array.from(document.querySelectorAll(".teacher-student-card"))
    .filter((card) => !card.querySelector(".student-more-details")?.classList.contains("hidden"))
    .map((card) => card.dataset.studentKey)
    .filter(Boolean);

  const modalCard = document.querySelector(".modal-overlay.active .modal-card");

  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    modalScrollTop: modalCard ? modalCard.scrollTop : 0,
    openTeacherStudentIds,
    openTeacherMoreIds,
    studentRatingOpen: Boolean(studentData?.querySelector(".rating-details:not(.hidden)")),
    studentModalRatingOpen: Boolean(studentModalBody?.querySelector(".rating-details:not(.hidden)"))
  };
}

function restoreUiPositionState(state) {
  if (!state) {
    return;
  }

  state.openTeacherStudentIds.forEach((studentKey) => {
    const card = Array.from(document.querySelectorAll(".teacher-student-card"))
      .find((studentCard) => studentCard.dataset.studentKey === studentKey);
    const details = card?.querySelector(".teacher-student-details");
    const nameButton = card?.querySelector(".teacher-student-name");
    if (details && nameButton) {
      details.hidden = false;
      nameButton.setAttribute("aria-expanded", "true");
    }
  });

  state.openTeacherMoreIds.forEach((studentKey) => {
    const card = Array.from(document.querySelectorAll(".teacher-student-card"))
      .find((studentCard) => studentCard.dataset.studentKey === studentKey);
    const moreDetails = card?.querySelector(".student-more-details");
    const moreButton = card?.querySelector(".student-more-btn");
    if (moreDetails && moreButton) {
      moreDetails.classList.remove("hidden");
      moreButton.textContent = "Show Less";
    }
  });

  if (state.studentRatingOpen && studentData) {
    studentData.querySelectorAll(".rating-details").forEach((details) => details.classList.remove("hidden"));
    studentData.querySelectorAll("button").forEach((button) => {
      if (button.textContent.trim() === "Show More" && button.nextElementSibling?.classList.contains("rating-details")) {
        button.textContent = "Show Less";
      }
    });
  }

  if (state.studentModalRatingOpen && studentModalBody) {
    studentModalBody.querySelectorAll(".rating-details").forEach((details) => details.classList.remove("hidden"));
    studentModalBody.querySelectorAll("button").forEach((button) => {
      if (button.textContent.trim() === "Show More" && button.nextElementSibling?.classList.contains("rating-details")) {
        button.textContent = "Show Less";
      }
    });
  }

  window.requestAnimationFrame(() => {
    window.scrollTo(state.scrollX, state.scrollY);
    const modalCard = document.querySelector(".modal-overlay.active .modal-card");
    if (modalCard) {
      modalCard.scrollTop = state.modalScrollTop;
    }
  });
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
    isTeacherLoggedIn = true;
    await refreshFirestoreData();
    loadSchedules();
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
    isTeacherLoggedIn = false;
    showPage("loginPage");
    return;
  }

  signOutTeacher()
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      isTeacherLoggedIn = false;
      showPage("loginPage");
    });
}

function requireTeacherLogin(actionText = "make this change") {
  if (isTeacherLoggedIn) {
    return true;
  }

  alert(`Teacher login required to ${actionText}`);
  return false;
}

async function addStudent() {
  if (!requireTeacherLogin("change student details")) {
    return;
  }

  const id = studentId.value.trim();
  const name = studentName.value.trim();
  const fee = feePending.checked;
  const feeAmountValue = Number(studentFeeAmount.value);
  const cycleStartDay = Number(studentCycleStartDay.value);
  const cycleEndDay = Number(studentCycleEndDay.value);

  if (!id || !name) {
    alert("Enter Student ID and Name");
    return;
  }

  if (studentFeeAmount.value.trim() === "" || !Number.isFinite(feeAmountValue) || feeAmountValue < 0 || !Number.isInteger(feeAmountValue)) {
    alert("Enter valid student fee amount");
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
      feeAmount: feeAmountValue,
      feeHistory: editingStudentIndex !== null
        ? getUpdatedFeeHistory(students[editingStudentIndex], fee)
        : getInitialFeeHistory(fee),
      photoUrl,
      feeCycleStartDay: cycleStartDay,
      feeCycleEndDay: cycleEndDay,
      subjectRatings: editingStudentIndex !== null ? students[editingStudentIndex].subjectRatings || { maths: 0, science: 0 } : { maths: 0, science: 0 }
    };

    if (editingStudentIndex !== null) {
      await saveStudentUpdate(editingStudentIndex, studentPayload);
    } else {
      if (students.find((student) => isSameStudentId(student.id, id))) {
        alert("Student ID already exists");
        return;
      }

      const firestoreId = await addStudentRecord(studentPayload);
      students.push({ firestoreId, ...studentPayload });
    }

    showStudents();
    showStudentCheckList();
    resetStudentForm();
    alert("Saved");
  } catch (error) {
    console.error(error);
    alert(error.message || "Unable to save student to Firestore");
  }
}

function showStudents() {
  const uiPositionState = captureUiPositionState();
  studentList.innerHTML = "";
  students.forEach((student, index) => {
    const ratings = student.subjectRatings || { maths: 0, science: 0 };
    const overallRating = Math.round((ratings.maths + ratings.science) / 2 * 10) / 10;
    const overallText = overallRating === 0 ? "Not Rated" : `${overallRating} / 10`;
    const feeCycleStartDay = getFeeCycleDay(student.feeCycleStartDay, DEFAULT_FEE_CYCLE_START_DAY);
    const feeCycleEndDay = getFeeCycleDay(student.feeCycleEndDay, DEFAULT_FEE_CYCLE_END_DAY);
    const studentDetailsId = `teacherStudentDetails_${index}`;
    const studentKey = normalizeStudentId(student.id);
    
    studentList.innerHTML += `
      <div class="box teacher-student-card" data-student-key="${escapeHtml(studentKey)}">
        <div class="teacher-student-summary">
          <button
            class="teacher-student-name"
            type="button"
            aria-expanded="false"
            aria-controls="${studentDetailsId}"
            onclick="toggleTeacherStudentDetails(${index})"
          >
            ${escapeHtml(student.name)}
          </button>
          <span class="teacher-student-id">ID: ${escapeHtml(student.id)}</span>
        </div>
        <div id="${studentDetailsId}" class="teacher-student-details" hidden>
          <img class="profile-avatar record-photo" src="${student.photoUrl || DEFAULT_STUDENT_PHOTO}" alt="${escapeHtml(student.name)} photo">
          <div>
            <strong>Name:</strong> ${escapeHtml(student.name)}<br>
            <strong>ID:</strong> ${escapeHtml(student.id)}<br>
            <strong>Fee Cycle:</strong> ${feeCycleStartDay} to ${feeCycleEndDay}<br>
            <strong>Fee Status:</strong> ${formatFeeStatusHtml(student)}<br>
            <strong>Overall Rating:</strong> ${overallText}
            <button class="secondary-btn compact-btn student-more-btn" onclick="toggleStudentMore(this)">Show More</button>
            <div class="student-more-details hidden">
              ${getAttendanceCalendarHtml(student.id, new Date(), { editable: true })}
              ${getFeeMonthCalendarHtml(student, new Date(), { editable: true, studentIndex: index })}
            </div>
          </div>
          <div class="box-actions">
            <button class="ghost-btn" onclick="editStudent(${index})">Edit</button>
            <button class="ghost-btn" onclick="setStudentRating(${index})">Rating</button>
            <button class="delete" onclick="deleteStudent(${index})">Remove</button>
          </div>
        </div>
      </div>
    `;
  });
  restoreUiPositionState(uiPositionState);
}

function toggleTeacherStudentDetails(index) {
  const details = document.getElementById(`teacherStudentDetails_${index}`);
  const nameButton = details?.closest(".teacher-student-card")?.querySelector(".teacher-student-name");

  if (!details || !nameButton) {
    return;
  }

  const shouldOpen = details.hidden;
  details.hidden = !shouldOpen;
  nameButton.setAttribute("aria-expanded", String(shouldOpen));
}

async function deleteStudent(index) {
  if (!requireTeacherLogin("delete student")) {
    return;
  }

  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  if (!confirm("Are you sure to delete ??")) {
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
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
        <label style="flex: 1;">
          <input type="checkbox" id="student_${index}" value="${index}">
          ${student.name} (ID:${student.id}) ${student.feePending ? "(Pending)" : ""}
        </label>
        <label style="font-size: 12px; color: #f59e0b;">
          <input type="checkbox" id="holiday_${index}" value="${index}"> Holiday
        </label>
      </div>
    `;
  });
}

function editStudent(index) {
  if (!requireTeacherLogin("change student details")) {
    return;
  }

  const student = students[index];
  editingStudentIndex = index;
  openStudentRegisterForm();
  studentId.value = student.id;
  studentName.value = student.name;
  studentFeeAmount.value = normalizeFeeAmount(student.feeAmount);
  feePending.checked = student.feePending;
  studentCycleStartDay.value = getFeeCycleDay(student.feeCycleStartDay, DEFAULT_FEE_CYCLE_START_DAY);
  studentCycleEndDay.value = getFeeCycleDay(student.feeCycleEndDay, DEFAULT_FEE_CYCLE_END_DAY);
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
  if (!requireTeacherLogin("change class schedule")) {
    return;
  }

  const date = classDate.value;
  const time = classTime.value;
  const day = classDay.value;
  const scheduleIndex = editingScheduleId
    ? schedules.findIndex((schedule) => schedule.firestoreId === editingScheduleId)
    : -1;
  const editingSchedule = scheduleIndex === -1 ? null : schedules[scheduleIndex];

  if (!date || !day) {
    alert("Fill Date and Day");
    return;
  }

  if (editingScheduleId && !editingSchedule) {
    alert("Schedule not found");
    resetScheduleForm();
    return;
  }

  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  const selectedStudents = [];
  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    const checkbox = document.getElementById(`student_${index}`);
    if (checkbox && checkbox.checked) {
      const holidayCheckbox = document.getElementById(`holiday_${index}`);
      const isHoliday = holidayCheckbox && holidayCheckbox.checked;
      const existingScheduleStudent = editingSchedule?.students?.find((scheduleStudent) =>
        isSameStudentId(scheduleStudent.id, student.id)
      );
      const preservedAttendanceStatus = existingScheduleStudent?.attendanceStatus || "pending";
      const preservedAttendanceReason = existingScheduleStudent?.attendanceReason || "";
      let attendanceReason = "";

      if (isHoliday) {
        if (preservedAttendanceStatus === "holiday") {
          attendanceReason = preservedAttendanceReason;
        } else {
          attendanceReason = askHolidayReason();
          if (attendanceReason === null) {
            return;
          }
        }
      }
      
      selectedStudents.push({
        ...student,
        attendanceStatus: isHoliday ? "holiday" : preservedAttendanceStatus === "holiday" ? "pending" : preservedAttendanceStatus,
        attendanceReason: isHoliday ? attendanceReason : preservedAttendanceReason
      });
    }
  }

  if (selectedStudents.length === 0) {
    alert("Select at least one student for the class");
    return;
  }

  // Check if all selected students are on holiday
  const allStudentsOnHoliday = selectedStudents.every(student => student.attendanceStatus === "holiday");

  // Time is required only if not all students are on holiday
  if (!allStudentsOnHoliday && !time) {
    alert("Fill Class Time (required when students are attending class)");
    return;
  }

  const schedulePayload = {
    date,
    time: time || "", // Use empty string if no time provided
    day,
    classStoppedAt: editingSchedule?.classStoppedAt || null,
    students: selectedStudents.map(({ firestoreId, ...student }) => ({
      ...student
    }))
  };

  try {
    if (editingSchedule) {
      await updateScheduleRecord(editingSchedule.firestoreId, schedulePayload);
      schedules[scheduleIndex] = { firestoreId: editingSchedule.firestoreId, ...schedulePayload };
    } else {
      const firestoreId = await addScheduleRecord(schedulePayload);
      schedules.push({ firestoreId, ...schedulePayload });
    }

    loadSchedules();
    resetScheduleForm();
    refreshStudentDataViewIfNeeded();
    alert(editingSchedule ? "Class updated" : "Saved");
  } catch (error) {
    console.error(error);
    alert(editingSchedule ? "Unable to update schedule in Firestore" : "Unable to save schedule to Firestore");
  }
}

function getScheduleDateTime(schedule) {
  if (!schedule?.date || !schedule?.time) {
    return null;
  }

  const timeParts = String(schedule.time).match(/^(\d{1,2}):(\d{2})/);
  if (!timeParts) {
    return null;
  }

  const dateParts = String(schedule.date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateParts) {
    return null;
  }

  const [, year, month, day] = dateParts;
  const [, hours, minutes] = timeParts;
  const scheduleDateTime = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), 0, 0);
  return Number.isNaN(scheduleDateTime.getTime()) ? null : scheduleDateTime;
}

function isScheduleExpired(schedule, now = new Date()) {
  const scheduleDateTime = getScheduleDateTime(schedule);
  if (!scheduleDateTime) {
    return false;
  }

  const expiresAt = scheduleDateTime.getTime() + SCHEDULE_AUTO_DELETE_AFTER_HOURS * 60 * 60 * 1000;
  return now.getTime() >= expiresAt;
}

function getHolidayStudentAutoDeleteTime(schedule) {
  const scheduleDate = parseScheduleDate(schedule?.date);
  if (!scheduleDate) {
    return null;
  }

  scheduleDate.setHours(HOLIDAY_STUDENT_AUTO_DELETE_HOUR, 0, 0, 0);
  return scheduleDate;
}

function isHolidayStudentAutoDeleteDue(schedule, now = new Date()) {
  const deleteTime = getHolidayStudentAutoDeleteTime(schedule);
  return Boolean(deleteTime && now.getTime() >= deleteTime.getTime());
}

function getVisibleSchedules(now = new Date()) {
  return schedules.filter((schedule) => !isScheduleExpired(schedule, now));
}

function normalizeStudentId(id) {
  return String(id || "").trim().toLowerCase();
}

function isSameStudentId(firstId, secondId) {
  return normalizeStudentId(firstId) === normalizeStudentId(secondId);
}

function refreshStudentDataViewIfNeeded() {
  const currentStudentId = loginStudentId.value.trim();
  const hasStudentViewContent = Boolean(studentData.innerHTML.trim());

  if (!currentStudentId || !hasStudentViewContent) {
    return;
  }

  loadStudentData({
    openModalAfterLoad: studentRecordModal.classList.contains("active"),
    showFeeReminder: false
  });
}

async function removeExpiredSchedules(options = {}) {
  const { refreshViews = true, now = new Date() } = options;

  if (!isFirebaseReady() || isCleaningExpiredSchedules || schedules.length === 0) {
    return 0;
  }

  const expiredSchedules = schedules.filter((schedule) => isScheduleExpired(schedule, now));
  if (expiredSchedules.length === 0) {
    return 0;
  }

  isCleaningExpiredSchedules = true;
  const deletedScheduleIds = [];
  const updatedScheduleIds = [];

  try {
    for (const schedule of expiredSchedules) {
      try {
        // Save attendance records to history before deleting the schedule
        for (const student of schedule.students) {
          const attendanceStatus = student.attendanceStatus || "pending";
          if (["coming", "not-coming", "holiday"].includes(attendanceStatus)) {
            try {
              const attendanceData = {
                studentId: student.id,
                date: schedule.date,
                day: schedule.day,
                time: schedule.time || "",
                status: attendanceStatus,
                reason: student.attendanceReason || "",
                scheduleId: schedule.firestoreId
              };
              await saveAttendanceHistoryRecord(attendanceData);
            } catch (error) {
              console.error("Failed to save attendance history:", error);
            }
          }
        }
        
        // Then delete the schedule
        await deleteScheduleRecord(schedule.firestoreId);
        deletedScheduleIds.push(schedule.firestoreId);
      } catch (error) {
        console.error("Unable to auto-delete expired schedule:", error);
      }
    }

    const remainingSchedules = schedules.filter((schedule) => !deletedScheduleIds.includes(schedule.firestoreId));
    for (let index = 0; index < remainingSchedules.length; index += 1) {
      const schedule = remainingSchedules[index];
      if (!isHolidayStudentAutoDeleteDue(schedule, now)) {
        continue;
      }

      const holidayStudents = schedule.students.filter((student) => student.attendanceStatus === "holiday");
      if (holidayStudents.length === 0) {
        continue;
      }

      try {
        for (const student of holidayStudents) {
          try {
            const attendanceData = {
              studentId: student.id,
              date: schedule.date,
              day: schedule.day,
              time: schedule.time || "",
              status: "holiday",
              reason: student.attendanceReason || "",
              scheduleId: schedule.firestoreId
            };
            await saveAttendanceHistoryRecord(attendanceData);
          } catch (error) {
            console.error("Failed to save holiday attendance history:", error);
          }
        }

        const remainingStudents = schedule.students.filter((student) => student.attendanceStatus !== "holiday");
        if (remainingStudents.length === 0) {
          await deleteScheduleRecord(schedule.firestoreId);
          deletedScheduleIds.push(schedule.firestoreId);
          continue;
        }

        const updatedSchedule = {
          date: schedule.date,
          time: schedule.time,
          day: schedule.day,
          classStoppedAt: schedule.classStoppedAt || null,
          students: remainingStudents
        };
        await updateScheduleRecord(schedule.firestoreId, updatedSchedule);
        remainingSchedules[index] = { firestoreId: schedule.firestoreId, ...updatedSchedule };
        updatedScheduleIds.push(schedule.firestoreId);
      } catch (error) {
        console.error("Unable to auto-delete holiday student from schedule:", error);
      }
    }

    if (deletedScheduleIds.length === 0 && updatedScheduleIds.length === 0) {
      return 0;
    }

    schedules = remainingSchedules.filter((schedule) => !deletedScheduleIds.includes(schedule.firestoreId));

    if (refreshViews) {
      loadSchedules();
      showStudents();
      refreshStudentDataViewIfNeeded();
    }

    return deletedScheduleIds.length + updatedScheduleIds.length;
  } finally {
    isCleaningExpiredSchedules = false;
  }
}

function startScheduleCleanupLoop() {
  if (scheduleCleanupTimerId !== null) {
    return;
  }

  scheduleCleanupTimerId = window.setInterval(() => {
    void removeExpiredSchedules();
  }, SCHEDULE_CLEANUP_INTERVAL_MS);
}

function startAttendanceCleanupLoop() {
  if (attendanceCleanupTimerId !== null) {
    return;
  }

  attendanceCleanupTimerId = window.setInterval(() => {
    void cleanupOldAttendanceHistory();
  }, ATTENDANCE_CLEANUP_INTERVAL_MS);
}

function startStudentCountdownLoop() {
  if (studentCountdownTimerId !== null) {
    return;
  }

  studentCountdownTimerId = window.setInterval(() => {
    updateClassTimers();
  }, 1000);
}

function startTeacherScheduleLoop() {
  if (teacherScheduleTimerId !== null) {
    return;
  }

  teacherScheduleTimerId = window.setInterval(() => {
    const activePage = document.querySelector(".page.active");
    if (activePage && activePage.id === "teacherPage") {
      loadSchedules();
    }
  }, 5000);
}

function formatUpcomingCountdownDuration(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const totalMinutes = Math.ceil(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hr ${String(minutes).padStart(2, "0")} min`;
}

function formatLiveClassDuration(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes} min ${String(seconds).padStart(2, "0")} sec`;
}

function getStoppedClassSeconds(schedule, classDateTime) {
  if (schedule?.classStoppedAt === null || schedule?.classStoppedAt === undefined || schedule?.classStoppedAt === "") {
    return null;
  }

  const classStoppedAt = Number(schedule?.classStoppedAt);

  if (!Number.isFinite(classStoppedAt) || !(classDateTime instanceof Date) || Number.isNaN(classDateTime.getTime())) {
    return null;
  }

  return Math.max(0, Math.floor((classStoppedAt - classDateTime.getTime()) / 1000));
}

function getCountdownMarkup(schedule, classDateTime, isHoliday) {
  if (isHoliday || !schedule.time || !(classDateTime instanceof Date) || Number.isNaN(classDateTime.getTime())) {
    return "";
  }

  const stoppedSeconds = getStoppedClassSeconds(schedule, classDateTime);
  if (stoppedSeconds !== null) {
    return `
      <div class="class-countdown-panel class-countdown-stopped">
        <span class="class-countdown-title">Class Timer</span>
        <span class="class-countdown-static is-stopped" aria-live="polite">
          Class stopped: ${formatLiveClassDuration(stoppedSeconds)}
        </span>
      </div>
    `;
  }

  return `
    <div class="class-countdown-panel">
      <span class="class-countdown-title">Live Countdown</span>
      <span class="class-countdown is-upcoming" data-class-date="${schedule.date}" data-class-time="${schedule.time}" data-class-start="${classDateTime.getTime()}" data-class-end="${classDateTime.getTime() + CLASS_TIMER_DURATION_MS}" aria-live="polite">
        Your class is in 0 hr 00 min
      </span>
    </div>
  `;
}

function updateClassTimers() {
  const now = Date.now();

  document.querySelectorAll(".class-countdown").forEach((countdownElement) => {
    const classStart = getClassStartTimeFromElement(countdownElement);
    if (!Number.isFinite(classStart)) {
      countdownElement.closest(".class-countdown-panel")?.remove();
      countdownElement.classList.remove("is-live", "is-upcoming", "is-completed");
      return;
    }

    const classEndValue = Number(countdownElement.dataset.classEnd);
    const classEnd = Number.isFinite(classEndValue) ? classEndValue : classStart + CLASS_TIMER_DURATION_MS;
    const isUpcoming = now < classStart;
    const isLive = now >= classStart && now < classEnd;

    if (isUpcoming) {
      const upcomingSeconds = Math.floor((classStart - now) / 1000);
      countdownElement.textContent = `Your class is in ${formatUpcomingCountdownDuration(upcomingSeconds)}`;
    } else if (isLive) {
      const liveSeconds = Math.floor((now - classStart) / 1000);
      countdownElement.textContent = `Your class is going: ${formatLiveClassDuration(liveSeconds)}`;
    } else {
      countdownElement.textContent = "Class completed";
    }

    countdownElement.classList.toggle("is-upcoming", isUpcoming);
    countdownElement.classList.toggle("is-live", isLive);
    countdownElement.classList.toggle("is-completed", !isUpcoming && !isLive);
  });
}

function getClassStartTimeFromElement(countdownElement) {
  const classStart = Number(countdownElement.getAttribute("data-class-start"));
  if (Number.isFinite(classStart)) {
    return classStart;
  }

  const classDate = countdownElement.getAttribute("data-class-date");
  const classTime = countdownElement.getAttribute("data-class-time");
  const scheduleDateTime = getScheduleDateTime({ date: classDate, time: classTime });
  return scheduleDateTime ? scheduleDateTime.getTime() : NaN;
}

function loadSchedules() {
  const uiPositionState = captureUiPositionState();
  const visibleSchedules = getVisibleSchedules();
  scheduleList.innerHTML = "";
  visibleSchedules.forEach((schedule) => {
    const scheduleDateTime = getScheduleDateTime(schedule);
    const countdownMarkup = getCountdownMarkup(schedule, scheduleDateTime, !schedule.time);
    const scheduleActions = getScheduleActionsHtml(schedule);

    scheduleList.innerHTML += `
      <div class="box">
        <strong>Date:</strong> ${schedule.date}<br>
        <strong>Time:</strong> ${schedule.time ? formatTime12Hour(schedule.time) : "Holiday (No Class)"}<br>
        ${countdownMarkup}
        <strong>Day:</strong> ${schedule.day}<br>
        <strong>Students:</strong><br>
        ${schedule.students.map((student) => getScheduleAttendanceHtml(student, schedule.firestoreId)).join("<br>")}
        ${scheduleActions}
      </div>
    `;
  });
  updateClassTimers();
  restoreUiPositionState(uiPositionState);
}

function isClassRunning(schedule, now = new Date()) {
  const scheduleDateTime = getScheduleDateTime(schedule);
  if (!scheduleDateTime || schedule.classStoppedAt) {
    return false;
  }

  const classStartTime = scheduleDateTime.getTime();
  const classEndTime = classStartTime + CLASS_TIMER_DURATION_MS;
  const nowTime = now.getTime();
  return nowTime >= classStartTime && nowTime < classEndTime;
}

function getScheduleActionsHtml(schedule) {
  const stopTimerButton = isClassRunning(schedule)
    ? `<button class="secondary-btn compact-btn stop-timer-btn" onclick="stopClassTimer('${schedule.firestoreId}')">Stop Timer</button>`
    : "";
  const stoppedText = schedule.classStoppedAt
    ? `<span class="class-stopped-label">Timer stopped</span>`
    : "";

  return `
    <div class="schedule-actions">
      ${stopTimerButton}
      ${stoppedText}
      <button class="ghost-btn compact-btn" onclick="editSchedule('${schedule.firestoreId}')">Edit Class</button>
      <button class="delete compact-btn" onclick="deleteSchedule('${schedule.firestoreId}')">Delete Class</button>
    </div>
  `;
}

function editSchedule(scheduleIdentifier) {
  const schedule = schedules.find((currentSchedule) => currentSchedule.firestoreId === scheduleIdentifier);

  if (!schedule) {
    alert("Schedule not found");
    return;
  }

  editingScheduleId = schedule.firestoreId;
  classDate.value = schedule.date || "";
  classTime.value = schedule.time || "";
  classDay.value = schedule.day || "";
  showStudentCheckList();

  students.forEach((student, index) => {
    const scheduleStudent = schedule.students?.find((currentStudent) => isSameStudentId(currentStudent.id, student.id));
    const studentCheckbox = document.getElementById(`student_${index}`);
    const holidayCheckbox = document.getElementById(`holiday_${index}`);

    if (studentCheckbox) {
      studentCheckbox.checked = Boolean(scheduleStudent);
    }

    if (holidayCheckbox) {
      holidayCheckbox.checked = scheduleStudent?.attendanceStatus === "holiday";
    }
  });

  openScheduleForm();
  if (scheduleSubmitBtn) {
    scheduleSubmitBtn.textContent = "Update Schedule";
  }
  if (scheduleCancelBtn) {
    scheduleCancelBtn.style.display = "block";
  }
  classDate.focus();
}

function cancelScheduleEdit() {
  resetScheduleForm();
}

async function stopClassTimer(scheduleIdentifier) {
  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  const scheduleIndex = schedules.findIndex((schedule) => schedule.firestoreId === scheduleIdentifier);
  if (scheduleIndex === -1) {
    alert("Schedule not found");
    return;
  }

  const schedule = schedules[scheduleIndex];
  if (!getScheduleDateTime(schedule)) {
    alert("Timer is not available for this class");
    return;
  }

  if (schedule.classStoppedAt) {
    alert("Class timer already stopped");
    return;
  }

  const updatedSchedule = {
    date: schedule.date,
    time: schedule.time,
    day: schedule.day,
    classStoppedAt: Date.now(),
    students: schedule.students
  };

  try {
    await updateScheduleRecord(schedule.firestoreId, updatedSchedule);
    schedules[scheduleIndex] = { firestoreId: schedule.firestoreId, ...updatedSchedule };
    loadSchedules();
    showStudents();
    refreshStudentDataViewIfNeeded();
    alert("Class timer stopped");
  } catch (error) {
    console.error(error);
    alert("Unable to stop class timer");
  }
}

async function deleteSchedule(scheduleIdentifier) {
  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  const scheduleIndex = schedules.findIndex((schedule) => schedule.firestoreId === scheduleIdentifier);
  if (scheduleIndex === -1) {
    alert("Schedule not found");
    return;
  }

  if (!confirm("Are you sure to delete ??")) {
    return;
  }

  try {
    await deleteScheduleRecord(schedules[scheduleIndex].firestoreId);
    schedules.splice(scheduleIndex, 1);
    if (editingScheduleId === scheduleIdentifier) {
      resetScheduleForm();
    }
    loadSchedules();
    refreshStudentDataViewIfNeeded();
  } catch (error) {
    console.error(error);
    alert("Unable to delete schedule from Firestore");
  }
}

function normalizeLoadStudentDataOptions(options) {
  if (typeof options === "boolean") {
    return {
      openModalAfterLoad: options,
      showFeeReminder: false
    };
  }

  return {
    openModalAfterLoad: true,
    showFeeReminder: true,
    ...(options || {})
  };
}

async function loadAttendanceHistoryForStudent(studentId) {
  if (!isFirebaseReady()) {
    return;
  }

  const cacheKey = normalizeStudentId(studentId);
  if (!cacheKey) {
    return;
  }

  try {
    const history = await getAttendanceHistory(studentId);
    attendanceHistoryCache[cacheKey] = filterAttendanceWithinRetention(history);
  } catch (error) {
    console.error("Error loading attendance history:", error);
  }
}

function addAttendanceRecordToCache(attendanceData) {
  const cacheKey = normalizeStudentId(attendanceData?.studentId);
  if (!cacheKey) {
    return;
  }

  const studentHistory = attendanceHistoryCache[cacheKey] || [];
  const nextRecord = {
    ...attendanceData,
    updatedAt: attendanceData.updatedAt || new Date()
  };

  attendanceHistoryCache[cacheKey] = filterAttendanceWithinRetention([
    nextRecord,
    ...studentHistory.filter((record) => {
      if (nextRecord.firestoreId && record.firestoreId === nextRecord.firestoreId) {
        return false;
      }

      return record.date !== nextRecord.date;
    })
  ]);
}

async function saveAttendanceHistoryRecord(attendanceData) {
  const recordToSave = {
    ...attendanceData,
    expiresOn: getAttendanceExpiryDateKey(attendanceData.date)
  };
  const firestoreId = await setAttendanceRecordForDate(recordToSave);
  addAttendanceRecordToCache({ firestoreId, ...recordToSave, updatedAt: new Date() });
  return firestoreId;
}

function filterAttendanceWithinRetention(history) {
  const cutoffDate = getAttendanceRetentionCutoffDateKey();
  return (history || []).filter((record) => String(record.date || "") >= cutoffDate);
}

function getAttendanceRetentionCutoffDateKey(referenceDate = new Date()) {
  const cutoffDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - ATTENDANCE_RETENTION_MONTHS, referenceDate.getDate());
  return formatDateKey(cutoffDate);
}

function getAttendanceExpiryDateKey(dateKey) {
  const attendanceDate = parseScheduleDate(dateKey) || new Date();
  return formatDateKey(new Date(attendanceDate.getFullYear(), attendanceDate.getMonth() + ATTENDANCE_RETENTION_MONTHS, attendanceDate.getDate()));
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function cleanupOldAttendanceHistory() {
  if (!isFirebaseReady()) {
    return;
  }

  const cutoffDate = getAttendanceRetentionCutoffDateKey();
  try {
    await deleteAttendanceHistoryOlderThan(cutoffDate);
    Object.keys(attendanceHistoryCache).forEach((studentId) => {
      attendanceHistoryCache[studentId] = filterAttendanceWithinRetention(attendanceHistoryCache[studentId]);
    });
  } catch (error) {
    console.error("Unable to clean old attendance history:", error);
  }
}

async function loadStudentData(options = {}) {
  const uiPositionState = captureUiPositionState();
  const { openModalAfterLoad, showFeeReminder } = normalizeLoadStudentDataOptions(options);
  const requestedId = loginStudentId.value.trim();
  const studentRecordForLogin = students.find((student) => isSameStudentId(student.id, requestedId));
  const id = studentRecordForLogin?.id || requestedId;
  
  if (id && isFirebaseReady()) {
    await loadAttendanceHistoryForStudent(id).catch(error => {
      console.error("Failed to load attendance history:", error);
    });
  }
  
  studentData.innerHTML = "";
  studentModalBody.innerHTML = "";
  const now = new Date();
  let feeReminderStudent = null;

  const matchedRecords = [];

  schedules.forEach((schedule) => {
    if (isScheduleExpired(schedule, now)) {
      return;
    }

    if (!schedule.time) {
      const scheduleDate = new Date(schedule.date + 'T00:00:00'); // Ensure proper date parsing
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (scheduleDate < oneMonthAgo || scheduleDate > oneMonthFromNow) {
        return; // Skip very old or very future holiday schedules
      }
    }

    // Calculate dateTime for sorting
    let classDateTime;
    classDateTime = getScheduleDateTime(schedule) || new Date(`${schedule.date}T00:00:00`);

    schedule.students.forEach((student) => {
      if (isSameStudentId(student.id, id)) {
        const fullStudent = students.find(s => isSameStudentId(s.id, id));
        feeReminderStudent = feeReminderStudent || fullStudent || student;
        const displayStudent = fullStudent
          ? {
              ...student,
              ...fullStudent,
              attendanceStatus: student.attendanceStatus,
              attendanceReason: student.attendanceReason
            }
          : student;
        const ratings = fullStudent ? (fullStudent.subjectRatings || { maths: 0, science: 0 }) : { maths: 0, science: 0 };
        const overallRating = Math.round((ratings.maths + ratings.science) / 2 * 10) / 10;
        const mathsText = ratings.maths === 0 ? "Not Rated" : `${ratings.maths} / 10`;
        const scienceText = ratings.science === 0 ? "Not Rated" : `${ratings.science} / 10`;
        const overallText = overallRating === 0 ? "Not Rated" : `${overallRating} / 10`;
        
        const attendanceStatus = student.attendanceStatus || "pending";
        const attendanceReason = student.attendanceReason || "";
        const isAbsent = attendanceStatus === "not-coming";
        const isHoliday = attendanceStatus === "holiday";
        const attendanceReasonHtml = attendanceReason
          ? `<strong>Reason:</strong> <span style="color:#dc2626; font-weight:700;">${escapeHtml(attendanceReason)}</span><br>`
          : "";
        
        const absenceReasonHtml = buildAbsenceReasonPickerHtml(schedule.firestoreId, student.id);
        const attendanceButtonsHtml = isHoliday ? 
          `<div style="margin-top: 10px; padding: 8px; background: #fef3c7; border-radius: 5px; color: #f59e0b; font-weight: bold;">Holiday marked by teacher</div>` :
          `<div class="attendance-actions" style="display:flex; gap:10px; flex-wrap:wrap; margin-top: 10px;">
            <button class="secondary-btn compact-btn" style="flex:1; min-width: 160px;" onclick="studentAttendance('${schedule.firestoreId}','${student.id}','coming','student')">I will come</button>
            <button class="secondary-btn compact-btn" style="flex:1; min-width: 160px; background:#dc2626; color:#fff;" onclick="showAbsenceReasonPicker(this)">I will not come today</button>
          </div>
          ${absenceReasonHtml}`;
        const countdownMarkup = getCountdownMarkup(schedule, classDateTime, isHoliday);
        
        const studentRecordHtml = `
          <div class="box">
            <img class="profile-avatar record-photo" src="${displayStudent.photoUrl || DEFAULT_STUDENT_PHOTO}" alt="${displayStudent.name} photo">
            <strong>Name:</strong> ${displayStudent.name}<br>
            <strong>Class Date:</strong> ${schedule.date}<br>
            <strong>Class Time:</strong> <span style="color: #0f766e; font-weight: bold;">${schedule.time ? formatTime12Hour(schedule.time) : "Holiday (No Class)"}</span><br>
            ${countdownMarkup}
            <strong>Day:</strong> ${schedule.day}<br>
            <strong>Fee Status:</strong> ${formatFeeStatusHtml(displayStudent)}<br>
            <strong>Attendance:</strong> ${getAttendanceStatusText(student)}<br>
            ${attendanceReasonHtml}
            ${attendanceButtonsHtml}
            <button class="secondary-btn compact-btn" onclick="toggleStudentRating(this)" style="margin-top: 10px; width: 100%;">Show More</button>
            <div class="rating-details hidden" style="margin-top: 10px; padding: 12px; background: rgba(15, 118, 110, 0.1); border-radius: 10px; border-left: 4px solid #0f766e;">
              <strong>📐 Maths Rating:</strong> ${mathsText}<br>
              <strong>🔬 Science Rating:</strong> ${scienceText}<br>
              <strong style="color: #0f766e; font-size: 1.1rem;">📊 Overall Rating: ${overallText}</strong>
              ${getAttendanceCalendarHtml(displayStudent.id)}
              ${getFeeMonthCalendarHtml(displayStudent)}
            </div>
          </div>
        `;
        matchedRecords.push({ html: studentRecordHtml, dateTime: classDateTime });
      }
    });
  });

  // Sort matched records by dateTime ascending (earliest first)
  matchedRecords.sort((a, b) => a.dateTime - b.dateTime);

  if (matchedRecords.length === 0) {
    const studentRecord = students.find((student) => isSameStudentId(student.id, id));
    if (studentRecord) {
      feeReminderStudent = studentRecord;
      const ratings = studentRecord.subjectRatings || { maths: 0, science: 0 };
      const overallRating = Math.round((ratings.maths + ratings.science) / 2 * 10) / 10;
      const mathsText = ratings.maths === 0 ? "Not Rated" : `${ratings.maths} / 10`;
      const scienceText = ratings.science === 0 ? "Not Rated" : `${ratings.science} / 10`;
      const overallText = overallRating === 0 ? "Not Rated" : `${overallRating} / 10`;

      const studentInfoHtml = `
        <div class="box">
          <img class="profile-avatar record-photo" src="${studentRecord.photoUrl || DEFAULT_STUDENT_PHOTO}" alt="${studentRecord.name} photo">
          <strong>Name:</strong> ${studentRecord.name}<br>
          <strong>ID:</strong> ${studentRecord.id}<br>
          <strong>Fee Status:</strong> ${formatFeeStatusHtml(studentRecord)}<br>
          <button class="secondary-btn compact-btn" onclick="toggleStudentRating(this)" style="margin-top: 10px; width: 100%;">Show More</button>
          <div class="rating-details hidden" style="margin-top: 10px; padding: 12px; background: rgba(15, 118, 110, 0.1); border-radius: 10px; border-left: 4px solid #0f766e;">
            <strong>📐 Maths Rating:</strong> ${mathsText}<br>
            <strong>🔬 Science Rating:</strong> ${scienceText}<br>
            <strong style="color: #0f766e; font-size: 1.1rem;">📊 Overall Rating: ${overallText}</strong>
            ${getAttendanceCalendarHtml(studentRecord.id)}
            ${getFeeMonthCalendarHtml(studentRecord)}
          </div>
          <strong style="display:block; margin-top: 12px; color: #dc2626;">Class update is not available yet.</strong>
          <strong style="color: #dc2626;">You will be informed soon.</strong><br>
          <button class="secondary-btn" onclick="openTeacherWhatsApp('Need help with student login')" style="margin-top: 10px;">Need Help</button>
        </div>
      `;

      studentData.innerHTML = studentInfoHtml;
      studentModalBody.innerHTML = studentInfoHtml;
      if (openModalAfterLoad) {
        openStudentModal();
      }
      if (showFeeReminder) {
        showFeeReminderIfNeeded(feeReminderStudent);
      }
      restoreUiPositionState(uiPositionState);
      return;
    }

    const notFoundHtml = `
      <div class="box">
        <strong style="display:block; margin-top: 12px; color: #dc2626;">Student not found.</strong>
        <strong style="color: #dc2626;">Enter correct ID.</strong>
      </div>
    `;
    studentData.innerHTML = notFoundHtml;
    studentModalBody.innerHTML = notFoundHtml;
    if (openModalAfterLoad) {
      openStudentModal();
    }
    closeFeeReminderModal();
    restoreUiPositionState(uiPositionState);
    return;
  }

  const recordsMarkup = matchedRecords.map(r => r.html).join("");
  studentData.innerHTML = recordsMarkup;
  studentModalBody.innerHTML = recordsMarkup;
  updateClassTimers();
  if (openModalAfterLoad) {
    openStudentModal();
  }
  if (showFeeReminder) {
    showFeeReminderIfNeeded(feeReminderStudent);
  }
  restoreUiPositionState(uiPositionState);
}

function toggleStudentRating(button) {
  let ratingDetails = button.nextElementSibling;
  while (ratingDetails && !ratingDetails.classList.contains('rating-details')) {
    ratingDetails = ratingDetails.nextElementSibling;
  }
  if (ratingDetails) {
    ratingDetails.classList.toggle('hidden');
    button.textContent = ratingDetails.classList.contains('hidden') ? "Show More" : "Show Less";
  }
}

function toggleStudentMore(button) {
  let moreDetails = button.nextElementSibling;
  while (moreDetails && !moreDetails.classList.contains("student-more-details")) {
    moreDetails = moreDetails.nextElementSibling;
  }

  if (moreDetails) {
    moreDetails.classList.toggle("hidden");
    button.textContent = moreDetails.classList.contains("hidden") ? "Show More" : "Show Less";
  }
}

function getAttendanceCalendarHtml(studentId, referenceDate = new Date(), options = {}) {
  // Show only current month by default; previous month is hidden until toggled.
  const currentMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const editable = Boolean(options.editable);

  const currentMonthHtml = buildMonthCalendar(studentId, currentMonth.getFullYear(), currentMonth.getMonth(), { editable });
  const previousMonthHtml = buildMonthCalendar(studentId, previousMonth.getFullYear(), previousMonth.getMonth(), { editable });

  return `
    <div class="attendance-calendar-toggle" style="margin-bottom: 12px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center;">
      <strong style="font-size: 0.98rem; color: #334155;">Attendance Calendar</strong>
      <button type="button" class="secondary-btn compact-btn attendance-toggle-btn" onclick="toggleAttendanceMonth(this)" title="Show previous month" aria-label="Toggle previous month">
        <span class="toggle-arrow">▼</span>
      </button>
    </div>
    <div class="attendance-calendar-months" style="display: flex; gap: 15px; flex-wrap: wrap;">
      <div class="attendance-calendar-current" style="flex: 1; min-width: 250px;">${currentMonthHtml}</div>
      <div class="attendance-calendar-previous" style="flex: 1; min-width: 250px; display: none;">${previousMonthHtml}</div>
    </div>
    <div class="attendance-calendar-legend" style="margin-top: 15px; display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.92rem; color: #475569;">
      <span><i class="status-coming"></i>Present</span>
      <span><i class="status-not-coming"></i>Absent</span>
      <span><i class="status-holiday"></i>Holiday</span>
    </div>
    ${editable ? `<div class="attendance-calendar-help">Click a date to change attendance.</div>` : ""}
  `;
}

function toggleAttendanceMonth(button) {
  const container = button.closest('.attendance-calendar-toggle');
  if (!container) {
    return;
  }

  const parent = container.nextElementSibling;
  if (!parent) {
    return;
  }

  const previousMonthContainer = parent.querySelector('.attendance-calendar-previous');
  if (!previousMonthContainer) {
    return;
  }

  const arrow = button.querySelector('.toggle-arrow');
  const isHidden = previousMonthContainer.style.display === 'none' || previousMonthContainer.style.display === '';
  previousMonthContainer.style.display = isHidden ? 'block' : 'none';
  
  if (arrow) {
    arrow.textContent = isHidden ? '▲' : '▼';
    button.title = isHidden ? 'Hide previous month' : 'Show previous month';
    button.setAttribute('aria-label', isHidden ? 'Hide previous month' : 'Show previous month');
  }
}

function buildMonthCalendar(studentId, year, month, options = {}) {
  const monthLabel = new Date(year, month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const attendanceByDate = getStudentAttendanceByDate(studentId, year, month);
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const blanks = Array.from({ length: firstDay.getDay() }, () => `<span class="attendance-calendar-day is-empty"></span>`);
  const editable = Boolean(options.editable);
  const days = Array.from({ length: totalDays }, (_, dayIndex) => {
    const day = dayIndex + 1;
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const status = attendanceByDate[dateKey] || "none";
    const label = getAttendanceCalendarLabel(status);
    if (editable) {
      return `<button type="button" class="attendance-calendar-day attendance-calendar-action status-${status}" title="${label}. Click to change" onclick='setAttendanceFromCalendar(${JSON.stringify(studentId)}, ${JSON.stringify(dateKey)}, ${JSON.stringify(status)})'>${day}</button>`;
    }
    return `<span class="attendance-calendar-day status-${status}" title="${label}">${day}</span>`;
  });

  return `
    <div class="attendance-calendar" style="flex: 1; min-width: 250px;">
      <div class="attendance-calendar-head">
        <strong>${monthLabel}</strong>
      </div>
      <div class="attendance-calendar-weekdays">
        ${dayLabels.map((dayLabel) => `<span>${dayLabel}</span>`).join("")}
      </div>
      <div class="attendance-calendar-grid">
        ${[...blanks, ...days].join("")}
      </div>
    </div>
  `;
}

function getStudentAttendanceByDate(studentId, year, month) {
  const attendanceByDate = {};

  // Get attendance from current schedules
  schedules.forEach((schedule) => {
    const scheduleDate = parseScheduleDate(schedule.date);
    if (!scheduleDate || scheduleDate.getFullYear() !== year || scheduleDate.getMonth() !== month) {
      return;
    }

    const scheduleStudent = schedule.students.find((student) => isSameStudentId(student.id, studentId));
    if (!scheduleStudent) {
      return;
    }

    const status = scheduleStudent.attendanceStatus || "pending";
    if (!["coming", "not-coming", "holiday"].includes(status)) {
      return;
    }

    attendanceByDate[schedule.date] = mergeAttendanceCalendarStatus(attendanceByDate[schedule.date], status);
  });

  // Get attendance from history cache
  const cachedHistory = attendanceHistoryCache[normalizeStudentId(studentId)];
  if (cachedHistory) {
    const latestHistoryByDate = {};
    cachedHistory.forEach((record) => {
      const recordDate = parseScheduleDate(record.date);
      if (!recordDate || recordDate.getFullYear() !== year || recordDate.getMonth() !== month) {
        return;
      }

      if (attendanceByDate[record.date]) {
        return;
      }

      const currentRecord = latestHistoryByDate[record.date];
      if (!currentRecord || getAttendanceRecordTime(record) >= getAttendanceRecordTime(currentRecord)) {
        latestHistoryByDate[record.date] = record;
      }
    });

    Object.entries(latestHistoryByDate).forEach(([date, record]) => {
      const status = record.status || "pending";
      if (["coming", "not-coming", "holiday"].includes(status)) {
        attendanceByDate[date] = status;
      }
    });
  }

  return attendanceByDate;
}

function getAttendanceRecordTime(record) {
  const timestamp = record?.updatedAt || record?.createdAt;
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  if (timestamp?.toMillis) {
    return timestamp.toMillis();
  }
  if (timestamp?.seconds) {
    return timestamp.seconds * 1000;
  }
  return 0;
}

function parseScheduleDate(dateValue) {
  const dateParts = String(dateValue || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateParts) {
    return null;
  }

  const [, year, month, day] = dateParts;
  const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function mergeAttendanceCalendarStatus(currentStatus, nextStatus) {
  const priority = {
    "not-coming": 3,
    holiday: 2,
    coming: 1
  };

  if (!currentStatus || priority[nextStatus] > priority[currentStatus]) {
    return nextStatus;
  }

  return currentStatus;
}

function getAttendanceCalendarLabel(status) {
  if (status === "coming") {
    return "Present";
  }
  if (status === "not-coming") {
    return "Absent";
  }
  if (status === "holiday") {
    return "Holiday";
  }
  return "No attendance";
}

async function setAttendanceFromCalendar(studentId, dateKey, currentStatus = "none") {
  if (!requireTeacherLogin("change attendance")) {
    return;
  }

  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  const student = students.find((studentRecord) => isSameStudentId(studentRecord.id, studentId));
  if (!student) {
    alert("Student not found");
    return;
  }

  const currentLabel = getAttendanceCalendarLabel(currentStatus);
  const choice = prompt(
    `Set attendance for ${student.name} on ${dateKey}\nP = Present\nA = Absent\nH = Holiday\nC = Clear\n\nCurrent: ${currentLabel}`,
    currentStatus === "not-coming" ? "A" : currentStatus === "holiday" ? "H" : currentStatus === "coming" ? "P" : ""
  );

  if (choice === null) {
    return;
  }

  const normalizedChoice = choice.trim().toLowerCase();
  const statusMap = {
    p: "coming",
    present: "coming",
    a: "not-coming",
    absent: "not-coming",
    h: "holiday",
    holiday: "holiday",
    c: "none",
    clear: "none"
  };
  const status = statusMap[normalizedChoice];

  if (!status) {
    alert("Use P for Present, A for Absent, H for Holiday, or C to clear.");
    return;
  }

  let reason = "";
  if (status === "holiday") {
    reason = askHolidayReason();
    if (reason === null) {
      return;
    }
  } else if (status === "not-coming") {
    reason = "Marked absent by teacher";
  }

  const schedule = schedules.find((scheduleRecord) =>
    scheduleRecord.date === dateKey &&
    scheduleRecord.students.some((scheduleStudent) => isSameStudentId(scheduleStudent.id, studentId))
  );

  if (schedule) {
    await updateStudentAttendance(schedule.firestoreId, student.id, status, reason);
    return;
  }

  try {
    const attendanceData = {
      studentId,
      date: dateKey,
      day: getDayNameFromDateKey(dateKey),
      time: "",
      status,
      reason,
      scheduleId: "manual-calendar"
    };
    await saveAttendanceHistoryRecord(attendanceData);
    showStudents();

    const currentStudentId = loginStudentId.value.trim();
    if (isSameStudentId(currentStudentId, studentId)) {
      loadStudentData({ openModalAfterLoad: true, showFeeReminder: false });
    }

    alert("Attendance status saved");
  } catch (error) {
    console.error(error);
    alert("Unable to save attendance status");
  }
}

function getDayNameFromDateKey(dateKey) {
  const parsedDate = parseScheduleDate(dateKey);
  if (!parsedDate) {
    return "";
  }

  return parsedDate.toLocaleString("en-US", { weekday: "long" });
}

function buildStudentAbsenceMessage(schedule, student, customMessage) {
  const classTiming = schedule.time ? ` at ${formatTime12Hour(schedule.time)}` : " (Holiday - No Class)";
  return `Student ${student.name} (ID: ${student.id}) will not come to class on ${schedule.date}${classTiming}. Message: ${customMessage}`;
}

function buildAbsenceReasonPickerHtml(scheduleId, studentId) {
  const options = ABSENCE_REASON_OPTIONS
    .map((reason) => `<option value="${escapeHtml(reason)}">${escapeHtml(reason)}</option>`)
    .join("");

  return `
    <div class="absence-reason-panel hidden">
      <label class="absence-reason-label">Reason</label>
      <select class="absence-reason-select" onchange="handleAbsenceReasonChange(this, '${scheduleId}', '${studentId}')">
        <option value="">Select one reason</option>
        ${options}
        <option value="other">Other</option>
      </select>
      <div class="absence-other-row hidden">
        <textarea class="absence-other-message" placeholder="I will not come due to -"></textarea>
        <button type="button" class="whatsapp-btn compact-btn" onclick="sendStudentOtherAbsenceReason(this, '${scheduleId}', '${studentId}')">Send WhatsApp</button>
      </div>
    </div>
  `;
}

function showAbsenceReasonPicker(button) {
  const panel = button.closest(".box")?.querySelector(".absence-reason-panel");
  if (!panel) {
    return;
  }

  panel.classList.remove("hidden");
  panel.querySelector(".absence-reason-select")?.focus();
}

async function handleAbsenceReasonChange(selectElement, scheduleId, studentId) {
  const selectedReason = selectElement.value;
  const panel = selectElement.closest(".absence-reason-panel");
  const otherRow = panel?.querySelector(".absence-other-row");

  if (otherRow) {
    otherRow.classList.toggle("hidden", selectedReason !== "other");
  }

  if (!selectedReason || selectedReason === "other") {
    return;
  }

  await studentAttendance(scheduleId, studentId, "not-coming", "student", selectedReason);
}

async function sendStudentOtherAbsenceReason(button, scheduleId, studentId) {
  const panel = button.closest(".absence-reason-panel");
  const messageInput = panel?.querySelector(".absence-other-message");
  const customReason = messageInput?.value.trim();

  if (!customReason) {
    alert("Write your reason");
    return;
  }

  await studentAttendance(scheduleId, studentId, "not-coming", "student", customReason, { openWhatsApp: true });
}

function getTeacherWhatsAppUrl(message = "") {
  const phone = `${TEACHER_WHATSAPP_COUNTRY_CODE}${TEACHER_WHATSAPP_NUMBER}`;
  const encodedMessage = message ? `&text=${encodeURIComponent(message)}` : "";
  return `https://api.whatsapp.com/send?phone=${phone}${encodedMessage}`;
}

function openTeacherWhatsApp(message = "") {
  window.location.assign(getTeacherWhatsAppUrl(message));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function askHolidayReason() {
  const holidayReason = prompt("Enter holiday reason");
  if (holidayReason === null) {
    return null;
  }

  return holidayReason.trim() || "Holiday marked by teacher";
}

async function studentAttendance(scheduleId, studentId, status, source = "teacher", selectedReason = "", options = {}) {
  if (source === "teacher" && !requireTeacherLogin("change attendance")) {
    return;
  }

  const schedule = schedules.find(s => s.firestoreId === scheduleId);
  if (!schedule) {
    alert("Schedule not found");
    return;
  }

  const student = schedule.students.find(s => isSameStudentId(s.id, studentId));
  if (!student) {
    alert("Student not found in schedule");
    return;
  }

  if (source === "student" && status === "not-coming") {
    const customMessage = selectedReason.trim();
    if (!customMessage) {
      alert("Select one reason");
      return;
    }

    await updateStudentAttendance(scheduleId, studentId, status, customMessage);
    if (options.openWhatsApp) {
      const message = buildStudentAbsenceMessage(schedule, student, `I will not come due to - ${customMessage}`);
      openTeacherWhatsApp(message);
    }
    return;
  }

  let reason = "";
  if (status === "holiday") {
    if (source === "teacher") {
      reason = askHolidayReason();
      if (reason === null) {
        return;
      }
    } else {
      reason = "Holiday marked by teacher";
    }
  } else if (status === "not-coming") {
    reason = "Marked absent by teacher";
  }
  await updateStudentAttendance(scheduleId, studentId, status, reason);
}

async function updateStudentAttendance(scheduleId, studentId, status, reason) {
  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  const scheduleIndex = schedules.findIndex((schedule) => schedule.firestoreId === scheduleId);
  if (scheduleIndex === -1) {
    alert("Schedule not found");
    return;
  }

  const schedule = schedules[scheduleIndex];
  const studentIndex = schedule.students.findIndex((student) => isSameStudentId(student.id, studentId));
  if (studentIndex === -1) {
    alert("Student not found in schedule");
    return;
  }

  const matchedStudentId = schedule.students[studentIndex].id;
  const updatedStudent = {
    ...schedule.students[studentIndex],
    attendanceStatus: status,
    attendanceReason: reason || ""
  };

  const updatedSchedule = {
    date: schedule.date,
    time: schedule.time,
    day: schedule.day,
    classStoppedAt: schedule.classStoppedAt || null,
    students: schedule.students.map((student, index) => (index === studentIndex ? updatedStudent : student))
  };

  try {
    await updateScheduleRecord(schedule.firestoreId, updatedSchedule);
    
    // Save attendance to history for persistence
    const attendanceData = {
      studentId: matchedStudentId,
      date: schedule.date,
      day: schedule.day,
      time: schedule.time || "",
      status: status,
      reason: reason || "",
      scheduleId: scheduleId
    };
    await saveAttendanceHistoryRecord(attendanceData);
    
    schedules[scheduleIndex] = { firestoreId: schedule.firestoreId, ...updatedSchedule };
    loadSchedules();
    showStudents();
    const currentStudentId = loginStudentId.value.trim();
    if (isSameStudentId(currentStudentId, matchedStudentId)) {
      loadStudentData({ openModalAfterLoad: true, showFeeReminder: false });
    }
    alert("Attendance status saved");
  } catch (error) {
    console.error(error);
    alert("Unable to save attendance status");
  }
}

function getAttendanceStatusText(student) {
  const status = student.attendanceStatus || "pending";
  if (status === "coming") {
    return `<span style="color:#0f766e;font-weight:700;">Coming</span>`;
  }
  if (status === "not-coming") {
    return `<span style="color:#dc2626;font-weight:700;">Not Coming</span>`;
  }
  if (status === "holiday") {
    return `<span style="color:#f59e0b;font-weight:700;">Holiday</span>`;
  }
  return `<span style="color:#6b7280;font-weight:700;">Not Confirmed</span>`;
}

function getScheduleAttendanceHtml(student, scheduleId) {
  const reasonMarkup = student.attendanceReason ? `<div style="margin-left: 18px; color:#dc2626;">Reason: ${escapeHtml(student.attendanceReason)}</div>` : "";
  const feeMarkup = student.feePending ? " (Pending)" : "";
  const attendanceButtons = `
    <div style="margin-left: 18px; margin-top: 5px; display: flex; gap: 5px; flex-wrap: wrap;">
      <button class="secondary-btn compact-btn" style="font-size: 11px; padding: 3px 8px;" onclick="studentAttendance('${scheduleId}', '${student.id}', 'holiday', 'teacher')">Mark Holiday</button>
      <button class="secondary-btn compact-btn" style="font-size: 11px; padding: 3px 8px; background:#dc2626; color:#fff;" onclick="studentAttendance('${scheduleId}', '${student.id}', 'not-coming', 'teacher')">Mark Absent</button>
      <button class="secondary-btn compact-btn" style="font-size: 11px; padding: 3px 8px; background:#0f766e; color:#fff;" onclick="studentAttendance('${scheduleId}', '${student.id}', 'coming', 'teacher')">Mark Present</button>
      <button class="secondary-btn compact-btn" style="font-size: 11px; padding: 3px 8px; background:#b91c1c; color:#fff;" onclick="removeStudentFromSchedule('${scheduleId}', '${student.id}')">Remove</button>
    </div>
  `;
  return `- ${student.name} (${student.id})${feeMarkup} - ${getAttendanceStatusText(student)} ${reasonMarkup}${attendanceButtons}`;
}

async function removeStudentFromSchedule(scheduleId, studentId) {
  if (!requireTeacherLogin("change class schedule")) {
    return;
  }

  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  const scheduleIndex = schedules.findIndex((schedule) => schedule.firestoreId === scheduleId);
  if (scheduleIndex === -1) {
    alert("Schedule not found");
    return;
  }

  const schedule = schedules[scheduleIndex];
  const student = schedule.students.find((s) => isSameStudentId(s.id, studentId));
  if (!student) {
    alert("Student not found in schedule");
    return;
  }

  if (!confirm(`Remove ${student.name} from this class schedule?`)) {
    return;
  }

  const remainingStudents = schedule.students.filter((s) => !isSameStudentId(s.id, studentId));
  try {
    if (remainingStudents.length === 0) {
      await deleteScheduleRecord(schedule.firestoreId);
      schedules.splice(scheduleIndex, 1);
      alert("Student removed and class schedule deleted because no students remain.");
    } else {
      const updatedSchedule = {
        date: schedule.date,
        time: schedule.time,
        day: schedule.day,
        classStoppedAt: schedule.classStoppedAt || null,
        students: remainingStudents
      };
      await updateScheduleRecord(schedule.firestoreId, updatedSchedule);
      schedules[scheduleIndex] = { firestoreId: schedule.firestoreId, ...updatedSchedule };
      alert("Student removed from class schedule.");
    }

    loadSchedules();
    showStudents();

    const currentStudentId = loginStudentId.value.trim();
    if (isSameStudentId(currentStudentId, studentId)) {
      loadStudentData({ openModalAfterLoad: true, showFeeReminder: false });
    }
  } catch (error) {
    console.error(error);
    alert("Unable to update class schedule");
  }
}

function sendWhatsApp() {
  const msg = whatsappMsg.value.trim() || "Hello teacher";
  whatsappMsg.value = msg;
  openTeacherWhatsApp(msg);
}

async function refreshFirestoreData() {
  const [studentsResult, schedulesResult] = await Promise.allSettled([
    getStudents(),
    getSchedules()
  ]);

  if (studentsResult.status === "fulfilled") {
    students = studentsResult.value;
  } else {
    console.error("Unable to load students:", studentsResult.reason);
    students = [];
  }

  if (schedulesResult.status === "fulfilled") {
    schedules = schedulesResult.value;
  } else {
    console.error("Unable to load schedules:", schedulesResult.reason);
    schedules = [];
  }

  await cleanupOldAttendanceHistory();
  await Promise.all(students.map((student) => loadAttendanceHistoryForStudent(student.id)));
  await removeExpiredSchedules({ refreshViews: false });
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

function resetStudentForm() {
  editingStudentIndex = null;
  studentId.value = "";
  studentName.value = "";
  studentFeeAmount.value = "";
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
    resetScheduleForm();
    return;
  }

  openScheduleForm();
}

function openScheduleForm() {
  scheduleForm.classList.add("active");
  newScheduleBtnText.textContent = editingScheduleId ? "Close Form" : "Hide Form";
}

function closeScheduleForm() {
  scheduleForm.classList.remove("active");
  newScheduleBtnText.textContent = "New Schedule";
}

function resetScheduleForm() {
  editingScheduleId = null;
  setScheduleFieldsToDate(new Date());
  classTime.value = "";
  showStudentCheckList();
  if (scheduleSubmitBtn) {
    scheduleSubmitBtn.textContent = "Save Schedule";
  }
  if (scheduleCancelBtn) {
    scheduleCancelBtn.style.display = "none";
  }
  closeScheduleForm();
}

function buildStudentRecordPayload(student, options = {}) {
  const { includeFeeCycle = false } = options;
  const payload = {
    id: student.id,
    name: student.name,
    feePending: Boolean(student.feePending),
    feeAmount: normalizeFeeAmount(student.feeAmount),
    feeHistory: student.feeHistory || {},
    photoUrl: student.photoUrl || "",
    subjectRatings: student.subjectRatings || { maths: 0, science: 0 }
  };

  if (includeFeeCycle) {
    payload.feeCycleStartDay = getFeeCycleDay(student.feeCycleStartDay, DEFAULT_FEE_CYCLE_START_DAY);
    payload.feeCycleEndDay = getFeeCycleDay(student.feeCycleEndDay, DEFAULT_FEE_CYCLE_END_DAY);
  }

  return payload;
}

async function saveStudentUpdate(index, updatedStudent) {
  const currentStudent = students[index];
  const duplicateStudent = students.find(
    (student, studentIndex) => isSameStudentId(student.id, updatedStudent.id) && studentIndex !== index
  );

  if (duplicateStudent) {
    throw new Error("Student ID already exists");
  }

  await updateStudentRecord(currentStudent.firestoreId, buildStudentRecordPayload(updatedStudent, { includeFeeCycle: true }));

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
      return {
        ...student,
        ...updatedStudent
      };
    });

    if (!hasChanges) {
      continue;
    }

    const updatedSchedule = {
      date: schedule.date,
      time: schedule.time,
      day: schedule.day,
      classStoppedAt: schedule.classStoppedAt || null,
      students: updatedScheduleStudents
    };

    try {
      await updateScheduleRecord(schedule.firestoreId, updatedSchedule);
      schedules[index] = {
        firestoreId: schedule.firestoreId,
        ...updatedSchedule
      };
    } catch (error) {
      console.error("Error updating schedule:", error);
      // Continue with other schedules even if one fails
    }
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
    isTeacherLoggedIn = Boolean(user);

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

function initializeFeeReminderModal() {
  if (!feeReminderModal) {
    return;
  }

  feeReminderModal.addEventListener("click", (event) => {
    if (event.target === feeReminderModal) {
      closeFeeReminderModal();
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
  resetScheduleForm();

  if (newScheduleBtn) {
    newScheduleBtn.addEventListener("click", toggleScheduleForm);
  }

  if (scheduleCloseBtn) {
    scheduleCloseBtn.addEventListener("click", () => {
      resetScheduleForm();
    });
  }

  if (scheduleCancelBtn) {
    scheduleCancelBtn.addEventListener("click", cancelScheduleEdit);
  }
}

function openStudentModal() {
  studentRecordModal.classList.add("active");
  studentRecordModal.setAttribute("aria-hidden", "false");
}

function closeStudentModal() {
  closeFeeReminderModal();
  studentRecordModal.classList.remove("active");
  studentRecordModal.setAttribute("aria-hidden", "true");
}

function showFeeReminderIfNeeded(student) {
  if (!student?.feePending || !feeReminderModal || !feeReminderText) {
    closeFeeReminderModal();
    return;
  }

  const feeStatus = getFeeStatusText(student);
  const feeAmount = formatFeeAmount(student);
  const amountText = feeAmount === "Not set" ? "" : ` Amount: ${feeAmount}.`;
  feeReminderText.textContent = `${student.name}, your fee is pending (${feeStatus}).${amountText} Scan the PhonePe QR below and complete the payment.`;
  feeReminderModal.dataset.studentId = student.id || "";
  feeReminderModal.classList.add("active");
  feeReminderModal.setAttribute("aria-hidden", "false");
}

function closeFeeReminderModal() {
  if (!feeReminderModal) {
    return;
  }

  feeReminderModal.classList.remove("active");
  feeReminderModal.setAttribute("aria-hidden", "true");
  feeReminderModal.dataset.studentId = "";
}

function setStudentRating(index) {
  if (!requireTeacherLogin("change student rating")) {
    return;
  }

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
  if (!requireTeacherLogin("change student rating")) {
    return;
  }

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

    await updateStudentRecord(currentStudent.firestoreId, buildStudentRecordPayload(updatedStudent));

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
  if (!isTeacherLoggedIn) {
    alert("Teacher login required to upload photo");
    return;
  }

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

async function saveTeacherNotice() {
  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  const notices = getTeacherNoticeInputs();

  try {
    teacherProfile = {
      ...(teacherProfile || {}),
      notice: notices[0] || "",
      notices
    };
    await updateTeacherProfile(teacherProfile);
    applyTeacherProfile();
    alert("Notice saved");
  } catch (error) {
    console.error(error);
    alert("Unable to save notice");
  }
}

async function loadTeacherProfile() {
  teacherProfile = await getTeacherProfile();
  applyTeacherProfile();
}

function applyTeacherProfile() {
  const teacherPhoto = teacherProfile?.photoUrl || DEFAULT_TEACHER_PHOTO;
  teacherLoginPhoto.src = teacherPhoto;
  if (teacherLoginBackgroundPhoto) {
    teacherLoginBackgroundPhoto.src = teacherPhoto;
  }
  teacherDashboardPhoto.src = teacherPhoto;
  if (aboutTeacherPhoto) {
    aboutTeacherPhoto.src = teacherPhoto;
  }
  const notices = getTeacherProfileNotices();
  applyNoticeBoard(notices);
  teacherNoticeInputs.forEach((input, index) => {
    if (input) {
      input.value = notices[index] === DEFAULT_HOME_NOTICE ? "" : notices[index] || "";
    }
  });
}

function getTeacherNoticeInputs() {
  return teacherNoticeInputs
    .map((input) => input?.value.trim() || "")
    .filter(Boolean)
    .slice(0, 3);
}

function getTeacherProfileNotices() {
  const savedNotices = Array.isArray(teacherProfile?.notices)
    ? teacherProfile.notices
    : [];
  const notices = savedNotices
    .map((notice) => String(notice || "").trim())
    .filter(Boolean)
    .slice(0, 3);

  if (notices.length > 0) {
    return notices;
  }

  const legacyNotice = teacherProfile?.notice?.trim();
  return legacyNotice ? [legacyNotice] : [DEFAULT_HOME_NOTICE];
}

function applyNoticeBoard(notices) {
  if (!homeNoticeText) {
    return;
  }

  const noticeContent = homeNoticeText.closest(".cloud-notice-content");
  const activeNotices = (notices || [])
    .map((notice) => String(notice || "").trim())
    .filter(Boolean);
  const displayNotices = activeNotices.length > 0 ? activeNotices.slice(0, 3) : [DEFAULT_HOME_NOTICE];

  currentNoticeIndex = 0;
  homeNoticeText.textContent = displayNotices[currentNoticeIndex];
  setNoticeColor(noticeContent, currentNoticeIndex);

  if (noticeRotationTimerId !== null) {
    window.clearInterval(noticeRotationTimerId);
    noticeRotationTimerId = null;
  }

  if (displayNotices.length < 2) {
    return;
  }

  noticeRotationTimerId = window.setInterval(() => {
    currentNoticeIndex = (currentNoticeIndex + 1) % displayNotices.length;
    homeNoticeText.classList.add("is-changing");
    window.setTimeout(() => {
      homeNoticeText.textContent = displayNotices[currentNoticeIndex];
      setNoticeColor(noticeContent, currentNoticeIndex);
      homeNoticeText.classList.remove("is-changing");
    }, 280);
  }, NOTICE_ROTATION_INTERVAL_MS);
}

function setNoticeColor(noticeContent, noticeIndex) {
  if (!noticeContent) {
    return;
  }

  noticeContent.classList.remove(...NOTICE_COLOR_CLASSES);
  noticeContent.classList.add(NOTICE_COLOR_CLASSES[noticeIndex % NOTICE_COLOR_CLASSES.length]);
}

function initializeAboutTeacherButton() {
  if (!aboutTeacherBtn) {
    return;
  }

  const savedPosition = getSavedAboutTeacherButtonPosition();
  if (savedPosition) {
    setAboutTeacherButtonPosition(savedPosition.left, savedPosition.top);
  }

  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let hasDragged = false;

  aboutTeacherBtn.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    const rect = aboutTeacherBtn.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    hasDragged = false;
    aboutTeacherBtn.classList.add("is-dragging");
    aboutTeacherBtn.setPointerCapture(event.pointerId);
  });

  aboutTeacherBtn.addEventListener("pointermove", (event) => {
    if (!aboutTeacherBtn.classList.contains("is-dragging")) {
      return;
    }

    const nextLeft = startLeft + event.clientX - startX;
    const nextTop = startTop + event.clientY - startY;
    if (Math.abs(event.clientX - startX) > 4 || Math.abs(event.clientY - startY) > 4) {
      hasDragged = true;
    }
    setAboutTeacherButtonPosition(nextLeft, nextTop);
  });

  aboutTeacherBtn.addEventListener("pointerup", (event) => {
    if (!aboutTeacherBtn.classList.contains("is-dragging")) {
      return;
    }

    aboutTeacherBtn.classList.remove("is-dragging");
    aboutTeacherBtn.releasePointerCapture(event.pointerId);
    const rect = aboutTeacherBtn.getBoundingClientRect();
    localStorage.setItem("aboutTeacherButtonPosition", JSON.stringify({ left: rect.left, top: rect.top }));

    if (hasDragged) {
      aboutTeacherBtn.dataset.skipClick = "true";
    }
  });

  aboutTeacherBtn.addEventListener("click", (event) => {
    event.preventDefault();

    if (aboutTeacherBtn.dataset.skipClick === "true") {
      delete aboutTeacherBtn.dataset.skipClick;
    }
  });
}

function getSavedAboutTeacherButtonPosition() {
  try {
    const savedPosition = JSON.parse(localStorage.getItem("aboutTeacherButtonPosition") || "null");
    if (!savedPosition || !Number.isFinite(savedPosition.left) || !Number.isFinite(savedPosition.top)) {
      return null;
    }
    return savedPosition;
  } catch (error) {
    return null;
  }
}

function setAboutTeacherButtonPosition(left, top) {
  if (!aboutTeacherBtn) {
    return;
  }

  const rect = aboutTeacherBtn.getBoundingClientRect();
  const safeLeft = Math.max(8, Math.min(window.innerWidth - rect.width - 8, left));
  const safeTop = Math.max(8, Math.min(window.innerHeight - rect.height - 8, top));
  aboutTeacherBtn.style.left = `${safeLeft}px`;
  aboutTeacherBtn.style.top = `${safeTop}px`;
  aboutTeacherBtn.style.right = "auto";
}

function isValidFeeCycleDay(dayValue) {
  const day = Number(dayValue);
  return Number.isInteger(day) && day >= 1 && day <= 31;
}

function getFeeCycleDay(dayValue, defaultDay) {
  return isValidFeeCycleDay(dayValue) ? Number(dayValue) : defaultDay;
}

async function loadRanchiWeather() {
  if (!ranchiTemperature || !ranchiWeatherText) {
    return;
  }

  try {
    const response = await fetch(RANCHI_WEATHER_URL);
    if (!response.ok) {
      throw new Error("Weather request failed");
    }

    const weatherData = await response.json();
    const temperature = Math.round(Number(weatherData?.current?.temperature_2m));
    const weatherCode = Number(weatherData?.current?.weather_code);
    const isDay = Number(weatherData?.current?.is_day) === 1;
    if (!Number.isFinite(temperature)) {
      throw new Error("Weather temperature missing");
    }

    ranchiTemperature.textContent = `${temperature}\u00B0C`;
    ranchiWeatherText.textContent = getWeatherDescription(weatherCode);
    applyWeatherTheme(getWeatherTheme(weatherCode, temperature), getWeatherIcon(weatherCode, isDay));
  } catch (error) {
    console.error("Weather loading failed:", error);
    ranchiTemperature.textContent = "--";
    ranchiWeatherText.textContent = "Weather unavailable";
    applyWeatherTheme("", "sun");
  }
}

function applyWeatherTheme(themeName, iconName = "sun") {
  document.body.classList.remove(...WEATHER_THEME_CLASSES);
  if (ranchiWeatherIcon) {
    ranchiWeatherIcon.classList.remove(...WEATHER_ICON_CLASSES);
    ranchiWeatherIcon.classList.add(`weather-icon-${iconName}`);
  }

  if (!themeName) {
    return;
  }

  document.body.classList.add("weather-ready", `weather-${themeName}`);
}

function getWeatherTheme(weatherCode, temperature) {
  if (Number.isFinite(temperature) && temperature <= 16) {
    return "cold";
  }
  if ([95, 96, 99].includes(weatherCode)) {
    return "thunder";
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82, 51, 53, 55, 56, 57].includes(weatherCode)) {
    return "rainy";
  }
  if ([45, 48].includes(weatherCode)) {
    return "foggy";
  }
  if ([3].includes(weatherCode)) {
    return "cloudy";
  }
  if ([0, 1, 2].includes(weatherCode)) {
    return "sunny";
  }
  return "cloudy";
}

function getWeatherIcon(weatherCode, isDay) {
  if ([95, 96, 99, 61, 63, 65, 66, 67, 80, 81, 82, 51, 53, 55, 56, 57].includes(weatherCode)) {
    return "drop";
  }
  if ([1, 2, 3, 45, 48].includes(weatherCode)) {
    return "cloud-sun";
  }
  return isDay ? "sun" : "moon";
}

function getWeatherDescription(weatherCode) {
  if ([0].includes(weatherCode)) {
    return "Clear sky";
  }
  if ([1, 2].includes(weatherCode)) {
    return "Partly cloudy";
  }
  if ([3].includes(weatherCode)) {
    return "Cloudy";
  }
  if ([45, 48].includes(weatherCode)) {
    return "Foggy";
  }
  if ([51, 53, 55, 56, 57].includes(weatherCode)) {
    return "Drizzle";
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
    return "Rain";
  }
  if ([95, 96, 99].includes(weatherCode)) {
    return "Thunderstorm";
  }
  return "Current weather";
}

function normalizeFeeAmount(feeAmount) {
  const normalizedAmount = Number(feeAmount);
  return Number.isFinite(normalizedAmount) && normalizedAmount >= 0 ? normalizedAmount : 0;
}

function formatFeeAmount(student) {
  const feeAmount = normalizeFeeAmount(student?.feeAmount);

  if (feeAmount === 0) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(feeAmount);
}

function getInitialFeeHistory(feePendingValue) {
  return getUpdatedFeeHistory({ feePending: null, feeHistory: {} }, feePendingValue);
}

function getUpdatedFeeHistory(currentStudent, nextFeePending, date = new Date()) {
  const monthKey = getPreviousFeeMonthKey(date);
  const dateValue = formatDateInputValue(date);
  const existingHistory = currentStudent?.feeHistory || {};
  const existingMonthRecord = existingHistory[monthKey] || {};
  const currentFeePending = Boolean(currentStudent?.feePending);
  const feeStatusChanged = currentStudent?.feePending === null || currentFeePending !== Boolean(nextFeePending);

  if (!feeStatusChanged && existingMonthRecord.status) {
    return existingHistory;
  }

  const nextMonthRecord = nextFeePending
    ? {
        ...existingMonthRecord,
        status: "pending",
        pendingDate: existingMonthRecord.pendingDate || dateValue
      }
    : {
        ...existingMonthRecord,
        status: "paid",
        paidDate: dateValue
      };

  return {
    ...existingHistory,
    [monthKey]: nextMonthRecord
  };
}

function getFeeMonthCalendarHtml(student, referenceDate = new Date(), options = {}) {
  const year = referenceDate.getFullYear();
  const dueMonthKey = getPreviousFeeMonthKey(referenceDate);
  const currentMonthKey = getFeeMonthKey(referenceDate);
  const months = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthDate = new Date(year, monthIndex, 1);
    const monthKey = getFeeMonthKey(monthDate);
    const monthLabel = monthDate.toLocaleString("en-US", { month: "short" });
    const feeRecord = getFeeMonthRecord(student, monthKey, dueMonthKey, currentMonthKey);
    const title = getFeeMonthTitle(feeRecord);
    const controls = options.editable && monthKey !== currentMonthKey
      ? `
        <span class="fee-month-actions">
          <button type="button" class="fee-month-action is-paid" onclick="setStudentFeeMonthStatus(${options.studentIndex}, '${monthKey}', 'paid')" title="Set paid">G</button>
          <button type="button" class="fee-month-action is-pending" onclick="setStudentFeeMonthStatus(${options.studentIndex}, '${monthKey}', 'pending')" title="Set pending">R</button>
          <button type="button" class="fee-month-action is-blank" onclick="setStudentFeeMonthStatus(${options.studentIndex}, '${monthKey}', 'none')" title="Set blank">B</button>
        </span>
      `
      : "";

    return `
      <span class="fee-month-cell">
        <span class="fee-month status-${feeRecord.status}" title="${title}">${monthLabel}</span>
        ${controls}
      </span>
    `;
  });

  return `
    <div class="fee-month-calendar">
      <div class="fee-month-calendar-head">
        <strong>Fee</strong>
        <span>${year}</span>
      </div>
      <div class="fee-month-grid">
        ${months.join("")}
      </div>
      <div class="fee-month-legend">
        <span><i class="status-paid"></i>Paid</span>
        <span><i class="status-pending"></i>Pending</span>
      </div>
    </div>
  `;
}

async function setStudentFeeMonthStatus(studentIndex, monthKey, status) {
  if (!requireTeacherLogin("change student fee status")) {
    return;
  }

  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  const currentStudent = students[studentIndex];
  if (!currentStudent || !["paid", "pending", "none"].includes(status)) {
    alert("Student fee record not found");
    return;
  }

  const feeHistory = {
    ...(currentStudent.feeHistory || {})
  };
  const today = formatDateInputValue(new Date());

  if (status === "none") {
    delete feeHistory[monthKey];
  } else {
    feeHistory[monthKey] = {
      ...(feeHistory[monthKey] || {}),
      status,
      ...(status === "paid" ? { paidDate: today } : { pendingDate: today })
    };
  }

  const dueMonthKey = getPreviousFeeMonthKey(new Date());
  const updatedStudent = {
    ...currentStudent,
    feePending: monthKey === dueMonthKey ? status === "pending" : currentStudent.feePending,
    feeHistory
  };

  const studentPayload = buildStudentRecordPayload(updatedStudent);

  try {
    await updateStudentRecord(currentStudent.firestoreId, studentPayload);
    students[studentIndex] = {
      firestoreId: currentStudent.firestoreId,
      feeCycleStartDay: currentStudent.feeCycleStartDay,
      feeCycleEndDay: currentStudent.feeCycleEndDay,
      ...studentPayload
    };
    await syncStudentInSchedules(currentStudent.id, studentPayload);
    showStudents();
    showStudentCheckList();
    refreshStudentDataViewIfNeeded();
  } catch (error) {
    console.error(error);
    alert("Unable to update fee month");
  }
}

function getFeeMonthRecord(student, monthKey, dueMonthKey, currentMonthKey) {
  if (monthKey === currentMonthKey) {
    return { status: "none" };
  }

  const historyRecord = student?.feeHistory?.[monthKey];

  if (monthKey === dueMonthKey) {
    if (student?.feePending) {
      return {
        status: "pending",
        pendingDate: historyRecord?.pendingDate || formatDateInputValue(new Date())
      };
    }

    if (historyRecord?.status === "paid") {
      return historyRecord;
    }

    return historyRecord || { status: "none" };
  }

  return historyRecord || { status: "none" };
}

function getFeeMonthTitle(feeRecord) {
  if (feeRecord.status === "paid") {
    return feeRecord.paidDate ? `Paid on ${feeRecord.paidDate}` : "Paid";
  }

  if (feeRecord.status === "pending") {
    return feeRecord.pendingDate ? `Pending from ${feeRecord.pendingDate}` : "Pending";
  }

  return "No fee record";
}

function getFeeMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getPreviousFeeMonthKey(date) {
  return getFeeMonthKey(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

function getFeeStatusText(student) {
  if (!student.feePending) {
    return "Clear";
  }

  return `Pending - ${getPreviousFeeMonthLabel(new Date())}`;
}

function formatFeeStatusHtml(student) {
  const feeStatus = getFeeStatusText(student);
  if (feeStatus.startsWith("Pending")) {
    return `<span class="blinking-red">Pending</span>`;
  }

  return feeStatus;
}

function hasFeeCycleCrossed(date, student) {
  return date.getDate() > getFeeCycleDay(student.feeCycleEndDay, DEFAULT_FEE_CYCLE_END_DAY);
}

async function normalizeAllStudentFeeCycles() {
  let studentsUpdated = false;

  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    const needsUpdate =
      student.feeCycleStartDay === undefined ||
      student.feeCycleStartDay === null ||
      student.feeCycleEndDay === undefined ||
      student.feeCycleEndDay === null;

    if (!needsUpdate) {
      continue;
    }

    const updatedStudent = {
      ...student,
      feeCycleStartDay: getFeeCycleDay(student.feeCycleStartDay, DEFAULT_FEE_CYCLE_START_DAY),
      feeCycleEndDay: getFeeCycleDay(student.feeCycleEndDay, DEFAULT_FEE_CYCLE_END_DAY)
    };

    students[index] = updatedStudent;
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

function getPreviousFeeMonthLabel(date) {
  return getPendingMonthLabel(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}
