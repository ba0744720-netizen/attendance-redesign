// ========================================
// NEW ATTENDANCE MARKING SYSTEM
// ========================================

const token = localStorage.getItem('authToken');
const userName = localStorage.getItem('userName');

if (!token) {
  alert('Please login first');
  window.location.href = '/login';
}

// Set user name and date
document.getElementById('userName').textContent = userName || 'User';
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-IN', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

let allStudents = [];
let filteredStudents = [];
let attendance = {}; // { studentId: 'Present' or 'Absent' }

// ========================================
// LOAD STUDENTS FROM API
// ========================================

async function loadStudents() {
  try {
    const response = await fetch('/students', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const result = await response.json();
    
    if (result.success) {
      allStudents = result.data;
      filteredStudents = allStudents;
      
      // Populate class filter dropdown
      populateClassFilter();
      
      // Display students
      displayStudents(filteredStudents);
      
      // Update stats
      updateStats();
    } else {
      alert('Error loading students: ' + result.message);
    }
  } catch (error) {
    console.error('Load error:', error);
    alert('Error loading students');
  }
}

// ========================================
// POPULATE CLASS FILTER
// ========================================

function populateClassFilter() {
  const classFilter = document.getElementById('classFilter');
  const uniqueClasses = [...new Set(allStudents.map(s => s.class))].sort();
  
  classFilter.innerHTML = '<option value="">All Classes</option>';
  uniqueClasses.forEach(className => {
    classFilter.innerHTML += `<option value="${className}">${className}</option>`;
  });
}

// ========================================
// DISPLAY STUDENTS IN TABLE
// ========================================

function displayStudents(students) {
  const tbody = document.getElementById('studentTableBody');
  
  if (students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="px-6 py-12 text-center text-gray-500">
          <div class="flex flex-col items-center gap-3">
            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            </svg>
            <span class="text-lg font-medium">No students found</span>
            <span class="text-sm text-gray-400">Try adjusting your filters</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = students.map(student => {
    const status = attendance[student.id];
    const isPresent = status === 'Present';
    const isAbsent = status === 'Absent';
    
    return `
      <tr class="border-b border-gray-100 hover:bg-indigo-50 transition-colors">
        <td class="px-6 py-4">
          <span class="font-mono font-bold text-gray-900">${student.rollNumber}</span>
        </td>
        <td class="px-6 py-4">
          <div class="font-semibold text-gray-900">${student.name}</div>
          <div class="text-sm text-gray-500">${student.year || 'III'} Year • ${student.course || 'B.Tech'}</div>
        </td>
        <td class="px-6 py-4">
          <span class="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-sm">
            ${student.class}
          </span>
        </td>
        <td class="px-6 py-4">
          <div class="flex gap-2 justify-center">
            <button 
              onclick="markAttendance(${student.id}, 'Present')"
              class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                isPresent 
                  ? 'bg-green-600 text-white shadow-lg scale-105' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Present
            </button>
            <button 
              onclick="markAttendance(${student.id}, 'Absent')"
              class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                isAbsent 
                  ? 'bg-red-600 text-white shadow-lg scale-105' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Absent
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ========================================
// MARK ATTENDANCE FOR SINGLE STUDENT
// ========================================

function markAttendance(studentId, status) {
  attendance[studentId] = status;
  displayStudents(filteredStudents);
  updateStats();
}

// ========================================
// MARK ALL PRESENT
// ========================================

function markAllPresent() {
  if (!confirm(`Mark all ${filteredStudents.length} filtered students as PRESENT?`)) {
    return;
  }
  
  filteredStudents.forEach(student => {
    attendance[student.id] = 'Present';
  });
  
  displayStudents(filteredStudents);
  updateStats();
}

// ========================================
// MARK ALL ABSENT
// ========================================

function markAllAbsent() {
  if (!confirm(`Mark all ${filteredStudents.length} filtered students as ABSENT?`)) {
    return;
  }
  
  filteredStudents.forEach(student => {
    attendance[student.id] = 'Absent';
  });
  
  displayStudents(filteredStudents);
  updateStats();
}

// ========================================
// UPDATE STATISTICS
// ========================================

function updateStats() {
  const totalStudents = filteredStudents.length;
  const presentCount = filteredStudents.filter(s => attendance[s.id] === 'Present').length;
  const absentCount = filteredStudents.filter(s => attendance[s.id] === 'Absent').length;
  const notMarkedCount = totalStudents - presentCount - absentCount;

  document.getElementById('totalStudents').textContent = totalStudents;
  document.getElementById('presentCount').textContent = presentCount;
  document.getElementById('absentCount').textContent = absentCount;
  document.getElementById('notMarkedCount').textContent = notMarkedCount;

  const markedCount = presentCount + absentCount;
  document.getElementById('submitInfo').textContent = 
    `${markedCount} of ${totalStudents} students marked`;
}

// ========================================
// APPLY FILTERS
// ========================================

function applyFilters() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const courseFilter = document.getElementById('courseFilter').value;
  const yearFilter = document.getElementById('yearFilter').value;
  const branchFilter = document.getElementById('branchFilter').value;
  const classFilter = document.getElementById('classFilter').value;

  filteredStudents = allStudents.filter(student => {
    const matchesSearch = !searchTerm || 
      student.name.toLowerCase().includes(searchTerm) ||
      student.rollNumber.toLowerCase().includes(searchTerm);
    
    const matchesCourse = !courseFilter || student.course === courseFilter;
    const matchesYear = !yearFilter || student.year === yearFilter;
    const matchesBranch = !branchFilter || student.branch === branchFilter;
    const matchesClass = !classFilter || student.class === classFilter;

    return matchesSearch && matchesCourse && matchesYear && matchesBranch && matchesClass;
  });

  displayStudents(filteredStudents);
  updateStats();
}

// ========================================
// CLEAR FILTERS
// ========================================

function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('courseFilter').value = '';
  document.getElementById('yearFilter').value = '';
  document.getElementById('branchFilter').value = '';
  document.getElementById('classFilter').value = '';
  
  filteredStudents = allStudents;
  displayStudents(filteredStudents);
  updateStats();
}

// ========================================
// SUBMIT ATTENDANCE
// ========================================

async function submitAttendance() {
  const markedStudents = filteredStudents.filter(s => attendance[s.id]);
  
  if (markedStudents.length === 0) {
    alert('Please mark attendance for at least one student!');
    return;
  }

  const unmarkedCount = filteredStudents.length - markedStudents.length;
  
  if (unmarkedCount > 0) {
    const confirmSubmit = confirm(
      `⚠️ Warning: ${unmarkedCount} student(s) attendance not marked.\n\nDo you want to submit anyway?`
    );
    if (!confirmSubmit) return;
  }

  // Prepare bulk attendance data
  const attendanceData = markedStudents.map(student => ({
    studentId: student.id,
    status: attendance[student.id]
  }));

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg class="w-6 h-6 inline-block mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
    </svg>
    Submitting...
  `;

  try {
    const response = await fetch('/attendance/mark-bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        students: attendanceData,
        date: new Date().toISOString().split('T')[0]
      })
    });

    const result = await response.json();
    
    if (result.success) {
      alert(`✅ Attendance submitted successfully!\n\n${result.data.success} students marked`);
      
      // Reset attendance
      attendance = {};
      displayStudents(filteredStudents);
      updateStats();
    } else {
      alert('Error submitting attendance: ' + result.message);
    }
  } catch (error) {
    console.error('Submit error:', error);
    alert('Error submitting attendance');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg class="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      Submit Attendance
    `;
  }
}

// ========================================
// NAVIGATION
// ========================================

function goBack() {
  const userRole = localStorage.getItem('userRole');
  window.location.href = userRole === 'admin' ? '/admin' : '/dashboard';
}

function logout() {
  localStorage.clear();
  window.location.href = '/login';
}

// ========================================
// LOAD ON PAGE LOAD
// ========================================

loadStudents();
