// Static data for the survey platform

// Dashboard data
export const dashboardData = {
  stats: {
    totalSurveys: 24,
    surveyGrowth: 12,
    totalResponses: 1842,
    responseGrowth: 8,
    completionRate: 76,
    completionRateGrowth: 3,
    avgResponseTime: 4.2,
    responseTimeImprovement: 12,
  },
  charts: {
    barChart: [
      { category: "IT Sector", responses: 320 },
      { category: "Automotive", responses: 240 },
      { category: "Healthcare", responses: 280 },
      { category: "Education", responses: 180 },
      { category: "Retail", responses: 220 },
    ],
    lineChart: [
      { month: "Jan", surveys: 10, responses: 320 },
      { month: "Feb", surveys: 12, responses: 380 },
      { month: "Mar", surveys: 14, responses: 420 },
      { month: "Apr", surveys: 18, responses: 550 },
      { month: "May", surveys: 20, responses: 620 },
      { month: "Jun", surveys: 24, responses: 700 },
    ],
    pieChart: [
      { category: "IT Sector", value: 32 },
      { category: "Automotive", value: 24 },
      { category: "Healthcare", value: 18 },
      { category: "Education", value: 14 },
      { category: "Retail", value: 12 },
    ],
  },
  recentSurveys: [
    {
      title: "IT Professional Work Satisfaction",
      category: "IT Sector",
      responses: 320,
      date: "2023-06-15",
    },
    {
      title: "Automotive Customer Experience",
      category: "Automotive",
      responses: 240,
      date: "2023-06-10",
    },
    {
      title: "Healthcare Service Quality",
      category: "Healthcare",
      responses: 280,
      date: "2023-06-05",
    },
    {
      title: "Education Technology Adoption",
      category: "Education",
      responses: 180,
      date: "2023-05-28",
    },
  ],
}

// Survey categories
export const categories = [
  "IT Sector",
  "Automotive",
  "Healthcare",
  "Education",
  "Retail",
  "Finance",
  "Manufacturing",
  "Entertainment",
  "Food & Beverage",
  "Travel & Tourism",
  "Real Estate",
  "Media",
  "Sports",
  "Technology",
  "Energy",
]

// Sample questions for the survey editor
export const sampleQuestions = [
  {
    id: "q1",
    type: "single_choice",
    question: "How satisfied are you with our product?",
    options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"],
    required: true,
  },
  {
    id: "q2",
    type: "checkbox",
    question: "Which features do you use most often?",
    options: ["Feature A", "Feature B", "Feature C", "Feature D"],
    required: false,
  },
  {
    id: "q3",
    type: "text",
    question: "What improvements would you suggest for our product?",
    required: false,
  },
  {
    id: "q4",
    type: "rating",
    question: "How likely are you to recommend our product to others?",
    required: true,
  },
]

// Sent surveys data
export const sentSurveys = [
  {
    id: "survey-1",
    title: "IT Professional Work Satisfaction",
    category: "IT Sector",
    status: "active",
    responses: 320,
    target: 500,
    completionRate: 76,
    createdAt: "2023-06-15",
  },
  {
    id: "survey-2",
    title: "Automotive Customer Experience",
    category: "Automotive",
    status: "completed",
    responses: 240,
    target: 250,
    completionRate: 96,
    createdAt: "2023-06-10",
  },
  {
    id: "survey-3",
    title: "Healthcare Service Quality",
    category: "Healthcare",
    status: "active",
    responses: 180,
    target: 300,
    completionRate: 60,
    createdAt: "2023-06-05",
  },
  {
    id: "survey-4",
    title: "Education Technology Adoption",
    category: "Education",
    status: "draft",
    responses: 0,
    target: 200,
    completionRate: 0,
    createdAt: "2023-05-28",
  },
]

// Add function to add new survey to sent surveys
export function addSentSurvey(surveyData: {
  title: string
  category: string
  targetCount: number
  questions: any[]
}) {
  const newSurvey = {
    id: `survey-${Date.now()}`,
    title: surveyData.title,
    category: surveyData.category,
    status: "active" as const,
    responses: 0,
    target: surveyData.targetCount,
    completionRate: 0,
    createdAt: new Date().toISOString().split("T")[0],
  }

  sentSurveys.unshift(newSurvey)

  // Update dashboard stats
  dashboardData.stats.totalSurveys += 1
  dashboardData.stats.surveyGrowth = Math.round(Math.random() * 20) + 5 // Simulate growth

  return newSurvey
}

// Add function to update dashboard data
export function updateDashboardStats() {
  dashboardData.stats.totalSurveys = sentSurveys.length
  dashboardData.stats.totalResponses = sentSurveys.reduce((sum, survey) => sum + survey.responses, 0)
  dashboardData.stats.completionRate = Math.round(
    sentSurveys.reduce((sum, survey) => sum + survey.completionRate, 0) / sentSurveys.length,
  )
}

