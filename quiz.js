// quiz.js — Final production-ready quiz script
// Works with mcq-data/<subject>.json where JSON = { "mcqs": [ ... ] }
// Saves results in multiple localStorage keys for compatibility.

(() => {
  const containerId = "quiz-container"; // quiz.html should have <div id="quiz-container"></div>
  const SUBJECT_KEY = "selectedSubject"; // set by mcq.html
  const MAX_QUESTIONS = 10;

  // util: shuffle array in-place
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // get DOM container
  const root = document.getElementById(containerId);
  if (!root) {
    console.error("quiz.js: missing container #" + containerId);
    return;
  }

  // state
  let subject = localStorage.getItem(SUBJECT_KEY) || "c";
  let pool = [];         // all mcqs loaded
  let questions = [];    // selected (shuffled) questions for this quiz
  let current = 0;
  let selectedAnswers = []; // store selected option (string) per index

  // render helpers
  function renderLayout() {
    root.innerHTML = `
      <div class="quiz-wrap" style="max-width:800px;margin:10px auto;">
        <div id="meta" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div style="color:#ffd700;font-weight:700;font-size:18px" id="subjectTitle"></div>
          <div id="progress" style="color:#ccc;font-size:14px"></div>
        </div>

        <div id="qcard" style="background:#111;padding:22px;border-radius:12px;box-shadow:0 6px 20px rgba(255,215,0,0.06);">
          <div id="questionText" style="color:#fff;font-size:20px;font-weight:600;margin-bottom:16px">Loading...</div>
          <div id="options" style="display:flex;flex-direction:column;gap:12px"></div>
        </div>

        <div style="display:flex;gap:12px;margin-top:18px;align-items:center">
          <button id="prevBtn" style="flex:1;padding:12px;border-radius:10px;border:none;background:transparent;color:#fff;border:1px solid #444;cursor:pointer">Previous</button>
          <button id="nextBtn" style="flex:1;padding:12px;border-radius:10px;border:none;background:#ffd700;color:#000;font-weight:700;cursor:pointer">Next</button>
        </div>

        <div style="margin-top:12px;color:#aaa;font-size:13px;text-align:center">
          <small>Answers are saved locally. You can review after finishing.</small>
        </div>
      </div>
    `;

    document.getElementById("subjectTitle").innerText = subject.toUpperCase() + " MCQ";
    document.getElementById("prevBtn").addEventListener("click", onPrev);
    document.getElementById("nextBtn").addEventListener("click", onNext);
  }

  // load JSON file for subject
  async function loadMCQs() {
    try {
      const path = `mcq-data/${subject}.json`;
      const res = await fetch(path, {cache: "no-store"});
      if (!res.ok) throw new Error("Failed to fetch " + path);
      const data = await res.json();
      pool = data.mcqs || data; // support both {mcqs:[]} and raw array
      if (!Array.isArray(pool) || pool.length === 0) throw new Error("No MCQs found in " + path);

      shuffle(pool);
      questions = pool.slice(0, Math.min(MAX_QUESTIONS, pool.length));
      // For fairness, also shuffle options for each question but keep answer mapping:
      questions.forEach(q => {
        if (!Array.isArray(q.options)) q.options = [];
        // attach original correct value then shuffle options
        q._correct = q.answer;
        shuffle(q.options);
      });

      selectedAnswers = new Array(questions.length).fill(null);
      updateUI();
    } catch (err) {
      root.innerHTML = `<div style="color:#ff6b6b;background:#2a0000;padding:18px;border-radius:8px">Error loading quiz: ${err.message}</div>`;
      console.error(err);
    }
  }

  // update question UI
  function updateUI() {
    const q = questions[current];
    if (!q) return;
    document.getElementById("questionText").innerText = `${current + 1}. ${q.question}`;
    document.getElementById("progress").innerText = `Question ${current + 1} of ${questions.length}`;

    const optionsDiv = document.getElementById("options");
    optionsDiv.innerHTML = "";
    q.options.forEach((opt, idx) => {
      const isChecked = selectedAnswers[current] === opt;
      const optBtn = document.createElement("div");
      optBtn.className = "opt";
      optBtn.style.cssText = `
        background: #1a1a1a; color: ${isChecked ? "#000" : "#fff"};
        padding:12px;border-radius:10px;border:2px solid ${isChecked ? "#ffd700" : "transparent"};
        cursor:pointer; transition: all .18s; display:flex;align-items:center;gap:12px;
      `;
      optBtn.onmouseenter = () => { if (!isChecked) optBtn.style.transform = "translateX(6px)"; };
      optBtn.onmouseleave = () => { optBtn.style.transform = "translateX(0)"; };
      optBtn.innerHTML = `
        <div style="width:22px;height:22px;border-radius:6px;background:${isChecked ? "#ffd700" : "#333"};display:inline-block"></div>
        <div style="flex:1">${opt}</div>
      `;
      optBtn.addEventListener("click", () => {
        selectedAnswers[current] = opt;
        // visual update: re-render current question
        updateUI();
      });
      optionsDiv.appendChild(optBtn);
    });

    // Prev/Next button text & visibility
    document.getElementById("prevBtn").style.display = current === 0 ? "none" : "inline-block";
    document.getElementById("nextBtn").innerText = current === questions.length - 1 ? "Finish & See Results" : "Next";
  }

  // Prev handler
  function onPrev() {
    saveProgressToLocalStorage(); // optional autosave
    if (current > 0) {
      current--;
      updateUI();
    }
  }

  // Next / Finish handler
  function onNext() {
    // require selection
    if (selectedAnswers[current] === null) {
      alert("Please select an option before continuing.");
      return;
    }

    if (current < questions.length - 1) {
      current++;
      updateUI();
    } else {
      finishQuiz();
    }
  }

  // compute score and save results -> redirect to result.html
  function finishQuiz() {
    const results = questions.map((q, i) => {
      // note: q._correct contains original correct answer text; but since options were shuffled, correct option text remains q._correct
      const selected = selectedAnswers[i] || null;
      const correct = q._correct || q.answer; // fallback
      const status = selected === correct ? "correct" : "wrong";
      return {
        question: q.question,
        options: q.options,
        selected: selected,
        correct: correct,
        status: status,
        explanation: q.explanation || ""
      };
    });

    const score = results.reduce((s, r) => s + (r.status === "correct" ? 1 : 0), 0);
    const total = results.length;

    // save many keys for compatibility across different result/answers pages
    localStorage.setItem("quizScore", String(score));
    localStorage.setItem("quizTotal", String(total));
    localStorage.setItem("quizResults", JSON.stringify(results));    // generic results
    // older answers.html expects quizAnswers with fields {question, userAnswer, correctAnswer}
    const answersForOld = results.map(r => ({
      question: r.question,
      userAnswer: r.selected,
      correctAnswer: r.correct
    }));
    localStorage.setItem("quizAnswers", JSON.stringify(answersForOld));
    // also store a combined dataset
    localStorage.setItem("quizData", JSON.stringify({
      subject, questions, selectedAnswers, results
    }));

    // Redirect to result page — include score & total in URL for pages that use query params
    const params = `?score=${score}&total=${total}`;
    window.location.href = "result.html" + params;
  }

  // small autosave in progress (optional)
  function saveProgressToLocalStorage() {
    localStorage.setItem("quizProgress", JSON.stringify({
      subject, questionsPreview: questions.map(q => ({question:q.question})), selectedAnswers, current
    }));
  }

  // start
  renderLayout();
  loadMCQs();
})();
