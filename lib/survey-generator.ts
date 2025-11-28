// Update the SurveyData interface to include id
interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
  required: boolean;
}

interface SurveyData {
  id?: string;
  title: string;
  description: string;
  questions: Question[];
}

// Update the function signature and usage
export function generateSurveyHtml(surveyData: SurveyData): string {
  const surveyId = surveyData.id || `survey-${Date.now()}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${surveyData.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #334155;
            background-color: #f8fafc;
            padding: 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            min-height: calc(100vh - 40px);
            display: flex;
            flex-direction: column;
        }

        .header {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
            color: white;
            padding: 30px;
            text-align: center;
            flex-shrink: 0;
        }

        .header h1 {
            font-size: 2.2rem;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .header p {
            font-size: 1rem;
            opacity: 0.9;
        }

        .progress-container {
            background: white;
            padding: 20px 30px;
            border-bottom: 1px solid #e2e8f0;
            flex-shrink: 0;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 15px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #7c3aed 0%, #a855f7 100%);
            width: 0%;
            transition: width 0.4s ease;
            border-radius: 4px;
        }

        .progress-text {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9rem;
            color: #64748b;
        }

        .progress-text .current-step {
            font-weight: 600;
            color: #7c3aed;
        }

        .content {
            flex: 1;
            padding: 40px 30px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .question-page {
            display: none;
            animation: fadeIn 0.3s ease-in-out;
        }

        .question-page.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .question-block {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            transition: all 0.3s ease;
        }

        .question-title {
            font-size: 1.4rem;
            font-weight: 600;
            margin-bottom: 25px;
            color: #1e293b;
            line-height: 1.4;
        }

        .required {
            color: #ef4444;
        }

        .option-group {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .option {
            display: flex;
            align-items: center;
            padding: 16px 20px;
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 1rem;
        }

        .option:hover {
            border-color: #7c3aed;
            background: #faf5ff;
            transform: translateY(-1px);
        }

        .option.selected {
            border-color: #7c3aed;
            background: #faf5ff;
        }

        .option input[type="radio"],
        .option input[type="checkbox"] {
            margin-right: 15px;
            transform: scale(1.3);
            accent-color: #7c3aed;
        }

        .option label {
            cursor: pointer;
            font-weight: 500;
            flex: 1;
        }

        .text-input {
            width: 100%;
            padding: 20px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 1rem;
            resize: vertical;
            min-height: 140px;
            font-family: inherit;
            transition: border-color 0.2s ease;
        }

        .text-input:focus {
            outline: none;
            border-color: #7c3aed;
            box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }

        .rating-group {
            display: flex;
            gap: 12px;
            justify-content: center;
            margin: 25px 0;
            flex-wrap: wrap;
        }

        .rating-button {
            width: 55px;
            height: 55px;
            border: 2px solid #e2e8f0;
            background: white;
            border-radius: 50%;
            cursor: pointer;
            font-weight: 600;
            font-size: 1.2rem;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .rating-button:hover {
            border-color: #7c3aed;
            background: #faf5ff;
            transform: scale(1.05);
        }

        .rating-button.selected {
            background: #7c3aed;
            color: white;
            border-color: #7c3aed;
        }

        .rating-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            font-size: 0.9rem;
            color: #64748b;
        }

        .navigation {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 30px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            flex-shrink: 0;
        }

        .nav-button {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 1rem;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 120px;
        }

        .nav-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(124, 58, 237, 0.3);
        }

        .nav-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .nav-button.secondary {
            background: #64748b;
            background: linear-gradient(135deg, #64748b 0%, #475569 100%);
        }

        .nav-button.secondary:hover:not(:disabled) {
            box-shadow: 0 8px 25px rgba(100, 116, 139, 0.3);
        }

        .loading {
            display: none;
            text-align: center;
            padding: 60px 30px;
        }

        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #7c3aed;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 25px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .thank-you {
            display: none;
            text-align: center;
            padding: 80px 30px;
        }

        .thank-you h2 {
            color: #7c3aed;
            font-size: 2.5rem;
            margin-bottom: 20px;
            font-weight: 700;
        }

        .thank-you p {
            font-size: 1.1rem;
            color: #64748b;
            max-width: 500px;
            margin: 0 auto;
            line-height: 1.6;
        }

        .error {
            background: #fef2f2;
            border: 2px solid #fecaca;
            color: #dc2626;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
            font-weight: 500;
        }

        .question-counter {
            background: #7c3aed;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 20px;
        }

        @media (max-width: 768px) {
            body {
                padding: 10px;
            }

            .container {
                border-radius: 8px;
                min-height: calc(100vh - 20px);
            }

            .header {
                padding: 25px 20px;
            }

            .header h1 {
                font-size: 1.8rem;
            }

            .progress-container {
                padding: 15px 20px;
            }

            .content {
                padding: 30px 20px;
            }

            .question-block {
                padding: 25px 20px;
            }

            .question-title {
                font-size: 1.2rem;
            }

            .rating-group {
                gap: 8px;
            }

            .rating-button {
                width: 50px;
                height: 50px;
                font-size: 1.1rem;
            }

            .navigation {
                padding: 20px;
                flex-direction: column;
                gap: 15px;
            }

            .nav-button {
                width: 100%;
                min-width: auto;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${surveyData.title}</h1>
            <p>${surveyData.description}</p>
        </div>

        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-text">
                <span class="current-step" id="currentStep">Question 1 of ${
                  surveyData.questions.length
                }</span>
                <span id="progressPercent">0%</span>
            </div>
        </div>

        <div class="content">
            <div class="error" id="error-message"></div>
            
            <form id="survey-form">
                ${surveyData.questions
                  .map((question, index) =>
                    generateQuestionPageHtml(
                      question,
                      index,
                      surveyData.questions.length
                    )
                  )
                  .join("")}
            </form>
            
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <h3>Submitting your response...</h3>
                <p>Please wait while we save your answers.</p>
            </div>
            
            <div class="thank-you" id="thank-you">
                <h2>Thank You!</h2>
                <p>Your response has been submitted successfully. We appreciate you taking the time to share your feedback with us.</p>
            </div>
        </div>

        <div class="navigation" id="navigation">
            <button type="button" class="nav-button secondary" id="prevBtn" onclick="previousQuestion()" disabled>
                Previous
            </button>
            <button type="button" class="nav-button" id="nextBtn" onclick="nextQuestion()">
                Next
            </button>
        </div>
    </div>

    <script>
        const SURVEY_ID = '${surveyId}';
        const API_BASE_URL = 'http://localhost:5000';
        const TOTAL_QUESTIONS = ${surveyData.questions.length};
        let currentQuestionIndex = 0;
        let answers = {};
        let startTime = Date.now();
        
        // Load survey data from API on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadSurveyData();
            showQuestion(0);
            updateProgress();
        });
        
        async function loadSurveyData() {
            try {
                const response = await fetch(\`\${API_BASE_URL}/api/public/survey/\${SURVEY_ID}\`);
                const result = await response.json();
                
                if (result.success && result.data) {
                    // Update page with fresh survey data
                    updateSurveyContent(result.data);
                } else {
                    console.warn('Failed to load fresh survey data, using embedded data');
                }
            } catch (error) {
                console.warn('Failed to load survey data from API:', error);
                // Continue with embedded data
            }
        }
        
        function updateSurveyContent(surveyData) {
            // Update title and description if different
            const headerTitle = document.querySelector('.header h1');
            const headerDesc = document.querySelector('.header p');
            
            if (headerTitle && surveyData.title !== headerTitle.textContent) {
                headerTitle.textContent = surveyData.title;
            }
            
            if (headerDesc && surveyData.description !== headerDesc.textContent) {
                headerDesc.textContent = surveyData.description;
            }
        }
        
        function showQuestion(index) {
            // Hide all questions
            const allQuestions = document.querySelectorAll('.question-page');
            allQuestions.forEach(q => q.classList.remove('active'));
            
            // Show current question
            const currentQuestion = document.getElementById(\`question-\${index}\`);
            if (currentQuestion) {
                currentQuestion.classList.add('active');
            }
            
            // Update navigation buttons
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            prevBtn.disabled = index === 0;
            
            if (index === TOTAL_QUESTIONS - 1) {
                nextBtn.textContent = 'Submit Survey';
                nextBtn.onclick = submitSurvey;
            } else {
                nextBtn.textContent = 'Next';
                nextBtn.onclick = nextQuestion;
            }
            
            // Check if current question is answered to enable/disable next button
            updateNextButtonState();
        }
        
        function updateProgress() {
            const progress = ((currentQuestionIndex + 1) / TOTAL_QUESTIONS) * 100;
            document.getElementById('progressFill').style.width = progress + '%';
            document.getElementById('currentStep').textContent = \`Question \${currentQuestionIndex + 1} of \${TOTAL_QUESTIONS}\`;
            document.getElementById('progressPercent').textContent = Math.round(progress) + '%';
        }
        
        function nextQuestion() {
            if (currentQuestionIndex < TOTAL_QUESTIONS - 1) {
                // Save current answer
                saveCurrentAnswer();
                currentQuestionIndex++;
                showQuestion(currentQuestionIndex);
                updateProgress();
            }
        }
        
        function previousQuestion() {
            if (currentQuestionIndex > 0) {
                // Save current answer
                saveCurrentAnswer();
                currentQuestionIndex--;
                showQuestion(currentQuestionIndex);
                updateProgress();
            }
        }
        
        function saveCurrentAnswer() {
            const currentQuestion = document.getElementById(\`question-\${currentQuestionIndex}\`);
            if (!currentQuestion) return;
            
            const questionId = currentQuestion.dataset.questionId;
            const questionText = currentQuestion.querySelector('.question-title').textContent.replace(' *', '');
            
            // Get answer based on question type
            const radioInputs = currentQuestion.querySelectorAll('input[type="radio"]');
            const checkboxInputs = currentQuestion.querySelectorAll('input[type="checkbox"]');
            const textInput = currentQuestion.querySelector('textarea, input[type="text"]');
            
            let answer = null;
            
            if (radioInputs.length > 0) {
                const checkedRadio = currentQuestion.querySelector('input[type="radio"]:checked');
                if (checkedRadio) {
                    answer = checkedRadio.value;
                }
            } else if (checkboxInputs.length > 0) {
                const checkedBoxes = currentQuestion.querySelectorAll('input[type="checkbox"]:checked');
                answer = Array.from(checkedBoxes).map(cb => cb.value);
            } else if (textInput) {
                answer = textInput.value.trim();
            }
            
            if (answer !== null && answer !== '' && !(Array.isArray(answer) && answer.length === 0)) {
                answers[questionId] = {
                    questionId: questionId,
                    question: questionText,
                    answer: answer
                };
            } else {
                delete answers[questionId];
            }
        }
        
        function updateNextButtonState() {
            const currentQuestion = document.getElementById(\`question-\${currentQuestionIndex}\`);
            const nextBtn = document.getElementById('nextBtn');
            
            if (!currentQuestion) return;
            
            const isRequired = currentQuestion.querySelector('.required') !== null;
            let hasAnswer = false;
            
            // Check if question is answered
            const radioInputs = currentQuestion.querySelectorAll('input[type="radio"]');
            const checkboxInputs = currentQuestion.querySelectorAll('input[type="checkbox"]');
            const textInput = currentQuestion.querySelector('textarea, input[type="text"]');
            
            if (radioInputs.length > 0) {
                hasAnswer = currentQuestion.querySelector('input[type="radio"]:checked') !== null;
            } else if (checkboxInputs.length > 0) {
                hasAnswer = currentQuestion.querySelector('input[type="checkbox"]:checked') !== null;
            } else if (textInput) {
                hasAnswer = textInput.value.trim() !== '';
            }
            
            nextBtn.disabled = isRequired && !hasAnswer;
        }
        
        // Add event listeners for form inputs
        document.addEventListener('change', function(e) {
            if (e.target.matches('input, textarea')) {
                updateNextButtonState();
                
                // Update visual state for options
                if (e.target.type === 'radio') {
                    const questionPage = e.target.closest('.question-page');
                    questionPage.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
                    e.target.closest('.option').classList.add('selected');
                }
            }
        });
        
        document.addEventListener('input', function(e) {
            if (e.target.matches('textarea, input[type="text"]')) {
                updateNextButtonState();
            }
        });
        
        // Rating functionality
        document.addEventListener('click', function(e) {
            if (e.target.matches('.rating-button')) {
                const rating = e.target.getAttribute('data-rating');
                const questionPage = e.target.closest('.question-page');
                const hiddenInput = questionPage.querySelector('input[type="hidden"]');
                
                // Remove selected class from all buttons in this question
                questionPage.querySelectorAll('.rating-button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // Add selected class to clicked button
                e.target.classList.add('selected');
                
                // Set hidden input value
                if (hiddenInput) {
                    hiddenInput.value = rating;
                }
                
                updateNextButtonState();
            }
        });
        
        async function submitSurvey() {
            // Save current answer
            saveCurrentAnswer();
            
            const answerArray = Object.values(answers);
            
            if (answerArray.length === 0) {
                showError('Please answer at least one question before submitting.');
                return;
            }
            
            // Hide form and show loading
            document.getElementById('survey-form').style.display = 'none';
            document.getElementById('navigation').style.display = 'none';
            document.getElementById('loading').style.display = 'block';
            
            try {
                const completionTime = Math.floor((Date.now() - startTime) / 1000);
                
                const response = await fetch(\`\${API_BASE_URL}/api/public/survey/\${SURVEY_ID}/submit\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        answers: answerArray,
                        completionTime: completionTime,
                        respondentInfo: {}
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    await showThankYou();
                } else {
                    throw new Error(result.error || 'Failed to submit survey');
                }
            } catch (error) {
                console.error('Submission error:', error);
                showError('Failed to submit survey. Please try again.');
                
                // Show form again
                document.getElementById('loading').style.display = 'none';
                document.getElementById('survey-form').style.display = 'block';
                document.getElementById('navigation').style.display = 'flex';
            }
        }
        
        async function showThankYou() {
            try {
                // Try to get custom thank you message from API
                const response = await fetch(\`\${API_BASE_URL}/api/public/survey/\${SURVEY_ID}/thank-you\`);
                const result = await response.json();
                
                if (result.success && result.data) {
                    const thankYouSection = document.getElementById('thank-you');
                    thankYouSection.querySelector('h2').textContent = result.data.title || 'Thank You!';
                    thankYouSection.querySelector('p').textContent = result.data.message || 'Your response has been submitted successfully.';
                }
            } catch (error) {
                console.warn('Failed to load custom thank you message:', error);
            }
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('thank-you').style.display = 'block';
        }
        
        function showError(message) {
            const errorElement = document.getElementById('error-message');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Hide error after 5 seconds
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' || e.key === 'Enter') {
                if (currentQuestionIndex < TOTAL_QUESTIONS - 1) {
                    const nextBtn = document.getElementById('nextBtn');
                    if (!nextBtn.disabled) {
                        nextQuestion();
                    }
                }
            } else if (e.key === 'ArrowLeft') {
                if (currentQuestionIndex > 0) {
                    previousQuestion();
                }
            }
        });
    </script>
</body>
</html>`;
}