// Survey results data
export const surveyResults = {
  "survey-1": {
    title: "IT Professional Work Satisfaction",
    description: "Understanding job satisfaction levels among IT professionals",
    stats: {
      totalResponses: 320,
      completionRate: 76,
      avgTime: 4.2,
      npsScore: 42,
    },
    questionResults: [
      {
        question: "How satisfied are you with your current role?",
        type: "single_choice",
        responses: 320,
        data: [
          { option: "Very Satisfied", count: 96, percentage: 30 },
          { option: "Satisfied", count: 128, percentage: 40 },
          { option: "Neutral", count: 64, percentage: 20 },
          { option: "Dissatisfied", count: 24, percentage: 7.5 },
          { option: "Very Dissatisfied", count: 8, percentage: 2.5 },
        ],
      },
      {
        question: "Rate your work-life balance",
        type: "rating",
        responses: 320,
        averageRating: 3.4,
        data: [
          { rating: "1", count: 32 },
          { rating: "2", count: 48 },
          { rating: "3", count: 96 },
          { rating: "4", count: 112 },
          { rating: "5", count: 32 },
        ],
      },
      {
        question: "What improvements would you suggest?",
        type: "text",
        responses: 280,
        sampleResponses: [
          "Better remote work policies and flexible hours",
          "More professional development opportunities",
          "Improved communication between teams",
          "Better work-life balance initiatives",
        ],
      },
    ],
    individualResponses: [
      {
        id: "R001",
        submittedAt: "2023-06-20 14:30",
        completionTime: 3.5,
        answers: [
          { question: "How satisfied are you with your current role?", answer: "Satisfied" },
          { question: "Rate your work-life balance", answer: "4/5" },
          { question: "What improvements would you suggest?", answer: "More flexible working hours" },
        ],
      },
      {
        id: "R002",
        submittedAt: "2023-06-20 15:45",
        completionTime: 4.1,
        answers: [
          { question: "How satisfied are you with your current role?", answer: "Very Satisfied" },
          { question: "Rate your work-life balance", answer: "5/5" },
          { question: "What improvements would you suggest?", answer: "Better team collaboration tools" },
        ],
      },
    ],
    demographics: {
      age: [
        { ageGroup: "18-24", count: 48 },
        { ageGroup: "25-34", count: 128 },
        { ageGroup: "35-44", count: 96 },
        { ageGroup: "45-54", count: 32 },
        { ageGroup: "55+", count: 16 },
      ],
      gender: [
        { gender: "Male", count: 192 },
        { gender: "Female", count: 112 },
        { gender: "Other", count: 16 },
      ],
      location: [
        { location: "United States", count: 160 },
        { location: "Canada", count: 64 },
        { location: "United Kingdom", count: 48 },
        { location: "Germany", count: 32 },
        { location: "Other", count: 16 },
      ],
    },
    responseTimeline: [
      { date: "Jun 15", responses: 45 },
      { date: "Jun 16", responses: 62 },
      { date: "Jun 17", responses: 38 },
      { date: "Jun 18", responses: 55 },
      { date: "Jun 19", responses: 48 },
      { date: "Jun 20", responses: 72 },
    ],
  },
}

// Add audience data generation at the end of the file

