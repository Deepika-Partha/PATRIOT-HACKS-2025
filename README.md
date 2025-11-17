# GMU Academic Portal

A comprehensive academic management platform for George Mason University students, providing schedule management, degree progress tracking, course planning, syllabus archiving, and an AI-powered academic assistant.

## 🎯 Overview

The GMU Academic Portal is a full-stack web application designed to help students manage their academic journey at George Mason University. It integrates course scheduling, degree progress tracking, prerequisite checking, syllabus management, and an intelligent chatbot assistant powered by Anthropic's Claude AI.

## ✨ Features

### 📅 **Interactive Calendar & Schedule Builder**
- **Fullscreen 24-hour calendar view** (12 AM - 11 PM) with scrollable time column
- **Real-time date/time synchronization** with auto-scroll to current time
- **Week navigation** with swipe gestures and floating arrow buttons
- **Floating course selection sidebar** with search functionality
- **GMU course catalog integration** from JSON data
- **Unique color coding** for each course for visual distinction
- **Task management** with due dates and completion tracking
- **Custom event creation** with specific day and time assignments
- **Database persistence** for schedules, tasks, and events

### 📊 **Academic Dashboard**
- **Degree progress tracking** with visual progress indicators
- **Academic history management** - add, view, and delete completed courses
- **Prerequisite checking** - automatically verifies if prerequisites are met
- **Course lookup** with autocomplete suggestions
- **Remaining courses calculator** - shows what courses are still needed
- **Credit tracking** - total credits earned and remaining
- **Potential courses roadmap** - plan future courses with prerequisite validation

### 📚 **Syllabus Archive**
- **Upload and store syllabi** by course, semester, and year
- **View and download** uploaded syllabi
- **Organized by semester** with sorting capabilities
- **PDF file support** with secure storage

### 🤖 **AI Academic Assistant**
- **Conversational interface** powered by Anthropic Claude AI
- **Context-aware responses** using student's academic history and profile
- **Persistent conversation history** saved to database
- **Academic guidance** for course planning and degree requirements
- **Personalized recommendations** based on student data

### 👤 **User Profile Management**
- **Profile editing** with major and year selection
- **Secure authentication** with JWT tokens
- **Password hashing** with bcrypt
- **Session management** with persistent login

## 🛠️ Tech Stack

### Frontend
- **SvelteKit** - Full-stack framework
- **TypeScript** - Type-safe development
- **CSS3** - Modern styling with Grid and Flexbox
- **Responsive Design** - Mobile and desktop support

### Backend
- **SvelteKit API Routes** - Server-side endpoints
- **MongoDB** - NoSQL database for data persistence
- **JWT (jsonwebtoken)** - Authentication and authorization
- **bcryptjs** - Password hashing

### AI Integration
- **Anthropic Claude SDK** - AI-powered chatbot assistant

