"use strict";

const form = document.getElementById("gradeForm");
const marksInputs = [...document.querySelectorAll(".mark")];
const errorBox = document.getElementById("formError");
const STORAGE_KEY = "grademate.studentRecords.v1";

let currentResult = null;
let records = loadRecords();

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(r =>
      r && typeof r.id === "string" &&
      typeof r.name === "string" &&
      Array.isArray(r.subjects)
    ) : [];
  } catch {
    return [];
  }
}

// Example grading scale for demonstration; adjust to your institution.
function getGrade(mark) {
  if (mark >= 80) return { letter: "A+", point: 5.0 };
  if (mark >= 70) return { letter: "A", point: 4.0 };
  if (mark >= 60) return { letter: "A-", point: 3.5 };
  if (mark >= 50) return { letter: "B", point: 3.0 };
  if (mark >= 40) return { letter: "C", point: 2.0 };
  if (mark >= 33) return { letter: "D", point: 1.0 };
  return { letter: "F", point: 0.0 };
}

function calculateResult(name, id, subjects) {
  const total = subjects.reduce((sum, subject) => sum + subject.mark, 0);
  const maximum = subjects.length * 100;
  const percentage = (total / maximum) * 100;
  const average = total / subjects.length;
  const passed = subjects.every(subject => subject.mark >= 33);
  const grade = getGrade(average);

  // GPA is the average of the example subject grade points.
  const gpa = subjects.reduce(
    (sum, subject) => sum + getGrade(subject.mark).point, 0
  ) / subjects.length;

  return {
    name, id, subjects, total, maximum, percentage, average,
    gpa, grade: passed ? grade.letter : "F",
    passed, createdAt: new Date().toISOString()
  };
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function hideError() {
  errorBox.textContent = "";
  errorBox.hidden = true;
}

function renderResult(result) {
  document.getElementById("emptyState").hidden = true;
  document.getElementById("results").hidden = false;

  document.getElementById("letterGrade").textContent = result.grade;
  const status = document.getElementById("resultStatus");
  status.textContent = result.passed ? "PASSED" : "FAILED";
  status.classList.toggle("fail", !result.passed);

  document.getElementById("totalMarks").textContent =
    `${result.total} / ${result.maximum}`;
  document.getElementById("percentage").textContent =
    `${result.percentage.toFixed(2)}%`;
  document.getElementById("gpa").textContent = result.gpa.toFixed(2);
  document.getElementById("average").textContent =
    result.average.toFixed(2);
  document.getElementById("resultName").textContent = result.name;
  document.getElementById("resultId").textContent = result.id;

  const container = document.getElementById("subjectResults");
  container.replaceChildren();

  result.subjects.forEach(subject => {
    const grade = getGrade(subject.mark);
    const row = document.createElement("div");
    const top = document.createElement("div");
    top.className = "subject-result-top";

    const name = document.createElement("span");
    name.textContent = subject.name;
    const score = document.createElement("span");
    score.textContent = `${subject.mark}/100 · ${grade.letter}`;
    top.append(name, score);

    const track = document.createElement("div");
    track.className = "track";
    const bar = document.createElement("span");
    bar.style.width = `${subject.mark}%`;
    track.append(bar);
    row.append(top, track);
    container.append(row);
  });
}

function persistRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    alert("Could not save records. Your browser storage may be full or disabled.");
    return false;
  }
}

function renderRecords() {
  const body = document.getElementById("recordsBody");
  body.replaceChildren();

  records.forEach((record, index) => {
    const row = document.createElement("tr");
    const values = [
      record.name, record.id,
      `${record.total}/${record.maximum}`,
      `${record.percentage.toFixed(2)}%`,
      record.grade, record.passed ? "Passed" : "Failed"
    ];

    values.forEach((value, i) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      if (i === 4) {
        const pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = value;
        cell.replaceChildren(pill);
      }
      row.append(cell);
    });

    const actionCell = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-record";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete record for ${record.name}`);
    deleteButton.addEventListener("click", () => {
      const previous = records;
      records = records.filter((_, i) => i !== index);
      if (persistRecords()) renderRecords();
      else records = previous;
    });
    actionCell.append(deleteButton);
    row.append(actionCell);
    body.append(row);
  });

  document.getElementById("recordCount").textContent =
    `${records.length} record${records.length === 1 ? "" : "s"}`;
  document.getElementById("recordsEmpty").hidden = records.length > 0;
}

form.addEventListener("submit", event => {
  event.preventDefault();
  hideError();

  const name = document.getElementById("studentName").value.trim();
  const id = document.getElementById("studentId").value.trim();

  if (!name || !id) {
    showError("Please enter the student's name and ID.");
    return;
  }

  const subjects = [];
  for (const input of marksInputs) {
    const raw = input.value.trim();
    const mark = Number(raw);

    if (raw === "" || !Number.isFinite(mark) ||
        mark < 0 || mark > 100 || !Number.isInteger(mark)) {
      showError("Enter a whole-number mark from 0 to 100 for every subject.");
      input.focus();
      return;
    }

    subjects.push({ name: input.dataset.subject, mark });
  }

  currentResult = calculateResult(name, id, subjects);
  renderResult(currentResult);
});

form.addEventListener("reset", () => {
  hideError();
  currentResult = null;
  document.getElementById("results").hidden = true;
  document.getElementById("emptyState").hidden = false;
});

document.getElementById("saveButton").addEventListener("click", () => {
  if (!currentResult) return;

  // Replace the existing record when the same student ID is used.
  const previous = records;
  records = records.filter(r => r.id.toLowerCase() !== currentResult.id.toLowerCase());
  records.unshift(currentResult);

  if (persistRecords()) {
    renderRecords();
    alert("Student record saved successfully!");
  } else {
    records = previous;
  }
});

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

document.getElementById("exportButton").addEventListener("click", () => {
  if (!records.length) {
    alert("There are no records to export yet.");
    return;
  }

  const header = [
    "Student Name", "Student ID", "Total Marks", "Maximum Marks",
    "Percentage", "Average", "GPA", "Grade", "Status", ...marksInputs.map(i => i.dataset.subject)
  ];
  const rows = records.map(r => [
    r.name, r.id, r.total, r.maximum, r.percentage.toFixed(2),
    r.average.toFixed(2), r.gpa.toFixed(2), r.grade,
    r.passed ? "Passed" : "Failed",
    ...r.subjects.map(s => s.mark)
  ]);

  const csv = "\uFEFF" + [header, ...rows]
    .map(row => row.map(csvEscape).join(",")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "student-grade-records.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

document.getElementById("clearRecordsButton").addEventListener("click", () => {
  if (!records.length) {
    alert("There are no saved records to clear.");
    return;
  }
  if (!confirm("Delete ALL saved student records from this browser?")) return;

  const previous = records;
  records = [];
  if (persistRecords()) renderRecords();
  else records = previous;
});

renderRecords();
