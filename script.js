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
  watchTeacherAuthState,
  addAttendanceRecord,
  getAttendanceHistory,
  getAttendanceHistoryByDateRange
} from "./firebase-api.js";
import { uploadImageToCloudinary } from "./cloudinary-api.js";

let students = [];
let schedules = [];
let attendanceHistoryCache = {}; // Cache for attendance history: { studentId: [attendance records] }
let editingStudentIndex = null;
let teacherProfile = null;
let currentRatingStudentIndex = null;
let selectedMathsRating = 0;
let selectedScienceRating = 0;
let scheduleCleanupTimerId = null;
let isCleaningExpiredSchedules = false;
let studentCountdownTimerId = null;
let teacherScheduleTimerId = null;

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
const teacherDashboardPhoto = document.getElementById("teacherDashboardPhoto");
const teacherPhotoFile = document.getElementById("teacherPhotoFile");
const teacherLoginPhotoFile = document.getElementById("teacherLoginPhotoFile");
const teacherNoticeInput = document.getElementById("teacherNoticeInput");
const homeNoticeText = document.getElementById("homeNoticeText");
const ranchiTemperature = document.getElementById("ranchiTemperature");
const ranchiWeatherText = document.getElementById("ranchiWeatherText");
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
const themeToggleBtn = document.getElementById("themeToggleBtn");

const FIREBASE_WARNING = "Firebase config missing. Open firebase-api.js and paste your Firebase web app config.";
const DEFAULT_TEACHER_PHOTO = "https://placehold.co/300x300/f2efe6/8b5e34?text=Teacher";
const DEFAULT_STUDENT_PHOTO = "https://placehold.co/300x300/e8f5f1/1f6f66?text=Student";
const DEFAULT_FEE_CYCLE_START_DAY = 1;
const DEFAULT_FEE_CYCLE_END_DAY = 30;
const TEACHER_WHATSAPP_NUMBER = "8864022272";
const TEACHER_WHATSAPP_COUNTRY_CODE = "91";
const SCHEDULE_AUTO_DELETE_AFTER_HOURS = 3;
const SCHEDULE_CLEANUP_INTERVAL_MS = 60 * 1000;
const CLASS_TIMER_DURATION_MS = 60 * 60 * 1000;
const DEFAULT_HOME_NOTICE = "No notice yet.";
const RANCHI_WEATHER_URL = "https://api.open-meteo.com/v1/forecast?latitude=23.3441&longitude=85.3096&current=temperature_2m,weather_code&timezone=auto";
const WEATHER_THEME_CLASSES = [
  "weather-ready",
  "weather-sunny",
  "weather-cloudy",
  "weather-cold",
  "weather-rainy",
  "weather-foggy",
  "weather-thunder"
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
window.deleteSchedule = deleteSchedule;
window.loadStudentData = loadStudentData;
window.closeStudentModal = closeStudentModal;
window.closeFeeReminderModal = closeFeeReminderModal;
window.studentAttendance = studentAttendance;
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

initializeThemeMode();
initializeScheduleDefaults();
initializeStudentModal();
initializeFeeReminderModal();
initializeStudentRegisterForm();
initializeScheduleForm();
startScheduleCleanupLoop();
startStudentCountdownLoop();
startTeacherScheduleLoop();
loadRanchiWeather();
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
    alert("Saved");
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
    const studentDetailsId = `teacherStudentDetails_${index}`;
    
    studentList.innerHTML += `
      <div class="box teacher-student-card">
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
            <strong>Fee Cycle:</strong> ${student.feeCycleStartDay || DEFAULT_FEE_CYCLE_START_DAY} to ${student.feeCycleEndDay || DEFAULT_FEE_CYCLE_END_DAY}<br>
            <strong>Fee Status:</strong> ${formatFeeStatusHtml(student)}<br>
            <strong>Overall Rating:</strong> ${overallText}
            <button class="secondary-btn compact-btn student-more-btn" onclick="toggleStudentMore(this)">Show More</button>
            <div class="student-more-details hidden">
              ${getAttendanceCalendarHtml(student.id)}
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
  const student = students[index];
  editingStudentIndex = index;
  openStudentRegisterForm();
  studentId.value = student.id;
  studentName.value = student.name;
  studentFeeAmount.value = normalizeFeeAmount(student.feeAmount);
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

  if (!date || !day) {
    alert("Fill Date and Day");
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
      let attendanceReason = "";

      if (isHoliday) {
        attendanceReason = askHolidayReason();
        if (attendanceReason === null) {
          return;
        }
      }
      
      selectedStudents.push({
        ...student,
        attendanceStatus: isHoliday ? "holiday" : "pending",
        attendanceReason
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
    classStoppedAt: null,
    students: selectedStudents.map(({ firestoreId, ...student }) => ({
      ...student
    }))
  };

  try {
    const firestoreId = await addScheduleRecord(schedulePayload);
    schedules.push({ firestoreId, ...schedulePayload });
    loadSchedules();
    setScheduleFieldsToDate(new Date());
    classTime.value = "";
    showStudentCheckList();
    alert("Saved");
  } catch (error) {
    console.error(error);
    alert("Unable to save schedule to Firestore");
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

function getVisibleSchedules(now = new Date()) {
  return schedules.filter((schedule) => !isScheduleExpired(schedule, now));
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

  try {
    for (const schedule of expiredSchedules) {
      try {
        // Save attendance records to history before deleting the schedule
        for (const student of schedule.students) {
          const attendanceStatus = student.attendanceStatus || "pending";
          if (["coming", "not-coming", "holiday"].includes(attendanceStatus)) {
            try {
              await addAttendanceRecord({
                studentId: student.id,
                date: schedule.date,
                day: schedule.day,
                time: schedule.time || "",
                status: attendanceStatus,
                reason: student.attendanceReason || "",
                scheduleId: schedule.firestoreId
              });
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

    if (deletedScheduleIds.length === 0) {
      return 0;
    }

    schedules = schedules.filter((schedule) => !deletedScheduleIds.includes(schedule.firestoreId));

    if (refreshViews) {
      loadSchedules();
      refreshStudentDataViewIfNeeded();
    }

    return deletedScheduleIds.length;
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
      <button class="delete compact-btn" onclick="deleteSchedule('${schedule.firestoreId}')">Delete Class</button>
    </div>
  `;
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

  try {
    const history = await getAttendanceHistory(studentId);
    attendanceHistoryCache[studentId] = history;
  } catch (error) {
    console.error("Error loading attendance history:", error);
  }
}