function generateQuestionPageHtml(
  question: Question,
  index: number,
  totalQuestions: number
): string {
  const questionNumber = index + 1;
  const requiredMark = question.required
    ? '<span class="required">*</span>'
    : "";

  let optionsHtml = "";

  switch (question.type) {
    case "single_choice":
      optionsHtml = `
        <div class="option-group">
          ${
            question.options
              ?.map(
                (option, optIndex) => `
            <div class="option">
              <input type="radio" id="${question.id}_${optIndex}" name="${
                  question.id
                }" value="${option}" ${question.required ? "required" : ""}>
              <label for="${question.id}_${optIndex}">${option}</label>
            </div>
          `
              )
              .join("") || ""
          }
        </div>
      `;
      break;

    case "checkbox":
      optionsHtml = `
        <div class="option-group">
          ${
            question.options
              ?.map(
                (option, optIndex) => `
            <div class="option">
              <input type="checkbox" id="${question.id}_${optIndex}" name="${question.id}" value="${option}">
              <label for="${question.id}_${optIndex}">${option}</label>
            </div>
          `
              )
              .join("") || ""
          }
        </div>
      `;
      break;

    case "text":
      optionsHtml = `
        <textarea 
          name="${question.id}" 
          class="text-input" 
          placeholder="Please share your thoughts..."
          ${question.required ? "required" : ""}
        ></textarea>
      `;
      break;

    case "rating":
      optionsHtml = `
        <div class="rating-group">
          ${
            question.options
              ?.map(
                (option) => `
            <div class="rating-button" data-rating="${option}">
              ${option}
            </div>
          `
              )
              .join("") || ""
          }
        </div>
        <div class="rating-labels">
          <span>Not likely</span>
          <span>Very likely</span>
        </div>
        <input type="hidden" name="${question.id}" id="${question.id}_hidden" ${
        question.required ? "required" : ""
      }>
      `;
      break;

    case "number":
      optionsHtml = `
        <input
          type="number"
          name="${question.id}"
          class="text-input"
          placeholder="Enter a number..."
          ${question.required ? "required" : ""}
        >
      `;
      break;

    case "nps":
      optionsHtml = `
        <div class="rating-group">
          ${Array.from({ length: 11 }, (_, i) => i)
            .map(
              (num) => `
            <div class="rating-button" data-rating="${num}">
              ${num}
            </div>
          `
            )
            .join("")}
        </div>
        <div class="rating-labels">
          <span>Not at all likely</span>
          <span>Extremely likely</span>
        </div>
        <input type="hidden" name="${question.id}" id="${question.id}_hidden" ${
        question.required ? "required" : ""
      }>
      `;
      break;

    default:
      optionsHtml = `<p>Unsupported question type: ${question.type}</p>`;
  }

  return `
    <div class="question-page" id="question-${index}" data-question-id="${question.id}">
      <div class="question-counter">Question ${questionNumber} of ${totalQuestions}</div>
      <div class="question-block">
        <h3 class="question-title">${question.question}${requiredMark}</h3>
        ${optionsHtml}
      </div>
    </div>
  `;
}
