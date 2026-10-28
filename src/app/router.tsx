import { createBrowserRouter } from 'react-router'
import { PublicLayout, AppLayout, RouteError } from './layouts'
import { RequireMember, RequireRole, RequireSession } from './guards'
import HomePage from '@/features/public/HomePage'
import SamplePage, { SampleActivityPage } from '@/features/public/SamplePage'
import { HelpPage, PrivacyPage, TermsPage, NotFoundPage } from '@/features/public/StaticPages'
import SignInPage from '@/features/auth/SignInPage'
import AuthCallbackPage from '@/features/auth/AuthCallbackPage'
import OnboardingPage from '@/features/onboarding/OnboardingPage'
import TodayPage from '@/features/today/TodayPage'
import ExplorePage from '@/features/activities/ExplorePage'
import ActivityPage from '@/features/activities/ActivityPage'
import LearnPage from '@/features/education/LearnPage'
import MemoriesPage from '@/features/memories/MemoriesPage'
import NewMemoryPage from '@/features/memories/NewMemoryPage'
import MemoryDetailPage from '@/features/memories/MemoryDetailPage'
import FamilyPage from '@/features/family/FamilyPage'
import JoinPage from '@/features/family/JoinPage'
import SettingsPage from '@/features/privacy/SettingsPage'
import PrivacySettingsPage from '@/features/privacy/PrivacySettingsPage'

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/sample', element: <SamplePage /> },
          { path: '/sample/:slug', element: <SampleActivityPage /> },
          { path: '/sign-in', element: <SignInPage /> },
          { path: '/auth/callback', element: <AuthCallbackPage /> },
          { path: '/join', element: <JoinPage /> },
          { path: '/privacy', element: <PrivacyPage /> },
          { path: '/terms', element: <TermsPage /> },
          { path: '/help', element: <HelpPage /> },
          {
            element: <RequireSession />,
            children: [{ path: '/onboarding', element: <OnboardingPage /> }],
          },
        ],
      },
      {
        element: <RequireMember />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/today', element: <TodayPage /> },
              { path: '/explore', element: <ExplorePage /> },
              { path: '/activities/:slug', element: <ActivityPage /> },
              { path: '/learn/:slug', element: <LearnPage /> },
              { path: '/memories', element: <MemoriesPage /> },
              { path: '/memories/new', element: <NewMemoryPage /> },
              { path: '/memories/:id', element: <MemoryDetailPage /> },
              { path: '/family', element: <FamilyPage /> },
              { path: '/settings', element: <SettingsPage /> },
              { path: '/settings/privacy', element: <PrivacySettingsPage /> },
              {
                element: <RequireRole roles={['editor', 'reviewer', 'publisher', 'operator']} />,
                // Editorial code is loaded only for admins.
                children: [
                  { path: '/admin', lazy: () => import('@/features/admin/AdminDashboard').then((m) => ({ Component: m.default })) },
                  { path: '/admin/content/:id', lazy: () => import('@/features/admin/AdminContentEditor').then((m) => ({ Component: m.default })) },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <PublicLayout />, children: [{ path: '*', element: <NotFoundPage /> }] },
    ],
  },
])