// Generate 10k audience data
const generateAudienceData = () => {
  const firstNames = [
    "James",
    "Mary",
    "John",
    "Patricia",
    "Robert",
    "Jennifer",
    "Michael",
    "Linda",
    "William",
    "Elizabeth",
    "David",
    "Barbara",
    "Richard",
    "Susan",
    "Joseph",
    "Jessica",
    "Thomas",
    "Sarah",
    "Christopher",
    "Karen",
    "Charles",
    "Nancy",
    "Daniel",
    "Lisa",
    "Matthew",
    "Betty",
    "Anthony",
    "Helen",
    "Mark",
    "Sandra",
    "Donald",
    "Donna",
    "Steven",
    "Carol",
    "Paul",
    "Ruth",
    "Andrew",
    "Sharon",
    "Joshua",
    "Michelle",
    "Kenneth",
    "Laura",
    "Kevin",
    "Sarah",
    "Brian",
    "Kimberly",
    "George",
    "Deborah",
    "Timothy",
    "Dorothy",
  ]

  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Gonzalez",
    "Wilson",
    "Anderson",
    "Thomas",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
    "Lee",
    "Perez",
    "Thompson",
    "White",
    "Harris",
    "Sanchez",
    "Clark",
    "Ramirez",
    "Lewis",
    "Robinson",
    "Walker",
    "Young",
    "Allen",
    "King",
    "Wright",
    "Scott",
    "Torres",
    "Nguyen",
    "Hill",
    "Flores",
    "Green",
    "Adams",
    "Nelson",
    "Baker",
    "Hall",
    "Rivera",
    "Campbell",
    "Mitchell",
    "Carter",
    "Roberts",
  ]

  const cities = [
    { name: "New York", state: "NY", country: "United States" },
    { name: "Los Angeles", state: "CA", country: "United States" },
    { name: "Chicago", state: "IL", country: "United States" },
    { name: "Houston", state: "TX", country: "United States" },
    { name: "Phoenix", state: "AZ", country: "United States" },
    { name: "Philadelphia", state: "PA", country: "United States" },
    { name: "San Antonio", state: "TX", country: "United States" },
    { name: "San Diego", state: "CA", country: "United States" },
    { name: "Dallas", state: "TX", country: "United States" },
    { name: "San Jose", state: "CA", country: "United States" },
    { name: "Toronto", state: "ON", country: "Canada" },
    { name: "Vancouver", state: "BC", country: "Canada" },
    { name: "Montreal", state: "QC", country: "Canada" },
    { name: "London", state: "", country: "United Kingdom" },
    { name: "Manchester", state: "", country: "United Kingdom" },
    { name: "Birmingham", state: "", country: "United Kingdom" },
    { name: "Berlin", state: "", country: "Germany" },
    { name: "Munich", state: "", country: "Germany" },
    { name: "Hamburg", state: "", country: "Germany" },
    { name: "Sydney", state: "NSW", country: "Australia" },
  ]

  const industries = [
    "IT Sector",
    "Healthcare",
    "Finance",
    "Education",
    "Retail",
    "Manufacturing",
    "Automotive",
    "Entertainment",
    "Real Estate",
    "Energy",
    "Food & Beverage",
    "Travel & Tourism",
    "Media",
    "Sports",
    "Technology",
  ]

  const jobTitles = [
    "Software Engineer",
    "Marketing Manager",
    "Sales Representative",
    "Data Analyst",
    "Project Manager",
    "HR Specialist",
    "Financial Analyst",
    "Customer Service Rep",
    "Operations Manager",
    "Business Analyst",
    "Designer",
    "Consultant",
    "Teacher",
    "Nurse",
    "Accountant",
    "Engineer",
    "Developer",
    "Coordinator",
    "Specialist",
    "Director",
  ]

  const ageGroups = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]
  const genders = ["Male", "Female", "Non-binary", "Prefer not to say"]
  const educationLevels = ["High School", "Bachelor's", "Master's", "PhD", "Associate", "Trade School"]
  const incomeRanges = ["$25k-$35k", "$35k-$50k", "$50k-$75k", "$75k-$100k", "$100k-$150k", "$150k+"]

  const audienceData = []

  for (let i = 1; i <= 10000; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const city = cities[Math.floor(Math.random() * cities.length)]
    const industry = industries[Math.floor(Math.random() * industries.length)]
    const jobTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)]
    const ageGroup = ageGroups[Math.floor(Math.random() * ageGroups.length)]
    const gender = genders[Math.floor(Math.random() * genders.length)]
    const education = educationLevels[Math.floor(Math.random() * educationLevels.length)]
    const income = incomeRanges[Math.floor(Math.random() * incomeRanges.length)]

    audienceData.push({
      id: `AUD${i.toString().padStart(5, "0")}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
      phone: `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      ageGroup,
      gender,
      city: city.name,
      state: city.state,
      country: city.country,
      industry,
      jobTitle,
      education,
      income,
      joinedDate: new Date(
        2020 + Math.floor(Math.random() * 4),
        Math.floor(Math.random() * 12),
        Math.floor(Math.random() * 28) + 1,
      )
        .toISOString()
        .split("T")[0],
      isActive: Math.random() > 0.1, // 90% active
      lastActivity: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      tags: [industry, ageGroup, gender].filter(Boolean),
    })
  }

  return audienceData
}

// Export the audience data
export const audienceData = generateAudienceData()
// Audience statistics
export const audienceStats = {
  total: audienceData.length,
  active: audienceData.filter((person) => person.isActive).length,

  byAgeGroup: audienceData.reduce<Record<string, number>>((acc, person) => {
    acc[person.ageGroup] = (acc[person.ageGroup] || 0) + 1;
    return acc;
  }, {}),

  byGender: audienceData.reduce<Record<string, number>>((acc, person) => {
    acc[person.gender] = (acc[person.gender] || 0) + 1;
    return acc;
  }, {}),

  byCountry: audienceData.reduce<Record<string, number>>((acc, person) => {
    acc[person.country] = (acc[person.country] || 0) + 1;
    return acc;
  }, {}),

  byIndustry: audienceData.reduce<Record<string, number>>((acc, person) => {
    acc[person.industry] = (acc[person.industry] || 0) + 1;
    return acc;
  }, {}),
};