### Additional Tools
- **pdf-parse** - PDF parsing for CS requirements
- **Vite** - Build tool and dev server

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** database (local or cloud instance)
- **Anthropic API Key** (for chatbot feature)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PATRIOT-HACKS-2025
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   MONGO_DB_URI=mongodb://localhost:27017/gmuApp
   # OR for MongoDB Atlas:
   # MONGO_DB_URI=mongodb+srv://username:password@cluster.mongodb.net/gmuApp
   
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
PATRIOT-HACKS-2025/
├── src/
│   ├── lib/
│   │   ├── components/          # Reusable Svelte components
│   │   │   └── NavBar.svelte
│   │   ├── server/              # Server-side utilities
│   │   │   ├── auth.ts         # Authentication helpers
│   │   │   ├── db.ts           # MongoDB connection
│   │   │   ├── jwt.ts          # JWT token management
│   │   │   ├── courseCatalog.ts # Course catalog data
│   │   │   ├── gmuScraper.ts   # GMU course scraping
│   │   │   └── parseCSRequirements.ts # PDF parsing
│   │   └── assets/             # Static assets
│   ├── routes/
│   │   ├── api/                # API endpoints
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── student/        # Student data endpoints
│   │   │   ├── courses/        # Course-related endpoints
│   │   │   ├── syllabus/       # Syllabus management endpoints
│   │   │   └── chatbot/        # AI chatbot endpoint
│   │   ├── dashboard/           # Main dashboard page
│   │   ├── schedule/            # Calendar/schedule page
│   │   ├── syllabus/           # Syllabus archive page
│   │   ├── profile/            # User profile page
│   │   ├── login/              # Login page
│   │   └── register/           # Registration page
│   └── app.html                # HTML template
├── static/
│   └── gmu_courses.json        # GMU course catalog data
├── package.json
├── svelte.config.js
├── tsconfig.json
└── vite.config.ts
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Student Data
- `GET /api/student/getInfo` - Get student information
- `GET /api/student/getProfile` - Get student profile
- `POST /api/student/updateProfile` - Update student profile
- `GET /api/student/getCurrentSchedule` - Get saved schedule
- `POST /api/student/updateCurrentSchedule` - Save schedule
- `GET /api/student/getTasks` - Get tasks and events
- `POST /api/student/updateTasks` - Save tasks and events
- `POST /api/student/addCompletedCourse` - Add completed course
- `POST /api/student/deleteCourse` - Delete course from history
- `POST /api/student/updateCredits` - Update credit count
- `POST /api/student/updateDegreeProgress` - Update degree progress

### Courses
- `GET /api/courses/search` - Search courses
- `GET /api/courses/lookup` - Lookup course details
- `GET /api/courses/prerequisites/[courseId]` - Get course prerequisites
- `GET /api/courses/countsTowardDegree/[courseId]` - Check if course counts toward degree
- `GET /api/courses/remaining` - Get remaining required courses
- `POST /api/courses/scrape` - Scrape GMU courses
- `POST /api/courses/parseCSRequirements` - Parse CS requirements PDF

### Syllabus
- `GET /api/syllabus/list` - List all syllabi
- `POST /api/syllabus/upload` - Upload syllabus
- `DELETE /api/syllabus/delete/[id]` - Delete syllabus

### Chatbot
- `GET /api/chatbot` - Get conversation history
- `POST /api/chatbot` - Send message to AI assistant

## 🎮 Usage

### Registration & Login
1. Navigate to the registration page and create an account
2. Log in with your credentials
3. Complete your profile with major and year information

### Schedule Management
1. Go to the **Calendar** tab
2. Click the floating menu button to open course selection
3. Search and select courses from the GMU catalog
4. Courses with meeting times will appear on the calendar
5. Add custom events by clicking the events tab
6. Create tasks with due dates in the tasks panel
7. Navigate between weeks using arrow buttons or swipe gestures

### Academic Dashboard
1. View your degree progress and credit count
2. Add completed courses to your academic history
3. Check prerequisite status for courses
4. View remaining required courses
5. Plan potential future courses with prerequisite validation
6. Use the AI chatbot for academic guidance

### Syllabus Archive
1. Upload syllabi by course, semester, and year
2. View and download stored syllabi
3. Organize by semester for easy access

## 🔒 Security

- **JWT-based authentication** for secure session management
- **Password hashing** with bcrypt
- **Protected API routes** requiring authentication
- **Input validation** on all user inputs
- **Error handling** to prevent information leakage

## 🧪 Testing

```bash
# Run type checking
npm run check

# Test chatbot endpoint
npm run test:chatbot

# Test all endpoints
npm test
```

## 🚢 Building for Production

```bash
npm run build
npm run preview
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_DB_URI` | MongoDB connection string | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key for chatbot | No (chatbot disabled if missing) |

## 🐛 Known Issues

- Chatbot requires Anthropic API key to function
- MongoDB connection must be configured before first run
- Some course data may need manual updates in `gmu_courses.json`

## 📄 License

This project is part of the Patriot Hacks 2025 hackathon.

## 👥 Authors

Developed for Patriot Hacks 2025.

---

**Note**: This application is designed specifically for George Mason University students and uses GMU course catalog data. Ensure you have proper database and API credentials configured before deployment.