function loadStudentData(options = {}) {
  const { openModalAfterLoad, showFeeReminder } = normalizeLoadStudentDataOptions(options);
  const id = loginStudentId.value.trim();
  
  // Load attendance history asynchronously
  if (id && isFirebaseReady()) {
    loadAttendanceHistoryForStudent(id).catch(error => {
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
      if (student.id === id) {
        const fullStudent = students.find(s => s.id === id);
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
        
        const attendanceButtonsHtml = isHoliday ? 
          `<div style="margin-top: 10px; padding: 8px; background: #fef3c7; border-radius: 5px; color: #f59e0b; font-weight: bold;">Holiday marked by teacher</div>` :
          `<div class="attendance-actions" style="display:flex; gap:10px; flex-wrap:wrap; margin-top: 10px;">
            <button class="secondary-btn compact-btn" style="flex:1; min-width: 160px;" onclick="studentAttendance('${schedule.firestoreId}','${student.id}','coming','student')">I will come</button>
            <button class="secondary-btn compact-btn" style="flex:1; min-width: 160px; background:#dc2626; color:#fff;" onclick="studentAttendance('${schedule.firestoreId}','${student.id}','not-coming','student')">I will not come today</button>
          </div>`;
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
    const studentRecord = students.find((student) => student.id === id);
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

function getAttendanceCalendarHtml(studentId, referenceDate = new Date()) {
  // Show current month and previous month
  const currentMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  
  // Build calendars for both months
  const currentMonthHtml = buildMonthCalendar(studentId, currentMonth.getFullYear(), currentMonth.getMonth());
  const previousMonthHtml = buildMonthCalendar(studentId, previousMonth.getFullYear(), previousMonth.getMonth());

  return `
    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
      ${previousMonthHtml}
      ${currentMonthHtml}
    </div>
    <div class="attendance-calendar-legend" style="margin-top: 15px;">
      <span><i class="status-coming"></i>Present</span>
      <span><i class="status-not-coming"></i>Absent</span>
      <span><i class="status-holiday"></i>Holiday</span>
    </div>
  `;
}

function buildMonthCalendar(studentId, year, month) {
  const monthLabel = new Date(year, month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const attendanceByDate = getStudentAttendanceByDate(studentId, year, month);
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const blanks = Array.from({ length: firstDay.getDay() }, () => `<span class="attendance-calendar-day is-empty"></span>`);
  const days = Array.from({ length: totalDays }, (_, dayIndex) => {
    const day = dayIndex + 1;
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const status = attendanceByDate[dateKey] || "none";
    const label = getAttendanceCalendarLabel(status);
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

    const scheduleStudent = schedule.students.find((student) => student.id === studentId);
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
  if (attendanceHistoryCache[studentId]) {
    attendanceHistoryCache[studentId].forEach((record) => {
      const recordDate = parseScheduleDate(record.date);
      if (!recordDate || recordDate.getFullYear() !== year || recordDate.getMonth() !== month) {
        return;
      }

      const status = record.status || "pending";
      if (!["coming", "not-coming", "holiday"].includes(status)) {
        return;
      }

      // Only use history if not already in current schedules
      if (!attendanceByDate[record.date]) {
        attendanceByDate[record.date] = status;
      }
    });
  }

  return attendanceByDate;
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

function buildStudentAbsenceMessage(schedule, student, customMessage) {
  const classTiming = schedule.time ? ` at ${formatTime12Hour(schedule.time)}` : " (Holiday - No Class)";
  return `Student ${student.name} (ID: ${student.id}) will not come to class on ${schedule.date}${classTiming}. Message: ${customMessage}`;
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

async function studentAttendance(scheduleId, studentId, status, source = "teacher") {
  const schedule = schedules.find(s => s.firestoreId === scheduleId);
  if (!schedule) {
    alert("Schedule not found");
    return;
  }

  const student = schedule.students.find(s => s.id === studentId);
  if (!student) {
    alert("Student not found in schedule");
    return;
  }

  if (source === "student" && status === "not-coming") {
    const customMessage = whatsappMsg.value.trim() || "I will not come today.";
    whatsappMsg.value = customMessage;

    const message = buildStudentAbsenceMessage(schedule, student, customMessage);
    await updateStudentAttendance(scheduleId, studentId, status, customMessage);
    openTeacherWhatsApp(message);
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
  const studentIndex = schedule.students.findIndex((student) => student.id === studentId);
  if (studentIndex === -1) {
    alert("Student not found in schedule");
    return;
  }

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
    await addAttendanceRecord({
      studentId: studentId,
      date: schedule.date,
      day: schedule.day,
      time: schedule.time || "",
      status: status,
      reason: reason || "",
      scheduleId: scheduleId
    });
    
    schedules[scheduleIndex] = { firestoreId: schedule.firestoreId, ...updatedSchedule };
    loadSchedules();
    showStudents();
    const currentStudentId = loginStudentId.value.trim();
    if (currentStudentId === studentId) {
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
  const student = schedule.students.find((s) => s.id === studentId);
  if (!student) {
    alert("Student not found in schedule");
    return;
  }

  if (!confirm(`Remove ${student.name} from this class schedule?`)) {
    return;
  }

  const remainingStudents = schedule.students.filter((s) => s.id !== studentId);
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
    if (currentStudentId === studentId) {
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
  students = await getStudents();
  schedules = await getSchedules();
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
    if (user) {
      showPage("teacherPage");
      return;
    }

    const activePage = document.querySelector(".page.active");
    if (activePage && activePage.id === "teacherPage") {
      showPage("loginPage");
    }
  });

  // Teacher login photo setting
  const teacherPhotoContainer = document.querySelector(".teacher-photo-container");
  if (teacherPhotoContainer) {
    teacherPhotoContainer.addEventListener("click", () => {
      teacherLoginPhotoFile.click();
    });
  }

  if (teacherLoginPhotoFile) {
    teacherLoginPhotoFile.addEventListener("change", async (event) => {
      if (!event.target.files[0]) return;
      try {
        const photoUrl = await uploadImageToCloudinary(event.target.files[0], "tuition-project/teachers");
        teacherLoginPhoto.src = photoUrl;
        teacherDashboardPhoto.src = photoUrl;
        // Save to teacher profile
        await updateTeacherProfile({ photoUrl });
        alert("Teacher photo updated successfully!");
      } catch (error) {
        console.error(error);
        alert("Failed to upload photo");
      }
      event.target.value = "";
    });
  }
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
      feeAmount: normalizeFeeAmount(updatedStudent.feeAmount),
      feeHistory: updatedStudent.feeHistory || {},
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

async function saveTeacherNotice() {
  if (!isFirebaseReady()) {
    alert(FIREBASE_WARNING);
    return;
  }

  const notice = teacherNoticeInput.value.trim();

  try {
    teacherProfile = {
      ...(teacherProfile || {}),
      notice
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
  teacherDashboardPhoto.src = teacherPhoto;
  const notice = teacherProfile?.notice?.trim() || DEFAULT_HOME_NOTICE;

  if (homeNoticeText) {
    homeNoticeText.textContent = notice;
  }

  if (teacherNoticeInput) {
    teacherNoticeInput.value = teacherProfile?.notice || "";
  }
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

    if (!Number.isFinite(temperature)) {
      throw new Error("Weather temperature missing");
    }

    ranchiTemperature.textContent = `${temperature}\u00B0C`;
    ranchiWeatherText.textContent = getWeatherDescription(weatherCode);
    applyWeatherTheme(getWeatherTheme(weatherCode, temperature));
  } catch (error) {
    console.error(error);
    ranchiTemperature.textContent = "--";
    ranchiWeatherText.textContent = "Weather unavailable";
    applyWeatherTheme("");
  }
}

function applyWeatherTheme(themeName) {
  document.body.classList.remove(...WEATHER_THEME_CLASSES);

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

  const studentPayload = {
    id: updatedStudent.id,
    name: updatedStudent.name,
    feePending: updatedStudent.feePending,
    feeAmount: normalizeFeeAmount(updatedStudent.feeAmount),
    feeHistory: updatedStudent.feeHistory,
    photoUrl: updatedStudent.photoUrl || "",
    feeCycleStartDay: updatedStudent.feeCycleStartDay,
    feeCycleEndDay: updatedStudent.feeCycleEndDay,
    subjectRatings: updatedStudent.subjectRatings || { maths: 0, science: 0 }
  };

  try {
    await updateStudentRecord(currentStudent.firestoreId, studentPayload);
    students[studentIndex] = {
      firestoreId: currentStudent.firestoreId,
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
      feeAmount: normalizeFeeAmount(updatedStudent.feeAmount),
      feeHistory: updatedStudent.feeHistory || {},
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

function getPreviousFeeMonthLabel(date) {
  return getPendingMonthLabel(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}
