# AAC - Form Management System

A comprehensive form management system built with Next.js, React, TypeScript, TailwindCSS, and Supabase. This system provides separate platforms for admins (web dashboard) and employees (mobile app) to manage and complete forms.

## Features

### Admin Dashboard (Web)
- **Form Builder**: Create forms with dynamic question types (short text, long text, single select, multi select)
- **Preset Questions**: Save frequently used questions for reuse across multiple forms
- **Team Management**: Invite employees and manage team members
- **Form Assignment**: Assign forms to specific employees with due dates
- **Analytics Dashboard**: View form completion statistics and insights
- **Role-based Access**: Secure admin-only access to dashboard features

### Employee Experience (Mobile)
- **Mobile App**: Dedicated mobile application for form completion
- **Form Assignment**: Receive assigned forms with clear due dates
- **Progress Tracking**: Track completion status of assigned forms
- **Offline Support**: Complete forms offline and sync when connected

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: TailwindCSS, Headless UI
- **Backend**: Supabase (PostgreSQL database, Authentication, Real-time)
- **State Management**: React Hooks, React Hook Form
- **Charts**: Recharts
- **Icons**: Heroicons, Lucide React

## Database Schema

The system uses Supabase with the following main tables:
- `profiles` - User profiles with roles (admin/employee) and status
- `forms` - Form definitions with metadata and settings
- `form_questions` - Questions within forms with types and options
- `form_assignments` - Links between forms and employees
- `form_responses` - Employee form submissions
- `form_response_answers` - Individual answers to form questions
- `preset_questions` - Reusable questions saved by admins

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd aac
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

The system includes SQL migrations in the `supabase/migrations/` directory. Apply these migrations to set up your database schema:

1. Install Supabase CLI
2. Link your project: `supabase link --project-ref your-project-ref`
3. Apply migrations: `supabase db push`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## User Roles and Access

### Admin Users
- Access to full web dashboard at `/dashboard`
- Can create and manage forms
- Can invite and manage employees
- Can view analytics and form responses
- Role: `admin` in database

### Employee Users
- Redirected to mobile app download page
- Cannot access web dashboard
- Receive form assignments via the mobile app
- Role: `employee` in database

## Form Assignment Workflow

1. **Admin creates form** - Using the form builder with dynamic questions
2. **Admin assigns form** - Selects employees and sets due dates
3. **Employee receives assignment** - Via mobile app notification
4. **Employee completes form** - Using mobile app interface
5. **Admin reviews responses** - Via analytics dashboard

## Question Types Supported

- **Short Text**: Single-line text input
- **Long Text**: Multi-line textarea input
- **Single Select**: Radio button selection from options
- **Multi Select**: Checkbox selection allowing multiple choices

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Next.js team for the amazing framework
- Supabase for the backend infrastructure
- Tailwind CSS for the styling system
